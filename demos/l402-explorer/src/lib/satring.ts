import type { L402Service, CategoryOption } from './types';

const SATRING_API = process.env.SATRING_API_URL || 'https://satring.com/api/v1';

/** Fetch L402 services from satring.com. */
export async function fetchServices(
  category?: string,
  query?: string,
): Promise<L402Service[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (query) params.set('q', query);
  params.set('limit', '50');

  const url = query
    ? `${SATRING_API}/search?${params}`
    : `${SATRING_API}/services?${params}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Satring API error: ${res.status}`);

  const data = await res.json();
  return data.services ?? [];
}

/** Extract unique categories from services. */
export function extractCategories(services: L402Service[]): CategoryOption[] {
  const counts = new Map<string, { name: string; count: number }>();

  for (const svc of services) {
    for (const cat of svc.categories) {
      const existing = counts.get(cat.slug);
      if (existing) {
        existing.count++;
      } else {
        counts.set(cat.slug, { name: cat.name, count: 1 });
      }
    }
  }

  return Array.from(counts.entries())
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count);
}
