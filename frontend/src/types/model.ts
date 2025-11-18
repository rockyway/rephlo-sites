// Model Lifecycle Management Types
// Extends model-tier.ts with lifecycle-specific fields

import type { SubscriptionTier } from '@rephlo/shared-types';
import type { TierRestrictionMode } from './model-tier';

/**
 * Model capability types
 */
export type ModelCapability = 'text' | 'vision' | 'function_calling' | 'code' | 'long_context';

/**
 * ModelMeta - JSONB metadata structure
 *
 * Matches backend Zod schema from docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 */
export interface ModelMeta {
  // Display Information
  displayName: string;
  description?: string;
  version?: string;

  // Capabilities
  capabilities: ModelCapability[];

  // Context & Output Limits
  contextLength: number;
  maxOutputTokens?: number;

  // Pricing (in smallest currency unit - cents for USD)
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  creditsPer1kTokens: number;

  // Tier Access Control
  requiredTier: SubscriptionTier;
  tierRestrictionMode: TierRestrictionMode;
  allowedTiers: SubscriptionTier[];

  // Legacy Management (Optional)
  legacyReplacementModelId?: string; // ID of recommended replacement model
  deprecationNotice?: string; // User-facing deprecation message
  sunsetDate?: string; // ISO 8601 date when model will be removed

  // Provider-Specific Extensions (Flexible)
  providerMetadata?: Record<string, any>;

  // Admin Metadata
  internalNotes?: string; // Admin-only notes
  complianceTags?: string[]; // GDPR, HIPAA, SOC2, etc.
}

/**
 * ModelInfo - Complete model information with lifecycle state
 *
 * Includes both lifecycle state (isLegacy, isArchived) and metadata (meta JSONB)
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;

  // Lifecycle State Fields
  isAvailable: boolean;
  isLegacy: boolean;
  isArchived: boolean;

  // Metadata (JSONB)
  meta: ModelMeta;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Legacy tier fields (backwards compatibility during migration)
  // These may be deprecated in future versions
  displayName?: string;
  requiredTier?: SubscriptionTier;
  tierRestrictionMode?: TierRestrictionMode;
  allowedTiers?: SubscriptionTier[];
}

/**
 * CreateModelRequest - Request payload for creating a new model
 */
export interface CreateModelRequest {
  id: string;
  name: string;
  provider: string;
  meta: ModelMeta;
}

/**
 * LifecycleEvent - Audit trail entry for lifecycle changes
 */
export interface LifecycleEvent {
  id: string;
  modelId: string;
  action: 'created' | 'mark_legacy' | 'unmark_legacy' | 'archived' | 'unarchived' | 'meta_updated';
  adminUserId: string;
  adminEmail: string;
  timestamp: string;
  changes: Record<string, any>;
  reason?: string;
}

/**
 * MarkLegacyRequest - Request payload for marking model as legacy
 */
export interface MarkLegacyRequest {
  replacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601 format
}

/**
 * ArchiveRequest - Request payload for archiving a model
 */
export interface ArchiveRequest {
  reason: string;
}

/**
 * UpdateModelMetaRequest - Request payload for updating model metadata
 */
export interface UpdateModelMetaRequest {
  meta: Partial<ModelMeta>;
}

/**
 * Model lifecycle status type
 */
export type ModelLifecycleStatus = 'active' | 'legacy' | 'archived';

/**
 * Helper function to determine model lifecycle status
 */
export function getModelLifecycleStatus(model: ModelInfo): ModelLifecycleStatus {
  if (model.isArchived) return 'archived';
  if (model.isLegacy) return 'legacy';
  return 'active';
}
