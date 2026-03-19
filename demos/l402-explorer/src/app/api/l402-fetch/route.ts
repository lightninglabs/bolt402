import { NextRequest, NextResponse } from 'next/server';

/**
 * API route that proxies L402 requests through the server.
 *
 * The browser can't talk to LND directly (gRPC/macaroon auth),
 * so this route handles the L402 flow server-side and returns results.
 *
 * In a real deployment, this would use bolt402-ai-sdk with a configured
 * LND or SwissKnife backend. For the demo, we simulate the protocol
 * flow with the mock server or forward to real L402 endpoints.
 */
export async function POST(req: NextRequest) {
  try {
    const { url, method = 'GET' } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const startTime = Date.now();

    // Step 1: Make the initial request
    const initialRes = await fetch(url, {
      method,
      headers: { 'User-Agent': 'bolt402-l402-explorer/0.1.0' },
    });

    // If not 402, return directly
    if (initialRes.status !== 402) {
      const body = await initialRes.text();
      return NextResponse.json({
        url,
        status: initialRes.status,
        body,
        paid: false,
        receipt: null,
        steps: [
          {
            id: 'request',
            label: 'HTTP Request',
            status: 'complete',
            detail: `${method} ${url}`,
          },
          {
            id: 'response',
            label: 'Response',
            status: 'complete',
            detail: `${initialRes.status} — no payment required`,
          },
        ],
      });
    }

    // Step 2: Parse the L402 challenge
    const wwwAuth = initialRes.headers.get('www-authenticate');
    if (!wwwAuth) {
      return NextResponse.json({
        url,
        status: 402,
        body: 'Server returned 402 but no WWW-Authenticate header',
        paid: false,
        receipt: null,
        error: 'Missing WWW-Authenticate header',
        steps: [
          { id: 'request', label: 'HTTP Request', status: 'complete', detail: `${method} ${url}` },
          { id: 'challenge', label: '402 Challenge', status: 'error', detail: 'No WWW-Authenticate header' },
        ],
      });
    }

    const macaroonMatch = /macaroon="([^"]+)"/.exec(wwwAuth);
    const invoiceMatch = /invoice="([^"]+)"/.exec(wwwAuth);

    if (!macaroonMatch || !invoiceMatch) {
      return NextResponse.json({
        url,
        status: 402,
        body: 'Failed to parse L402 challenge',
        paid: false,
        receipt: null,
        error: `Unparseable challenge: ${wwwAuth.substring(0, 100)}`,
        steps: [
          { id: 'request', label: 'HTTP Request', status: 'complete', detail: `${method} ${url}` },
          { id: 'challenge', label: '402 Challenge', status: 'error', detail: 'Malformed challenge header' },
        ],
      });
    }

    const macaroon = macaroonMatch[1];
    const invoice = invoiceMatch[1];

    // Step 3: Pay the invoice via configured backend
    // TODO: Integrate bolt402-ai-sdk with real LND/SwissKnife backend
    // For now, return the challenge details so the frontend can visualize the flow
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      url,
      status: 402,
      body: 'Payment required — backend not configured',
      paid: false,
      receipt: null,
      challenge: {
        macaroon: macaroon.substring(0, 20) + '...',
        invoice: invoice.substring(0, 40) + '...',
        invoiceFull: invoice,
      },
      steps: [
        { id: 'request', label: 'HTTP Request', status: 'complete', detail: `${method} ${url}` },
        {
          id: 'challenge',
          label: '402 Payment Required',
          status: 'complete',
          detail: `Invoice: ${invoice.substring(0, 30)}...`,
        },
        {
          id: 'payment',
          label: 'Lightning Payment',
          status: 'pending',
          detail: 'Configure LND or SwissKnife backend to enable payments',
        },
      ],
      latencyMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
