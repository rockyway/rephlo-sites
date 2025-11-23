/**
 * Unit Tests for ParameterValidationService
 *
 * Tests parameter validation against model constraints:
 * - Allowed values enforcement (temperature=[1.0] for GPT-5-mini)
 * - Min/max range validation
 * - Mutually exclusive parameters (temperature + top_p)
 * - Parameter transformation (max_tokens → max_completion_tokens)
 * - Model constraint precedence (model meta > provider spec)
 * - Provider spec fallback
 * - Unsupported parameter warnings
 * - Default value application
 * - Custom parameter handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ParameterValidationService } from '../../../src/services/parameter-validation.service';
import { IModelService } from '../../../src/interfaces';

// Mock ModelService
const mockModelService: jest.Mocked<IModelService> = {
  getModelForInference: jest.fn(),
  getModels: jest.fn(),
  createModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
  getModelByProviderId: jest.fn(),
} as any;

describe('ParameterValidationService', () => {
  let service: ParameterValidationService;

  beforeEach(() => {
    service = new ParameterValidationService(mockModelService);
    jest.clearAllMocks();
  });

  describe('Allowed Values Enforcement', () => {
    it('should accept temperature=1.0 for GPT-5-mini (allowed value)', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-5-mini',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              allowedValues: [1.0],
              default: 1.0,
              reason: 'GPT-5-mini only supports temperature=1.0',
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-5-mini', {
        temperature: 1.0,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(1.0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject temperature=0.7 for GPT-5-mini (not in allowed values)', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-5-mini',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              allowedValues: [1.0],
              default: 1.0,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-5-mini', {
        temperature: 0.7,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("must be one of: [1.0]");
      expect(result.errors[0]).toContain("Got: 0.7");
    });

    it('should accept multiple allowed values', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'test-model',
        provider: 'test',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              allowedValues: [0.5, 1.0, 1.5],
            },
          },
        },
      } as any);

      const result1 = await service.validateParameters('test-model', {
        temperature: 0.5,
      });
      const result2 = await service.validateParameters('test-model', {
        temperature: 1.0,
      });
      const result3 = await service.validateParameters('test-model', {
        temperature: 1.5,
      });

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
    });
  });

  describe('Range Validation (Min/Max)', () => {
    it('should accept temperature within range (0-2.0)', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2.0,
              default: 0.7,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 1.5,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(1.5);
    });

    it('should reject temperature below min (< 0)', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2.0,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: -0.5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("must be >= 0");
      expect(result.errors[0]).toContain("Got: -0.5");
    });

    it('should reject temperature above max (> 2.0)', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2.0,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 3.0,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("must be <= 2");
      expect(result.errors[0]).toContain("Got: 3");
    });

    it('should accept exact min value', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2.0 },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 0,
      });

      expect(result.valid).toBe(true);
    });

    it('should accept exact max value', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2.0 },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 2.0,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Parameter Transformation (Alternative Names)', () => {
    it('should transform max_tokens to max_completion_tokens for GPT-5', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-5',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            max_tokens: {
              supported: true,
              min: 1,
              max: 4096,
              alternativeName: 'max_completion_tokens',
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-5', {
        max_tokens: 2000,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.max_completion_tokens).toBe(2000);
      expect(result.transformedParams.max_tokens).toBeUndefined();
    });

    it('should not transform if alternativeName not specified', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            max_tokens: {
              supported: true,
              min: 1,
              max: 4096,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        max_tokens: 2000,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.max_tokens).toBe(2000);
      expect(result.transformedParams.max_completion_tokens).toBeUndefined();
    });
  });

  describe('Mutually Exclusive Parameters', () => {
    it('should reject temperature + top_p for Claude 4.5', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'claude-sonnet-4.5',
        provider: 'anthropic',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['top_p'],
              reason: 'Claude 4.5 only supports temperature OR top_p, not both',
            },
            top_p: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['temperature'],
            },
          },
        },
      } as any);

      const result = await service.validateParameters('claude-sonnet-4.5', {
        temperature: 0.8,
        top_p: 0.9,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes("cannot be used together"))).toBe(true);
    });

    it('should accept temperature only for Claude 4.5', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'claude-sonnet-4.5',
        provider: 'anthropic',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['top_p'],
            },
            top_p: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['temperature'],
            },
          },
        },
      } as any);

      const result = await service.validateParameters('claude-sonnet-4.5', {
        temperature: 0.8,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(0.8);
      expect(result.transformedParams.top_p).toBeUndefined();
    });

    it('should accept top_p only for Claude 4.5', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'claude-sonnet-4.5',
        provider: 'anthropic',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['top_p'],
            },
            top_p: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['temperature'],
            },
          },
        },
      } as any);

      const result = await service.validateParameters('claude-sonnet-4.5', {
        top_p: 0.9,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.top_p).toBe(0.9);
      expect(result.transformedParams.temperature).toBeUndefined();
    });
  });

  describe('Unsupported Parameters', () => {
    it('should warn about unsupported parameter', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-5-mini',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            top_p: {
              supported: false,
              reason: 'Not supported with temperature restriction',
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-5-mini', {
        top_p: 0.9,
      });

      expect(result.valid).toBe(true); // Valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("not supported"))).toBe(true);
      expect(result.transformedParams.top_p).toBeUndefined(); // Excluded from params
    });
  });

  describe('Default Value Application', () => {
    it('should apply default temperature when not provided', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2.0,
              default: 0.7,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {});

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(0.7);
    });

    it('should not apply default when parameter explicitly provided', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2.0,
              default: 0.7,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 1.5,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(1.5);
    });
  });

  describe('No Constraints (Allow All)', () => {
    it('should allow all parameters when no constraints defined', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'unconstrained-model',
        provider: 'test',
        meta: {
          // No parameterConstraints
        },
      } as any);

      const result = await service.validateParameters('unconstrained-model', {
        temperature: 0.5,
        max_tokens: 2000,
        top_p: 0.9,
        custom_param: 'value',
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams).toEqual({
        temperature: 0.5,
        max_tokens: 2000,
        top_p: 0.9,
        custom_param: 'value',
      });
    });
  });

  describe('Unknown Parameters', () => {
    it('should pass through unknown parameter with warning', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2.0 },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 1.0,
        unknown_param: 'value',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("unknown_param"))).toBe(true);
      expect(result.transformedParams.unknown_param).toBe('value');
    });
  });

  describe('Non-Configurable Parameters (model, messages, stream)', () => {
    it('should always pass through model parameter', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {},
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        model: 'gpt-4o',
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.model).toBe('gpt-4o');
    });

    it('should always pass through messages parameter', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {},
        },
      } as any);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await service.validateParameters('gpt-4o', {
        messages,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.messages).toBe(messages);
    });

    it('should always pass through stream parameter', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {},
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        stream: true,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.stream).toBe(true);
    });
  });

  describe('Array Parameter Validation', () => {
    it('should accept stop sequences within limit', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            stop: {
              supported: true,
              maxSequences: 4,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        stop: ['END', 'STOP', 'FINISH'],
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.stop).toEqual(['END', 'STOP', 'FINISH']);
    });

    it('should reject stop sequences exceeding limit', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            stop: {
              supported: true,
              maxSequences: 4,
            },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        stop: ['END', 'STOP', 'FINISH', 'DONE', 'COMPLETE'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("max 4 items");
      expect(result.errors[0]).toContain("Got: 5");
    });
  });

  describe('Model Not Found', () => {
    it('should return error when model not found', async () => {
      mockModelService.getModelForInference.mockRejectedValueOnce(
        new Error('Model not found')
      );

      const result = await service.validateParameters('nonexistent-model', {
        temperature: 1.0,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("not found");
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should handle multiple valid parameters', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2.0, default: 0.7 },
            max_tokens: { supported: true, min: 1, max: 4096, default: 1000 },
            frequency_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
            presence_penalty: { supported: true, min: -2.0, max: 2.0, default: 0 },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 1.5,
        max_tokens: 2000,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      });

      expect(result.valid).toBe(true);
      expect(result.transformedParams.temperature).toBe(1.5);
      expect(result.transformedParams.max_tokens).toBe(2000);
      expect(result.transformedParams.frequency_penalty).toBe(0.5);
      expect(result.transformedParams.presence_penalty).toBe(0.5);
    });

    it('should handle multiple validation errors', async () => {
      mockModelService.getModelForInference.mockResolvedValueOnce({
        id: 'gpt-4o',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2.0 },
            max_tokens: { supported: true, min: 1, max: 4096 },
          },
        },
      } as any);

      const result = await service.validateParameters('gpt-4o', {
        temperature: 3.0, // Invalid
        max_tokens: 5000, // Invalid
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors.some(e => e.includes("temperature"))).toBe(true);
      expect(result.errors.some(e => e.includes("max_tokens"))).toBe(true);
    });
  });
});
