import { TransformResult } from '../base-provider-spec';

/**
 * Google Parameter Transformer
 *
 * Transforms snake_case to camelCase for Google Gemini API
 */
export function transformGoogleParameters(params: any, _modelId?: string): TransformResult {
  const transformed: any = {};
  const warnings: string[] = [];

  // Parameter name mapping (snake_case → camelCase)
  const nameMapping: Record<string, string> = {
    max_tokens: 'maxOutputTokens',
    top_p: 'topP',
    top_k: 'topK',
    stop: 'stopSequences',
  };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    // Transform parameter name if mapping exists
    const transformedKey = nameMapping[key] || key;
    transformed[transformedKey] = value;

    if (transformedKey !== key) {
      warnings.push(`Transformed '${key}' to '${transformedKey}' for Google API`);
    }
  }

  return { transformed, warnings };
}
