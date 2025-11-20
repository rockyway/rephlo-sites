/**
 * ParameterValidationService Unit Tests
 *
 * Tests parameter validation against provider specifications (Plan 205)
 * and model-specific constraints (Plan 203).
 *
 * Test Coverage:
 * 1. GPT-5-mini temperature restriction (allowedValues=[1.0])
 * 2. Claude 4.5 mutually exclusive temperature/top_p
 * 3. Min/max range validation
 * 4. Parameter transformation (max_tokens → max_completion_tokens)
 * 5. Provider spec fallback behavior
 * 6. Model-specific constraint precedence
 */

import { PrismaClient } from '@prisma/client';
import { ParameterValidationService } from '../../../services/parameter-validation.service';

// Mock Prisma
jest.mock('@prisma/client');

// Mock getProviderSpec
jest.mock('../../../config/providers', () => ({
  getProviderSpec: jest.fn(),
}));

import { getProviderSpec } from '../../../config/providers';

describe('ParameterValidationService', () => {
  let service: ParameterValidationService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      models: {
        findUnique: jest.fn(),
      },
    } as any;

    service = new ParameterValidationService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GPT-5-mini temperature restriction', () => {
    it('should reject temperature != 1.0 for GPT-5-mini (model constraint)', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
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
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {},
      });

      // Act
      const result = await service.validateParameters('gpt-5-mini', {
        temperature: 0.7,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('temperature');
      expect(result.errors[0]).toContain('[1.0]');
      expect(result.errors[0]).toContain('0.7');
    });

    it('should accept temperature=1.0 for GPT-5-mini', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
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
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {},
      });

      // Act
      const result = await service.validateParameters('gpt-5-mini', {
        temperature: 1.0,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transformedParams.temperature).toBe(1.0);
    });
  });

  describe('Claude 4.5 mutually exclusive parameters', () => {
    it('should reject both temperature AND top_p for Claude 4.5', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
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
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'anthropic',
        apiVersion: '2023-06-01',
        baseParameters: {},
      });

      // Act
      const result = await service.validateParameters('claude-sonnet-4.5', {
        temperature: 0.7,
        top_p: 0.9,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('mutually exclusive');
      expect(result.errors[0]).toContain('temperature');
      expect(result.errors[0]).toContain('top_p');
    });

    it('should accept temperature alone for Claude 4.5', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'anthropic',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 1.0,
              mutuallyExclusiveWith: ['top_p'],
            },
          },
        },
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'anthropic',
        apiVersion: '2023-06-01',
        baseParameters: {},
      });

      // Act
      const result = await service.validateParameters('claude-sonnet-4.5', {
        temperature: 0.7,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transformedParams.temperature).toBe(0.7);
    });
  });

  describe('Min/max range validation', () => {
    it('should reject temperature < min', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {},
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {
          temperature: {
            supported: true,
            min: 0,
            max: 2.0,
            default: 0.7,
          },
        },
      });

      // Act
      const result = await service.validateParameters('gpt-4o', {
        temperature: -0.5,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('>=');
      expect(result.errors[0]).toContain('0');
    });

    it('should reject temperature > max', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {},
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {
          temperature: {
            supported: true,
            min: 0,
            max: 2.0,
            default: 0.7,
          },
        },
      });

      // Act
      const result = await service.validateParameters('gpt-4o', {
        temperature: 3.0,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('<=');
      expect(result.errors[0]).toContain('2');
    });

    it('should accept temperature within range', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {},
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {
          temperature: {
            supported: true,
            min: 0,
            max: 2.0,
            default: 0.7,
          },
        },
      });

      // Act
      const result = await service.validateParameters('gpt-4o', {
        temperature: 0.7,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transformedParams.temperature).toBe(0.7);
    });
  });

  describe('Parameter transformation', () => {
    it('should transform max_tokens to max_completion_tokens for GPT-5', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {
          parameterConstraints: {
            max_tokens: {
              supported: true,
              min: 1,
              max: 4096,
              alternativeName: 'max_completion_tokens',
              reason: 'GPT-5 models use max_completion_tokens parameter',
            },
          },
        },
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {},
      });

      // Act
      const result = await service.validateParameters('gpt-5', {
        max_tokens: 1000,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transformedParams.max_completion_tokens).toBe(1000);
      expect(result.transformedParams.max_tokens).toBeUndefined();
      expect(result.warnings).toContain(
        "Transformed parameter 'max_tokens' to 'max_completion_tokens'"
      );
    });
  });

  describe('Provider spec fallback', () => {
    it('should use provider spec when no model constraint exists', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {}, // No model-specific constraints
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {
          temperature: {
            supported: true,
            min: 0,
            max: 2.0,
            default: 0.7,
          },
        },
      });

      // Act
      const result = await service.validateParameters('gpt-4o', {
        temperature: 0.5,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transformedParams.temperature).toBe(0.5);
    });

    it('should return error when model not found', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validateParameters('unknown-model', {
        temperature: 0.7,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Model 'unknown-model' not found");
    });

    it('should warn when no provider spec found', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'unknown-provider',
        meta: {},
      });

      (getProviderSpec as jest.Mock).mockReturnValue(undefined);

      // Act
      const result = await service.validateParameters('some-model', {
        temperature: 0.7,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No provider spec found');
      expect(result.transformedParams.temperature).toBe(0.7);
    });
  });

  describe('Model constraint precedence', () => {
    it('should use model constraint over provider spec', async () => {
      // Arrange
      mockPrisma.models.findUnique.mockResolvedValue({
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              allowedValues: [1.0], // Model-specific restriction
            },
          },
        },
      });

      (getProviderSpec as jest.Mock).mockReturnValue({
        providerName: 'openai',
        apiVersion: '2024-12-01',
        baseParameters: {
          temperature: {
            supported: true,
            min: 0,
            max: 2.0, // Provider allows full range
          },
        },
      });

      // Act
      const result = await service.validateParameters('gpt-5-mini', {
        temperature: 0.7, // Valid for provider, invalid for model
      });

      // Assert
      expect(result.valid).toBe(false); // Model constraint takes precedence
      expect(result.errors[0]).toContain('[1.0]');
    });
  });
});
