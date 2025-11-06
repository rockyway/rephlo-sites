import 'reflect-metadata';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockModelService } from '../mocks/model.service.mock';
import { DependencyContainer } from 'tsyringe';

describe('ModelService', () => {
  let testContainer: DependencyContainer;
  let modelService: MockModelService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    modelService = mocks.modelService;
  });

  afterEach(() => {
    modelService.clear();
    resetTestContainer(testContainer);
  });

  describe('listModels', () => {
    it('should list all models without filters', async () => {
      // Act
      const result = await modelService.listModels();

      // Assert
      expect(result.models).toBeInstanceOf(Array);
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.count).toBe(result.models.length);
    });

    it('should filter by availability', async () => {
      // Act
      const result = await modelService.listModels({ available: true });

      // Assert
      expect(result.models).toBeInstanceOf(Array);
      result.models.forEach((model: any) => {
        expect(model.available).toBe(true);
      });
    });

    it('should filter by provider', async () => {
      // Act
      const result = await modelService.listModels({ provider: 'openai' });

      // Assert
      expect(result.models).toBeInstanceOf(Array);
      result.models.forEach((model: any) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should filter by capability', async () => {
      // Act
      const result = await modelService.listModels({ capability: ['chat'] });

      // Assert
      expect(result.models).toBeInstanceOf(Array);
      result.models.forEach((model: any) => {
        expect(model.capabilities).toContain('chat');
      });
    });

    it('should combine multiple filters', async () => {
      // Act
      const result = await modelService.listModels({
        available: true,
        provider: 'anthropic',
        capability: ['chat'],
      });

      // Assert
      expect(result.models).toBeInstanceOf(Array);
      result.models.forEach((model: any) => {
        expect(model.available).toBe(true);
        expect(model.provider).toBe('anthropic');
        expect(model.capabilities).toContain('chat');
      });
    });
  });

  describe('getModelDetails', () => {
    it('should get model details by ID', async () => {
      // Act
      const result = await modelService.getModelDetails('gpt-4');

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe('gpt-4');
      expect(result.name).toBe('GPT-4');
    });

    it('should return null for non-existent model', async () => {
      // Act
      const result = await modelService.getModelDetails('non-existent-model');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for available model', async () => {
      // Act
      const result = await modelService.isModelAvailable('gpt-4');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent model', async () => {
      // Act
      const result = await modelService.isModelAvailable('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for unavailable model', async () => {
      // Arrange
      const unavailableModel = {
        id: 'unavailable-model',
        provider: 'test',
        name: 'Unavailable Model',
        available: false,
        capabilities: ['chat'],
        maxTokens: 1000,
        creditCost: 1,
      };
      modelService.addModel(unavailableModel);

      // Act
      const result = await modelService.isModelAvailable('unavailable-model');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getModelForInference', () => {
    it('should get model for inference if available', async () => {
      // Act
      const result = await modelService.getModelForInference('gpt-4');

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe('gpt-4');
      expect(result.available).toBe(true);
    });

    it('should throw error if model not found', async () => {
      // Act & Assert
      await expect(modelService.getModelForInference('non-existent')).rejects.toThrow(
        'Model non-existent not found'
      );
    });

    it('should throw error if model not available', async () => {
      // Arrange
      const unavailableModel = {
        id: 'unavailable-model',
        provider: 'test',
        name: 'Unavailable Model',
        available: false,
        capabilities: ['chat'],
        maxTokens: 1000,
        creditCost: 1,
      };
      modelService.addModel(unavailableModel);

      // Act & Assert
      await expect(modelService.getModelForInference('unavailable-model')).rejects.toThrow(
        'Model unavailable-model is not available'
      );
    });
  });

  describe('refreshCache', () => {
    it('should refresh cache without errors', async () => {
      // Act & Assert
      await expect(modelService.refreshCache()).resolves.not.toThrow();
    });
  });

  describe('getModelUsageStats', () => {
    it('should get usage stats without date filters', async () => {
      // Act
      const result = await modelService.getModelUsageStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.stats).toBeInstanceOf(Array);
    });

    it('should filter stats by start date', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');

      // Act
      const result = await modelService.getModelUsageStats(startDate);

      // Assert
      expect(result).toBeDefined();
      expect(result.stats).toBeInstanceOf(Array);
    });

    it('should filter stats by date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act
      const result = await modelService.getModelUsageStats(startDate, endDate);

      // Assert
      expect(result).toBeDefined();
      expect(result.stats).toBeInstanceOf(Array);
    });
  });
});
