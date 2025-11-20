# Plan 203: Model Parameter Constraints - Admin Configuration System

**Status:** Planning
**Priority:** High
**Created:** 2025-11-19
**Updated:** 2025-01-19 (Added parameter research, UI mockups, custom field support)
**Dependencies:** Existing model metadata (JSONB meta field)

---

## Executive Summary

Replace hardcoded model parameter constraints (temperature, max_tokens, etc.) with a flexible, admin-configurable system stored in the model's `meta` field. This allows admins to define per-model parameter restrictions through the Admin UI without code changes.

**Key Features**:
- Admin UI for configuring parameter constraints per model
- Support for all major LLM parameters (OpenAI, Anthropic, Google)
- Custom field support for unknown/future parameters
- Automatic validation and filtering at runtime
- Provider-agnostic constraint system

---

## Problem Statement

### Current Issues

1. **Hardcoded Constraints**: Temperature restrictions for `gpt-5-mini` and `gpt-5.1-chat` are hardcoded in `openai.provider.ts` (lines 87-90, 117-122)
2. **Inflexible**: Adding new models with parameter restrictions requires code changes and deployments
3. **Vendor Changes**: When providers update model capabilities, we must modify code
4. **Limited Visibility**: Admins cannot see or modify parameter constraints without developer intervention
5. **Inconsistent Enforcement**: Different parameter rules are scattered across provider implementations

### Proposed Solution

Store parameter constraints in the model's `meta` JSONB field with a well-defined schema, configurable through the Admin UI.

---

## Parameter Research (2025)

### OpenAI Chat Completions API

**Standard Parameters** (snake_case naming):

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `temperature` | number | 0 - 2.0 | 0.7 | Controls randomness. Lower = deterministic, Higher = creative |
| `max_tokens` | integer | 1 - model_max | 1000 | Maximum tokens to generate |
| `top_p` | number | 0 - 1.0 | 1.0 | Nucleus sampling threshold. Don't use with temperature |
| `frequency_penalty` | number | -2.0 - 2.0 | 0 | Penalize repeated tokens |
| `presence_penalty` | number | -2.0 - 2.0 | 0 | Penalize already mentioned tokens |
| `stop` | string \| array | - | null | Stop sequences (max 4) |
| `n` | integer | 1 - 10 | 1 | Number of completions to generate |

**GPT-5 Specific**:
- `max_completion_tokens`: Replaces `max_tokens` for GPT-5 models
- `gpt-5-mini`, `gpt-5.1-chat`: Only support temperature=1.0 (default)

### Anthropic Claude API

**Standard Parameters** (snake_case naming):

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `temperature` | number | 0.0 - 1.0 | 1.0 | Randomness control (0 = near-deterministic) |
| `max_tokens` | integer | 1 - 200,000 | Required | Maximum output tokens (Claude 4 Sonnet: 64K) |
| `top_p` | number | 0 - 1.0 | - | Nucleus sampling. Don't use with temperature |
| `top_k` | integer | 0 - 100 | 40 | Sample from top K tokens only |
| `stop_sequences` | array | - | null | Stop sequences (max 4) |

**Important Notes**:
- **Claude Sonnet 4.5 & Haiku 4.5**: Can specify either `temperature` OR `top_p`, NOT BOTH
- Older models support both parameters simultaneously
- Recommended: Use temperature only, avoid top_k for most cases

### Google Gemini API

**Standard Parameters** (camelCase naming - requires transformation):

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `temperature` | number | 0 - 2.0 | 1.0 | Randomness control (0 = deterministic) |
| `maxOutputTokens` | integer | 1 - model_max | 8192 | Maximum output tokens |
| `topP` | number | 0 - 1.0 | 0.95 | Nucleus sampling threshold |
| `topK` | integer | 0 - 100 | 40 | Sample from top K tokens |
| `stopSequences` | array | - | null | Stop sequences |

**Important Notes**:
- **Gemini 3 Models**: MUST keep temperature at 1.0 (default). Changing causes looping/degraded performance
- 100 tokens ≈ 60-80 words

**Transformation**: Backend must convert camelCase to snake_case for API consistency:
- `maxOutputTokens` → `max_tokens`
- `topP` → `top_p`
- `topK` → `top_k`
- `stopSequences` → `stop_sequences`

---

## Data Model Design

### Model Meta Schema Extension

Add a new `parameterConstraints` object to the `meta` field:

