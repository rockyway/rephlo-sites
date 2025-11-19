/**
 * Predefined Model Templates
 *
 * Provider-specific templates to speed up model creation.
 * Based on architecture design: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md (lines 464-514)
 *
 * Templates provide sensible defaults for each provider's typical model configuration.
 * Admins can customize all fields when creating a new model.
 */

export interface ModelTemplate {
  provider: string;
  providerDisplayName: string;
  defaults: {
    capabilities: string[];
    tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
    requiredTier: string;
    allowedTiers: string[];
    providerMetadata?: {
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
    };
  };
  hints: {
    displayName: string;
    description: string;
    contextLength: string;
    inputCost: string;
    outputCost: string;
  };
}

/**
 * Available model templates by provider
 */
export const MODEL_TEMPLATES: Record<string, ModelTemplate> = {
  openai: {
    provider: 'openai',
    providerDisplayName: 'OpenAI',
    defaults: {
      capabilities: ['text', 'function_calling'],
      tierRestrictionMode: 'minimum',
      requiredTier: 'pro',
      allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
      providerMetadata: {
        openai: {
          modelFamily: '', // Admin fills: "gpt-4", "gpt-3.5", "gpt-5"
          trainingCutoff: '', // Admin fills: "2023-09", "2024-04"
        },
      },
    },
    hints: {
      displayName: 'e.g., GPT-5, GPT-4 Turbo',
      description: 'e.g., OpenAI GPT-5 with 272K context and enhanced reasoning',
      contextLength: 'e.g., 128000 (128K), 272000 (272K)',
      inputCost: 'e.g., 1.25 for $1.25 per 1M tokens',
      outputCost: 'e.g., 10.00 for $10.00 per 1M tokens',
    },
  },
  anthropic: {
    provider: 'anthropic',
    providerDisplayName: 'Anthropic',
    defaults: {
      capabilities: ['text', 'vision', 'long_context'],
      tierRestrictionMode: 'minimum',
      requiredTier: 'pro',
      allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
      providerMetadata: {
        anthropic: {
          modelSeries: '', // Admin fills: "claude-3", "claude-2", "claude-4"
          knowledgeCutoff: '', // Admin fills: "2024-04", "2025-01"
        },
      },
    },
    hints: {
      displayName: 'e.g., Claude Opus 4.5, Claude Sonnet 4.5',
      description: 'e.g., Anthropic Claude with 200K context and advanced vision',
      contextLength: 'e.g., 200000 (200K)',
      inputCost: 'e.g., 1.50 for $1.50 per 1M tokens',
      outputCost: 'e.g., 7.50 for $7.50 per 1M tokens',
    },
  },
  google: {
    provider: 'google',
    providerDisplayName: 'Google',
    defaults: {
      capabilities: ['text', 'vision'],
      tierRestrictionMode: 'minimum',
      requiredTier: 'free',
      allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
      providerMetadata: {
        google: {
          modelType: '', // Admin fills: "gemini-pro", "gemini-ultra", "palm"
          tuningSupport: false,
        },
      },
    },
    hints: {
      displayName: 'e.g., Gemini 2.0 Pro, Gemini Ultra',
      description: 'e.g., Google Gemini 2.0 Pro with multimodal capabilities',
      contextLength: 'e.g., 1048576 (1M), 2097152 (2M)',
      inputCost: 'e.g., 0.35 for $0.35 per 1M tokens',
      outputCost: 'e.g., 1.05 for $1.05 per 1M tokens',
    },
  },
  custom: {
    provider: '',
    providerDisplayName: 'Custom Provider',
    defaults: {
      capabilities: ['text'],
      tierRestrictionMode: 'minimum',
      requiredTier: 'free',
      allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
    },
    hints: {
      displayName: 'e.g., My Custom Model 1.0',
      description: 'e.g., Custom model with specialized capabilities',
      contextLength: 'e.g., 8000, 16000, 128000',
      inputCost: 'e.g., 1.00 for $1.00 per 1M tokens',
      outputCost: 'e.g., 3.00 for $3.00 per 1M tokens',
    },
  },
};

/**
 * Available capability options
 */
export const CAPABILITY_OPTIONS = [
  { value: 'text', label: 'Text Generation', description: 'Standard text completion' },
  { value: 'vision', label: 'Vision/Image Analysis', description: 'Can process images' },
  { value: 'function_calling', label: 'Function Calling', description: 'Supports tool/function calls' },
  { value: 'code', label: 'Code Generation', description: 'Optimized for code' },
  { value: 'long_context', label: 'Long Context', description: 'Extended context window (>100K)' },
];

/**
 * Available tier options
 */
export const TIER_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'pro_plus', label: 'Pro Plus' },
  { value: 'pro_max', label: 'Pro Max' },
  { value: 'enterprise_pro', label: 'Enterprise Pro' },
  { value: 'enterprise_pro_plus', label: 'Enterprise Pro Plus' },
];

/**
 * Tier restriction mode options
 */
export const TIER_RESTRICTION_MODE_OPTIONS = [
  {
    value: 'minimum',
    label: 'Minimum Tier',
    description: 'User must have at least this tier or higher',
  },
  {
    value: 'exact',
    label: 'Exact Tier',
    description: 'User must have exactly this tier',
  },
  {
    value: 'whitelist',
    label: 'Whitelist',
    description: 'User tier must be in the allowed tiers list',
  },
];

/**
 * Calculate suggested creditsPer1kTokens based on vendor pricing
 * Formula: ((inputCost + outputCost) / 2 / 1000) * marginMultiplier / creditUSDValue
 *
 * @param inputCostPerMillion - Cost per 1M input tokens in cents
 * @param outputCostPerMillion - Cost per 1M output tokens in cents
 * @param marginMultiplier - Profit margin multiplier (default 2.5x)
 * @param creditUSDValue - USD value of 1 credit (default $0.0005)
 * @returns Suggested credits per 1K tokens
 */
export function calculateSuggestedCredits(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier = 2.5,
  creditUSDValue = 0.0005
): number {
  if (!inputCostPerMillion || !outputCostPerMillion) return 0;

  // Convert to cents per 1K tokens
  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;

  // Apply margin
  const costWithMargin = costPer1K * marginMultiplier;

  // Convert to credits (1 credit = $0.0005)
  const creditsPerK = Math.ceil(costWithMargin / creditUSDValue);

  return creditsPerK;
}
