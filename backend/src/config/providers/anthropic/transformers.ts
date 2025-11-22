import { TransformResult } from '../base-provider-spec';

/**
 * Anthropic Parameter Transformer
 *
 * Transforms parameters before sending to Anthropic API
 * Currently identity function (no transformations needed)
 */
export function transformAnthropicParameters(
  params: any,
  _modelId?: string
): TransformResult {
  const transformed = { ...params };
  const warnings: string[] = [];

  // Remove undefined fields
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) {
      delete transformed[key];
    }
  });

  return { transformed, warnings };
}
