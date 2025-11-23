import { ModelFamilySpec } from '../base-provider-spec';

/**
 * Claude 3 Model Family Specification
 *
 * Models: claude-3-opus, claude-3-sonnet, claude-3-haiku
 *
 * Characteristics:
 * - Standard temperature/top_p support (can use both)
 * - Full parameter support
 */
export const claude3FamilySpec: ModelFamilySpec = {
  familyName: 'Claude 3 Family',
  modelPattern: /^claude-3/i,
  apiVersion: '2023-06-01',
  parameters: {
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
      max: 200000,  // Claude 3 supports up to 200K output
      default: 4096,
      reason: 'Maximum output tokens (required parameter)',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      reason: 'Nucleus sampling threshold',
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
  notes: 'Claude 3 family with full parameter support',
};
