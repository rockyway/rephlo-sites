// Model Tier Types for Admin UI

// Import SubscriptionTier from shared-types
import type { SubscriptionTier } from '@rephlo/shared-types';

// Re-export for convenience
export type { SubscriptionTier };

// Frontend-specific types for model tier management
export type TierRestrictionMode = 'minimum' | 'exact' | 'whitelist';
export type AccessStatus = 'allowed' | 'restricted' | 'upgrade_required';

export interface ModelTierInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  requiredTier: SubscriptionTier;
  tierRestrictionMode: TierRestrictionMode;
  allowedTiers: SubscriptionTier[];
  isAvailable: boolean;
  isDeprecated: boolean;
  updatedAt: string;
}

export interface ModelTierUpdateRequest {
  requiredTier?: SubscriptionTier;
  tierRestrictionMode?: TierRestrictionMode;
  allowedTiers?: SubscriptionTier[];
  reason?: string;
}

export interface BulkTierUpdateRequest {
  modelIds: string[];
  updates: ModelTierUpdateRequest;
  reason?: string;
}

export interface TierAuditLogEntry {
  id: string;
  modelId: string;
  modelName: string;
  adminUserId: string;
  adminUserEmail?: string;
  changeType: 'tier_change' | 'restriction_mode_change' | 'allowed_tiers_change';
  oldValues: {
    requiredTier?: SubscriptionTier;
    tierRestrictionMode?: TierRestrictionMode;
    allowedTiers?: SubscriptionTier[];
  };
  newValues: {
    requiredTier?: SubscriptionTier;
    tierRestrictionMode?: TierRestrictionMode;
    allowedTiers?: SubscriptionTier[];
  };
  reason?: string;
  timestamp: string;
}

export interface ModelTierFilters {
  provider?: string;
  tier?: SubscriptionTier;
  restrictionMode?: TierRestrictionMode;
  search?: string;
}

export interface ModelTierListResponse {
  models: ModelTierInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogResponse {
  logs: TierAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
