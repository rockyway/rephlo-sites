import { ModelFamilySpec } from '../base-provider-spec';

/**
 * Gemini Model Family Specification
 *
 * Models: gemini-pro, gemini-pro-vision, gemini-1.5-pro, gemini-3
 *
 * CRITICAL: Gemini 3 models MUST keep temperature=1.0
 */
export const geminiFamilySpec: ModelFamilySpec = {
  familyName: 'Gemini Family',
  modelPattern: /^gemini/i,
  apiVersion: 'v1',
  parameters: {
    temperature: {
      supported: true,
      allowedValues: [1.0],  // Gemini 3 restriction
      default: 1.0,
      reason: 'Gemini 3 models require temperature=1.0 to prevent looping/degraded performance',
      apiVersion: 'v1',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 8192,
      default: 2048,
      alternativeName: 'maxOutputTokens',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      default: 0.95,
      alternativeName: 'topP',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      alternativeName: 'topK',
    },
  },
  notes: `
CRITICAL WARNING (Gemini 3):
- Temperature MUST be 1.0 (default)
- Changing temperature causes looping or degraded performance
- This is a known limitation in Gemini 3 architecture
  `,
};

/**
 * Check if model is Gemini 3 (requires temperature=1.0)
 */
export function isGemini3Model(modelId: string): boolean {
  return /gemini-3/i.test(modelId);
}
