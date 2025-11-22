# Plan 205: Provider Parameter Specifications - Modular Architecture

**Status:** Planning
**Priority:** High
**Created:** 2025-01-19
**Related Plans:** Plan 203 (Model Parameter Constraints)
**Purpose:** Separate provider-specific parameter configurations for easy maintenance when APIs change

---

## Executive Summary

Create a modular, provider-centric architecture for LLM parameter specifications that isolates provider-specific logic into dedicated files. This allows quick updates when providers (OpenAI, Anthropic, Google) change their APIs without touching core validation logic.

**Key Principles**:
- **Separation of Concerns**: Each provider has its own specification file
- **Version Control**: Track API version changes per provider
- **Easy Updates**: Change provider specs without affecting validation logic
- **Type Safety**: TypeScript interfaces ensure consistency
- **Documentation**: Each spec file documents provider-specific quirks

---

## Problem Statement

### Current Issues (Plan 203)

1. **Mixed Concerns**: Provider-specific logic scattered across validation service
2. **Hard to Update**: When OpenAI changes temperature range (0-1 → 0-2), must search entire codebase
3. **No Versioning**: Can't track which API version specs correspond to
4. **Documentation Gap**: Provider quirks not centralized
5. **Rigid Templates**: UI templates hardcoded in React components

### Proposed Solution

**Provider Specification Files**: Dedicated TypeScript files per provider with:
- Parameter definitions (ranges, defaults, constraints)
- API version tracking
- Provider-specific transformations (e.g., Gemini camelCase → snake_case)
- Model family specifications (GPT-4, GPT-5, Claude 3, Claude 4.5, etc.)
- Validation rules (mutually exclusive params, restricted models)

---

## Architecture Overview

### File Structure

```
backend/src/config/
├── providers/
│   ├── index.ts                           # Provider registry and exports
│   ├── base-provider-spec.ts              # Base interfaces and types
│   ├── openai/
│   │   ├── index.ts                       # OpenAI exports
│   │   ├── openai-spec.ts                 # OpenAI parameter specifications
│   │   ├── gpt4-family.ts                 # GPT-4 model family specs
│   │   ├── gpt5-family.ts                 # GPT-5 model family specs
│   │   └── transformers.ts                # OpenAI-specific transformations
│   ├── anthropic/
│   │   ├── index.ts                       # Anthropic exports
│   │   ├── anthropic-spec.ts              # Anthropic parameter specifications
│   │   ├── claude3-family.ts              # Claude 3 model family specs
│   │   ├── claude4-family.ts              # Claude 4 & 4.5 model family specs
│   │   └── transformers.ts                # Anthropic-specific transformations
│   └── google/
│       ├── index.ts                       # Google exports
│       ├── google-spec.ts                 # Google parameter specifications
│       ├── gemini-family.ts               # Gemini model family specs
│       └── transformers.ts                # Google-specific transformations (camelCase → snake_case)
│
└── parameter-specs.ts                     # Main registry (imports all providers)
```

---

## Base Type Definitions

### File: `backend/src/config/providers/base-provider-spec.ts`

```typescript
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
  parameterTransformer?: (params: any) => any;  // Transform params before API call
  notes?: string;                     // Provider-specific notes
}

/**
 * Parameter transformation result
 */
export interface TransformResult {
  transformed: any;
  warnings: string[];
}
```

---

## OpenAI Specification

### File: `backend/src/config/providers/openai/openai-spec.ts`

```typescript
import { ProviderSpec, ParameterConstraint } from '../base-provider-spec';
import { gpt4FamilySpec } from './gpt4-family';
import { gpt5FamilySpec } from './gpt5-family';

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
  notes: `
OpenAI API Changelog:
- 2024-01-01: Temperature range expanded to 0-2.0
- 2024-06-01: GPT-5 models introduced with max_completion_tokens
- 2024-12-01: GPT-5 temperature restrictions for some models
  `,
};
```

### File: `backend/src/config/providers/openai/gpt4-family.ts`

```typescript
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
```

### File: `backend/src/config/providers/openai/gpt5-family.ts`

```typescript
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
```

### File: `backend/src/config/providers/openai/transformers.ts`

