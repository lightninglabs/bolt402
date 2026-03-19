'use client';

import type { SpendingEntry } from '@/lib/types';

interface SpendingDashboardProps {
  entries: SpendingEntry[];
}

export default function SpendingDashboard({ entries }: SpendingDashboardProps) {
  const totalSats = entries.reduce((sum, e) => sum + e.amountSats + e.feeSats, 0);
  const avgLatency =
    entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.latencyMs, 0) / entries.length)
      : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-semibold text-[#F7931A] font-mono">
            {totalSats.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            Sats Spent
          </div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-semibold text-zinc-100 font-mono">
            {entries.length}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            Requests
          </div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-semibold text-zinc-100 font-mono">
            {avgLatency}ms
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            Avg Latency
          </div>
        </div>
      </div>

      {/* Receipts list */}
      <div className="max-h-64 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-zinc-600">
            No requests yet. Click a service and run the protocol flow.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {entries
              .slice()
              .reverse()
              .map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-zinc-200 font-medium truncate">
                      {entry.service}
                    </span>
                    <span className="text-zinc-600 font-mono text-[10px] truncate">
                      {entry.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="font-mono text-zinc-400">
                      {entry.latencyMs}ms
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        entry.status < 400
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : entry.status === 402
                            ? 'bg-[#F7931A]/10 text-[#F7931A]'
                            : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="font-mono text-[#F7931A]">
                      {entry.amountSats > 0 ? `${entry.amountSats} sats` : '—'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
