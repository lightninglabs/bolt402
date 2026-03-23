/**
 * WASM L402 engine adapter.
 *
 * Wraps the Rust/WASM WasmL402Engine for use in bolt402-ai-sdk.
 * The WASM module handles all L402 protocol logic (challenge parsing,
 * token construction, budget enforcement, token caching), while
 * JavaScript provides HTTP and Lightning payment I/O.
 *
 * Architecture:
 * ```
 * bolt402-ai-sdk (Vercel AI SDK tools)
 *     │
 *     └── WasmL402EngineAdapter (this file)
 *             │
 *             ├── WasmL402Engine (Rust/WASM)
 *             │     ├── Challenge parsing
 *             │     ├── Token construction
 *             │     ├── Budget enforcement
 *             │     └── Token cache
 *             │
 *             └── JS callbacks
 *                   ├── fetchFn → native fetch()
 *                   └── payInvoiceFn → LnBackend.payInvoice()
 * ```
 */

import type { Budget, LnBackend, Receipt, TokenStore } from './types.js';

// WASM types are loaded dynamically
type WasmModule = typeof import('bolt402-wasm');
type WasmEngine = InstanceType<WasmModule['WasmL402Engine']>;

let wasmModule: WasmModule | null = null;
let wasmInitPromise: Promise<WasmModule | null> | null = null;

/** Whether WASM initialization has been attempted and failed. */
let wasmFailed = false;

/**
 * Initialize the WASM module. Safe to call multiple times (idempotent).
 * Returns the initialized WASM module, or null if WASM is unavailable.
 */
async function initWasm(): Promise<WasmModule | null> {
  if (wasmModule) return wasmModule;
  if (wasmFailed) return null;

  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      try {
        const wasm = await import('bolt402-wasm');
        // wasm-pack web target exports an init function as default
        if (typeof wasm.default === 'function') {
          await wasm.default();
        }
        wasmModule = wasm;
        return wasm;
      } catch {
        // WASM loading failed (e.g., Node.js without web target support).
        // Fall back to pure TypeScript.
        wasmFailed = true;
        return null;
      }
    })();
  }

  return wasmInitPromise;
}

/** Configuration for the WASM engine adapter. */
export interface WasmEngineAdapterConfig {
  /** Lightning backend for paying invoices. */
  backend: LnBackend;
  /** Budget limits. */
  budget?: Budget;
  /** Maximum routing fee in satoshis. Default: 100. */
  maxFeeSats?: number;
  /** Custom fetch function. */
  fetchFn?: typeof fetch;
}

/**
 * WASM-backed L402 client engine.
 *
 * Delegates L402 protocol logic to the Rust/WASM module while keeping
 * HTTP and Lightning I/O in JavaScript. This ensures a single source
 * of truth for protocol logic across TS, Python, and Go.
 */
export class WasmL402EngineAdapter {
  private engine: WasmEngine | null = null;
  private initPromise: Promise<void> | null = null;
  private wasmUnavailable = false;
  private readonly config: WasmEngineAdapterConfig;
  private readonly fetchFn: typeof fetch;
  private readonly receipts: Receipt[] = [];

