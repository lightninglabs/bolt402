/**
 * AI Agent Example — bolt402-ai-sdk + Vercel AI SDK
 *
 * Demonstrates an AI agent that can autonomously pay for L402-gated APIs.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... LND_URL=https://... LND_MACAROON=... npx tsx index.ts
 */

import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createBolt402Tools, LndBackend } from 'bolt402-ai-sdk';

async function main() {
  console.log('bolt402 AI Agent Example');
  console.log('========================\n');

  // Step 1: Configure the Lightning backend
  const backend = new LndBackend({
    url: process.env.LND_URL ?? 'https://localhost:8080',
    macaroon: process.env.LND_MACAROON ?? '',
  });

  // Step 2: Create tools with budget limits
  const tools = createBolt402Tools({
    backend,
    budget: {
      perRequestMax: 1_000,  // Max 1,000 sats per request
      dailyMax: 10_000,      // Max 10,000 sats per day
    },
  });

  console.log('Lightning backend configured');
  console.log('Budget: max 1,000 sats/request, 10,000 sats/day\n');

  // Step 3: Run the agent
  const prompt =
    'Fetch the premium weather data from https://api.example.com/v1/weather. ' +
    'If the API requires payment, pay for it. ' +
    'After fetching, tell me the total cost.';

  console.log(`Prompt: ${prompt}\n`);
  console.log('Running agent...\n');

  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      tools,
      stopWhen: stepCountIs(5),
      prompt,
    });

    console.log('Agent response:');
    console.log(result.text);
    console.log();

    // Step 4: Show tool usage
    if (result.steps.length > 0) {
      console.log('Tool calls made:');
      for (const step of result.steps) {
        for (const call of step.toolCalls) {
          console.log(`  - ${call.toolName}(${JSON.stringify(call.args)})`);
        }
      }
    }
  } catch (error) {
    console.error('Agent error:', error);
  }
}

main().catch(console.error);
