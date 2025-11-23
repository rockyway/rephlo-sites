import { ModelFamilySpec } from '../base-provider-spec';

/**
 * Claude 4 & 4.5 Model Family Specification
 *
 * Models: claude-4-opus, claude-sonnet-4.5, claude-haiku-4.5
 *
 * CRITICAL: Claude 4.5 (Sonnet, Haiku) only supports temperature OR top_p, NOT BOTH
 */
export const claude4FamilySpec: ModelFamilySpec = {
  familyName: 'Claude 4 & 4.5 Family',
  modelPattern: /^claude-(4|sonnet-4\.5|haiku-4\.5)/i,
  apiVersion: '2023-06-01',
  parameters: {
    temperature: {
      supported: true,
      min: 0.0,
      max: 1.0,
      default: 1.0,
      mutuallyExclusiveWith: ['top_p'],
      reason: 'Claude 4.5 only supports temperature OR top_p, not both',
      apiVersion: '2024-10-01',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 64000,  // Claude 4 Sonnet supports 64K output
      default: 4096,
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      mutuallyExclusiveWith: ['temperature'],
      reason: 'Claude 4.5 only supports temperature OR top_p, not both',
      apiVersion: '2024-10-01',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      reason: 'Advanced use only',
    },
  },
  notes: `
CRITICAL RESTRICTION (Claude 4.5 & Haiku 4.5):
- Can specify EITHER temperature OR top_p, NOT BOTH
- Older Claude 4 models support both simultaneously
- API will return error if both are specified for 4.5 models
  `,
};

/**
 * Check if model has mutually exclusive temperature/top_p
 */
export function isClaude45Model(modelId: string): boolean {
  return /claude-(sonnet-4\.5|haiku-4\.5)/i.test(modelId);
}
