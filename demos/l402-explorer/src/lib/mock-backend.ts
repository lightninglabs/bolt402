import { createHash, randomBytes } from 'crypto';
import type { LnBackend, NodeInfo, PaymentResult } from 'bolt402-ai-sdk';

/**
 * Mock Lightning backend for demo purposes.
 *
 * Simulates L402 payments without requiring a real Lightning node.
 * Generates cryptographically valid preimage/hash pairs so the
 * L402 token validation works correctly against servers that
 * verify SHA256(preimage) == payment_hash.
 *
 * NOTE: This mock does NOT actually pay the Lightning invoice.
 * It only works against mock L402 servers or services that skip
 * on-chain payment verification.
 */
export class MockBackend implements LnBackend {
  private balance = 100_000;

  async payInvoice(bolt11: string, maxFeeSats: number): Promise<PaymentResult> {
    // Simulate payment latency
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const amountSats = 10 + Math.floor(Math.random() * 40);
    const feeSats = Math.min(1 + Math.floor(Math.random() * 3), maxFeeSats);
    this.balance -= amountSats + feeSats;

    // Generate a valid preimage/hash pair: SHA256(preimage) == paymentHash
    const preimageBytes = randomBytes(32);
    const preimage = preimageBytes.toString('hex');
    const paymentHash = createHash('sha256').update(preimageBytes).digest('hex');

    return {
      preimage,
      paymentHash,
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
