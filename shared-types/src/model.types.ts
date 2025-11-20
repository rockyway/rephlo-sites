/**
 * Model Types - Shared between Backend and Frontend
 *
 * Phase 3: Separate input/output pricing implementation
 *
 * These types define the API contract for model-related responses.
 * All fields use camelCase as per REST API standards.
 */

/**
 * Model capability enum
 */
export type ModelCapability =
  | 'text'
  | 'vision'
  | 'function_calling'
  | 'code'
  | 'long_context';

/**
 * Subscription tier enum
 */
export type SubscriptionTier =
  | 'free'
  | 'pro'
  | 'pro_max'
  | 'enterprise_pro'
  | 'enterprise_max'
  | 'perpetual';

/**
 * Tier restriction mode enum
 */
export type TierRestrictionMode = 'minimum' | 'exact' | 'whitelist';

/**
 * Provider-specific metadata structure
 */
export interface ProviderMetadata {
  openai?: {
    modelFamily?: string;
    trainingCutoff?: string;
  };
  anthropic?: {
    modelSeries?: string;
    knowledgeCutoff?: string;
  };
  google?: {
    modelType?: string;
    tuningSupport?: boolean;
  };
}

/**
 * Model metadata interface (API response format - camelCase)
 *
 * Phase 3: Includes separate input/output pricing
 */
export interface ModelMetaApiType {
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

  // Phase 3: Separate input/output pricing
  inputCreditsPerK?: number;
  outputCreditsPerK?: number;

  // DEPRECATED: Will be removed after full migration
  creditsPer1kTokens?: number;

  // Tier Access Control
  requiredTier: SubscriptionTier;
  tierRestrictionMode: TierRestrictionMode;
  allowedTiers: SubscriptionTier[];

  // Legacy Management (Optional)
  legacyReplacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string;

  // Provider-Specific Extensions
  providerMetadata?: ProviderMetadata;

  // Admin Metadata
  internalNotes?: string;
  complianceTags?: string[];
}

/**
 * Model API response type (camelCase)
 */
export interface ModelApiType {
  id: string;
  name: string;
  provider: string;
  isAvailable: boolean;
  isLegacy: boolean;
  isArchived: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  meta: ModelMetaApiType;
}

/**
 * Model list API response
 */
export interface ModelListApiResponse {
  status: 'success';
  data: {
    models: ModelApiType[];
    total: number;
  };
}

/**
 * Single model API response
 */
export interface ModelApiResponse {
  status: 'success';
  data: {
    model: ModelApiType;
  };
}

/**
 * Model pricing breakdown (for cost estimation UI)
 */
export interface ModelPricingBreakdown {
  // Separate pricing
  inputCreditsPerK: number;
  outputCreditsPerK: number;

  // Cost estimates for different token amounts
  estimates: {
    tokens1K: {
      inputCredits: number;
      outputCredits: number;
      totalCredits: number; // Based on typical 1:10 ratio
    };
    tokens10K: {
      inputCredits: number;
      outputCredits: number;
      totalCredits: number;
    };
    tokens100K: {
      inputCredits: number;
      outputCredits: number;
      totalCredits: number;
    };
  };

  // USD values (for display)
  inputCostPerMillion: number; // Dollars
  outputCostPerMillion: number; // Dollars
}
