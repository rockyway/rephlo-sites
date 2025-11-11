/**
 * Vendor Pricing Test Fixtures
 *
 * Provides realistic vendor pricing data for testing cost calculations.
 * Pricing data based on Plan 112 specifications (October 2025 rates).
 */

export interface VendorPricingData {
  id: string;
  providerId: string;
  providerName: string;
  modelName: string;
  vendorModelId: string;
  inputPricePerK: number;  // USD per 1,000 tokens
  outputPricePerK: number;  // USD per 1,000 tokens
  cacheInputPricePerK?: number;  // For Anthropic/Google caching
  cacheHitPricePerK?: number;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
  description: string;
}

export const PROVIDER_IDS = {
  OPENAI: 'openai-provider-uuid-001',
  ANTHROPIC: 'anthropic-provider-uuid-002',
  GOOGLE: 'google-provider-uuid-003',
  AZURE: 'azure-provider-uuid-004',
};

/**
 * Current Active Pricing (November 2025)
 */
export const CURRENT_VENDOR_PRICING: VendorPricingData[] = [
  // OpenAI Pricing
  {
    id: 'pricing-openai-gpt4o',
    providerId: PROVIDER_IDS.OPENAI,
    providerName: 'OpenAI',
    modelName: 'gpt-4o',
    vendorModelId: 'gpt-4o',
    inputPricePerK: 0.005,
    outputPricePerK: 0.015,
    effectiveFrom: new Date('2025-10-15'),
    isActive: true,
    description: 'OpenAI GPT-4o standard pricing',
  },
  {
    id: 'pricing-openai-gpt4-turbo',
    providerId: PROVIDER_IDS.OPENAI,
    providerName: 'OpenAI',
    modelName: 'gpt-4-turbo',
    vendorModelId: 'gpt-4-turbo',
    inputPricePerK: 0.01,
    outputPricePerK: 0.03,
    effectiveFrom: new Date('2025-10-15'),
    isActive: true,
    description: 'OpenAI GPT-4 Turbo standard pricing',
  },
  {
    id: 'pricing-openai-gpt35-turbo',
    providerId: PROVIDER_IDS.OPENAI,
    providerName: 'OpenAI',
    modelName: 'gpt-3.5-turbo',
    vendorModelId: 'gpt-3.5-turbo',
    inputPricePerK: 0.0005,
    outputPricePerK: 0.0015,
    effectiveFrom: new Date('2025-10-15'),
    isActive: true,
    description: 'OpenAI GPT-3.5 Turbo standard pricing',
  },

  // Anthropic Pricing
  {
    id: 'pricing-anthropic-claude35-sonnet',
    providerId: PROVIDER_IDS.ANTHROPIC,
    providerName: 'Anthropic',
    modelName: 'claude-3-5-sonnet-20241022',
    vendorModelId: 'claude-3-5-sonnet-20241022',
    inputPricePerK: 0.003,
    outputPricePerK: 0.015,
    cacheInputPricePerK: 0.0003,  // 10% of standard for cached
    effectiveFrom: new Date('2025-09-20'),
    isActive: true,
    description: 'Anthropic Claude 3.5 Sonnet with prompt caching',
  },
  {
    id: 'pricing-anthropic-claude3-opus',
    providerId: PROVIDER_IDS.ANTHROPIC,
    providerName: 'Anthropic',
    modelName: 'claude-3-opus',
    vendorModelId: 'claude-3-opus-20240229',
    inputPricePerK: 0.015,
    outputPricePerK: 0.075,
    cacheInputPricePerK: 0.0015,
    effectiveFrom: new Date('2025-09-20'),
    isActive: true,
    description: 'Anthropic Claude 3 Opus (expensive model)',
  },
  {
    id: 'pricing-anthropic-claude3-haiku',
    providerId: PROVIDER_IDS.ANTHROPIC,
    providerName: 'Anthropic',
    modelName: 'claude-3-haiku',
    vendorModelId: 'claude-3-haiku-20240307',
    inputPricePerK: 0.00025,
    outputPricePerK: 0.00125,
    cacheInputPricePerK: 0.000025,
    effectiveFrom: new Date('2025-09-20'),
    isActive: true,
    description: 'Anthropic Claude 3 Haiku (cheapest model)',
  },

  // Google Gemini Pricing
  {
    id: 'pricing-google-gemini-flash',
    providerId: PROVIDER_IDS.GOOGLE,
    providerName: 'Google',
    modelName: 'gemini-2.0-flash',
    vendorModelId: 'gemini-2.0-flash',
    inputPricePerK: 0.000375,
    outputPricePerK: 0.0015,
    cacheInputPricePerK: 0.0000188,  // 5% of standard
    effectiveFrom: new Date('2025-11-01'),
    isActive: true,
    description: 'Google Gemini 2.0 Flash (cheapest)',
  },
  {
    id: 'pricing-google-gemini-pro',
    providerId: PROVIDER_IDS.GOOGLE,
    providerName: 'Google',
    modelName: 'gemini-1.5-pro',
    vendorModelId: 'gemini-1.5-pro',
    inputPricePerK: 0.00125,
    outputPricePerK: 0.005,
    cacheInputPricePerK: 0.0000625,
    effectiveFrom: new Date('2025-11-01'),
    isActive: true,
    description: 'Google Gemini 1.5 Pro',
  },
];

/**
 * Historical Pricing (for testing historical price lookups)
 */
