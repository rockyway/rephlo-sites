/**
 * Shared Tier Configuration Types (Plan 190)
 * Types for tier management, credit allocation configuration, and audit history
 *
 * IMPORTANT: All fields use camelCase for API responses.
 * Database uses snake_case - transformation happens in typeMappers.ts
 */

import { z } from 'zod';
import { SubscriptionTier } from './user.types';

// =============================================================================
// Tier Configuration
// =============================================================================

/**
 * Tier Configuration Interface
 * Represents subscription tier settings and credit allocations
 */
export interface TierConfig {
  id: string;
  tierName: SubscriptionTier;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  monthlyCreditAllocation: number;
  maxCreditRollover: number;
  features: Record<string, any>;
  isActive: boolean;

  // Version tracking (Plan 190)
  configVersion: number;
  lastModifiedBy: string | null;
  lastModifiedAt: string; // ISO 8601
  applyToExistingUsers: boolean;
  rolloutStartDate: string | null; // ISO 8601

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Tier Configuration History Interface
 * Audit trail for tier configuration changes
 */
export interface TierConfigHistory {
  id: string;
  tierConfigId: string;
  tierName: string;

  // Historical values
  previousCredits: number;
  newCredits: number;
  previousPriceUsd: number;
  newPriceUsd: number;

  // Change metadata
  changeReason: string;
  changeType: TierChangeType;
  affectedUsersCount: number;

  // Audit fields
  changedBy: string;
  changedAt: string; // ISO 8601
  appliedAt: string | null; // ISO 8601
}

/**
 * Tier Change Type Enum
 * Categories of tier configuration changes
 */
export enum TierChangeType {
  CREDIT_INCREASE = 'credit_increase',
  CREDIT_DECREASE = 'credit_decrease',
  PRICE_CHANGE = 'price_change',
  FEATURE_UPDATE = 'feature_update',
  ROLLOVER_CHANGE = 'rollover_change',
}

// =============================================================================
// Update Impact Interfaces
// =============================================================================

/**
 * Update Impact Preview
 * Shows what will happen before applying tier changes
 */
export interface UpdateImpact {
  tierName: string;
  currentCredits: number;
  newCredits: number;
  changeType: 'increase' | 'decrease' | 'no_change';
  affectedUsers: {
    total: number;
    willUpgrade: number;
    willRemainSame: number;
  };
  estimatedCostImpact: number; // USD difference
  breakdown: {
    costPerUser: number;
    totalCreditsAdded: number;
    dollarValueAdded: number;
  };
}

/**
 * Validation Result
 * Result of tier update validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Upgrade Result
 * Result of processing tier credit upgrades
 */
export interface UpgradeResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Update Tier Credits Request
 */
export interface UpdateTierCreditsRequest {
  newCredits: number;
  reason: string;
  applyToExistingUsers?: boolean;
  scheduledRolloutDate?: string; // ISO 8601, optional
}

/**
 * Update Tier Price Request
 */
export interface UpdateTierPriceRequest {
  newMonthlyPrice?: number;
  newAnnualPrice?: number;
  reason: string;
}

/**
 * Preview Update Request
 */
export interface PreviewUpdateRequest {
  newCredits?: number;
  newMonthlyPrice?: number;
  newAnnualPrice?: number;
  applyToExistingUsers?: boolean;
}

/**
 * Tier Config Update Response
 */
export interface TierConfigUpdateResponse {
  tierName: string;
  previousCredits: number;
  newCredits: number;
  configVersion: number;
  impact: UpdateImpact;
  rolloutScheduled: boolean;
  rolloutDate: string | null;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export const TierChangeTypeSchema = z.nativeEnum(TierChangeType);

export const TierConfigSchema = z.object({
  id: z.string().uuid(),
  tierName: z.nativeEnum(SubscriptionTier),
  monthlyPriceUsd: z.number().min(0),
  annualPriceUsd: z.number().min(0),
  monthlyCreditAllocation: z.number().int().min(0),
  maxCreditRollover: z.number().int().min(0),
  features: z.record(z.any()),
  isActive: z.boolean(),
  configVersion: z.number().int().min(1),
  lastModifiedBy: z.string().uuid().nullable(),
  lastModifiedAt: z.string().datetime(),
  applyToExistingUsers: z.boolean(),
  rolloutStartDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TierConfigHistorySchema = z.object({
  id: z.string().uuid(),
  tierConfigId: z.string().uuid(),
  tierName: z.string(),
  previousCredits: z.number().int().min(0),
  newCredits: z.number().int().min(0),
  previousPriceUsd: z.number().min(0),
  newPriceUsd: z.number().min(0),
  changeReason: z.string().min(10).max(500),
  changeType: TierChangeTypeSchema,
  affectedUsersCount: z.number().int().min(0),
  changedBy: z.string().uuid(),
  changedAt: z.string().datetime(),
  appliedAt: z.string().datetime().nullable(),
});

export const UpdateTierCreditsRequestSchema = z.object({
  newCredits: z
    .number()
    .int()
    .min(100, 'Minimum 100 credits required')
    .max(1000000, 'Maximum 1,000,000 credits allowed')
    .multipleOf(100, 'Credits must be in increments of 100'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
  applyToExistingUsers: z.boolean().optional().default(false),
  scheduledRolloutDate: z.string().datetime().optional(),
});

export const UpdateTierPriceRequestSchema = z.object({
  newMonthlyPrice: z.number().min(0).optional(),
  newAnnualPrice: z.number().min(0).optional(),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
});

export const PreviewUpdateRequestSchema = z.object({
  newCredits: z.number().int().min(0).optional(),
  newMonthlyPrice: z.number().min(0).optional(),
  newAnnualPrice: z.number().min(0).optional(),
  applyToExistingUsers: z.boolean().optional().default(false),
});
