import type { LnBackend, NodeInfo, PaymentResult } from '@/lib/bolt402';

/**
 * Mock Lightning backend for demo purposes.
 *
 * Simulates L402 payments without requiring a real Lightning node.
 * Returns realistic-looking (but fake) payment data so the full
 * protocol flow can be demonstrated.
 */
export class MockBackend implements LnBackend {
  private balance = 100_000;

  async payInvoice(bolt11: string, maxFeeSats: number): Promise<PaymentResult> {
    // Simulate payment latency
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const amountSats = 10 + Math.floor(Math.random() * 40);
    const feeSats = Math.min(1 + Math.floor(Math.random() * 3), maxFeeSats);
    this.balance -= amountSats + feeSats;

    return {
      preimage: 'mock_preimage_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10),
      paymentHash: 'mock_hash_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10),
      amountSats,
      feeSats,
    };
  }

  async getBalance(): Promise<number> {
    return this.balance;
  }

  async getInfo(): Promise<NodeInfo> {
    return {
      pubkey: '02mock' + '0'.repeat(60),
      alias: 'MockNode (Demo)',
      numActiveChannels: 3,
    };
  }
}
