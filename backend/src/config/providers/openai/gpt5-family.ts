import { ModelFamilySpec } from '../base-provider-spec';

/**
 * GPT-5 Model Family Specification
 *
 * Models: gpt-5, gpt-5-mini, gpt-5.1-chat
 *
 * Characteristics:
 * - Uses max_completion_tokens instead of max_tokens
 * - Some models (gpt-5-mini, gpt-5.1-chat) only support temperature=1.0
 */
export const gpt5FamilySpec: ModelFamilySpec = {
  familyName: 'GPT-5 Family',
  modelPattern: /^gpt-5/i,
  apiVersion: '2024-12-01',
  parameters: {
    temperature: {
      supported: true,
      allowedValues: [1.0],  // Restricted for gpt-5-mini, gpt-5.1-chat
      default: 1.0,
      reason: 'GPT-5 restricted models only support temperature=1.0 due to architecture',
      apiVersion: '2024-12-01',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 4096,
      default: 1000,
      alternativeName: 'max_completion_tokens',  // GPT-5 uses different name
      reason: 'GPT-5 models use max_completion_tokens parameter',
    },
    top_p: {
      supported: false,
      reason: 'Not supported with temperature restriction',
    },
    frequency_penalty: {
      supported: true,
      min: -2.0,
      max: 2.0,
      default: 0,
    },
    presence_penalty: {
      supported: true,
      min: -2.0,
      max: 2.0,
      default: 0,
    },
  },
  notes: `
GPT-5 Restrictions:
- gpt-5-mini: temperature=1.0 only
- gpt-5.1-chat: temperature=1.0 only
- All GPT-5: max_completion_tokens instead of max_tokens
  `,
};

/**
 * Check if model is a restricted GPT-5 model
 */
export function isRestrictedGPT5Model(modelId: string): boolean {
  const restrictedModels = ['gpt-5-mini', 'gpt-5.1-chat'];
  return restrictedModels.some(restricted => modelId.includes(restricted));
}
