import { ModelFamilySpec } from '../base-provider-spec';

/**
 * Grok 4 Model Family Specification
 *
 * Models:
 * - grok-4-0709 (256K context, flagship)
 * - grok-4-1-fast-reasoning (2M context, reasoning v2)
 * - grok-4-1-fast-non-reasoning (2M context, fast)
 * - grok-4-l-fast-non-reasoning (2M context, large fast)
 * - grok-code-fast-1 (2M context, code optimized)
 *
 * Characteristics:
 * - Extended context (256K to 2M)
 * - OpenAI-compatible API
 * - Reasoning variants available
 * - Cache pricing: 75% (flagship), 90% (fast variants)
 */
export const grok4FamilySpec: ModelFamilySpec = {
  familyName: 'Grok 4 Family',
  modelPattern: /^grok-(?:4|code)/i,  // Matches grok-4* and grok-code*
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
      max: 2000000,  // 2M context for extended models
      default: 1000,
      reason: 'Maximum tokens to generate. Context size varies by model (256K-2M)',
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
  notes: `
Grok 4 family includes multiple variants:
- grok-4-0709: Flagship model, 256K context, 75% cache discount
- grok-4-1-fast-reasoning: Reasoning v2, 2M context, chain-of-thought, 90% cache discount
- grok-4-1-fast-non-reasoning: Fast variant, 2M context, 90% cache discount
- grok-4-l-fast-non-reasoning: Large fast variant, 2M context, 90% cache discount
- grok-code-fast-1: Code-optimized, 2M context, 90% cache discount
  `,
};
