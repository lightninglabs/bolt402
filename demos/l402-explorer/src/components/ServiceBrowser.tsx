'use client';

import { useState, useMemo, useCallback } from 'react';
import type { L402Service, CategoryOption, SpendingEntry } from '@/lib/types';
import ServiceCard from './ServiceCard';
import ProtocolFlow from './ProtocolFlow';
import SpendingDashboard from './SpendingDashboard';

interface ServiceBrowserProps {
  initialServices: L402Service[];
  categories: CategoryOption[];
}

export default function ServiceBrowser({
  initialServices,
  categories,
}: ServiceBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<L402Service | null>(null);
  const [spending, setSpending] = useState<SpendingEntry[]>([]);

  const filteredServices = useMemo(() => {
    let filtered = initialServices;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) =>
        s.categories.some((c) => c.slug === selectedCategory),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [initialServices, selectedCategory, search]);

  const handleSpend = useCallback(
    (entry: {
      service: string;
      url: string;
      amountSats: number;
      feeSats: number;
      latencyMs: number;
      status: number;
    }) => {
      setSpending((prev) => [
        ...prev,
        { ...entry, timestamp: new Date().toISOString() },
      ]);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#F7931A]/50 focus:outline-none focus:ring-1 focus:ring-[#F7931A]/30 transition-colors"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-[#F7931A]/50 focus:outline-none focus:ring-1 focus:ring-[#F7931A]/30 transition-colors"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="text-xs text-zinc-500 shrink-0">
          {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Service grid */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={setSelectedService}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30 py-16 text-center">
          <span className="text-3xl mb-3">🔍</span>
          <p className="text-sm text-zinc-400">No services found</p>
          <p className="text-xs text-zinc-600 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Spending Dashboard */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          ⚡ Spending Dashboard
        </h2>
        <SpendingDashboard entries={spending} />
      </div>

      {/* Protocol Flow Modal */}
      {selectedService && (
        <ProtocolFlow
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSpend={handleSpend}
        />
      )}
    </div>
  );
}