```typescript
import { TransformResult } from '../base-provider-spec';

/**
 * OpenAI Parameter Transformer
 *
 * Transforms parameters before sending to OpenAI API
 * Handles GPT-5 max_completion_tokens conversion
 */
export function transformOpenAIParameters(
  params: any,
  modelId: string
): TransformResult {
  const transformed = { ...params };
  const warnings: string[] = [];

  // GPT-5: Convert max_tokens to max_completion_tokens
  if (modelId.match(/^gpt-5/i)) {
    if (transformed.max_tokens !== undefined) {
      transformed.max_completion_tokens = transformed.max_tokens;
      delete transformed.max_tokens;
      warnings.push('Converted max_tokens to max_completion_tokens for GPT-5 model');
    }
  }

  // Remove undefined fields
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) {
      delete transformed[key];
    }
  });

  return { transformed, warnings };
}
```

---

## Anthropic Specification

### File: `backend/src/config/providers/anthropic/anthropic-spec.ts`

```typescript
import { ProviderSpec } from '../base-provider-spec';
import { claude3FamilySpec } from './claude3-family';
import { claude4FamilySpec } from './claude4-family';

/**
 * Anthropic Provider Specification
 *
 * API Version: 2023-06-01
 * Last Updated: 2025-01-19
 *
 * Reference: https://docs.anthropic.com/claude/reference/messages_post
 *
 * Important Notes:
 * - Claude 4.5 & Haiku 4.5: temperature OR top_p (mutually exclusive)
 * - Older models support both temperature and top_p
 * - Recommended: Use temperature only, avoid top_k for most cases
 * - max_tokens is required (no default)
 */
export const anthropicSpec: ProviderSpec = {
  providerName: 'anthropic',
  displayName: 'Anthropic',
  apiVersion: '2023-06-01',
  lastUpdated: '2025-01-19',
  baseParameters: {
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
      max: 200000,  // Claude 4 Sonnet: 64K output
      default: 4096,
      reason: 'Maximum output tokens (required parameter)',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      reason: 'Nucleus sampling. Do not use with temperature on Claude 4.5',
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
  modelFamilies: [
    claude3FamilySpec,
    claude4FamilySpec,
  ],
  notes: `
Anthropic API Changelog:
- 2023-06-01: Messages API introduced
- 2024-10-01: Claude 4.5 mutually exclusive temperature/top_p
  `,
};
```

### File: `backend/src/config/providers/anthropic/claude4-family.ts`

```typescript
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
```

---

## Google Specification

### File: `backend/src/config/providers/google/google-spec.ts`

```typescript
import { ProviderSpec } from '../base-provider-spec';
import { geminiFamilySpec } from './gemini-family';

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
  notes: `
Google Gemini API Quirks:
- Uses camelCase parameter names (must transform to snake_case)
- Gemini 3 models MUST use temperature=1.0 (risk of looping otherwise)
  `,
};
```

### File: `backend/src/config/providers/google/gemini-family.ts`

```typescript
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
```

### File: `backend/src/config/providers/google/transformers.ts`

```typescript
import { TransformResult } from '../base-provider-spec';

/**
 * Google Parameter Transformer
 *
 * Transforms snake_case to camelCase for Google Gemini API
 */
export function transformGoogleParameters(params: any): TransformResult {
  const transformed: any = {};
  const warnings: string[] = [];

  // Parameter name mapping (snake_case → camelCase)
  const nameMapping: Record<string, string> = {
    max_tokens: 'maxOutputTokens',
    top_p: 'topP',
    top_k: 'topK',
    stop: 'stopSequences',
  };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    // Transform parameter name if mapping exists
    const transformedKey = nameMapping[key] || key;
    transformed[transformedKey] = value;

    if (transformedKey !== key) {
      warnings.push(`Transformed '${key}' to '${transformedKey}' for Google API`);
    }
  }

  return { transformed, warnings };
}
```

---

## Provider Registry

### File: `backend/src/config/providers/index.ts`

