import { ProviderSpec } from '../base-provider-spec';
import { geminiFamilySpec } from './gemini-family';
import { transformGoogleParameters } from './transformers';

/**
 * Google Provider Specification
 *
 * API Version: v1
 * Last Updated: 2025-01-19
 *
 * Reference: https://ai.google.dev/api/rest/v1/GenerationConfig
 *
 * IMPORTANT NOTES:
 * - Gemini API uses camelCase (maxOutputTokens, topP, topK)
 * - Backend must transform to snake_case for consistency
 * - Gemini 3 models: MUST keep temperature=1.0 or risk looping/degraded performance
 */
export const googleSpec: ProviderSpec = {
  providerName: 'google',
  displayName: 'Google',
  apiVersion: 'v1',
  lastUpdated: '2025-01-19',
  baseParameters: {
    temperature: {
      supported: true,
      min: 0,
      max: 2.0,
      default: 1.0,
      reason: 'Randomness control (0 = deterministic)',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 8192,
      default: 2048,
      alternativeName: 'maxOutputTokens',  // Google uses camelCase
      reason: 'Maximum output tokens (100 tokens ≈ 60-80 words)',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      default: 0.95,
      alternativeName: 'topP',  // Google uses camelCase
      reason: 'Nucleus sampling threshold',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      alternativeName: 'topK',  // Google uses camelCase
      reason: 'Sample from top K tokens',
    },
    stop: {
      supported: true,
      alternativeName: 'stopSequences',  // Google uses camelCase
    },
  },
  modelFamilies: [
    geminiFamilySpec,
  ],
  parameterTransformer: transformGoogleParameters,
  notes: `
Google Gemini API Quirks:
- Uses camelCase parameter names (must transform to snake_case)
- Gemini 3 models MUST use temperature=1.0 (risk of looping otherwise)
  `,
};