```typescript
interface ModelMeta {
  // Existing fields...
  displayName: string;
  description: string;
  capabilities: string[];
  pricing: { ... };
  tierAccess: { ... };

  // NEW: Parameter constraints
  parameterConstraints?: {
    temperature?: {
      supported: boolean;           // Can this parameter be used?
      min?: number;                 // Minimum allowed value
      max?: number;                 // Maximum allowed value
      default?: number;             // Default value if not specified
      allowedValues?: number[];     // Discrete allowed values (e.g., [1.0])
      mutuallyExclusiveWith?: string[];  // Cannot be used with these params
      reason?: string;              // Admin note explaining the restriction
    };
    max_tokens?: {                  // snake_case for API consistency
      supported: boolean;
      min?: number;
      max?: number;
      default?: number;
      alternativeName?: string;     // e.g., "max_completion_tokens" for GPT-5
      reason?: string;
    };
    top_p?: {
      supported: boolean;
      min?: number;
      max?: number;
      default?: number;
      mutuallyExclusiveWith?: string[];  // e.g., ["temperature"]
      reason?: string;
    };
    top_k?: {                       // Anthropic, Google only
      supported: boolean;
      min?: number;
      max?: number;
      default?: number;
      reason?: string;
    };
    presence_penalty?: {
      supported: boolean;
      min?: number;
      max?: number;
      default?: number;
      reason?: string;
    };
    frequency_penalty?: {
      supported: boolean;
      min?: number;
      max?: number;
      default?: number;
      reason?: string;
    };
    stop?: {
      supported: boolean;
      maxSequences?: number;        // Max number of stop sequences
      maxLength?: number;           // Max length per sequence
      reason?: string;
    };
    n?: {
      supported: boolean;
      max?: number;                 // Max number of completions
      reason?: string;
    };
    // Custom fields (future-proofing)
    customParameters?: Record<string, {
      supported: boolean;
      type: 'string' | 'number' | 'boolean' | 'array';
      min?: number;                 // For numbers
      max?: number;                 // For numbers
      default?: any;
      allowedValues?: any[];        // Discrete values
      reason?: string;
    }>;
  };
}
```

### Example Configurations

**GPT-5.1-Chat** (Restricted Temperature):
```json
{
  "parameterConstraints": {
    "temperature": {
      "supported": true,
      "allowedValues": [1.0],
      "default": 1.0,
      "reason": "GPT-5.1-chat only supports default temperature (1.0)"
    },
    "max_tokens": {
      "supported": true,
      "min": 1,
      "max": 4096,
      "default": 1000,
      "alternativeName": "max_completion_tokens"
    },
    "top_p": {
      "supported": false,
      "reason": "Not supported with temperature restriction"
    },
    "frequency_penalty": {
      "supported": true,
      "min": -2.0,
      "max": 2.0,
      "default": 0
    },
    "presence_penalty": {
      "supported": true,
      "min": -2.0,
      "max": 2.0,
      "default": 0
    }
  }
}
```

**Claude Sonnet 4.5** (Mutually Exclusive Temperature/Top-P):
```json
{
  "parameterConstraints": {
    "temperature": {
      "supported": true,
      "min": 0.0,
      "max": 1.0,
      "default": 1.0,
      "mutuallyExclusiveWith": ["top_p"],
      "reason": "Claude 4.5 only supports temperature OR top_p, not both"
    },
    "max_tokens": {
      "supported": true,
      "min": 1,
      "max": 64000,
      "default": 4096
    },
    "top_p": {
      "supported": true,
      "min": 0,
      "max": 1.0,
      "mutuallyExclusiveWith": ["temperature"],
      "reason": "Claude 4.5 only supports temperature OR top_p, not both"
    },
    "top_k": {
      "supported": true,
      "min": 0,
      "max": 100,
      "default": 40,
      "reason": "Advanced use only. Recommended: use temperature instead"
    }
  }
}
```

**Gemini Pro 1.5** (Temperature Lock for Gemini 3):
```json
{
  "parameterConstraints": {
    "temperature": {
      "supported": true,
      "allowedValues": [1.0],
      "default": 1.0,
      "reason": "Gemini 3 models require temperature=1.0 to prevent looping"
    },
    "max_tokens": {
      "supported": true,
      "min": 1,
      "max": 8192,
      "default": 2048,
      "alternativeName": "maxOutputTokens"
    },
    "top_p": {
      "supported": true,
      "min": 0,
      "max": 1.0,
      "default": 0.95
    },
    "top_k": {
      "supported": true,
      "min": 0,
      "max": 100,
      "default": 40
    }
  }
}
```

**GPT-4o** (Standard Configuration):
```json
{
  "parameterConstraints": {
    "temperature": {
      "supported": true,
      "min": 0,
      "max": 2.0,
      "default": 0.7
    },
    "max_tokens": {
      "supported": true,
      "min": 1,
      "max": 4096,
      "default": 1000
    },
    "top_p": {
      "supported": true,
      "min": 0,
      "max": 1.0,
      "default": 1.0,
      "reason": "Don't use with temperature - choose one"
    },
    "frequency_penalty": {
      "supported": true,
      "min": -2.0,
      "max": 2.0,
      "default": 0
    },
    "presence_penalty": {
      "supported": true,
      "min": -2.0,
      "max": 2.0,
      "default": 0
    },
    "stop": {
      "supported": true,
      "maxSequences": 4,
      "maxLength": 256
    },
    "n": {
      "supported": true,
      "max": 10
    }
  }
}
```

---

## ASCII UI Mockups