```typescript
import { ProviderSpec } from './base-provider-spec';
import { openaiSpec } from './openai/openai-spec';
import { anthropicSpec } from './anthropic/anthropic-spec';
import { googleSpec } from './google/google-spec';

/**
 * Provider Registry
 *
 * Central registry of all provider specifications
 * Add new providers here when integrated
 */
export const providerRegistry: Record<string, ProviderSpec> = {
  openai: openaiSpec,
  anthropic: anthropicSpec,
  google: googleSpec,
};

/**
 * Get provider specification by name
 */
export function getProviderSpec(providerName: string): ProviderSpec | undefined {
  return providerRegistry[providerName.toLowerCase()];
}

/**
 * Get all provider names
 */
export function getAllProviderNames(): string[] {
  return Object.keys(providerRegistry);
}

/**
 * Export all provider specs and utilities
 */
export * from './base-provider-spec';
export * from './openai/openai-spec';
export * from './openai/transformers';
export * from './anthropic/anthropic-spec';
export * from './google/google-spec';
export * from './google/transformers';
```

---

## Updated Parameter Validation Service

### File: `backend/src/services/parameterValidation.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { validationError } from '../middleware/error.middleware';
import logger from '../utils/logger';
import { IModelService } from '../interfaces';
import { getProviderSpec } from '../config/providers';
import { ProviderSpec, ModelFamilySpec } from '../config/providers/base-provider-spec';

export interface ParameterValidationResult {
  valid: boolean;
  filteredParams: any;
  errors: string[];
  warnings: string[];
}

@injectable()
export class ParameterValidationService {
  constructor(
    @inject('IModelService') private modelService: IModelService
  ) {}

  /**
   * Validates and filters request parameters against provider specifications
   *
   * NEW: Uses provider specification files instead of hardcoded constraints
   */
  async validateAndFilterParameters(
    modelId: string,
    requestParams: any
  ): Promise<ParameterValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const filteredParams: any = {};

    // Get model information
    const modelInfo = await this.modelService.getModelForInference(modelId);
    const providerName = modelInfo.provider;

    // Get provider specification from registry
    const providerSpec = getProviderSpec(providerName);

    if (!providerSpec) {
      warnings.push(`No specification found for provider '${providerName}', allowing all parameters`);
      return {
        valid: true,
        filteredParams: requestParams,
        errors: [],
        warnings,
      };
    }

    logger.debug('ParameterValidationService: Using provider specification', {
      modelId,
      provider: providerName,
      apiVersion: providerSpec.apiVersion,
    });

    // Find matching model family
    const modelFamily = this.findModelFamily(modelId, providerSpec);

    // Get constraints (model family overrides base parameters)
    const constraints = modelFamily
      ? { ...providerSpec.baseParameters, ...modelFamily.parameters }
      : providerSpec.baseParameters;

    // Validate each parameter
    for (const [paramName, paramValue] of Object.entries(requestParams)) {
      // Skip non-configurable parameters
      if (['model', 'messages', 'stream'].includes(paramName)) {
        filteredParams[paramName] = paramValue;
        continue;
      }

      const constraint = constraints[paramName];

      if (!constraint) {
        warnings.push(`Parameter '${paramName}' not in provider specification, passing through`);
        filteredParams[paramName] = paramValue;
        continue;
      }

      if (!constraint.supported) {
        warnings.push(
          `Parameter '${paramName}' not supported: ${constraint.reason || 'No reason provided'}`
        );
        continue;
      }

      // Validate parameter value
      const result = this.validateParameter(paramName, paramValue, constraint);
      if (result.valid) {
        // Use alternative name if specified
        const finalName = constraint.alternativeName || paramName;
        filteredParams[finalName] = result.value;

        if (finalName !== paramName) {
          warnings.push(`Transformed '${paramName}' to '${finalName}'`);
        }
      } else {
        errors.push(...result.errors);
      }
    }

    // Check mutually exclusive parameters
    for (const [paramName, constraint] of Object.entries(constraints)) {
      if (constraint.mutuallyExclusiveWith && filteredParams[paramName] !== undefined) {
        for (const exclusive of constraint.mutuallyExclusiveWith) {
          if (filteredParams[exclusive] !== undefined) {
            errors.push(
              `Parameters '${paramName}' and '${exclusive}' cannot be used together: ${constraint.reason || ''}`
            );
          }
        }
      }
    }

