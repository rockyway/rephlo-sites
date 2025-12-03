import { ModelFamilySpec } from '../base-provider-spec';

/**
 * Grok 3 Model Family Specification
 *
 * Models: grok-3, grok-3-fast
 *
 * Characteristics:
 * - 131K context window
 * - OpenAI-compatible API
 * - Standard parameter support
 * - Cache pricing: 75% (standard), 90% (fast)
 */
export const grok3FamilySpec: ModelFamilySpec = {
  familyName: 'Grok 3 Family',
  modelPattern: /^grok-3(?!-\d)/i,  // Matches grok-3* but not grok-3-<digit>
  apiVersion: '2025-01-01',
  parameters: {
    temperature: {
      supported: true,
      min: 0,
      max: 2.0,
      default: 0.7,
      reason: 'Controls randomness. Lower = deterministic, Higher = creative',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 131072,  // 131K context
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
  },
  notes: 'Grok 3 series with 131K context. grok-3-fast has 90% cache discount.',
};