export const HISTORICAL_VENDOR_PRICING: VendorPricingData[] = [
  // GPT-4o price before November 2025
  {
    id: 'pricing-openai-gpt4o-old',
    providerId: PROVIDER_IDS.OPENAI,
    providerName: 'OpenAI',
    modelName: 'gpt-4o',
    vendorModelId: 'gpt-4o',
    inputPricePerK: 0.003,  // Old price
    outputPricePerK: 0.012,  // Old price
    effectiveFrom: new Date('2025-08-01'),
    effectiveUntil: new Date('2025-10-14'),
    isActive: false,
    description: 'OpenAI GPT-4o historical pricing (before Oct 15)',
  },
];

/**
 * Test Scenarios for Cost Calculation
 */
export const COST_CALCULATION_TEST_CASES = [
  {
    name: 'GPT-4o standard completion',
    modelName: 'gpt-4o',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 500,
    outputTokens: 1500,
    expectedInputCost: 0.0025,  // 500 * 0.005 / 1000
    expectedOutputCost: 0.0225,  // 1500 * 0.015 / 1000
    expectedTotalCost: 0.025,
    description: 'Basic GPT-4o request from Plan 112 example',
  },
  {
    name: 'Claude 3.5 Sonnet with cache',
    modelName: 'claude-3-5-sonnet-20241022',
    providerId: PROVIDER_IDS.ANTHROPIC,
    inputTokens: 500,
    outputTokens: 1500,
    cachedInputTokens: 200,  // 200 tokens cached
    expectedInputCost: 0.0009,  // (300 * 0.003 + 200 * 0.0003) / 1000
    expectedOutputCost: 0.0225,  // 1500 * 0.015 / 1000
    expectedTotalCost: 0.0234,
    description: 'Claude with prompt caching (10% discount on cached)',
  },
  {
    name: 'Gemini Flash (cheapest model)',
    modelName: 'gemini-2.0-flash',
    providerId: PROVIDER_IDS.GOOGLE,
    inputTokens: 500,
    outputTokens: 1500,
    expectedInputCost: 0.0001875,  // 500 * 0.000375 / 1000
    expectedOutputCost: 0.00225,  // 1500 * 0.0015 / 1000
    expectedTotalCost: 0.0024375,
    description: 'Cheapest model - very low cost',
  },
  {
    name: 'Claude 3 Opus (expensive model)',
    modelName: 'claude-3-opus',
    providerId: PROVIDER_IDS.ANTHROPIC,
    inputTokens: 500,
    outputTokens: 1500,
    expectedInputCost: 0.0075,  // 500 * 0.015 / 1000
    expectedOutputCost: 0.1125,  // 1500 * 0.075 / 1000
    expectedTotalCost: 0.12,
    description: 'Most expensive model - high cost',
  },
  {
    name: 'Zero output tokens (error case)',
    modelName: 'gpt-4o',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 500,
    outputTokens: 0,
    expectedInputCost: 0.0025,
    expectedOutputCost: 0,
    expectedTotalCost: 0.0025,
    description: 'Request failed, only input tokens charged',
  },
  {
    name: 'Very large token count',
    modelName: 'gpt-4o',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 100000,
    outputTokens: 50000,
    expectedInputCost: 0.5,  // 100000 * 0.005 / 1000
    expectedOutputCost: 0.75,  // 50000 * 0.015 / 1000
    expectedTotalCost: 1.25,
    description: 'Large completion (100k input, 50k output)',
  },
  {
    name: 'Fractional cent precision',
    modelName: 'gpt-3.5-turbo',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 17,
    outputTokens: 23,
    expectedInputCost: 0.0000085,  // 17 * 0.0005 / 1000
    expectedOutputCost: 0.0000345,  // 23 * 0.0015 / 1000
    expectedTotalCost: 0.000043,
    description: 'Very small token counts requiring precision',
  },
];

/**
 * Edge Case Test Scenarios
 */
export const EDGE_CASE_SCENARIOS = {
  missingModel: {
    modelName: 'gpt-5-ultra',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 500,
    outputTokens: 1500,
    expectedError: 'No active pricing found',
    description: 'Model not in pricing table',
  },
  negativeTokens: {
    modelName: 'gpt-4o',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: -100,
    outputTokens: 1500,
    expectedError: 'Invalid token count',
    description: 'Negative token counts should be rejected',
  },
  zeroTokens: {
    modelName: 'gpt-4o',
    providerId: PROVIDER_IDS.OPENAI,
    inputTokens: 0,
    outputTokens: 0,
    expectedInputCost: 0,
    expectedOutputCost: 0,
    expectedTotalCost: 0,
    description: 'Both input and output zero',
  },
};

/**
 * Helper function to get pricing by model name
 */
export function getPricingByModel(modelName: string): VendorPricingData | undefined {
  return CURRENT_VENDOR_PRICING.find(p => p.modelName === modelName && p.isActive);
}

/**
 * Helper function to calculate expected cost
 */
export function calculateExpectedCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerK: number,
  outputPricePerK: number,
  cachedInputTokens = 0,
  cacheInputPricePerK = 0
): number {
  const regularInputTokens = inputTokens - cachedInputTokens;
  const inputCost = (regularInputTokens * inputPricePerK) / 1000;
  const cachedCost = (cachedInputTokens * cacheInputPricePerK) / 1000;
  const outputCost = (outputTokens * outputPricePerK) / 1000;
  return inputCost + cachedCost + outputCost;
}

export default {
  CURRENT_VENDOR_PRICING,
  HISTORICAL_VENDOR_PRICING,
  COST_CALCULATION_TEST_CASES,
  EDGE_CASE_SCENARIOS,
  PROVIDER_IDS,
  getPricingByModel,
  calculateExpectedCost,
};
