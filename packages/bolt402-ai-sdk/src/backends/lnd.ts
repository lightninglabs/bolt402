/**
 * LND REST API backend adapter.
 *
 * Connects to an LND node via its REST API for paying invoices
 * and querying node state.
 */

import type { LnBackend, NodeInfo, PaymentResult } from '../types.js';

/** Configuration for the LND REST backend. */
export interface LndBackendConfig {
  /** LND REST API URL (e.g., 'https://localhost:8080'). */
  url: string;
  /** Hex-encoded admin macaroon. */
  macaroon: string;
  /** Custom fetch function (for testing or custom TLS handling). */
  fetchFn?: typeof fetch;
}

/**
 * LND REST API backend.
 *
 * Uses LND's REST API to pay invoices and query node information.
 * Requires an admin macaroon for payment operations.
 */
export class LndBackend implements LnBackend {
  private readonly url: string;
  private readonly macaroon: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: LndBackendConfig) {
    // Remove trailing slash
    this.url = config.url.replace(/\/+$/, '');
    this.macaroon = config.macaroon;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async payInvoice(bolt11: string, maxFeeSats: number): Promise<PaymentResult> {
    const response = await this.fetchFn(`${this.url}/v2/router/send`, {
      method: 'POST',
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_request: bolt11,
        fee_limit_sat: maxFeeSats,
        timeout_seconds: 60,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LND payment failed (${response.status}): ${errorText}`);
    }

    // v2/router/send returns newline-delimited JSON stream.
    // Each line is a JSON object. We scan from the last line backward
    // to find the final payment update (SUCCEEDED or FAILED).
    const text = await response.text();
    const lines = text.trim().split('\n').filter((l) => l.trim());

    // Find the SUCCEEDED payment in the stream (scan from end)
    let payment: LndPaymentResult | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const parsed = JSON.parse(lines[i]) as { result?: LndPaymentResult } & LndPaymentResult;
      // Handle both wrapped {"result": {...}} and unwrapped {...} formats
      const candidate = parsed.result ?? parsed;
      if (candidate.status === 'SUCCEEDED') {
        payment = candidate;
        break;
      }
    }

    if (!payment) {
      // Try to find a failure reason
      const lastParsed = JSON.parse(lines[lines.length - 1]) as { result?: LndPaymentResult } & LndPaymentResult;
      const last = lastParsed.result ?? lastParsed;
      const reason = last.failure_reason ?? last.status ?? 'unknown';
      throw new Error(`LND payment failed: ${reason}`);
    }

    // Extract preimage — support both snake_case and camelCase field names
    // (grpc-gateway version differences)
    const preimageRaw = payment.payment_preimage ?? payment.paymentPreimage ?? '';
    const hashRaw = payment.payment_hash ?? payment.paymentHash ?? '';

    if (!preimageRaw) {
      throw new Error('LND payment succeeded but returned empty preimage');
    }

    // LND REST API returns bytes fields as either base64 or hex depending
    // on the grpc-gateway version and LND configuration.
    // Detect the encoding and normalize to hex for L402.
    const preimage = bytesFieldToHex(preimageRaw);
    const paymentHash = bytesFieldToHex(hashRaw);

    // Sanity check: verify SHA256(preimage) == paymentHash
    const crypto = await import('crypto');
    const computedHash = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
    if (computedHash !== paymentHash) {
      throw new Error(
        `Preimage verification failed: SHA256(preimage) does not match payment hash`,
      );
    }

    return {
      preimage,
      paymentHash,
      amountSats: parseInt(payment.value_sat ?? payment.valueSat ?? '0', 10),
      feeSats: parseInt(payment.fee_sat ?? payment.feeSat ?? '0', 10),
    };
  }

  async getBalance(): Promise<number> {
    const response = await this.fetchFn(`${this.url}/v1/balance/channels`, {
      method: 'GET',
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LND balance query failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      local_balance?: { sat?: string };
    };

    return parseInt(data.local_balance?.sat ?? '0', 10);
  }

  async getInfo(): Promise<NodeInfo> {
    const response = await this.fetchFn(`${this.url}/v1/getinfo`, {
      method: 'GET',
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LND getinfo failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      identity_pubkey?: string;
      alias?: string;
      num_active_channels?: number;
    };

    return {
      pubkey: data.identity_pubkey ?? '',
      alias: data.alias ?? '',
      numActiveChannels: data.num_active_channels ?? 0,
    };
  }
}

/** Shape of a payment result from LND v2/router/send (supports both casing conventions). */
interface LndPaymentResult {
  status?: string;
  payment_preimage?: string;
  paymentPreimage?: string;
  payment_hash?: string;
  paymentHash?: string;
  value_sat?: string;
  valueSat?: string;
  fee_sat?: string;
  feeSat?: string;
  failure_reason?: string;
}

/**
 * Normalize a bytes field from LND REST API to hex string.
 *
 * LND's REST API (grpc-gateway) encodes protobuf `bytes` fields as
 * either base64 (standard grpc-gateway) or hex (some LND versions,
 * especially via Umbrel/wrapper proxies). We detect the format:
 *
 * - If the string is valid hex (only [0-9a-fA-F]) and has the right
 *   length for 32 bytes (64 chars), treat it as hex.
 * - Otherwise, decode as base64 and convert to hex.
 */
function bytesFieldToHex(raw: string): string {
  if (!raw) return '';

  // Check if it's already a hex string (32 bytes = 64 hex chars)
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 64) {
    return raw.toLowerCase();
  }

  // Otherwise, decode as base64
  const bytes = Buffer.from(raw, 'base64');
  return bytes.toString('hex');
}
