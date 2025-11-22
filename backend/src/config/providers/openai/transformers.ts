import { TransformResult } from '../base-provider-spec';

/**
 * OpenAI Parameter Transformer
 *
 * Transforms parameters before sending to OpenAI API
 * Handles GPT-5 max_completion_tokens conversion
 */
export function transformOpenAIParameters(
  params: any,
  modelId: string
): TransformResult {
  const transformed = { ...params };
  const warnings: string[] = [];

  // GPT-5: Convert max_tokens to max_completion_tokens
  if (modelId.match(/^gpt-5/i)) {
    if (transformed.max_tokens !== undefined) {
      transformed.max_completion_tokens = transformed.max_tokens;
      delete transformed.max_tokens;
      warnings.push('Converted max_tokens to max_completion_tokens for GPT-5 model');
    }
  }

  // Remove undefined fields
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) {
      delete transformed[key];
    }
  });

  return { transformed, warnings };
}
