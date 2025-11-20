import { ProviderSpec, ParameterConstraint } from '../base-provider-spec';
import { gpt4FamilySpec } from './gpt4-family';
import { gpt5FamilySpec } from './gpt5-family';
import { transformOpenAIParameters } from './transformers';

/**
 * OpenAI Provider Specification
 *
 * API Version: 2024-12-01
 * Last Updated: 2025-01-19
 *
 * Reference: https://platform.openai.com/docs/api-reference/chat/create
 *
 * Important Notes:
 * - Temperature range expanded from 0-1 to 0-2 in 2024
 * - GPT-5 models use max_completion_tokens instead of max_tokens
 * - Some GPT-5 models (gpt-5-mini, gpt-5.1-chat) only support temperature=1.0
 */

/**
 * Base parameters common to all OpenAI models
 */
export const openaiBaseParameters: Record<string, ParameterConstraint> = {
  temperature: {
    supported: true,
    min: 0,
    max: 2.0,
    default: 0.7,
    reason: 'Controls randomness. Lower = deterministic, Higher = creative',
    apiVersion: '2024-01-01',  // When 0-2 range was introduced
  },
  max_tokens: {
    supported: true,
    min: 1,
    max: 4096,  // Model-specific, this is conservative default
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
 * Complete OpenAI specification
 */
export const openaiSpec: ProviderSpec = {
  providerName: 'openai',
  displayName: 'OpenAI',
  apiVersion: '2024-12-01',
  lastUpdated: '2025-01-19',
  baseParameters: openaiBaseParameters,
  modelFamilies: [
    gpt4FamilySpec,
    gpt5FamilySpec,
  ],
  parameterTransformer: transformOpenAIParameters,
  notes: `
OpenAI API Changelog:
- 2024-01-01: Temperature range expanded to 0-2.0
- 2024-06-01: GPT-5 models introduced with max_completion_tokens
- 2024-12-01: GPT-5 temperature restrictions for some models
  `,
};
