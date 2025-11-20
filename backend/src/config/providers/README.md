# Provider Specifications

This directory contains provider-specific parameter specifications for LLM APIs.

## Structure

Each provider has its own directory with:
- `{provider}-spec.ts` - Main provider specification
- `{family}-family.ts` - Model family specifications
- `transformers.ts` - Parameter transformations

```
providers/
├── base-provider-spec.ts           # Base interfaces and types
├── index.ts                         # Provider registry and exports
├── openai/
│   ├── openai-spec.ts              # OpenAI provider specification
│   ├── gpt4-family.ts              # GPT-4 family (gpt-4, gpt-4o, gpt-4-turbo)
│   ├── gpt5-family.ts              # GPT-5 family (gpt-5, gpt-5-mini, gpt-5.1-chat)
│   └── transformers.ts             # OpenAI parameter transformer
├── anthropic/
│   ├── anthropic-spec.ts           # Anthropic provider specification
│   ├── claude3-family.ts           # Claude 3 family
│   ├── claude4-family.ts           # Claude 4 & 4.5 family
│   └── transformers.ts             # Anthropic parameter transformer
└── google/
    ├── google-spec.ts              # Google provider specification
    ├── gemini-family.ts            # Gemini family
    └── transformers.ts             # Google parameter transformer (camelCase conversion)
```

## Adding a New Provider

1. Create directory: `providers/newprovider/`
2. Create spec file: `newprovider-spec.ts`
3. Create family files: `model-family.ts`
4. Create transformer: `transformers.ts`
5. Add to registry: `providers/index.ts`
6. Update tests: `__tests__/unit/config/provider-specs.test.ts`

### Example: Adding a New Provider

```typescript
// providers/cohere/cohere-spec.ts
import { ProviderSpec } from '../base-provider-spec';
import { commandFamilySpec } from './command-family';
import { transformCohereParameters } from './transformers';

export const cohereSpec: ProviderSpec = {
  providerName: 'cohere',
  displayName: 'Cohere',
  apiVersion: 'v1',
  lastUpdated: '2025-01-20',
  baseParameters: {
    temperature: {
      supported: true,
      min: 0,
      max: 2.0,
      default: 0.7,
    },
    // ... other parameters
  },
  modelFamilies: [commandFamilySpec],
  parameterTransformer: transformCohereParameters,
};
```

Then register in `index.ts`:

```typescript
import { cohereSpec } from './cohere/cohere-spec';

export const providerRegistry: Record<string, ProviderSpec> = {
  openai: openaiSpec,
  anthropic: anthropicSpec,
  google: googleSpec,
  cohere: cohereSpec,  // NEW
};
```

## Updating Provider Specs

When a provider changes their API:
1. Find the relevant spec file
2. Update parameter constraints
3. Update `apiVersion` and `lastUpdated`
4. Add changelog note
5. Run tests: `npm test -- provider-specs.test`
6. Deploy

### Example: OpenAI Increases Temperature Range

**Scenario**: OpenAI announces temperature range is now 0-3.0 (from 0-2.0)

**Steps** (Single file change):
1. Open `backend/src/config/providers/openai/openai-spec.ts`
2. Update `baseParameters.temperature.max` from `2.0` to `3.0`
3. Update `apiVersion` and `lastUpdated`
4. Add note to changelog

```typescript
// Before
temperature: {
  supported: true,
  min: 0,
  max: 2.0,  // OLD
  default: 0.7,
  apiVersion: '2024-01-01',
}

// After
temperature: {
  supported: true,
  min: 0,
  max: 3.0,  // NEW
  default: 0.7,
  reason: 'Expanded range for enhanced creativity control',
  apiVersion: '2025-02-01',  // When change was introduced
}
```

That's it! No changes to validation logic, no changes to UI, no changes to providers.

## Provider-Specific Notes

### OpenAI
- **Temperature Range**: Expanded to 0-2.0 in 2024
- **GPT-5 Models**: Use `max_completion_tokens` instead of `max_tokens`
- **GPT-5 Restrictions**: `gpt-5-mini` and `gpt-5.1-chat` only support temperature=1.0

### Anthropic
- **Claude 4.5 & Haiku 4.5**: Temperature OR top_p (mutually exclusive)
- **Older models**: Support both temperature and top_p simultaneously
- **Recommended**: Use temperature only, avoid top_k for most cases

### Google
- **Gemini API**: Uses camelCase parameter names (maxOutputTokens, topP, topK)
- **Backend transforms**: snake_case → camelCase automatically
- **Gemini 3 Models**: MUST keep temperature=1.0 (risk of looping otherwise)

## Testing

Run provider specification tests:

```bash
npm test -- provider-specs.test
```

Tests cover:
- Provider registry functionality
- Model family pattern matching
- Parameter transformers
- Provider-specific constraints

## File Naming Convention

- Spec files: `{provider}-spec.ts`
- Family files: `{family}-family.ts`
- Transformers: `transformers.ts`

## References

- **OpenAI API**: https://platform.openai.com/docs/api-reference/chat/create
- **Anthropic Claude API**: https://docs.anthropic.com/claude/reference/messages_post
- **Google Gemini API**: https://ai.google.dev/api/rest/v1/GenerationConfig
- **Plan 205**: docs/plan/205-provider-parameter-specifications-architecture.md
