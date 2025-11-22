import { ProviderSpec } from '../base-provider-spec';
import { claude3FamilySpec } from './claude3-family';
import { claude4FamilySpec } from './claude4-family';
import { transformAnthropicParameters } from './transformers';

/**
 * Anthropic Provider Specification
 *
 * API Version: 2023-06-01
 * Last Updated: 2025-01-19
 *
 * Reference: https://docs.anthropic.com/claude/reference/messages_post
 *
 * Important Notes:
 * - Claude 4.5 & Haiku 4.5: temperature OR top_p (mutually exclusive)
 * - Older models support both temperature and top_p
 * - Recommended: Use temperature only, avoid top_k for most cases
 * - max_tokens is required (no default)
 */
export const anthropicSpec: ProviderSpec = {
  providerName: 'anthropic',
  displayName: 'Anthropic',
  apiVersion: '2023-06-01',
  lastUpdated: '2025-01-19',
  baseParameters: {
    temperature: {
      supported: true,
      min: 0.0,
      max: 1.0,
      default: 1.0,
      reason: 'Randomness control (0 = near-deterministic)',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 200000,  // Claude 4 Sonnet: 64K output
      default: 4096,
      reason: 'Maximum output tokens (required parameter)',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      reason: 'Nucleus sampling. Do not use with temperature on Claude 4.5',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      reason: 'Advanced use only. Recommended: use temperature instead',
    },
    stop_sequences: {
      supported: true,
      reason: 'Stop sequences (max 4)',
    },
  },
  modelFamilies: [
    claude3FamilySpec,
    claude4FamilySpec,
  ],
  parameterTransformer: transformAnthropicParameters,
  notes: `
Anthropic API Changelog:
- 2023-06-01: Messages API introduced
- 2024-10-01: Claude 4.5 mutually exclusive temperature/top_p
  `,
};
