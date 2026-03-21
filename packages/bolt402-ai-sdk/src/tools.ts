/**
 * Vercel AI SDK tool definitions for L402 payments.
 *
 * Provides `createBolt402Tools()` which returns a set of tools that can be
 * passed directly to the Vercel AI SDK's `generateText` or `streamText`.
 *
 * @example
 * ```typescript
 * import { createBolt402Tools } from 'bolt402-ai-sdk';
 * import { LndBackend } from 'bolt402-ai-sdk/backends';
 * import { generateText } from 'ai';
 *
 * const tools = createBolt402Tools({
 *   backend: new LndBackend({ url: 'https://localhost:8080', macaroon: '...' }),
 *   budget: { perRequestMax: 1000 },
 * });
 *
 * const result = await generateText({
 *   model: openai('gpt-4o'),
 *   tools,
 *   prompt: 'Fetch data from https://api.example.com/paid-endpoint',
 * });
 * ```
 */

import { tool } from 'ai';
import { z } from 'zod';

import { L402Client } from './l402-client.js';
import { InMemoryTokenStore } from './token-store.js';
import type { Budget, L402ClientConfig, LnBackend, TokenStore } from './types.js';

/** Configuration for creating bolt402 AI SDK tools. */
export interface Bolt402ToolsConfig {
  /** Lightning backend for paying invoices. */
  backend: LnBackend;
  /** Token store for caching L402 credentials. Optional, defaults to in-memory. */
  tokenStore?: TokenStore;
  /** Budget limits for spending control. Optional, defaults to unlimited. */
  budget?: Budget;
  /** Maximum routing fee in satoshis. Default: 100. */
  maxFeeSats?: number;
  /** Custom fetch function (for testing). */
  fetchFn?: typeof fetch;
  /** Use an existing L402Client instead of creating a new one. When provided, backend/tokenStore/budget/maxFeeSats/fetchFn are ignored. */
  client?: L402Client;
}

/**
 * Create Vercel AI SDK tools for L402 Lightning payments.
 *
 * Returns an object with tools that can be spread into the `tools` parameter
 * of `generateText` or `streamText`.
 *
 * Tools provided:
 * - `l402_fetch`: Fetch a URL, automatically paying L402 challenges
 * - `l402_get_balance`: Check Lightning node balance
 * - `l402_get_receipts`: Get payment receipts for cost tracking
 */
export function createBolt402Tools(config: Bolt402ToolsConfig) {
  const client = config.client ?? new L402Client({
    backend: config.backend,
    tokenStore: config.tokenStore ?? new InMemoryTokenStore(),
    budget: config.budget,
    maxFeeSats: config.maxFeeSats,
    fetchFn: config.fetchFn,
  });
  const backend = config.client ? config.client.getBackend() : config.backend;

  return {
    l402_fetch: tool({
      description:
        'Fetch a URL, automatically paying Lightning invoices for L402-gated APIs. ' +
        'When the server requires payment (HTTP 402), this tool pays the Lightning invoice, ' +
        'caches the token, and retries the request. Returns the response body and payment ' +
        'receipt if a payment was made. Use this for any API that requires L402 authentication.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL to fetch'),
        method: z
          .enum(['GET', 'POST', 'PUT', 'DELETE'])
          .default('GET')
          .describe('HTTP method to use'),
        body: z
          .string()
          .optional()
          .describe('Request body (for POST/PUT requests). Should be JSON-encoded.'),
        headers: z
          .record(z.string())
          .optional()
          .describe('Additional HTTP headers to include in the request'),
      }),
      execute: async ({ url, method, body, headers }) => {
        const response = await client.fetch(url, { method, body, headers });

        return {
          status: response.status,
          body: response.body,
          paid: response.paid,
          receipt: response.receipt
            ? {
                amountSats: response.receipt.amountSats,
                feeSats: response.receipt.feeSats,
                totalCostSats: response.receipt.totalCostSats,
                paymentHash: response.receipt.paymentHash,
                latencyMs: response.receipt.latencyMs,
              }
            : null,
        };
      },
    }),

    l402_get_balance: tool({
      description:
        'Get the current Lightning node balance in satoshis. ' +
        'Use this to check available funds before making L402 payments.',
      inputSchema: z.object({}),
      execute: async () => {
        const balance = await backend.getBalance();
        const info = await backend.getInfo();
        return {
          balanceSats: balance,
          nodeAlias: info.alias,
          activeChannels: info.numActiveChannels,
        };
      },
    }),

    l402_get_receipts: tool({
      description:
        'Get all L402 payment receipts from this session. ' +
        'Useful for tracking costs, auditing payments, and reporting spend to the user.',
      inputSchema: z.object({}),
      execute: async () => {
        const receipts = client.getReceipts();
        const totalSpent = client.getTotalSpent();
        return {
          totalSpentSats: totalSpent,
          paymentCount: receipts.length,
          receipts: receipts.map((r) => ({
            url: r.url,
            amountSats: r.amountSats,
            feeSats: r.feeSats,
            totalCostSats: r.totalCostSats,
            httpStatus: r.httpStatus,
            latencyMs: r.latencyMs,
            timestamp: r.timestamp,
          })),
        };
      },
    }),
  };
}
