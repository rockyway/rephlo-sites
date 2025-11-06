import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ModelService } from '../../../src/services/model.service';
import { getTestDatabase, cleanDatabase, seedTestData } from '../../setup/database';

describe('ModelService', () => {
  let prisma: PrismaClient;
  let modelService: ModelService;

  beforeEach(async () => {
    prisma = getTestDatabase();
    modelService = new ModelService();
    await cleanDatabase();
    await seedTestData(); // Seed models
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('listModels', () => {
    it('should return all available models', async () => {
      const models = await modelService.listModels({ available: true });

      expect(models.length).toBeGreaterThan(0);
      expect(models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            provider: expect.any(String),
            isAvailable: true,
          }),
        ])
      );
    });

    it('should filter models by provider', async () => {
      const models = await modelService.listModels({ provider: 'openai' });

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should filter models by capability', async () => {
      const models = await modelService.listModels({ capability: 'vision' });

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.capabilities).toContain('vision');
      });
    });

    it('should exclude deprecated models when available filter is true', async () => {
      // Mark one model as deprecated
      await prisma.model.update({
        where: { id: 'gpt-5' },
        data: { isDeprecated: true, isAvailable: false },
      });

      const models = await modelService.listModels({ available: true });

      expect(models.find((m) => m.id === 'gpt-5')).toBeUndefined();
    });

    it('should return empty array if no models match filters', async () => {
      const models = await modelService.listModels({ provider: 'nonexistent' });

      expect(models).toEqual([]);
    });
  });

  describe('getModelById', () => {
    it('should return model details by ID', async () => {
      const model = await modelService.getModelById('gpt-5');

      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-5');
      expect(model?.displayName).toBe('GPT-5');
      expect(model?.provider).toBe('openai');
      expect(model?.capabilities).toContain('text');
    });

    it('should return null for non-existent model', async () => {
      const model = await modelService.getModelById('non-existent-model');

      expect(model).toBeNull();
    });

    it('should return full model details including pricing', async () => {
      const model = await modelService.getModelById('gpt-5');

      expect(model).toMatchObject({
        id: 'gpt-5',
        inputCostPerMillionTokens: expect.any(Number),
        outputCostPerMillionTokens: expect.any(Number),
        creditsPerKTokens: expect.any(Number),
        contextLength: expect.any(Number),
        maxOutputTokens: expect.any(Number),
      });
    });
  });

  describe('validateModel', () => {
    it('should return true for valid and available model', async () => {
      const isValid = await modelService.validateModel('gpt-5');

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent model', async () => {
      const isValid = await modelService.validateModel('invalid-model');

      expect(isValid).toBe(false);
    });

    it('should return false for deprecated model', async () => {
      await prisma.model.update({
        where: { id: 'gpt-5' },
        data: { isDeprecated: true, isAvailable: false },
      });

      const isValid = await modelService.validateModel('gpt-5');

      expect(isValid).toBe(false);
    });
  });

  describe('calculateCredits', () => {
    it('should calculate credits based on token usage', async () => {
      const credits = await modelService.calculateCredits('gpt-5', 1000);

      // gpt-5 has 2 credits per 1k tokens
      expect(credits).toBe(2);
    });

    it('should round up partial credits', async () => {
      const credits = await modelService.calculateCredits('gpt-5', 1500);

      // 1.5k tokens * 2 credits/k = 3 credits
      expect(credits).toBe(3);
    });

    it('should handle different model pricing', async () => {
      const credits = await modelService.calculateCredits('gemini-2.0-pro', 1000);

      // gemini-2.0-pro has 1 credit per 1k tokens
      expect(credits).toBe(1);
    });

    it('should handle small token counts', async () => {
      const credits = await modelService.calculateCredits('gpt-5', 100);

      // 0.1k tokens * 2 credits/k = 0.2, rounds up to 1
      expect(credits).toBe(1);
    });
  });

  describe('getModelsByProvider', () => {
    it('should return all models for a provider', async () => {
      const models = await modelService.getModelsByProvider('google');

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('google');
      });
    });

    it('should return empty array for provider with no models', async () => {
      const models = await modelService.getModelsByProvider('unknown-provider');

      expect(models).toEqual([]);
    });
  });
});
