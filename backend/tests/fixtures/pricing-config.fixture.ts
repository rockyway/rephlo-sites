/**
 * Pricing Configuration Test Fixtures
 *
 * Provides tier-based margin multipliers and pricing configuration data
 * for testing credit conversion calculations.
 */

export interface PricingConfigData {
  id: string;
  scopeType: 'tier' | 'provider' | 'model' | 'combination';
  subscriptionTier?: string;
  providerId?: string;
  modelId?: string;
  marginMultiplier: number;
  targetGrossMarginPercent: number;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  reason: string;
  reasonDetails: string;
  isActive: boolean;
}

/**
 * Tier-Based Multipliers (Default Configuration)
 * From Plan 112 specifications
 */
export const TIER_MULTIPLIERS: PricingConfigData[] = [
  {
    id: 'config-tier-free',
    scopeType: 'tier',
    subscriptionTier: 'free',
    marginMultiplier: 2.0,
    targetGrossMarginPercent: 50.0,  // (2.0 - 1.0) / 2.0 = 50%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Aggressive margin protection for free tier to prevent abuse',
    isActive: true,
  },
  {
    id: 'config-tier-pro',
    scopeType: 'tier',
    subscriptionTier: 'pro',
    marginMultiplier: 1.5,
    targetGrossMarginPercent: 33.33,  // (1.5 - 1.0) / 1.5 = 33.33%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Balanced margin for Pro tier ($19/month)',
    isActive: true,
  },
  {
    id: 'config-tier-pro-max',
    scopeType: 'tier',
    subscriptionTier: 'pro_max',
    marginMultiplier: 1.2,
    targetGrossMarginPercent: 16.67,  // (1.2 - 1.0) / 1.2 = 16.67%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Lower margin to attract heavy usage ($49/month)',
    isActive: true,
  },
  {
    id: 'config-tier-enterprise-pro',
    scopeType: 'tier',
    subscriptionTier: 'enterprise_pro',
    marginMultiplier: 1.1,
    targetGrossMarginPercent: 9.09,  // (1.1 - 1.0) / 1.1 = 9.09%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Volume-based penetration pricing ($149/month)',
    isActive: true,
  },
  {
    id: 'config-tier-enterprise-max',
    scopeType: 'tier',
    subscriptionTier: 'enterprise_max',
    marginMultiplier: 1.05,
    targetGrossMarginPercent: 4.76,  // (1.05 - 1.0) / 1.05 = 4.76%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Minimal margin for unlimited tier (custom pricing)',
    isActive: true,
  },
  {
    id: 'config-tier-perpetual',
    scopeType: 'tier',
    subscriptionTier: 'perpetual',
    marginMultiplier: 1.3,
    targetGrossMarginPercent: 23.08,  // (1.3 - 1.0) / 1.3 = 23.08%
    effectiveFrom: new Date('2025-11-01'),
    reason: 'initial_setup',
    reasonDetails: 'Perpetual license with BYOK ($199 one-time)',
    isActive: true,
  },
];

/**
 * Provider-Specific Multipliers (Override tier defaults)
 */
export const PROVIDER_MULTIPLIERS: PricingConfigData[] = [
  {
    id: 'config-provider-anthropic-premium',
    scopeType: 'provider',
    providerId: 'anthropic-provider-uuid-002',
    marginMultiplier: 1.1,  // +10% over tier default for expensive provider
    targetGrossMarginPercent: 9.09,
    effectiveFrom: new Date('2025-11-01'),
    reason: 'margin_protection',
    reasonDetails: 'Anthropic models are expensive, need higher margin',
    isActive: true,
  },
];

/**
 * Model-Specific Multipliers (Most specific override)
 */
