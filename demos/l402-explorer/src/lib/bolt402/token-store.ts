/**
 * In-memory LRU token store.
 *
 * Caches L402 tokens keyed by endpoint URL. Uses a simple Map with
 * LRU eviction when the capacity is reached.
 */

import type { CachedToken, TokenStore } from './types';

/** In-memory token store with LRU eviction. */
export class InMemoryTokenStore implements TokenStore {
  private readonly cache: Map<string, CachedToken>;
  private readonly capacity: number;

  /**
   * Create a new in-memory token store.
   * @param capacity Maximum number of tokens to cache. Default: 1000.
   */
  constructor(capacity = 1000) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  async get(endpoint: string): Promise<CachedToken | null> {
    const token = this.cache.get(endpoint);
    if (!token) return null;

    // Move to end (most recently used)
    this.cache.delete(endpoint);
    this.cache.set(endpoint, token);

    return token;
  }

  async put(endpoint: string, macaroon: string, preimage: string): Promise<void> {
    // Remove if exists (to update position)
    this.cache.delete(endpoint);

    // Evict oldest if at capacity
    if (this.cache.size >= this.capacity) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }

    this.cache.set(endpoint, { macaroon, preimage });
  }

  async remove(endpoint: string): Promise<void> {
    this.cache.delete(endpoint);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /** Get the current number of cached tokens. */
  get size(): number {
    return this.cache.size;
  }
}
