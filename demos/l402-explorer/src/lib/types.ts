/** A service from the satring.com directory. */
export interface L402Service {
  id: number;
  name: string;
  slug: string;
  url: string;
  description: string;
  pricing_sats: number;
  pricing_model: string;
  protocol: string;
  owner_name: string;
  avg_rating: number;
  rating_count: number;
  domain_verified: boolean;
  categories: { id: number; name: string; slug: string; description: string }[];
  created_at: string;
}

/** Response from satring.com API. */
export interface SatringResponse {
  services: L402Service[];
}

/** The step-by-step protocol flow for display. */
export interface ProtocolStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  detail?: string;
}

/** Result of an L402 fetch operation. */
export interface FetchResult {
  url: string;
  status: number;
  body: string;
  paid: boolean;
  receipt: {
    amountSats: number;
    feeSats: number;
    totalCostSats: number;
    paymentHash: string;
    latencyMs: number;
  } | null;
  error?: string;
}

/** A receipt for the spending dashboard. */
export interface SpendingEntry {
  url: string;
  service: string;
  amountSats: number;
  feeSats: number;
  timestamp: string;
  status: number;
  latencyMs: number;
}

/** Category filter option. */
export interface CategoryOption {
  slug: string;
  name: string;
  count: number;
}
