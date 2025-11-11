/**
 * Common types used across service interfaces
 */

import { User, Credit, UsageHistory, Model, Subscription } from '@prisma/client';

// Re-export Prisma types for convenience
export type { User, Credit, UsageHistory, Model, Subscription };

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
