/**
 * Budget tracker for L402 payments.
 *
 * Enforces per-request, hourly, daily, and total spending limits.
 * Mirrors the Rust bolt402-core BudgetTracker.
 */

import type { Budget } from './types';

/** Error thrown when a budget limit is exceeded. */
export class BudgetExceededError extends Error {
  constructor(
    public readonly limit: string,
    public readonly current: number,
    public readonly max: number,
  ) {
    super(`Budget exceeded: ${limit} (${current} >= ${max} sats)`);
    this.name = 'BudgetExceededError';
  }
}

interface TimestampedPayment {
  amountSats: number;
  timestamp: number;
}

/** Tracks spending against configured budget limits. */
export class BudgetTracker {
  private readonly budget: Required<Budget>;
  private readonly payments: TimestampedPayment[] = [];
  private totalSpent = 0;

  constructor(budget: Budget = {}) {
    this.budget = {
      perRequestMax: budget.perRequestMax ?? Infinity,
      hourlyMax: budget.hourlyMax ?? Infinity,
      dailyMax: budget.dailyMax ?? Infinity,
      totalMax: budget.totalMax ?? Infinity,
    };
  }

  /**
   * Check if a payment of the given amount is allowed, and record it.
   * @throws {BudgetExceededError} if the payment would exceed any limit.
   */
  checkAndRecord(amountSats: number): void {
    // Per-request check
    if (amountSats > this.budget.perRequestMax) {
      throw new BudgetExceededError('per-request', amountSats, this.budget.perRequestMax);
    }

    const now = Date.now();

    // Hourly check
    if (this.budget.hourlyMax !== Infinity) {
      const oneHourAgo = now - 3_600_000;
      const hourlySpent = this.payments
        .filter((p) => p.timestamp > oneHourAgo)
        .reduce((sum, p) => sum + p.amountSats, 0);
      if (hourlySpent + amountSats > this.budget.hourlyMax) {
        throw new BudgetExceededError('hourly', hourlySpent + amountSats, this.budget.hourlyMax);
      }
    }

    // Daily check
    if (this.budget.dailyMax !== Infinity) {
      const oneDayAgo = now - 86_400_000;
      const dailySpent = this.payments
        .filter((p) => p.timestamp > oneDayAgo)
        .reduce((sum, p) => sum + p.amountSats, 0);
      if (dailySpent + amountSats > this.budget.dailyMax) {
        throw new BudgetExceededError('daily', dailySpent + amountSats, this.budget.dailyMax);
      }
    }

    // Total check
    if (this.totalSpent + amountSats > this.budget.totalMax) {
      throw new BudgetExceededError('total', this.totalSpent + amountSats, this.budget.totalMax);
    }

    // Record the payment
    this.payments.push({ amountSats, timestamp: now });
    this.totalSpent += amountSats;
  }

  /** Get the total amount spent across all payments. */
  getTotalSpent(): number {
    return this.totalSpent;
  }

  /** Get the number of payments recorded. */
  getPaymentCount(): number {
    return this.payments.length;
  }
}
