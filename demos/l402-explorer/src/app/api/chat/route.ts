import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { xai } from '@ai-sdk/xai';
import {
  createBolt402Tools,
  LndBackend,
  SwissKnifeBackend,
  type LnBackend,
} from '@/lib/bolt402';
import { MockBackend } from '@/lib/mock-backend';

type Provider = 'openai' | 'anthropic' | 'xai';

function detectProvider(): { provider: Provider; model: string; apiKeySet: boolean } {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    return {
      provider: 'anthropic',
      model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
      apiKeySet: true,
    };
  }
  if (process.env.XAI_API_KEY) {
    return {
      provider: 'xai',
      model: process.env.AI_MODEL || 'grok-3-mini',
      apiKeySet: true,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
      apiKeySet: true,
    };
  }
  return { provider: 'openai', model: 'gpt-4o', apiKeySet: false };
}

function createModel(provider: Provider, model: string) {
  switch (provider) {
    case 'anthropic': {
      // Support both standard API keys (ANTHROPIC_API_KEY) and OAuth tokens
      // (ANTHROPIC_AUTH_TOKEN) from `claude setup-token`. OAuth tokens require
      // the oauth beta header.
      const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
      if (authToken) {
        const provider = createAnthropic({
          authToken,
          headers: { 'anthropic-beta': 'oauth-2025-04-20' },
        });
        return provider(model);
      }
      return anthropic(model);
    }
    case 'xai':
      return xai(model);
    case 'openai':
    default:
      return openai(model);
  }
}

function getConfig() {
  const backendType = process.env.BACKEND_TYPE || 'mock';
  const { provider, model, apiKeySet } = detectProvider();
  const lndUrl = process.env.LND_URL || '(not set)';
  const swissKnifeUrl = process.env.SWISSKNIFE_URL || '(not set)';
  const satringUrl = process.env.SATRING_API_URL || 'https://satring.com/api/v1';

  return { backendType, provider, model, apiKeySet, lndUrl, swissKnifeUrl, satringUrl };
}

function createBackend(): LnBackend {
  const { backendType } = getConfig();

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

// Well-known L402 API endpoint mappings for services where the satring URL
// is just the base URL and the AI needs to know specific endpoints.
const ENDPOINT_HINTS: Record<string, string> = {
  'https://oracle.neofreight.net': [
    'GET /api/price — BTC/USD price with Nostr-signed attestation',
    'GET /api/fees — Current mempool fee estimates (1/3/6/144 blocks)',
    'GET /api/blockheight — Current Bitcoin block height',
    'GET /api/verify?q=<txid|address|bolt11> — Verify transaction, address, or invoice',
  ].join('\n    '),
  'https://l402.services': [
    'GET /geoip/<ip> — IP geolocation (1 sat/10min)',
    'GET /ln/node/<pubkey> — Lightning node info (10 sats/min)',
    'GET /ln/health/<pubkey> — Node health score (15 sats/min)',
    'GET /ln/fees — Network fee statistics (25 sats/min)',
    'GET /predictions/signals — Polymarket prediction signals (10 sats/min)',
    'GET /predictions/oracle — AI-analyzed prediction data (250 sats)',
  ].join('\n    '),
  'https://l402.directory': [
    'GET /api/services — Browse all L402 services (free)',
    'GET /api/report/<service_id> — Detailed health report (10 sats)',
  ].join('\n    '),
};

function buildSystemPrompt(services: Array<{ name: string; url: string; description: string; pricing_sats: number; pricing_model: string; categories: Array<{ name: string }> }>) {
  const serviceList = services
    .map((s) => {
      const baseUrl = s.url.replace(/\/$/, '');
      // Check for endpoint hints by matching the base URL
      const hintKey = Object.keys(ENDPOINT_HINTS).find((k) => baseUrl.startsWith(k));
      const endpoints = hintKey ? `\n  Endpoints:\n    ${ENDPOINT_HINTS[hintKey]}` : '';

      return `- **${s.name}**: ${s.description}\n  URL: ${s.url}\n  Price: ${s.pricing_sats} sats/${s.pricing_model.replace('per-', '')}\n  Categories: ${s.categories.map((c) => c.name).join(', ')}${endpoints}`;
    })
    .join('\n');

  return `You are an AI research assistant powered by bolt402. You have access to L402-gated APIs that you can query by paying with Lightning Network micropayments.

Available L402 services:
${serviceList || 'No services currently loaded.'}

When a user asks a question:
1. Identify which L402 API(s) can answer it
2. Use the l402_fetch tool to call the specific API endpoint URL (not just the base URL)
3. Present the data clearly and in a well-formatted way
4. Report which APIs you used, their cost in sats, and response latency

IMPORTANT: Many services list a base URL. You must call the specific endpoint path, not the base URL.
For example, call https://oracle.neofreight.net/api/price, NOT https://oracle.neofreight.net.

If no API can answer the question, explain what services are available and what they can do.
Always mention the cost of each API call to keep the user informed about spending.

When presenting data, use markdown formatting for clarity. If you receive JSON data, extract the key information and present it in a human-readable format.`;
}

export async function POST(req: Request) {
  const config = getConfig();

  console.log('[bolt402-chat]', {
    provider: config.provider,
    model: config.model,
    backend: config.backendType,
    apiKeySet: config.apiKeySet,
    lndUrl: config.backendType === 'lnd' ? config.lndUrl : undefined,
    swissKnifeUrl: config.backendType === 'swissknife' ? config.swissKnifeUrl : undefined,
    satringApi: config.satringUrl,
  });

  if (!config.apiKeySet) {
    return new Response(
      JSON.stringify({
        error: 'No AI provider API key set. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or XAI_API_KEY to .env.local.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { messages, services } = await req.json();

    const backend = createBackend();
    const tools = createBolt402Tools({
      backend,
      budget: { perRequestMax: 1000, dailyMax: 50000 },
      maxFeeSats: 100,
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: createModel(config.provider, config.model),
      system: buildSystemPrompt(services || []),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      onError({ error }) {
        console.error('[bolt402-chat] Stream error:', error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[bolt402-chat] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
