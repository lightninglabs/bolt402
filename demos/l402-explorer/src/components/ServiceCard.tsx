'use client';

import type { L402Service } from '@/lib/types';

interface ServiceCardProps {
  service: L402Service;
  onSelect: (service: L402Service) => void;
}

export default function ServiceCard({ service, onSelect }: ServiceCardProps) {
  const truncatedDesc =
    service.description.length > 120
      ? service.description.slice(0, 120) + '…'
      : service.description;

  return (
    <button
      onClick={() => onSelect(service)}
      className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all hover:border-[#F7931A]/40 hover:bg-zinc-900 hover:shadow-[0_0_24px_rgba(247,147,26,0.06)] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-[#F7931A] transition-colors leading-tight">
          {service.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {service.domain_verified && (
            <span title="Domain verified" className="text-emerald-400 text-xs">
              ✓
            </span>
          )}
          <span className="rounded-full bg-[#F7931A]/10 px-2 py-0.5 text-[10px] font-medium text-[#F7931A] uppercase tracking-wider">
            {service.protocol}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-zinc-400 flex-1">
        {truncatedDesc}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {service.categories.slice(0, 3).map((cat) => (
            <span
              key={cat.slug}
              className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
            >
              {cat.name}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-[#F7931A]">⚡</span>
          <span className="text-zinc-300">{service.pricing_sats} sats</span>
          <span className="text-zinc-600">/{service.pricing_model.replace('per-', '')}</span>
        </div>
      </div>

      {/* Owner */}
      <div className="text-[10px] text-zinc-600">
        by {service.owner_name}
      </div>
    </button>
  );
}
