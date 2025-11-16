/**
 * Common types used across service interfaces
 */

import type { users, credit_balance, token_usage, model, subscription_monetization } from '@prisma/client';

// Re-export Prisma types for convenience
export type { users as User, credit_balance as Credit, token_usage as UsageHistory, model as Model, subscription_monetization as Subscription };

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