export const MODEL_MULTIPLIERS: PricingConfigData[] = [
  {
    id: 'config-model-gpt4o-pro',
    scopeType: 'combination',
    subscriptionTier: 'pro',
    providerId: 'openai-provider-uuid-001',
    modelId: 'gpt-4-turbo',
    marginMultiplier: 1.65,  // Higher than default Pro (1.5)
    targetGrossMarginPercent: 39.39,
    effectiveFrom: new Date('2025-11-01'),
    reason: 'model_optimization',
    reasonDetails: 'GPT-4 Turbo is expensive, need higher margin for Pro tier',
    isActive: true,
  },
  {
    id: 'config-model-gemini-flash-discount',
    scopeType: 'model',
    providerId: 'google-provider-uuid-003',
    modelId: 'gemini-2.0-flash',
    marginMultiplier: 1.2,  // Lower margin for cheap model
    targetGrossMarginPercent: 16.67,
    effectiveFrom: new Date('2025-11-01'),
    reason: 'tier_optimization',
    reasonDetails: 'Gemini Flash is cheap, can afford lower margin',
    isActive: true,
  },
];

/**
 * Historical Configuration (for testing historical multiplier lookups)
 */
export const HISTORICAL_PRICING_CONFIG: PricingConfigData[] = [
  {
    id: 'config-tier-pro-old',
    scopeType: 'tier',
    subscriptionTier: 'pro',
    marginMultiplier: 1.4,  // Old multiplier
    targetGrossMarginPercent: 28.57,
    effectiveFrom: new Date('2025-09-01'),
    effectiveUntil: new Date('2025-10-31'),
    reason: 'initial_setup',
    reasonDetails: 'Original Pro tier multiplier',
    isActive: false,
  },
];

/**
 * Test Cases for Multiplier Lookup
 */
export const MULTIPLIER_LOOKUP_TEST_CASES = [
  {
    name: 'Free tier default',
    tier: 'free',
    providerId: undefined,
    modelId: undefined,
    expectedMultiplier: 2.0,
    expectedMarginPercent: 50.0,
    description: 'Free tier uses default 2.0x multiplier',
  },
  {
    name: 'Pro tier default',
    tier: 'pro',
    providerId: undefined,
    modelId: undefined,
    expectedMultiplier: 1.5,
    expectedMarginPercent: 33.33,
    description: 'Pro tier uses default 1.5x multiplier',
  },
  {
    name: 'Enterprise Pro tier',
    tier: 'enterprise_pro',
    providerId: undefined,
    modelId: undefined,
    expectedMultiplier: 1.1,
    expectedMarginPercent: 9.09,
    description: 'Enterprise tier uses low 1.1x multiplier',
  },
  {
    name: 'Pro tier + GPT-4 Turbo (combination override)',
    tier: 'pro',
    providerId: 'openai-provider-uuid-001',
    modelId: 'gpt-4-turbo',
    expectedMultiplier: 1.65,
    expectedMarginPercent: 39.39,
    description: 'Combination config overrides tier default',
  },
  {
    name: 'Pro tier + Anthropic (provider override)',
    tier: 'pro',
    providerId: 'anthropic-provider-uuid-002',
    modelId: 'claude-3-5-sonnet-20241022',
    expectedMultiplier: 1.1,  // Provider override applies
    expectedMarginPercent: 9.09,
    description: 'Provider-level override takes precedence over tier',
  },
  {
    name: 'Any tier + Gemini Flash (model override)',
    tier: 'pro',
    providerId: 'google-provider-uuid-003',
    modelId: 'gemini-2.0-flash',
    expectedMultiplier: 1.2,
    expectedMarginPercent: 16.67,
    description: 'Model-specific config overrides tier',
  },
];

/**
 * Margin Calculation Test Cases
 */
