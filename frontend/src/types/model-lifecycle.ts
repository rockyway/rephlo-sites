// Model Lifecycle Management Types
// Based on docs/plan/160-model-lifecycle-ui-merge-architecture.md

import type { SubscriptionTier } from '@rephlo/shared-types';

// ============================================================================
// Core Model Lifecycle Types
// ============================================================================

/**
 * Model metadata stored in JSONB field
 * Contains all model configuration, pricing, and lifecycle information
 */
export interface ModelMeta {
  // Display Information
  displayName: string;
  description?: string;
  version?: string;

  // Capabilities
  capabilities: ('text' | 'vision' | 'function_calling' | 'code' | 'long_context')[];

  // Context and Limits
  contextLength: number;
  maxOutputTokens?: number;

  // Pricing Configuration
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;

  // Phase 3: Separate input/output pricing
  inputCreditsPerK?: number;
  outputCreditsPerK?: number;

  // DEPRECATED: Will be removed after full migration
  creditsPer1kTokens?: number;

  // Tier Access Configuration
  requiredTier: SubscriptionTier;
  tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
  allowedTiers: SubscriptionTier[];

  // Legacy/Deprecation Information (optional)
  legacyReplacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601 date string

  // Provider-specific metadata (optional)
  providerMetadata?: Record<string, any>;

  // Admin notes (optional)
  internalNotes?: string;
  complianceTags?: string[];
}

/**
 * Complete model information including lifecycle state
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;

  // Lifecycle State
  isAvailable: boolean;
  isLegacy: boolean;
  isArchived: boolean;

  // Metadata (JSONB field)
  meta: ModelMeta;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Legacy tier fields (backwards compatibility during migration)
  displayName?: string;
  requiredTier?: SubscriptionTier;
  tierRestrictionMode?: string;
  allowedTiers?: SubscriptionTier[];
}

/**
 * Lifecycle event history entry
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

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request payload for marking a model as legacy
 */
export interface MarkLegacyRequest {
  replacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601 date string
}

/**
 * Request payload for archiving a model
 */
export interface ArchiveRequest {
  reason: string;
}

/**
 * Request payload for creating a new model
 */
export interface CreateModelRequest {
  id: string;
  name: string;
  provider: string;
  meta: ModelMeta;
}

/**
 * Response from lifecycle history endpoint
 */
export interface LifecycleHistoryResponse {
  history: LifecycleEvent[];
  total: number;
}

/**
 * Response from legacy models endpoint
 */
export interface LegacyModelsResponse {
  models: ModelInfo[];
  total: number;
}

/**
 * Response from archived models endpoint
 */
export interface ArchivedModelsResponse {
  models: ModelInfo[];
  total: number;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Status filter options for model table
 */
export type ModelStatusFilter = 'all' | 'active' | 'legacy' | 'archived';

/**
 * Lifecycle action type for dialogs
 */
export type LifecycleAction = 'mark-legacy' | 'unmark-legacy' | 'archive' | 'unarchive' | 'edit-meta';

/**
 * Props for MarkLegacyDialog component
 */
export interface MarkLegacyDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  availableModels: ModelInfo[];
  onConfirm: (data: MarkLegacyRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ArchiveDialog component
 */
export interface ArchiveDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  usageStats?: {
    activeUsers: number;
    requestsLast30Days: number;
  };
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for MetaJsonEditor component
 */
export interface MetaJsonEditorProps {
  isOpen: boolean;
  model: ModelInfo | null;
  currentMeta: ModelMeta;
  onSave: (updatedMeta: Partial<ModelMeta>) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ModelCreationForm component
 */
export interface ModelCreationFormProps {
  onSubmit: (modelData: CreateModelRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for LifecycleHistoryPanel component
 */
export interface LifecycleHistoryPanelProps {
  modelId: string;
  history: LifecycleEvent[];
  isLoading: boolean;
}

/**
 * Props for ModelStatusBadge component
 */
export interface ModelStatusBadgeProps {
  isLegacy: boolean;
  isArchived: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Props for LifecycleActionMenu component
 */
export interface LifecycleActionMenuProps {
  model: ModelInfo;
  onMarkLegacy: () => void;
  onUnmarkLegacy: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onEditMeta: () => void;
  permissions: {
    canManageLifecycle: boolean;
    canEditMeta: boolean;
  };
}
