/**
 * Base Provider Specification Types
 *
 * These interfaces define the contract for all provider specifications.
 * Each provider implements these interfaces with their specific rules.
 */

/**
 * Parameter constraint definition
 */
export interface ParameterConstraint {
  supported: boolean;
  min?: number;
  max?: number;
  default?: number | string | boolean;
  allowedValues?: (number | string | boolean)[];
  mutuallyExclusiveWith?: string[];
  alternativeName?: string;          // e.g., max_completion_tokens
  reason?: string;
  apiVersion?: string;                // When this constraint was introduced/changed
}

/**
 * Parameter type definition
 */
export type ParameterType = 'number' | 'string' | 'boolean' | 'array' | 'object';

/**
 * Custom parameter definition (for future/unknown params)
 */
export interface CustomParameterDefinition {
  type: ParameterType;
  constraint: ParameterConstraint;
}

/**
 * Model family specification (e.g., GPT-4, GPT-5, Claude 3)
 */
export interface ModelFamilySpec {
  familyName: string;                 // e.g., "GPT-4", "Claude 3 Opus"
  modelPattern: RegExp;               // Regex to match model IDs in this family
  apiVersion: string;                 // Provider API version
  parameters: Record<string, ParameterConstraint>;
  customParameters?: Record<string, CustomParameterDefinition>;
  notes?: string;                     // Important notes about this family
}

/**
 * Provider specification (complete provider config)
 */
export interface ProviderSpec {
  providerName: string;               // "openai", "anthropic", "google"
  displayName: string;                // "OpenAI", "Anthropic", "Google"
  apiVersion: string;                 // Current API version
  lastUpdated: string;                // ISO date when spec was last updated
  baseParameters: Record<string, ParameterConstraint>;  // Common to all models
  modelFamilies: ModelFamilySpec[];   // Specific model families
  parameterTransformer?: (params: any, modelId: string) => TransformResult;  // Transform params before API call
  notes?: string;                     // Provider-specific notes
}

/**
 * Parameter transformation result
 */
export interface TransformResult {
  transformed: any;
  warnings: string[];
}