### Main Admin UI: Add/Edit Model Dialog

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Add New Model                                                     [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ BASIC INFORMATION                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Model ID:         [gpt-5.1-chat                                    ] │ │
│ │ Display Name:     [GPT-5.1 Chat                                    ] │ │
│ │ Provider:         [▼ OpenAI                                        ] │ │
│ │ Description:      [Fast, efficient chat model with restrictions   ] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ PARAMETER CONSTRAINTS                                    [▼ Expand All] │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                       │ │
│ │ ┌── Temperature ──────────────────────────────────────────────────┐ │ │
│ │ │ ☑ Supported                                                      │ │ │
│ │ │                                                                  │ │ │
│ │ │ Constraint Type:  ◉ Allowed Values  ○ Range  ○ Not Supported   │ │ │
│ │ │                                                                  │ │ │
│ │ │ Allowed Values:  [1.0        ] [+ Add Value]                    │ │ │
│ │ │                                                                  │ │ │
│ │ │ Default Value:   [1.0        ]                                  │ │ │
│ │ │                                                                  │ │ │
│ │ │ Reason/Note:     [GPT-5.1-chat only supports temperature=1.0  ] │ │ │
│ │ │                  [due to model architecture limitations        ] │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │ ┌── Max Tokens ───────────────────────────────────────────────────┐ │ │
│ │ │ ☑ Supported                                                      │ │ │
│ │ │                                                                  │ │ │
│ │ │ Constraint Type:  ○ Allowed Values  ◉ Range  ○ Not Supported   │ │ │
│ │ │                                                                  │ │ │
│ │ │ Min Value:        [1           ]                                │ │ │
│ │ │ Max Value:        [4096        ]                                │ │ │
│ │ │ Default Value:    [1000        ]                                │ │ │
│ │ │                                                                  │ │ │
│ │ │ Alternative Name: [max_completion_tokens] (for GPT-5 models)    │ │ │
│ │ │                                                                  │ │ │
│ │ │ Reason/Note:     [GPT-5 models use max_completion_tokens       ] │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │ ┌── Top-P ────────────────────────────────────────────────────────┐ │ │
│ │ │ ☐ Supported                                                      │ │ │
│ │ │                                                                  │ │ │
│ │ │ Constraint Type:  ○ Allowed Values  ○ Range  ◉ Not Supported   │ │ │
│ │ │                                                                  │ │ │
│ │ │ Reason/Note:     [Not supported with temperature restriction   ] │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │ ┌── Frequency Penalty ────────────────────────────────────────────┐ │ │
│ │ │ ☑ Supported                                                      │ │ │
│ │ │                                                                  │ │ │
│ │ │ Constraint Type:  ○ Allowed Values  ◉ Range  ○ Not Supported   │ │ │
│ │ │                                                                  │ │ │
│ │ │ Min Value:        [-2.0        ]                                │ │ │
│ │ │ Max Value:        [2.0         ]                                │ │ │
│ │ │ Default Value:    [0           ]                                │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │ ┌── Presence Penalty ─────────────────────────────────────────────┐ │ │
│ │ │ ☑ Supported                                                      │ │ │
│ │ │ (Same layout as Frequency Penalty)                              │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │ [+ Add More Standard Parameters ▼]                                  │ │
│ │    - Top-K (Anthropic, Google)                                      │ │
│ │    - Stop Sequences                                                 │ │
│ │    - N (Number of Completions)                                      │ │
│ │                                                                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ CUSTOM PARAMETERS                                         [+ Add Custom] │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ No custom parameters defined.                                       │ │
│ │                                                                       │ │
│ │ Custom parameters allow you to configure future or provider-        │ │
│ │ specific parameters not in the standard list.                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                                                           │
│                           [Cancel]  [Save Model]                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Custom Parameter Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Custom Parameter                                      [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Parameter Name:  [response_format                             ] │
│                  (Use snake_case format)                         │
│                                                                   │
│ Parameter Type:  [▼ String                                    ] │
│                  Options: String, Number, Boolean, Array        │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☑ Supported                                                 │ │
│ │                                                             │ │
│ │ Constraint Type:  ◉ Allowed Values  ○ Range                │ │
│ │                                                             │ │
│ │ Allowed Values:   [json_object     ] [+ Add Value]         │ │
│ │                   [text            ] [Remove]               │ │
│ │                                                             │ │
│ │ Default Value:    [text            ]                        │ │
│ │                                                             │ │
│ │ Mutually Exclusive With:  [              ] [+ Add]         │ │
│ │ (Parameter names separated by commas)                      │ │
│ │                                                             │ │
│ │ Reason/Note:      [Controls output format for structured  ] │ │
│ │                   [JSON responses                          ] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                                                                   │
│                        [Cancel]  [Add Parameter]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Parameter Constraint Template Selector

```
┌─────────────────────────────────────────────────────────────────┐
│ Select Parameter Template                                 [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Choose a pre-configured template for common model types:        │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ◉ OpenAI GPT-4 (Standard)                                   │ │
│ │   Full parameter support: temperature, max_tokens, top_p,   │ │
│ │   frequency_penalty, presence_penalty, stop, n              │ │
│ │                                                             │ │
│ │ ○ OpenAI GPT-5 (Restricted Temperature)                     │ │
│ │   Temperature locked to 1.0, uses max_completion_tokens     │ │
│ │                                                             │ │
│ │ ○ Anthropic Claude 4.5 (Mutually Exclusive)                 │ │
│ │   Temperature OR top_p (not both), supports top_k           │ │
│ │                                                             │ │
│ │ ○ Google Gemini 3 (Temperature Locked)                      │ │
│ │   Temperature must be 1.0, supports topK and topP           │ │
│ │                                                             │ │
│ │ ○ Custom (Start from scratch)                               │ │
│ │   Manually configure all parameters                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Preview of selected template will appear below:                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ OpenAI GPT-4 (Standard)                                     │ │
│ │ • temperature: 0 - 2.0 (default: 0.7)                       │ │
│ │ • max_tokens: 1 - 4096 (default: 1000)                      │ │
│ │ • top_p: 0 - 1.0 (default: 1.0)                             │ │
│ │ • frequency_penalty: -2.0 - 2.0 (default: 0)                │ │
│ │ • presence_penalty: -2.0 - 2.0 (default: 0)                 │ │
│ │ • stop: max 4 sequences                                     │ │
│ │ • n: max 10 completions                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                   [Cancel]  [Apply Template]                     │
└─────────────────────────────────────────────────────────────────┘
```

### Parameter Constraints Quick View (Collapsed State)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Model: GPT-5.1 Chat                                      [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────────────┤
│ Parameter Constraints Summary:                   [▶ Expand]             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ temperature:         Allowed: [1.0] (RESTRICTED)                    │ │
│ │ max_tokens:          Range: 1 - 4096 (default: 1000)                │ │
│ │ top_p:               NOT SUPPORTED                                  │ │
│ │ frequency_penalty:   Range: -2.0 - 2.0 (default: 0)                 │ │
│ │ presence_penalty:    Range: -2.0 - 2.0 (default: 0)                 │ │
│ │                                                                       │ │
│ │ 3 more parameters... [Show All]                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### 1. Parameter Validation Service

**File**: `backend/src/services/parameterValidation.service.ts` (NEW)

```typescript
import { injectable, inject } from 'tsyringe';
import { validationError } from '../middleware/error.middleware';
import logger from '../utils/logger';
import { IModelService } from '../interfaces';

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
   * Validates and filters request parameters against model constraints
   *
   * @param modelId - Model ID
   * @param requestParams - Raw request parameters from client
   * @returns Validation result with filtered parameters
   */
  async validateAndFilterParameters(
    modelId: string,
    requestParams: any
  ): Promise<ParameterValidationResult> {
    // Get model metadata
    const model = await this.modelService.getModelForInference(modelId);
    const constraints = (model.meta as any)?.parameterConstraints;

    if (!constraints) {
      // No constraints defined, allow all parameters
      logger.debug('ParameterValidationService: No constraints for model', { modelId });
      return {
        valid: true,
        filteredParams: requestParams,
        errors: [],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const filteredParams: any = {};

    // Validate each parameter
    for (const [paramName, paramValue] of Object.entries(requestParams)) {
      const constraint = constraints[paramName];

      // Skip validation for non-configurable parameters (model, messages, stream)
      if (['model', 'messages', 'stream'].includes(paramName)) {
        filteredParams[paramName] = paramValue;
        continue;
      }

      // Unknown parameter (not in constraints)
      if (!constraint) {
        // Check custom parameters
        const customConstraint = constraints.customParameters?.[paramName];
        if (customConstraint) {
          const result = this.validateParameter(paramName, paramValue, customConstraint);
          if (result.valid) {
            filteredParams[paramName] = result.value;
          } else {
            errors.push(...result.errors);
          }
        } else {
          // Unknown parameter, pass through with warning
          warnings.push(`Parameter '${paramName}' not configured for model, passing through`);
          filteredParams[paramName] = paramValue;
        }
        continue;
      }

      // Parameter not supported
      if (constraint.supported === false) {
        warnings.push(
          `Parameter '${paramName}' is not supported for this model: ${constraint.reason || 'No reason provided'}`
        );
        continue; // Exclude from filtered params
      }

      // Validate parameter value
      const result = this.validateParameter(paramName, paramValue, constraint);
      if (result.valid) {
        // Use alternative name if specified (e.g., max_completion_tokens)
        const finalName = constraint.alternativeName || paramName;
        filteredParams[finalName] = result.value;
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

    // Apply defaults for missing parameters
    for (const [paramName, constraint] of Object.entries(constraints)) {
      if (constraint.supported && constraint.default !== undefined && filteredParams[paramName] === undefined) {
        const finalName = constraint.alternativeName || paramName;
        filteredParams[finalName] = constraint.default;
      }
    }

    logger.debug('ParameterValidationService: Validation complete', {
      modelId,
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
   * Validates a single parameter value against its constraint
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

    // Range validation (min/max)
    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        errors.push(
          `Parameter '${paramName}' must be >= ${constraint.min}. Got: ${value}`
        );
      }
      if (constraint.max !== undefined && value > constraint.max) {
        errors.push(
          `Parameter '${paramName}' must be <= ${constraint.max}. Got: ${value}`
        );
      }
    }

    // Array validation (e.g., stop sequences)
    if (Array.isArray(value) && constraint.maxSequences !== undefined) {
      if (value.length > constraint.maxSequences) {
        errors.push(
          `Parameter '${paramName}' can have max ${constraint.maxSequences} items. Got: ${value.length}`
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value, errors: [] };
  }
}
```

### 2. Update LLM Service

**File**: `backend/src/services/llm.service.ts`

**Add Parameter Validation**:
```typescript
import { ParameterValidationService } from './parameterValidation.service';

@injectable()
export class LLMService {
  constructor(
    // ... existing dependencies
    @inject(ParameterValidationService) private parameterValidationService: ParameterValidationService
  ) {}

  /**
   * Updated chat completion with parameter validation
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    userId: string
  ): Promise<ChatCompletionResponse> {
    // Validate and filter parameters
    const validationResult = await this.parameterValidationService.validateAndFilterParameters(
      request.model,
      request
    );

    if (!validationResult.valid) {
      logger.error('LLMService: Parameter validation failed', {
        model: request.model,
        errors: validationResult.errors,
      });
      throw validationError(
        `Invalid parameters for model '${request.model}': ${validationResult.errors.join(', ')}`
      );
    }

    // Log warnings
    if (validationResult.warnings.length > 0) {
      logger.warn('LLMService: Parameter validation warnings', {
        model: request.model,
        warnings: validationResult.warnings,
      });
    }

    // Use filtered parameters
    const filteredRequest = { ...validationResult.filteredParams };

    logger.debug('LLMService: Parameters validated and filtered', {
      model: request.model,
      originalParams: Object.keys(request),
      filteredParams: Object.keys(filteredRequest),
    });

    // Delegate to provider with filtered parameters
    const provider = this.getProviderForModel(modelProvider);
    const result = await provider.chatCompletion(filteredRequest);

    // ... existing usage tracking code
  }
}
```

### 3. Remove Hardcoded Constraints from Providers

**File**: `backend/src/providers/openai.provider.ts`

**Before** (Lines 87-122):
```typescript
private hasRestrictedTemperature(model: string): boolean {
  const restrictedModels = ['gpt-5-mini', 'gpt-5.1-chat'];
  return restrictedModels.some(restricted => model.includes(restricted));
}

private buildChatParams(request: ChatCompletionRequest, streaming: boolean = false): any {
  const isGPT5 = this.isGPT5Model(request.model);
  const hasTemperatureRestriction = this.hasRestrictedTemperature(request.model);

  const params: any = {
    model: request.model,
    messages: request.messages,
    stop: request.stop,
    presence_penalty: request.presence_penalty,
    frequency_penalty: request.frequency_penalty,
    n: request.n,
  };

  // GPT-5 models use max_completion_tokens instead of max_tokens
  if (isGPT5) {
    params.max_completion_tokens = request.max_tokens;
  } else {
    params.max_tokens = request.max_tokens;
  }

  // Some models only support default temperature (1.0)
  // Do not send temperature/top_p for these models
  if (!hasTemperatureRestriction) {
    params.temperature = request.temperature;
    params.top_p = request.top_p;
  }

  // ... rest of method
}
```

**After** (Simplified):
```typescript
private buildChatParams(request: ChatCompletionRequest, streaming: boolean = false): any {
  // LLMService has already validated and filtered parameters
  // Just pass them through to OpenAI API
  const params: any = {
    model: request.model,
    messages: request.messages,
    max_tokens: request.max_tokens,
    max_completion_tokens: request.max_completion_tokens, // If provided by filter
    temperature: request.temperature,
    top_p: request.top_p,
    stop: request.stop,
    presence_penalty: request.presence_penalty,
    frequency_penalty: request.frequency_penalty,
    n: request.n,
  };

  // Remove undefined fields
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  if (streaming) {
    params.stream = true;
  }

  return params;
}
```

---

## Admin UI Components (React + TypeScript)

### 1. Parameter Constraints Editor Component

**File**: `frontend/src/components/admin/ParameterConstraintsEditor.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';

// Parameter constraint types
interface ParameterConstraint {
  supported: boolean;
  min?: number;
  max?: number;
  default?: number;
  allowedValues?: number[];
  mutuallyExclusiveWith?: string[];
  alternativeName?: string;
  reason?: string;
}

interface ParameterConstraintsEditorProps {
  constraints: Record<string, ParameterConstraint>;
  onChange: (constraints: Record<string, ParameterConstraint>) => void;
  availableParameters?: string[];
}

export const ParameterConstraintsEditor: React.FC<ParameterConstraintsEditorProps> = ({
  constraints,
  onChange,
  availableParameters = [
    'temperature',
    'max_tokens',
    'top_p',
    'top_k',
    'frequency_penalty',
    'presence_penalty',
    'stop',
    'n',
  ],
}) => {
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const toggleExpand = (paramName: string) => {
    const newExpanded = new Set(expandedParams);
    if (newExpanded.has(paramName)) {
      newExpanded.delete(paramName);
    } else {
      newExpanded.add(paramName);
    }
    setExpandedParams(newExpanded);
  };

  const updateConstraint = (paramName: string, updates: Partial<ParameterConstraint>) => {
    onChange({
      ...constraints,
      [paramName]: {
        ...constraints[paramName],
        ...updates,
      },
    });
  };

  const applyTemplate = (templateName: string) => {
    const templates = {
      'openai-gpt4': {
        temperature: { supported: true, min: 0, max: 2.0, default: 0.7 },
        max_tokens: { supported: true, min: 1, max: 4096, default: 1000 },
        top_p: { supported: true, min: 0, max: 1.0, default: 1.0, reason: "Don't use with temperature" },
        frequency_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
        presence_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
      },
      'openai-gpt5-restricted': {
        temperature: { supported: true, allowedValues: [1.0], default: 1.0, reason: 'GPT-5 restricted models only support temperature=1.0' },
        max_tokens: { supported: true, min: 1, max: 4096, default: 1000, alternativeName: 'max_completion_tokens' },
        top_p: { supported: false, reason: 'Not supported with temperature restriction' },
      },
      'anthropic-claude45': {
        temperature: { supported: true, min: 0.0, max: 1.0, default: 1.0, mutuallyExclusiveWith: ['top_p'] },
        max_tokens: { supported: true, min: 1, max: 64000, default: 4096 },
        top_p: { supported: true, min: 0, max: 1.0, mutuallyExclusiveWith: ['temperature'] },
        top_k: { supported: true, min: 0, max: 100, default: 40, reason: 'Advanced use only' },
      },
      'google-gemini3': {
        temperature: { supported: true, allowedValues: [1.0], default: 1.0, reason: 'Gemini 3 requires temperature=1.0' },
        max_tokens: { supported: true, min: 1, max: 8192, default: 2048, alternativeName: 'maxOutputTokens' },
        top_p: { supported: true, min: 0, max: 1.0, default: 0.95 },
        top_k: { supported: true, min: 0, max: 100, default: 40 },
      },
    };

    onChange(templates[templateName as keyof typeof templates] || {});
    setShowTemplateSelector(false);
  };

  return (
    <div className="space-y-4">
      {/* Template Selector Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Parameter Constraints</h3>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplateSelector(true)}>
            📋 Load Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedParams(new Set(availableParameters))}>
            ▼ Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedParams(new Set())}>
            ▶ Collapse All
          </Button>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <Card className="p-4 border-2 border-blue-500">
          <h4 className="font-semibold mb-3">Select Parameter Template</h4>
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-left" onClick={() => applyTemplate('openai-gpt4')}>
              OpenAI GPT-4 (Standard)
            </Button>
            <Button variant="outline" className="w-full text-left" onClick={() => applyTemplate('openai-gpt5-restricted')}>
              OpenAI GPT-5 (Restricted Temperature)
            </Button>
            <Button variant="outline" className="w-full text-left" onClick={() => applyTemplate('anthropic-claude45')}>
              Anthropic Claude 4.5 (Mutually Exclusive)
            </Button>
            <Button variant="outline" className="w-full text-left" onClick={() => applyTemplate('google-gemini3')}>
              Google Gemini 3 (Temperature Locked)
            </Button>
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={() => setShowTemplateSelector(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Parameter List */}
      <div className="space-y-3">
        {availableParameters.map((paramName) => {
          const constraint = constraints[paramName] || { supported: true };
          const isExpanded = expandedParams.has(paramName);

          return (
            <Card key={paramName} className="p-4">
              {/* Parameter Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={constraint.supported}
                    onChange={(checked) => updateConstraint(paramName, { supported: checked })}
                  />
                  <span className="font-mono font-semibold">{paramName}</span>
                  {!constraint.supported && (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">NOT SUPPORTED</span>
                  )}
                  {constraint.allowedValues && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">RESTRICTED</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleExpand(paramName)}>
                  {isExpanded ? '▼' : '▶'}
                </Button>
              </div>

              {/* Parameter Details (Expanded) */}
              {isExpanded && constraint.supported && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  {/* Constraint Type Selector */}
                  <div>
                    <label className="text-sm font-medium">Constraint Type</label>
                    <div className="flex space-x-4 mt-1">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!!constraint.allowedValues}
                          onChange={() => updateConstraint(paramName, { allowedValues: [], min: undefined, max: undefined })}
                        />
                        <span className="ml-2">Allowed Values</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!constraint.allowedValues}
                          onChange={() => updateConstraint(paramName, { allowedValues: undefined })}
                        />
                        <span className="ml-2">Range (Min/Max)</span>
                      </label>
                    </div>
                  </div>

                  {/* Allowed Values */}
                  {constraint.allowedValues && (
                    <div>
                      <label className="text-sm font-medium">Allowed Values</label>
                      <div className="flex space-x-2 mt-1">
                        {constraint.allowedValues.map((val, idx) => (
                          <Input
                            key={idx}
                            type="number"
                            value={val}
                            className="w-24"
                            onChange={(e) => {
                              const newValues = [...constraint.allowedValues!];
                              newValues[idx] = parseFloat(e.target.value);
                              updateConstraint(paramName, { allowedValues: newValues });
                            }}
                          />
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateConstraint(paramName, {
                              allowedValues: [...(constraint.allowedValues || []), 0],
                            });
                          }}
                        >
                          + Add Value
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Range (Min/Max) */}
                  {!constraint.allowedValues && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-sm font-medium">Min Value</label>
                        <Input
                          type="number"
                          value={constraint.min ?? ''}
                          onChange={(e) => updateConstraint(paramName, { min: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Max Value</label>
                        <Input
                          type="number"
                          value={constraint.max ?? ''}
                          onChange={(e) => updateConstraint(paramName, { max: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Default</label>
                        <Input
                          type="number"
                          value={constraint.default ?? ''}
                          onChange={(e) => updateConstraint(paramName, { default: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alternative Name */}
                  <div>
                    <label className="text-sm font-medium">Alternative Name (Optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g., max_completion_tokens"
                      value={constraint.alternativeName ?? ''}
                      onChange={(e) => updateConstraint(paramName, { alternativeName: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use this if the provider expects a different parameter name
                    </p>
                  </div>

                  {/* Mutually Exclusive With */}
                  <div>
                    <label className="text-sm font-medium">Mutually Exclusive With (Optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g., top_p"
                      value={constraint.mutuallyExclusiveWith?.join(', ') ?? ''}
                      onChange={(e) => {
                        const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                        updateConstraint(paramName, { mutuallyExclusiveWith: values });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Parameter names that cannot be used together (comma-separated)
                    </p>
                  </div>

                  {/* Reason/Note */}
                  <div>
                    <label className="text-sm font-medium">Reason/Note (Optional)</label>
                    <Textarea
                      placeholder="Explain why this constraint exists..."
                      value={constraint.reason ?? ''}
                      onChange={(e) => updateConstraint(paramName, { reason: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Not Supported Reason */}
              {isExpanded && !constraint.supported && (
                <div className="mt-4 border-t pt-3">
                  <label className="text-sm font-medium">Reason for Not Supporting</label>
                  <Textarea
                    placeholder="Explain why this parameter is not supported..."
                    value={constraint.reason ?? ''}
                    onChange={(e) => updateConstraint(paramName, { reason: e.target.value })}
                    rows={2}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Custom Parameter Section */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-semibold mb-2">Custom Parameters</h4>
        <p className="text-sm text-gray-600 mb-3">
          Add provider-specific or future parameters not in the standard list.
        </p>
        <Button variant="outline">+ Add Custom Parameter</Button>
      </Card>
    </div>
  );
};
```

### 2. Integration with AddModelDialog

**File**: `frontend/src/components/admin/AddModelDialog.tsx`

**Add to existing dialog**:
```typescript
import { ParameterConstraintsEditor } from './ParameterConstraintsEditor';

export const AddModelDialog: React.FC<Props> = ({ open, onClose, onSave }) => {
  const [parameterConstraints, setParameterConstraints] = useState({});

  // ... existing state

  const handleSave = async () => {
    const modelData = {
      // ... existing fields
      meta: {
        // ... existing meta fields
        parameterConstraints, // NEW
      },
    };

    await onSave(modelData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      {/* ... existing sections */}

      {/* NEW: Parameter Constraints Section */}
      <div className="mb-6">
        <ParameterConstraintsEditor
          constraints={parameterConstraints}
          onChange={setParameterConstraints}
        />
      </div>

      {/* ... save/cancel buttons */}
    </Dialog>
  );
};
```

---

## Migration Strategy

### Phase 1: Backend Foundation (Week 1)

**Tasks**:
1. Create ParameterValidationService
2. Add parameterConstraints to existing models in database
3. Update LLMService to use validation service
4. Remove hardcoded constraints from providers
5. Unit tests for validation service

**Migration Script** (`backend/scripts/migrate-parameter-constraints.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateParameterConstraints() {
  // GPT-5.1-Chat (Restricted Temperature)
  await prisma.models.update({
    where: { id: 'gpt-5.1-chat' },
    data: {
      meta: {
        ...(await prisma.models.findUnique({ where: { id: 'gpt-5.1-chat' } }))?.meta,
        parameterConstraints: {
          temperature: {
            supported: true,
            allowedValues: [1.0],
            default: 1.0,
            reason: 'GPT-5.1-chat only supports temperature=1.0',
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 4096,
            default: 1000,
            alternativeName: 'max_completion_tokens',
          },
          top_p: {
            supported: false,
            reason: 'Not supported with temperature restriction',
          },
        },
      },
    },
  });

  // GPT-5-Mini (Similar constraints)
  await prisma.models.update({
    where: { id: 'gpt-5-mini' },
    data: {
      meta: {
        ...(await prisma.models.findUnique({ where: { id: 'gpt-5-mini' } }))?.meta,
        parameterConstraints: {
          temperature: {
            supported: true,
            allowedValues: [1.0],
            default: 1.0,
            reason: 'GPT-5-mini only supports temperature=1.0',
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 4096,
            default: 1000,
            alternativeName: 'max_completion_tokens',
          },
        },
      },
    },
  });

  // GPT-4o (Standard Configuration)
  await prisma.models.update({
    where: { id: 'gpt-4o' },
    data: {
      meta: {
        ...(await prisma.models.findUnique({ where: { id: 'gpt-4o' } }))?.meta,
        parameterConstraints: {
          temperature: { supported: true, min: 0, max: 2.0, default: 0.7 },
          max_tokens: { supported: true, min: 1, max: 4096, default: 1000 },
          top_p: { supported: true, min: 0, max: 1.0, default: 1.0 },
          frequency_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
          presence_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
        },
      },
    },
  });

  console.log('✅ Parameter constraints migrated');
}

migrateParameterConstraints()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
```

**Run Migration**:
```bash
cd backend
npx ts-node scripts/migrate-parameter-constraints.ts
```

### Phase 2: Admin UI (Week 2)

**Tasks**:
1. Create ParameterConstraintsEditor component
2. Integrate with AddModelDialog
3. Integrate with EditModelDialog
4. Manual testing with various constraint types

### Phase 3: Testing & Rollout (Week 3)

**Tasks**:
1. Integration tests for parameter validation
2. E2E tests with Desktop Client
3. Documentation updates
4. Gradual rollout to production

---

## Testing Strategy

### Unit Tests

**ParameterValidationService** (`tests/unit/services/parameterValidation.service.test.ts`):
```typescript
describe('ParameterValidationService', () => {
  it('should allow all parameters when no constraints defined', async () => {
    const result = await service.validateAndFilterParameters('unconstrained-model', {
      temperature: 0.5,
      max_tokens: 2000,
    });

    expect(result.valid).toBe(true);
    expect(result.filteredParams).toEqual({
      temperature: 0.5,
      max_tokens: 2000,
    });
  });

  it('should enforce allowed values constraint', async () => {
    // Mock model with temperature=[1.0] only
    const result = await service.validateAndFilterParameters('gpt-5.1-chat', {
      temperature: 0.7,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Parameter 'temperature' must be one of: 1.0. Got: 0.7"
    );
  });

  it('should enforce range constraints', async () => {
    const result = await service.validateAndFilterParameters('gpt-4o', {
      temperature: 3.0, // Exceeds max of 2.0
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Parameter 'temperature' must be <= 2. Got: 3"
    );
  });

  it('should apply alternative parameter names', async () => {
    // GPT-5 uses max_completion_tokens instead of max_tokens
    const result = await service.validateAndFilterParameters('gpt-5.1-chat', {
      max_tokens: 2000,
    });

    expect(result.valid).toBe(true);
    expect(result.filteredParams.max_completion_tokens).toBe(2000);
    expect(result.filteredParams.max_tokens).toBeUndefined();
  });

  it('should detect mutually exclusive parameters', async () => {
    // Claude 4.5: temperature XOR top_p
    const result = await service.validateAndFilterParameters('claude-sonnet-4.5', {
      temperature: 0.8,
      top_p: 0.9,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Parameters 'temperature' and 'top_p' cannot be used together"
    );
  });

  it('should apply default values for missing parameters', async () => {
    const result = await service.validateAndFilterParameters('gpt-4o', {
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.valid).toBe(true);
    expect(result.filteredParams.temperature).toBe(0.7); // Default
    expect(result.filteredParams.max_tokens).toBe(1000); // Default
  });
});
```

### Integration Tests

**Chat Completion with Constraints** (`tests/integration/parameter-constraints.test.ts`):
```typescript
describe('POST /v1/chat/completions (Parameter Constraints)', () => {
  it('should reject request with invalid temperature for gpt-5.1-chat', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-5.1-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5, // ❌ Invalid (only 1.0 allowed)
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('temperature');
  });

  it('should accept request with valid temperature for gpt-5.1-chat', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-5.1-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 1.0, // ✅ Valid
      });

    expect(response.status).toBe(200);
  });

  it('should use max_completion_tokens for GPT-5 models', async () => {
    // Mock provider to verify parameter transformation
    const providerSpy = jest.spyOn(openaiProvider, 'chatCompletion');

    await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-5.1-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 2000,
      });

    expect(providerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        max_completion_tokens: 2000,
        max_tokens: undefined,
      })
    );
  });
});
```

---

## Documentation Requirements

### Admin User Guide

**File**: `docs/guides/xxx-admin-parameter-configuration.md`

**Content**:
- How to configure parameter constraints for new models
- Using pre-built templates (OpenAI, Anthropic, Google)
- Adding custom parameters
- Understanding constraint types (allowed values, ranges, mutually exclusive)
- Best practices for model configuration

### API Reference Update

**File**: `docs/reference/xxx-model-parameter-constraints.md`

**Content**:
- List of all supported parameters by provider
- Constraint schema reference
- Examples of constraint configurations
- Troubleshooting common validation errors

---

## Success Metrics

- **Admin Productivity**: Time to add new model reduced from 30 min (code change + deploy) to 5 min (UI config)
- **Flexibility**: 100% of new models can be configured via UI without code changes
- **Validation Accuracy**: 0 invalid parameter requests reach provider APIs
- **Error Rate**: <1% parameter validation errors in production

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Migration breaks existing models | High | Low | Comprehensive testing, gradual rollout, rollback plan |
| Admin misconfigures constraints | Medium | Medium | Templates, validation, preview mode |
| Performance overhead from validation | Medium | Low | Cache model metadata, optimize validation logic |
| Incomplete parameter coverage | Low | Medium | Custom parameters field for unknown params |

---

## Future Enhancements

### Phase 2 Features

1. **Constraint Validation Preview**: Test parameters against constraints before saving
2. **Bulk Constraint Import**: Upload JSON/CSV with constraints for multiple models
3. **Constraint History**: Track changes to parameter constraints over time
4. **Constraint Templates Library**: Community-contributed templates for new models
5. **Parameter Usage Analytics**: Track which parameters are most commonly used/restricted

---

## References

- **OpenAI API Docs**: https://platform.openai.com/docs/api-reference/chat/create
- **Anthropic Claude API**: https://docs.anthropic.com/claude/reference/messages_post
- **Google Gemini API**: https://ai.google.dev/api/rest/v1/GenerationConfig
- **Existing Implementation**: `backend/src/providers/openai.provider.ts:87-122`

---

**Document Version**: 2.0
**Last Updated**: 2025-01-19
**Next Review**: After Phase 1 completion
