import { ProviderSpec, ParameterConstraint } from '../base-provider-spec';
import { grok3FamilySpec } from './grok3-family';
import { grok4FamilySpec } from './grok4-family';
import { transformGrokParameters } from './transformers';

/**
 * Grok (xAI) Provider Specification
 *
 * API Version: 2025-01-01
 * Last Updated: 2025-12-01
 *
 * Reference: https://docs.x.ai/api
 *
 * Important Notes:
 * - Uses OpenAI-compatible API format
 * - Base URL: https://api.x.ai/v1
 * - Supports prompt caching with Anthropic-style cache metrics
 * - Cache fields: cache_creation_input_tokens, cache_read_input_tokens
 * - Alternative: prompt_tokens_details.cached_tokens (OpenAI-style)
 */

/**
 * Base parameters common to all Grok models
 */
export const grokBaseParameters: Record<string, ParameterConstraint> = {
  temperature: {
    supported: true,
    min: 0,
    max: 2.0,
    default: 0.7,
    reason: 'Controls randomness. Lower = deterministic, Higher = creative',
    apiVersion: '2025-01-01',
  },
  max_tokens: {
    supported: true,
    min: 1,
    max: 2000000,  // 2M for extended context models
    default: 1000,
    reason: 'Maximum tokens to generate',
  },
  top_p: {
    supported: true,
    min: 0,
    max: 1.0,
    default: 1.0,
    reason: 'Nucleus sampling. Do not use with temperature',
  },
  frequency_penalty: {
    supported: true,
    min: -2.0,
    max: 2.0,
    default: 0,
    reason: 'Penalize repeated tokens',
  },
  presence_penalty: {
    supported: true,
    min: -2.0,
    max: 2.0,
    default: 0,
    reason: 'Penalize already mentioned tokens',
  },
  stop: {
    supported: true,
    reason: 'Stop sequences (max 4)',
  },
  n: {
    supported: true,
    min: 1,
    max: 10,
    default: 1,
    reason: 'Number of completions to generate',
  },
};

/**
 * Complete Grok (xAI) specification
 */
export const grokSpec: ProviderSpec = {
  providerName: 'xai',
  displayName: 'xAI Grok',
  apiVersion: '2025-01-01',
  lastUpdated: '2025-12-01',
  baseParameters: grokBaseParameters,
  modelFamilies: [
    grok3FamilySpec,
    grok4FamilySpec,
  ],
  parameterTransformer: transformGrokParameters,
  notes: `
xAI Grok API Notes:
- OpenAI-compatible API format
- Base URL: https://api.x.ai/v1
- Supports prompt caching (75-90% discount)
- Cache metrics returned in:
  1. Anthropic-style: cache_creation_input_tokens, cache_read_input_tokens
  2. OpenAI-style: prompt_tokens_details.cached_tokens
- Enable stream_options: { include_usage: true } for streaming usage stats
- Context windows: 131K (Grok 3), 256K-2M (Grok 4)
  `,
};
