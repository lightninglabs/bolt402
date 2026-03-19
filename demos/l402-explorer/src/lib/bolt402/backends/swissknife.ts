/**
 * SwissKnife REST API backend adapter.
 *
 * Connects to a Numeraire SwissKnife instance for paying invoices
 * and querying wallet state.
 */

import type { LnBackend, NodeInfo, PaymentResult } from '../types';

/** Configuration for the SwissKnife REST backend. */
export interface SwissKnifeBackendConfig {
  /** SwissKnife API URL (e.g., 'https://app.numeraire.tech'). */
  url: string;
  /** API key for authentication. */
  apiKey: string;
  /** Custom fetch function (for testing or custom HTTP handling). */
  fetchFn?: typeof fetch;
}

/**
 * SwissKnife REST API backend.
 *
 * Uses the Numeraire SwissKnife API for Lightning payments.
 * See: https://github.com/bitcoin-numeraire/swissknife
 */
export class SwissKnifeBackend implements LnBackend {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: SwissKnifeBackendConfig) {
    this.url = config.url.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async payInvoice(bolt11: string, maxFeeSats: number): Promise<PaymentResult> {
    const response = await this.fetchFn(`${this.url}/api/v1/payments/bolt11`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: bolt11,
        max_fee_sats: maxFeeSats,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SwissKnife payment failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      payment_preimage?: string;
      payment_hash?: string;
      amount_sats?: number;
      fee_sats?: number;
    };

    return {
      preimage: data.payment_preimage ?? '',
      paymentHash: data.payment_hash ?? '',
      amountSats: data.amount_sats ?? 0,
      feeSats: data.fee_sats ?? 0,
    };
  }

  async getBalance(): Promise<number> {
    const response = await this.fetchFn(`${this.url}/api/v1/balance`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SwissKnife balance query failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      balance_sats?: number;
    };

    return data.balance_sats ?? 0;
  }

  async getInfo(): Promise<NodeInfo> {
    const response = await this.fetchFn(`${this.url}/api/v1/info`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SwissKnife info query failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      pubkey?: string;
      alias?: string;
      num_active_channels?: number;
    };

    return {
      pubkey: data.pubkey ?? '',
      alias: data.alias ?? '',
      numActiveChannels: data.num_active_channels ?? 0,
    };
  }
}
