import { describe, it, expect } from '@jest/globals';
import {
  getProviderSpec,
  getAllProviderNames,
  providerRegistry,
} from '../../../config/providers';
import { openaiSpec } from '../../../config/providers/openai/openai-spec';
import { anthropicSpec } from '../../../config/providers/anthropic/anthropic-spec';
import { googleSpec } from '../../../config/providers/google/google-spec';
import { gpt4FamilySpec } from '../../../config/providers/openai/gpt4-family';
import { gpt5FamilySpec, isRestrictedGPT5Model } from '../../../config/providers/openai/gpt5-family';
import { claude4FamilySpec, isClaude45Model } from '../../../config/providers/anthropic/claude4-family';
import { geminiFamilySpec, isGemini3Model } from '../../../config/providers/google/gemini-family';
import { transformOpenAIParameters } from '../../../config/providers/openai/transformers';
import { transformGoogleParameters } from '../../../config/providers/google/transformers';

describe('Provider Registry', () => {
  describe('providerRegistry', () => {
    it('should contain all three providers', () => {
      expect(Object.keys(providerRegistry)).toEqual(['openai', 'anthropic', 'google']);
    });

    it('should have valid OpenAI spec', () => {
      expect(providerRegistry.openai).toBeDefined();
      expect(providerRegistry.openai.providerName).toBe('openai');
      expect(providerRegistry.openai.displayName).toBe('OpenAI');
    });

    it('should have valid Anthropic spec', () => {
      expect(providerRegistry.anthropic).toBeDefined();
      expect(providerRegistry.anthropic.providerName).toBe('anthropic');
      expect(providerRegistry.anthropic.displayName).toBe('Anthropic');
    });

    it('should have valid Google spec', () => {
      expect(providerRegistry.google).toBeDefined();
      expect(providerRegistry.google.providerName).toBe('google');
      expect(providerRegistry.google.displayName).toBe('Google');
    });
  });

  describe('getProviderSpec', () => {
    it('should return OpenAI spec by name', () => {
      const spec = getProviderSpec('openai');
      expect(spec).toBeDefined();
      expect(spec?.providerName).toBe('openai');
    });

    it('should be case-insensitive', () => {
      const spec = getProviderSpec('OPENAI');
      expect(spec).toBeDefined();
      expect(spec?.providerName).toBe('openai');
    });

    it('should return undefined for unknown provider', () => {
      const spec = getProviderSpec('unknown');
      expect(spec).toBeUndefined();
    });
  });

  describe('getAllProviderNames', () => {
    it('should return all provider names', () => {
      const names = getAllProviderNames();
      expect(names).toContain('openai');
      expect(names).toContain('anthropic');
      expect(names).toContain('google');
    });
  });
});

describe('OpenAI Specifications', () => {
  describe('openaiSpec', () => {
    it('should have valid base parameters', () => {
      expect(openaiSpec.baseParameters.temperature).toBeDefined();
      expect(openaiSpec.baseParameters.temperature.supported).toBe(true);
      expect(openaiSpec.baseParameters.temperature.min).toBe(0);
      expect(openaiSpec.baseParameters.temperature.max).toBe(2.0);
    });

    it('should include GPT-4 and GPT-5 families', () => {
      expect(openaiSpec.modelFamilies).toHaveLength(2);
      expect(openaiSpec.modelFamilies[0].familyName).toBe('GPT-4 Family');
      expect(openaiSpec.modelFamilies[1].familyName).toBe('GPT-5 Family');
    });
  });

  describe('gpt4FamilySpec', () => {
    it('should match GPT-4 models', () => {
      expect(gpt4FamilySpec.modelPattern.test('gpt-4')).toBe(true);
      expect(gpt4FamilySpec.modelPattern.test('gpt-4-turbo')).toBe(true);
      expect(gpt4FamilySpec.modelPattern.test('gpt-4o')).toBe(true);
      expect(gpt4FamilySpec.modelPattern.test('gpt-4o-mini')).toBe(true);
    });

    it('should not match GPT-5 models', () => {
      expect(gpt4FamilySpec.modelPattern.test('gpt-5')).toBe(false);
      expect(gpt4FamilySpec.modelPattern.test('gpt-5-mini')).toBe(false);
    });

    it('should support full temperature range', () => {
      expect(gpt4FamilySpec.parameters.temperature.min).toBe(0);
      expect(gpt4FamilySpec.parameters.temperature.max).toBe(2.0);
      expect(gpt4FamilySpec.parameters.temperature.allowedValues).toBeUndefined();
    });
  });

  describe('gpt5FamilySpec', () => {
    it('should match GPT-5 models', () => {
      expect(gpt5FamilySpec.modelPattern.test('gpt-5')).toBe(true);
      expect(gpt5FamilySpec.modelPattern.test('gpt-5-mini')).toBe(true);
      expect(gpt5FamilySpec.modelPattern.test('gpt-5.1-chat')).toBe(true);
    });

    it('should restrict temperature to 1.0', () => {
      expect(gpt5FamilySpec.parameters.temperature.allowedValues).toEqual([1.0]);
      expect(gpt5FamilySpec.parameters.temperature.default).toBe(1.0);
    });

    it('should use max_completion_tokens', () => {
      expect(gpt5FamilySpec.parameters.max_tokens.alternativeName).toBe('max_completion_tokens');
    });

    it('should not support top_p', () => {
      expect(gpt5FamilySpec.parameters.top_p?.supported).toBe(false);
    });
  });

  describe('isRestrictedGPT5Model', () => {
    it('should identify restricted models', () => {
      expect(isRestrictedGPT5Model('gpt-5-mini')).toBe(true);
      expect(isRestrictedGPT5Model('gpt-5.1-chat')).toBe(true);
    });

    it('should not match unrestricted models', () => {
      expect(isRestrictedGPT5Model('gpt-5')).toBe(false);
      expect(isRestrictedGPT5Model('gpt-4o')).toBe(false);
    });
  });

  describe('transformOpenAIParameters', () => {
    it('should convert max_tokens to max_completion_tokens for GPT-5', () => {
      const result = transformOpenAIParameters(
        { max_tokens: 2000, temperature: 1.0 },
        'gpt-5-mini'
      );

      expect(result.transformed.max_completion_tokens).toBe(2000);
      expect(result.transformed.max_tokens).toBeUndefined();
      expect(result.warnings).toContain('Converted max_tokens to max_completion_tokens for GPT-5 model');
    });

    it('should not convert for GPT-4 models', () => {
      const result = transformOpenAIParameters(
        { max_tokens: 2000, temperature: 0.7 },
        'gpt-4o'
      );

      expect(result.transformed.max_tokens).toBe(2000);
      expect(result.transformed.max_completion_tokens).toBeUndefined();
      expect(result.warnings).toHaveLength(0);
    });

    it('should remove undefined fields', () => {
      const result = transformOpenAIParameters(
        { temperature: 0.7, top_p: undefined },
        'gpt-4o'
      );

      expect(result.transformed.temperature).toBe(0.7);
      expect('top_p' in result.transformed).toBe(false);
    });
  });
});

