/**
 * Common types used across service interfaces
 */

import type { users, user_credit_balance, token_usage_ledger, models, subscription_monetization } from '@prisma/client';

// Re-export Prisma types for convenience
export type { users as User, user_credit_balance as Credit, token_usage_ledger as UsageHistory, models as Model, subscription_monetization as Subscription };

// Common input types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}
