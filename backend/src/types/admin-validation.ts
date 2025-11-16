/**
 * Admin API Validation Types
 *
 * Zod schemas and TypeScript types for admin model tier management endpoints.
 * Used for request validation and type safety.
 */

import { z } from 'zod';
import type { SubscriptionTier } from '@prisma/client';

// =============================================================================
// Request Validation Schemas
// =============================================================================

/**
 * Schema for updating a single model's tier configuration
 */
export const updateModelTierSchema = z.object({
  requiredTier: z.nativeEnum(SubscriptionTier).optional(),
  tierRestrictionMode: z.enum(['minimum', 'exact', 'whitelist']).optional(),
  allowedTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  reason: z.string().max(500).optional(),
});

export type UpdateModelTierRequest = z.infer<typeof updateModelTierSchema>;

/**
 * Schema for bulk updating model tiers
 */
export const bulkUpdateTiersSchema = z.object({
  updates: z
    .array(
      z.object({
        modelId: z.string().min(1, 'Model ID is required'),
        requiredTier: z.nativeEnum(SubscriptionTier).optional(),
        tierRestrictionMode: z.enum(['minimum', 'exact', 'whitelist']).optional(),
        allowedTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
      })
    )
    .min(1, 'At least one model update is required')
    .max(50, 'Cannot update more than 50 models at once'),
  reason: z.string().max(500).optional(),
});

export type BulkUpdateTiersRequest = z.infer<typeof bulkUpdateTiersSchema>;

/**
 * Schema for audit log query parameters
 */
export const auditLogQuerySchema = z.object({
  modelId: z.string().optional(),
  adminUserId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type AuditLogQueryParams = z.infer<typeof auditLogQuerySchema>;

/**
 * Schema for model tier filters
 */
export const modelTierFiltersSchema = z.object({
  provider: z.string().optional(),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  restrictionMode: z.enum(['minimum', 'exact', 'whitelist']).optional(),
});

export type ModelTierFilters = z.infer<typeof modelTierFiltersSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Audit log entry response
 */
export interface AuditLogEntry {
  id: string;
  modelId: string;
  adminUserId: string;
  adminEmail?: string;
  changeType: string;
  previousValue: Record<string, any> | null;
  newValue: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

/**
 * Model with tier configuration response
 */
export interface ModelTierInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  requiredTier: SubscriptionTier;
  tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
  allowedTiers: SubscriptionTier[];
  isAvailable: boolean;
  lastModified?: string;
}

/**
 * Single model tier update response
 */
export interface UpdateModelTierResponse {
  model: ModelTierInfo;
  auditLog: AuditLogEntry;
}

/**
 * Bulk update result
 */
export interface BulkUpdateResult {
  modelId: string;
  success: boolean;
  error?: string;
  auditLog?: AuditLogEntry;
}

/**
 * Bulk update response
 */
export interface BulkUpdateTiersResponse {
  success: number;
  failed: number;
  results: BulkUpdateResult[];
}

/**
 * Audit logs list response
 */
export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Model tier list response
 */
export interface ModelTierListResponse {
  models: ModelTierInfo[];
  total: number;
}