    // Apply provider-specific transformations
    if (providerSpec.parameterTransformer) {
      const transformResult = providerSpec.parameterTransformer(filteredParams, modelId);
      Object.assign(filteredParams, transformResult.transformed);
      warnings.push(...transformResult.warnings);
    }

    logger.debug('ParameterValidationService: Validation complete', {
      modelId,
      provider: providerName,
      originalParams: Object.keys(requestParams),
      filteredParams: Object.keys(filteredParams),
      errors,
      warnings,
    });

    return {
      valid: errors.length === 0,
      filteredParams,
      errors,
      warnings,
    };
  }

  /**
   * Find matching model family for a model ID
   */
  private findModelFamily(
    modelId: string,
    providerSpec: ProviderSpec
  ): ModelFamilySpec | undefined {
    return providerSpec.modelFamilies.find(family =>
      family.modelPattern.test(modelId)
    );
  }

  /**
   * Validates a single parameter value against its constraint
   * (Same as Plan 203, no changes needed)
   */
  private validateParameter(
    paramName: string,
    value: any,
    constraint: any
  ): { valid: boolean; value?: any; errors: string[] } {
    const errors: string[] = [];

    // Allowed values (discrete set)
    if (constraint.allowedValues && constraint.allowedValues.length > 0) {
      if (!constraint.allowedValues.includes(value)) {
        errors.push(
          `Parameter '${paramName}' must be one of: ${constraint.allowedValues.join(', ')}. Got: ${value}`
        );
        return { valid: false, errors };
      }
      return { valid: true, value, errors: [] };
    }

    // Range validation
    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        errors.push(`Parameter '${paramName}' must be >= ${constraint.min}. Got: ${value}`);
      }
      if (constraint.max !== undefined && value > constraint.max) {
        errors.push(`Parameter '${paramName}' must be <= ${constraint.max}. Got: ${value}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value, errors: [] };
  }
}
```

---

## How to Update When Provider Changes API

### Example: OpenAI Increases Temperature Range

**Scenario**: OpenAI announces temperature range is now 0-3.0 (from 0-2.0)

**Steps** (Single file change):
1. Open `backend/src/config/providers/openai/openai-spec.ts`
2. Update `baseParameters.temperature.max` from `2.0` to `3.0`
3. Update `apiVersion` and `lastUpdated`
4. Add note to changelog
5. Deploy

**Before**:
```typescript
temperature: {
  supported: true,
  min: 0,
  max: 2.0,  // OLD
  default: 0.7,
  apiVersion: '2024-01-01',
},
```

**After**:
```typescript
temperature: {
  supported: true,
  min: 0,
  max: 3.0,  // NEW
  default: 0.7,
  reason: 'Expanded range for enhanced creativity control',
  apiVersion: '2025-02-01',  // When change was introduced
},
```

**That's it!** No changes to validation logic, no changes to UI, no changes to providers.

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Provider logic isolated from validation logic
- Each provider in its own directory
- Easy to find and update

### 2. **Maintainability**
- Single file per provider family
- Clear structure and naming
- Self-documenting code

### 3. **Version Tracking**
- API version per provider
- API version per constraint
- Last updated timestamp

### 4. **Type Safety**
- TypeScript interfaces enforce structure
- Provider registry enforces consistency
- Compile-time checks

### 5. **Scalability**
- Add new providers by creating new directory
- Add new model families by creating new file
- No changes to core validation logic

### 6. **Documentation**
- Spec files serve as documentation
- Notes explain provider quirks
- Changelog tracks changes

---

## Admin UI Integration

### File: `frontend/src/config/provider-templates.ts`

```typescript
import { ProviderSpec } from '../../backend/src/config/providers/base-provider-spec';

/**
 * Frontend Provider Templates
 *
 * Generated from backend provider specifications
 * Can be auto-generated via API endpoint
 */

export interface ProviderTemplate {
  id: string;
  name: string;
  provider: string;
  constraints: Record<string, any>;
}

/**
 * Fetch provider templates from backend API
 */
export async function fetchProviderTemplates(): Promise<ProviderTemplate[]> {
  const response = await fetch('/api/admin/provider-templates');
  return response.json();
}

/**
 * Convert provider spec to UI template
 */
export function specToTemplate(spec: ProviderSpec, familyName?: string): ProviderTemplate {
  // Implementation
}
```

### New Backend Endpoint

```typescript
/**
 * GET /api/admin/provider-templates
 *
 * Returns all provider specifications for admin UI
 * Allows UI to dynamically generate templates
 */
router.get('/provider-templates', async (req, res) => {
  const templates = Object.values(providerRegistry).map(spec => ({
    provider: spec.providerName,
    displayName: spec.displayName,
    apiVersion: spec.apiVersion,
    baseParameters: spec.baseParameters,
    modelFamilies: spec.modelFamilies.map(family => ({
      name: family.familyName,
      pattern: family.modelPattern.toString(),
      parameters: family.parameters,
    })),
  }));

  res.json(templates);
});
```

---

## Migration from Plan 203

### Step 1: Create Provider Specification Files

```bash
cd backend/src/config
mkdir -p providers/openai providers/anthropic providers/google
```

Create all files listed in this plan.

### Step 2: Update ParameterValidationService

Replace Plan 203 implementation with new version that uses provider registry.

### Step 3: Update Providers

Remove hardcoded constraints from `openai.provider.ts`, etc.

### Step 4: Test

Run unit tests to ensure all constraints still work correctly.

---

## Testing Strategy

### Unit Tests: Provider Specifications

```typescript
describe('OpenAI Specification', () => {
  it('should have valid GPT-4 family spec', () => {
    expect(gpt4FamilySpec.familyName).toBe('GPT-4 Family');
    expect(gpt4FamilySpec.modelPattern.test('gpt-4o')).toBe(true);
    expect(gpt4FamilySpec.modelPattern.test('gpt-5')).toBe(false);
  });

  it('should have valid GPT-5 family spec', () => {
    expect(gpt5FamilySpec.parameters.temperature.allowedValues).toEqual([1.0]);
    expect(gpt5FamilySpec.parameters.max_tokens.alternativeName).toBe('max_completion_tokens');
  });
});

describe('Provider Registry', () => {
  it('should return all provider specs', () => {
    const providers = getAllProviderNames();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
  });

  it('should get provider spec by name', () => {
    const spec = getProviderSpec('openai');
    expect(spec?.providerName).toBe('openai');
    expect(spec?.displayName).toBe('OpenAI');
  });
});
```

---

## Documentation Requirements

### Provider Spec README

**File**: `backend/src/config/providers/README.md`

```markdown
# Provider Specifications

This directory contains provider-specific parameter specifications for LLM APIs.

## Structure

Each provider has its own directory with:
- `{provider}-spec.ts` - Main provider specification
- `{family}-family.ts` - Model family specifications
- `transformers.ts` - Parameter transformations

## Adding a New Provider

1. Create directory: `providers/newprovider/`
2. Create spec file: `newprovider-spec.ts`
3. Create family files: `model-family.ts`
4. Add to registry: `providers/index.ts`
5. Update tests

## Updating Provider Specs

When a provider changes their API:
1. Find the relevant spec file
2. Update parameter constraints
3. Update `apiVersion` and `lastUpdated`
4. Add changelog note
5. Run tests
6. Deploy

## File Naming Convention

- Spec files: `{provider}-spec.ts`
- Family files: `{family}-family.ts`
- Transformers: `transformers.ts`
```

---

## Success Metrics

- **Update Speed**: Provider API change → Production in <30 minutes
- **Code Changes**: Single file edit for most updates
- **Test Coverage**: 100% coverage on provider specs
- **Type Safety**: Zero TypeScript errors in provider specs

---

## Future Enhancements

1. **Auto-Generation**: Generate specs from provider OpenAPI docs
2. **Version History**: Track all API version changes
3. **Migration Tools**: Auto-migrate between API versions
4. **Spec Validation**: Validate spec files against schema on startup

---

**Document Version**: 1.0
**Last Updated**: 2025-01-19
**Next Review**: After provider spec implementation