export const MARGIN_CALCULATION_TEST_CASES = [
  {
    name: 'Free tier margin (2.0x)',
    vendorCost: 0.024,
    multiplier: 2.0,
    expectedCreditValue: 0.048,
    expectedGrossMargin: 0.024,
    expectedMarginPercent: 50.0,
    description: 'Free tier: $0.024 cost → $0.048 credit value (50% margin)',
  },
  {
    name: 'Pro tier margin (1.5x)',
    vendorCost: 0.024,
    multiplier: 1.5,
    expectedCreditValue: 0.036,
    expectedGrossMargin: 0.012,
    expectedMarginPercent: 33.33,
    description: 'Pro tier: $0.024 cost → $0.036 credit value (33% margin)',
  },
  {
    name: 'Enterprise tier margin (1.1x)',
    vendorCost: 0.024,
    multiplier: 1.1,
    expectedCreditValue: 0.0264,
    expectedGrossMargin: 0.0024,
    expectedMarginPercent: 9.09,
    description: 'Enterprise: $0.024 cost → $0.0264 credit value (9% margin)',
  },
  {
    name: 'Very small cost (fractional)',
    vendorCost: 0.000043,  // GPT-3.5 Turbo small request
    multiplier: 1.5,
    expectedCreditValue: 0.0000645,
    expectedGrossMargin: 0.0000215,
    expectedMarginPercent: 33.33,
    description: 'Fractional cent calculation with precision',
  },
  {
    name: 'Large cost (expensive model)',
    vendorCost: 0.12,  // Claude 3 Opus
    multiplier: 2.0,
    expectedCreditValue: 0.24,
    expectedGrossMargin: 0.12,
    expectedMarginPercent: 50.0,
    description: 'Expensive model with Free tier multiplier',
  },
];

/**
 * Priority Cascade Test Cases
 * Tests the lookup order: combination > model > provider > tier > default
 */
export const CASCADE_LOOKUP_TEST_CASES = [
  {
    name: 'Most specific wins (combination)',
    tier: 'pro',
    providerId: 'openai-provider-uuid-001',
    modelId: 'gpt-4-turbo',
    expectedConfigId: 'config-model-gpt4o-pro',
    expectedMultiplier: 1.65,
    description: 'Combination config beats all others',
  },
  {
    name: 'Model-level override',
    tier: 'free',
    providerId: 'google-provider-uuid-003',
    modelId: 'gemini-2.0-flash',
    expectedConfigId: 'config-model-gemini-flash-discount',
    expectedMultiplier: 1.2,
    description: 'Model config beats provider and tier',
  },
  {
    name: 'Provider-level override',
    tier: 'pro',
    providerId: 'anthropic-provider-uuid-002',
    modelId: 'claude-3-haiku',  // No specific model config
    expectedConfigId: 'config-provider-anthropic-premium',
    expectedMultiplier: 1.1,
    description: 'Provider config beats tier default',
  },
  {
    name: 'Fallback to tier default',
    tier: 'pro',
    providerId: 'openai-provider-uuid-001',
    modelId: 'gpt-3.5-turbo',  // No specific overrides
    expectedConfigId: 'config-tier-pro',
    expectedMultiplier: 1.5,
    description: 'No overrides, uses tier default',
  },
  {
    name: 'Unknown tier fallback',
    tier: 'unknown_tier',
    providerId: undefined,
    modelId: undefined,
    expectedMultiplier: 1.5,  // System default
    description: 'Unknown tier falls back to default 1.5x',
  },
];

/**
 * Helper function to calculate margin percentage
 */
export function calculateMarginPercent(multiplier: number): number {
  return ((multiplier - 1.0) / multiplier) * 100;
}

/**
 * Helper function to calculate credit value
 */
export function calculateCreditValue(vendorCost: number, multiplier: number): number {
  return vendorCost * multiplier;
}

/**
 * Helper function to calculate gross margin
 */
export function calculateGrossMargin(vendorCost: number, multiplier: number): number {
  const creditValue = vendorCost * multiplier;
  return creditValue - vendorCost;
}

export default {
  TIER_MULTIPLIERS,
  PROVIDER_MULTIPLIERS,
  MODEL_MULTIPLIERS,
  HISTORICAL_PRICING_CONFIG,
  MULTIPLIER_LOOKUP_TEST_CASES,
  MARGIN_CALCULATION_TEST_CASES,
  CASCADE_LOOKUP_TEST_CASES,
  calculateMarginPercent,
  calculateCreditValue,
  calculateGrossMargin,
};
