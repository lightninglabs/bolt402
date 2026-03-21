/**
 * Shared L402 client singleton.
 *
 * Both the chat route and the l402-fetch route use this so that receipts
 * accumulate in a single place and can be queried via /api/l402-receipts.
 */

import {
  L402Client,
  LndBackend,
  SwissKnifeBackend,
  type LnBackend,
} from 'bolt402-ai-sdk';
import { MockBackend } from '@/lib/mock-backend';

function createBackend(): LnBackend {
  const backendType = process.env.BACKEND_TYPE || 'mock';

  if (backendType === 'lnd' && process.env.LND_URL && process.env.LND_MACAROON) {
    return new LndBackend({
      url: process.env.LND_URL,
      macaroon: process.env.LND_MACAROON,
    });
  }

  if (
    backendType === 'swissknife' &&
    process.env.SWISSKNIFE_URL &&
    process.env.SWISSKNIFE_API_KEY
  ) {
    return new SwissKnifeBackend({
      url: process.env.SWISSKNIFE_URL,
      apiKey: process.env.SWISSKNIFE_API_KEY,
    });
  }

  return new MockBackend();
}

let sharedClient: L402Client | null = null;
let sharedBackend: LnBackend | null = null;

/** Get the shared L402 client (creates on first call). */
export function getSharedL402Client(): L402Client {
  if (!sharedClient) {
    sharedBackend = createBackend();
    sharedClient = new L402Client({
      backend: sharedBackend,
      budget: { perRequestMax: 1000, dailyMax: 50000 },
      maxFeeSats: 100,
    });
  }
  return sharedClient;
}

/** Get the shared Lightning backend. */
export function getSharedBackend(): LnBackend {
  if (!sharedBackend) {
    getSharedL402Client(); // initializes both
  }
  return sharedBackend!;
}
