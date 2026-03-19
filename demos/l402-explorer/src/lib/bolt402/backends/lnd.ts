/**
 * LND REST API backend adapter.
 *
 * Connects to an LND node via its REST API for paying invoices
 * and querying node state.
 */

import type { LnBackend, NodeInfo, PaymentResult } from '../types';

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

    // v2/router/send returns newline-delimited JSON stream
    // The final message contains the payment result
    const text = await response.text();
    const lines = text.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const result = JSON.parse(lastLine) as {
      result?: {
        status?: string;
        payment_preimage?: string;
        payment_hash?: string;
        value_sat?: string;
        fee_sat?: string;
        failure_reason?: string;
      };
    };

    if (!result.result || result.result.status !== 'SUCCEEDED') {
      const reason = result.result?.failure_reason ?? 'unknown';
      throw new Error(`LND payment failed: ${reason}`);
    }

    const preimageBase64 = result.result.payment_preimage ?? '';
    const hashBase64 = result.result.payment_hash ?? '';

    return {
      preimage: base64ToHex(preimageBase64),
      paymentHash: base64ToHex(hashBase64),
      amountSats: parseInt(result.result.value_sat ?? '0', 10),
      feeSats: parseInt(result.result.fee_sat ?? '0', 10),
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

/** Convert a base64 string to hex. */
function base64ToHex(b64: string): string {
  if (!b64) return '';
  const bytes = Buffer.from(b64, 'base64');
  return bytes.toString('hex');
}
