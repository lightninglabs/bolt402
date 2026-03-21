'use client';

import { useState, useCallback } from 'react';
import type { L402Service } from '@/lib/types';

interface FlowStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
}

interface ProtocolFlowProps {
  service: L402Service;
  onClose: () => void;
}

const INITIAL_STEPS: FlowStep[] = [
  { id: 'request', label: 'Initial Request', status: 'pending', detail: 'Sending HTTP request to service endpoint' },
  { id: 'challenge', label: '402 Challenge', status: 'pending', detail: 'Server responds with payment challenge' },
  { id: 'payment', label: 'Lightning Payment', status: 'pending', detail: 'Pay the Lightning invoice' },
  { id: 'retry', label: 'Retry with Token', status: 'pending', detail: 'Re-send request with L402 authorization' },
  { id: 'response', label: 'Response Data', status: 'pending', detail: 'Receive the paid content' },
];

export default function ProtocolFlow({ service, onClose }: ProtocolFlowProps) {
  const [steps, setSteps] = useState<FlowStep[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [responseBody, setResponseBody] = useState<string | null>(null);

  const runFlow = useCallback(async () => {
    setRunning(true);
    setSteps(INITIAL_STEPS);
    setResponseBody(null);

    // Step 1: Initial Request — activate
    setSteps((s) =>
      s.map((step) =>
        step.id === 'request' ? { ...step, status: 'active' } : step,
      ),
    );
    await new Promise((r) => setTimeout(r, 600));

    try {
      const res = await fetch('/api/l402-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: service.url }),
      });

      const data = await res.json();

      // Mark request complete
      setSteps((s) =>
        s.map((step) =>
          step.id === 'request'
            ? { ...step, status: 'complete', detail: `GET ${service.url}` }
            : step,
        ),
      );
      await new Promise((r) => setTimeout(r, 400));

      if (data.error) {
        // Server-side error (network, parse, etc.)
        setSteps((s) =>
          s.map((step) => {
            const serverStep = data.steps?.find((ds: FlowStep) => ds.id === step.id);
            return serverStep || step;
          }),
        );
      } else if (data.steps) {
        // Server returned completed steps — use them directly
        setSteps(data.steps.map((s: FlowStep) => ({
          id: s.id,
          label: s.label,
          status: s.status as FlowStep['status'],
          detail: s.detail,
        })));

        if (data.body) {
          setResponseBody(typeof data.body === 'string' ? data.body.slice(0, 2000) : JSON.stringify(data.body).slice(0, 2000));
        }
      }
    } catch (err) {
      setSteps((s) =>
        s.map((step) =>
          step.id === 'request'
            ? { ...step, status: 'error', detail: err instanceof Error ? err.message : 'Network error' }
            : step,
        ),
      );
    }

    setRunning(false);
  }, [service]);

  const statusColor = (status: FlowStep['status']) => {
    switch (status) {
      case 'complete': return 'bg-emerald-500';
      case 'active': return 'bg-[#F7931A] animate-step-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-zinc-700';
    }
  };

  const statusBorder = (status: FlowStep['status']) => {
    switch (status) {
      case 'complete': return 'border-emerald-500/30';
      case 'active': return 'border-[#F7931A]/30';
      case 'error': return 'border-red-500/30';
      default: return 'border-zinc-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              ⚡ Protocol Flow
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">{service.name} — {service.url}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {steps.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${statusBorder(step.status)}`}>
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div className={`h-2.5 w-2.5 rounded-full ${statusColor(step.status)} shrink-0`} />
                {i < steps.length - 1 && (
                  <div className="w-px h-4 bg-zinc-800" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{step.label}</span>
                  {step.status === 'complete' && <span className="text-emerald-400 text-xs">✓</span>}
                  {step.status === 'error' && <span className="text-red-400 text-xs">✗</span>}
                </div>
                {step.detail && (
                  <p className="mt-0.5 text-xs text-zinc-500 font-mono break-all whitespace-pre-wrap">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Response preview */}
        {responseBody && (
          <div className="mx-6 mb-4 rounded-lg bg-zinc-900 border border-zinc-800 p-4">
            <h3 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
              Response Preview
            </h3>
            <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(responseBody), null, 2);
                } catch {
                  return responseBody;
                }
              })()}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={runFlow}
            disabled={running}
            className="flex items-center gap-2 rounded-lg bg-[#F7931A] px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-[#F7931A]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                </svg>
                Running…
              </>
            ) : (
              <>⚡ Run Flow</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
