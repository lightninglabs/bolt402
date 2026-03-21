import { NextResponse } from 'next/server';
import { getSharedL402Client } from '@/lib/l402-shared';

/**
 * Returns all L402 payment receipts from the shared client.
 *
 * The spending dashboard polls this endpoint to stay in sync
 * with payments made via the chat agent or the l402-fetch route.
 */
export async function GET() {
  const client = getSharedL402Client();
  const receipts = client.getReceipts();
  const totalSpent = client.getTotalSpent();

  return NextResponse.json({
    totalSpentSats: totalSpent,
    paymentCount: receipts.length,
    receipts: receipts.map((r) => ({
      url: r.url,
      amountSats: r.amountSats,
      feeSats: r.feeSats,
      totalCostSats: r.totalCostSats,
      paymentHash: r.paymentHash,
      httpStatus: r.httpStatus,
      latencyMs: r.latencyMs,
      timestamp: r.timestamp,
    })),
  });
}
