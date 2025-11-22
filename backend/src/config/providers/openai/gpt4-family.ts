import { ModelFamilySpec } from '../base-provider-spec';

/**
 * GPT-4 Model Family Specification
 *
 * Models: gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini
 *
 * Characteristics:
 * - Standard temperature support (0-2.0)
 * - Uses max_tokens parameter
 * - Full parameter support
 */
export const gpt4FamilySpec: ModelFamilySpec = {
  familyName: 'GPT-4 Family',
  modelPattern: /^gpt-4(?!.*-5)/i,  // Matches gpt-4* but not gpt-4-5
  apiVersion: '2024-12-01',
  parameters: {
    temperature: {
      supported: true,
      min: 0,
      max: 2.0,
      default: 0.7,
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 4096,
      default: 1000,
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      default: 1.0,
      reason: 'Use either temperature or top_p, not both',
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
    stop: {
      supported: true,
    },
    n: {
      supported: true,
      min: 1,
      max: 10,
      default: 1,
    },
  },
  notes: 'Standard GPT-4 family with full parameter support',
};