  constructor(config: WasmEngineAdapterConfig) {
    this.config = config;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  /** Ensure WASM is initialized and the engine is created. Returns null if WASM unavailable. */
  private async ensureInit(): Promise<WasmEngine | null> {
    if (this.engine) return this.engine;
    if (this.wasmUnavailable) return null;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        const wasm = await initWasm();
        if (!wasm) {
          this.wasmUnavailable = true;
          return;
        }

        // Create budget config
        const toBigIntOpt = (n: number | undefined): bigint | undefined =>
          n !== undefined ? BigInt(n) : undefined;

        const budget = this.config.budget
          ? new wasm.WasmBudget(
              toBigIntOpt(this.config.budget.perRequestMax),
              toBigIntOpt(this.config.budget.hourlyMax),
              toBigIntOpt(this.config.budget.dailyMax),
              toBigIntOpt(this.config.budget.totalMax),
            )
          : undefined;

        const engineConfig = new wasm.WasmEngineConfig(
          BigInt(this.config.maxFeeSats ?? 100),
          budget,
        );

        this.engine = new wasm.WasmL402Engine(engineConfig);
      })();
    }

    await this.initPromise;
    return this.engine;
  }

  /**
   * Fetch a URL with L402 payment handling.
   *
   * The WASM engine orchestrates the L402 protocol flow, calling back
   * into JavaScript for HTTP requests and Lightning payments.
   */
  async fetch(
    url: string,
    options: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    } = {},
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    paid: boolean;
    receipt: Receipt | null;
    cachedToken: boolean;
  } | null> {
    const engine = await this.ensureInit();
    if (!engine) return null; // WASM unavailable, caller should use TS fallback
    const method = options.method ?? 'GET';
    const backend = this.config.backend;
    const fetchFn = this.fetchFn;

    // Create the JS fetch callback for the WASM engine
    const jsFetchFn = async (
      fetchUrl: string,
      fetchMethod: string,
      fetchBody: string | undefined,
      headersJson: string,
    ): Promise<{ status: number; headers: string; body: string }> => {
      const headers: Record<string, string> = JSON.parse(headersJson);
      headers['User-Agent'] = headers['User-Agent'] ?? 'bolt402-ai-sdk/0.1.0';
      if (fetchBody) {
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      }

      const resp = await fetchFn(fetchUrl, {
        method: fetchMethod,
        headers,
        body: fetchBody ?? undefined,
      });

      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });

      const respBody = await resp.text();
      return {
        status: resp.status,
        headers: JSON.stringify(respHeaders),
        body: respBody,
      };
    };

    // Create the JS pay_invoice callback
    const jsPayInvoiceFn = async (
      invoice: string,
      maxFeeSats: number,
    ): Promise<{
      preimage: string;
      paymentHash: string;
      amountSats: number;
      feeSats: number;
    }> => {
      return backend.payInvoice(invoice, maxFeeSats);
    };

    // Call the WASM engine
    const result = await engine.fetch(
      url,
      method,
      options.body ?? undefined,
      options.headers ? JSON.stringify(options.headers) : undefined,
      jsFetchFn as unknown as Function,
      jsPayInvoiceFn as unknown as Function,
    );

    const responseHeaders: Record<string, string> = JSON.parse(result.headers);

    let receipt: Receipt | null = null;
    if (result.paid && result.receipt) {
      receipt = {
        url,
        amountSats: Number(result.receipt.amountSats),
        feeSats: Number(result.receipt.feeSats),
        totalCostSats: Number(result.receipt.amountSats) + Number(result.receipt.feeSats),
        paymentHash: result.receipt.paymentHash,
        preimage: result.receipt.preimage,
        httpStatus: result.status,
        latencyMs: 0, // WASM engine doesn't track this yet
        timestamp: new Date().toISOString(),
      };
      this.receipts.push(receipt);
    }

    return {
      status: result.status,
      headers: responseHeaders,
      body: result.body,
      paid: result.paid,
      receipt,
      cachedToken: result.cachedToken,
    };
  }

  /** Get all payment receipts. */
  getReceipts(): Receipt[] {
    return [...this.receipts];
  }

  /** Get total spent in satoshis. */
  getTotalSpent(): number {
    if (!this.engine) return 0;
    return Number(this.engine.totalSpent);
  }

  /** Get the Lightning backend. */
  getBackend(): LnBackend {
    return this.config.backend;
  }

  /** Clear the token cache. */
  clearCache(): void {
    this.engine?.clearCache();
  }
}

/**
 * Check if WASM is available in the current environment.
 *
 * Returns true if WebAssembly is available (browser, Node.js 12+, Deno, etc.).
 */
export function isWasmAvailable(): boolean {
  try {
    return typeof (globalThis as Record<string, unknown>).WebAssembly !== 'undefined';
  } catch {
    return false;
  }
}