describe('Anthropic Specifications', () => {
  describe('anthropicSpec', () => {
    it('should have valid base parameters', () => {
      expect(anthropicSpec.baseParameters.temperature).toBeDefined();
      expect(anthropicSpec.baseParameters.temperature.min).toBe(0.0);
      expect(anthropicSpec.baseParameters.temperature.max).toBe(1.0);
    });

    it('should support stop_sequences', () => {
      expect(anthropicSpec.baseParameters.stop_sequences.supported).toBe(true);
    });
  });

  describe('claude4FamilySpec', () => {
    it('should match Claude 4 models', () => {
      expect(claude4FamilySpec.modelPattern.test('claude-4-opus')).toBe(true);
      expect(claude4FamilySpec.modelPattern.test('claude-sonnet-4.5')).toBe(true);
      expect(claude4FamilySpec.modelPattern.test('claude-haiku-4.5')).toBe(true);
    });

    it('should not match Claude 3 models', () => {
      expect(claude4FamilySpec.modelPattern.test('claude-3-opus')).toBe(false);
      expect(claude4FamilySpec.modelPattern.test('claude-3-sonnet')).toBe(false);
    });

    it('should have mutually exclusive temperature and top_p', () => {
      expect(claude4FamilySpec.parameters.temperature.mutuallyExclusiveWith).toContain('top_p');
      expect(claude4FamilySpec.parameters.top_p?.mutuallyExclusiveWith).toContain('temperature');
    });
  });

  describe('isClaude45Model', () => {
    it('should identify Claude 4.5 models', () => {
      expect(isClaude45Model('claude-sonnet-4.5')).toBe(true);
      expect(isClaude45Model('claude-haiku-4.5')).toBe(true);
    });

    it('should not match Claude 4 base models', () => {
      expect(isClaude45Model('claude-4-opus')).toBe(false);
    });
  });
});

describe('Google Specifications', () => {
  describe('googleSpec', () => {
    it('should have valid base parameters', () => {
      expect(googleSpec.baseParameters.temperature).toBeDefined();
      expect(googleSpec.baseParameters.temperature.default).toBe(1.0);
    });

    it('should use camelCase alternative names', () => {
      expect(googleSpec.baseParameters.max_tokens.alternativeName).toBe('maxOutputTokens');
      expect(googleSpec.baseParameters.top_p?.alternativeName).toBe('topP');
      expect(googleSpec.baseParameters.top_k?.alternativeName).toBe('topK');
    });
  });

  describe('geminiFamilySpec', () => {
    it('should match Gemini models', () => {
      expect(geminiFamilySpec.modelPattern.test('gemini-pro')).toBe(true);
      expect(geminiFamilySpec.modelPattern.test('gemini-1.5-pro')).toBe(true);
      expect(geminiFamilySpec.modelPattern.test('gemini-3')).toBe(true);
    });

    it('should restrict temperature to 1.0', () => {
      expect(geminiFamilySpec.parameters.temperature.allowedValues).toEqual([1.0]);
    });
  });

  describe('isGemini3Model', () => {
    it('should identify Gemini 3 models', () => {
      expect(isGemini3Model('gemini-3')).toBe(true);
      expect(isGemini3Model('gemini-3-pro')).toBe(true);
    });

    it('should not match other Gemini models', () => {
      expect(isGemini3Model('gemini-pro')).toBe(false);
      expect(isGemini3Model('gemini-1.5-pro')).toBe(false);
    });
  });

  describe('transformGoogleParameters', () => {
    it('should convert snake_case to camelCase', () => {
      const result = transformGoogleParameters({
        max_tokens: 2048,
        top_p: 0.95,
        top_k: 40,
      });

      expect(result.transformed.maxOutputTokens).toBe(2048);
      expect(result.transformed.topP).toBe(0.95);
      expect(result.transformed.topK).toBe(40);
      expect(result.warnings).toHaveLength(3);
    });

    it('should preserve temperature as-is', () => {
      const result = transformGoogleParameters({
        temperature: 1.0,
      });

      expect(result.transformed.temperature).toBe(1.0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should remove undefined values', () => {
      const result = transformGoogleParameters({
        temperature: 1.0,
        top_p: undefined,
      });

      expect(result.transformed.temperature).toBe(1.0);
      expect('top_p' in result.transformed).toBe(false);
      expect('topP' in result.transformed).toBe(false);
    });
  });
});
