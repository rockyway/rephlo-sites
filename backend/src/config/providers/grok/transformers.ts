import { TransformResult } from '../base-provider-spec';

/**
 * Grok (xAI) Parameter Transformer
 *
 * Transforms parameters before sending to xAI API
 * Grok uses OpenAI-compatible API format, minimal transformation needed
 */
export function transformGrokParameters(
  params: any,
  modelId: string
): TransformResult {
  const transformed = { ...params };
  const warnings: string[] = [];

  // Remove undefined fields
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) {
      delete transformed[key];
    }
  });

  // Grok-specific: Ensure temperature is reasonable for reasoning models
  if (modelId.includes('reasoning') && transformed.temperature > 1.0) {
    warnings.push(
      `Reasoning models work best with temperature <= 1.0. Current: ${transformed.temperature}`
    );
  }

  // Validate max_tokens against context window
  const contextLimits: Record<string, number> = {
    'grok-4-0709': 256000,
    'grok-4-1-fast-reasoning': 2000000,
    'grok-4-1-fast-non-reasoning': 2000000,
    'grok-4-l-fast-non-reasoning': 2000000,
    'grok-code-fast-1': 2000000,
    'grok-3': 131072,
    'grok-3-fast': 131072,
  };

  const limit = contextLimits[modelId.toLowerCase()];
  if (limit && transformed.max_tokens > limit) {
    transformed.max_tokens = limit;
    warnings.push(
      `max_tokens capped to ${limit} for model ${modelId}`
    );
  }

  return { transformed, warnings };
}
