/**
 * ModelService Lifecycle Methods - Unit Tests
 *
 * Tests for model lifecycle management operations:
 * - addModel() - Create new models
 * - markAsLegacy() - Deprecate models
 * - unmarkLegacy() - Remove deprecation
 * - archive() - Archive models
 * - unarchive() - Restore models
 * - updateModelMeta() - Update metadata
 * - getLegacyModels() - List legacy models
 * - getArchivedModels() - List archived models
 *
 * Reference: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ModelService } from '../../../src/services/model.service';
import {
  getTestDatabase,
  cleanDatabase,
  seedTestData,
} from '../../setup/database';
import {
  validateModelMeta,
  calculateCreditsPerKTokens,
} from '../../../src/types/model-meta';
import type { ModelCapability, SubscriptionTier } from '../../../src/types/model-meta';

describe('ModelService - Lifecycle Management', () => {
  let prisma: PrismaClient;
  let modelService: ModelService;
  const adminUserId = 'admin-test-user-id';

  beforeEach(async () => {
    prisma = getTestDatabase();
    modelService = new ModelService(prisma);
    await cleanDatabase();
    await seedTestData();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ==========================================================================
  // addModel() Tests
  // ==========================================================================

  describe('addModel()', () => {
    it('should create model with valid meta JSONB', async () => {
      const modelData = {
        id: 'gpt-6-turbo',
        name: 'gpt-6-turbo',
        provider: 'openai',
        meta: {
          displayName: 'GPT-6 Turbo',
          description: 'Latest turbo model',
          version: '1.0',
          capabilities: ['text', 'vision'] as ModelCapability[],
          contextLength: 128000,
          maxOutputTokens: 4096,
          inputCostPerMillionTokens: 1000,
          outputCostPerMillionTokens: 3000,
          creditsPer1kTokens: 5,
          requiredTier: 'pro' as 'pro',
          tierRestrictionMode: 'minimum' as 'minimum',
          allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'] as SubscriptionTier[],
        },
      };

      const result = await modelService.addModel(modelData, adminUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('gpt-6-turbo');
      expect(result.display_name).toBe('GPT-6 Turbo');

      // Verify in database
      const dbModel = await prisma.model.findUnique({
        where: { id: 'gpt-6-turbo' },
      });

      expect(dbModel).toBeDefined();
      expect(dbModel?.isAvailable).toBe(true);
      expect(dbModel?.isLegacy).toBe(false);
      expect(dbModel?.isArchived).toBe(false);

      // Validate meta JSONB
      const meta = validateModelMeta(dbModel?.meta);
      expect(meta.displayName).toBe('GPT-6 Turbo');
      expect(meta.capabilities).toContain('text');
      expect(meta.capabilities).toContain('vision');
    });

    it('should auto-calculate creditsPer1kTokens if not provided', async () => {
      const modelData = {
        id: 'test-model-auto-credits',
        name: 'test-model-auto-credits',
        provider: 'openai',
        meta: {
          displayName: 'Test Model',
          description: 'Test',
          capabilities: ['text'] as ModelCapability[],
          contextLength: 8000,
          inputCostPerMillionTokens: 500,
          outputCostPerMillionTokens: 1500,
          creditsPer1kTokens: 0, // Invalid - will trigger auto-calc
          requiredTier: 'free' as 'free',
          tierRestrictionMode: 'minimum' as 'minimum',
          allowedTiers: ['free', 'pro'] as SubscriptionTier[],
        },
      };

      await modelService.addModel(modelData, adminUserId);

      // Verify auto-calculated credits
      const dbModel = await prisma.model.findUnique({
        where: { id: 'test-model-auto-credits' },
      });

      const meta = validateModelMeta(dbModel?.meta);
      const expectedCredits = calculateCreditsPerKTokens(500, 1500);
      expect(meta.creditsPer1kTokens).toBe(expectedCredits);
      expect(meta.creditsPer1kTokens).toBeGreaterThan(0);
    });

    it('should validate meta with Zod schema', async () => {
      const invalidModelData = {
        id: 'invalid-model',
        name: 'invalid-model',
        provider: 'openai',
        meta: {
          displayName: 'Invalid Model',
          // Missing required fields: capabilities, contextLength, etc.
        } as any,
      };

      await expect(
        modelService.addModel(invalidModelData, adminUserId)
      ).rejects.toThrow();
    });

    it('should clear cache after creation', async () => {
      const modelData = {
        id: 'cache-test-model',
        name: 'cache-test-model',
        provider: 'openai',
        meta: {
          displayName: 'Cache Test',
          capabilities: ['text'] as ModelCapability[],
          contextLength: 8000,
          inputCostPerMillionTokens: 500,
          outputCostPerMillionTokens: 1500,
          creditsPer1kTokens: 2,
          requiredTier: 'free' as const,
          tierRestrictionMode: 'minimum' as const,
          allowedTiers: ['free'] as SubscriptionTier[],
        },
      };

      // Pre-populate cache by listing models
      await modelService.listModels();

      // Create new model
      await modelService.addModel(modelData, adminUserId);

      // List should include new model (cache should be cleared)
      const models = await modelService.listModels();
      const newModel = models.models.find((m) => m.id === 'cache-test-model');
      expect(newModel).toBeDefined();
    });

    it('should reject duplicate model ID', async () => {
      const modelData = {
        id: 'gpt-5', // Already exists from seed
        name: 'gpt-5',
        provider: 'openai',
        meta: {
          displayName: 'GPT-5 Duplicate',
          capabilities: ['text'] as ModelCapability[],
          contextLength: 8000,
          inputCostPerMillionTokens: 500,
          outputCostPerMillionTokens: 1500,
          creditsPer1kTokens: 2,
          requiredTier: 'free' as const,
          tierRestrictionMode: 'minimum' as const,
          allowedTiers: ['free'] as SubscriptionTier[],
        },
      };

      await expect(
        modelService.addModel(modelData, adminUserId)
      ).rejects.toThrow(/already exists/i);
    });

    it('should reject invalid meta structure', async () => {
      const modelData = {
        id: 'invalid-meta-model',
        name: 'invalid-meta-model',
        provider: 'openai',
        meta: {
          displayName: 'Invalid',
          capabilities: ['text'] as ModelCapability[],
          contextLength: -1000, // Invalid negative value
          inputCostPerMillionTokens: 500,
          outputCostPerMillionTokens: 1500,
          creditsPer1kTokens: 2,
          requiredTier: 'free' as const,
          tierRestrictionMode: 'minimum' as const,
          allowedTiers: ['free'] as SubscriptionTier[],
        },
      };

      await expect(
        modelService.addModel(modelData, adminUserId)
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // markAsLegacy() Tests
  // ==========================================================================

  describe('markAsLegacy()', () => {
    it('should set isLegacy=true', async () => {
      await modelService.markAsLegacy(
        'gpt-5',
        { deprecationNotice: 'Deprecated model' },
        adminUserId
      );

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      expect(model?.isLegacy).toBe(true);
    });

    it('should update meta with replacement model ID', async () => {
      await modelService.markAsLegacy(
        'gpt-5',
        {
          replacementModelId: 'gemini-2.0-pro',
          deprecationNotice: 'Use Gemini 2.0 Pro instead',
        },
        adminUserId
      );

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      const meta = validateModelMeta(model?.meta);
      expect(meta.legacyReplacementModelId).toBe('gemini-2.0-pro');
      expect(meta.deprecationNotice).toBe('Use Gemini 2.0 Pro instead');
    });

    it('should update meta with deprecation notice', async () => {
      const notice = 'This model will be sunset on 2025-12-31';

      await modelService.markAsLegacy(
        'gpt-5',
        { deprecationNotice: notice },
        adminUserId
      );

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      const meta = validateModelMeta(model?.meta);
      expect(meta.deprecationNotice).toBe(notice);
    });

    it('should update meta with sunset date', async () => {
      const sunsetDate = '2025-12-31T23:59:59Z';

      await modelService.markAsLegacy(
        'gpt-5',
        { sunsetDate },
        adminUserId
      );

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      const meta = validateModelMeta(model?.meta);
      expect(meta.sunsetDate).toBe(sunsetDate);
    });

    it('should clear cache', async () => {
      // Pre-populate cache
      await modelService.listModels();

      await modelService.markAsLegacy(
        'gpt-5',
        { deprecationNotice: 'Deprecated' },
        adminUserId
      );

      // List should reflect legacy status
      const models = await modelService.listModels();
      const gpt5 = models.models.find((m) => m.id === 'gpt-5');
      expect(gpt5?.is_legacy).toBe(true);
    });

    it('should reject non-existent model', async () => {
      await expect(
        modelService.markAsLegacy(
          'non-existent-model',
          { deprecationNotice: 'Test' },
          adminUserId
        )
      ).rejects.toThrow(/not found/i);
    });

    it('should reject invalid replacement model ID', async () => {
      await expect(
        modelService.markAsLegacy(
          'gpt-5',
          { replacementModelId: 'invalid-replacement-model' },
          adminUserId
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // unmarkLegacy() Tests
  // ==========================================================================

  describe('unmarkLegacy()', () => {
    beforeEach(async () => {
      // Mark gpt-5 as legacy first
      await modelService.markAsLegacy(
        'gpt-5',
        {
          replacementModelId: 'gemini-2.0-pro',
          deprecationNotice: 'Deprecated',
          sunsetDate: '2025-12-31T23:59:59Z',
        },
        adminUserId
      );
    });

    it('should set isLegacy=false', async () => {
      await modelService.unmarkLegacy('gpt-5', adminUserId);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      expect(model?.isLegacy).toBe(false);
    });

    it('should remove legacy fields from meta', async () => {
      await modelService.unmarkLegacy('gpt-5', adminUserId);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      const meta = validateModelMeta(model?.meta);
      expect(meta.legacyReplacementModelId).toBeUndefined();
      expect(meta.deprecationNotice).toBeUndefined();
      expect(meta.sunsetDate).toBeUndefined();
    });

    it('should clear cache', async () => {
      await modelService.listModels();

      await modelService.unmarkLegacy('gpt-5', adminUserId);

      const models = await modelService.listModels();
      const gpt5 = models.models.find((m) => m.id === 'gpt-5');
      expect(gpt5?.is_legacy).toBe(false);
    });

    it('should reject non-existent model', async () => {
      await expect(
        modelService.unmarkLegacy('non-existent-model', adminUserId)
      ).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // archive() Tests
  // ==========================================================================

  describe('archive()', () => {
    it('should set isArchived=true, isAvailable=false', async () => {
      await modelService.archive('gpt-5', adminUserId);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      expect(model?.isArchived).toBe(true);
      expect(model?.isAvailable).toBe(false);
    });

    it('should clear cache', async () => {
      await modelService.listModels();

      await modelService.archive('gpt-5', adminUserId);

      // Archived models should be excluded by default
      const models = await modelService.listModels();
      const gpt5 = models.models.find((m) => m.id === 'gpt-5');
      expect(gpt5).toBeUndefined();
    });

    it('should reject non-existent model', async () => {
      await expect(
        modelService.archive('non-existent-model', adminUserId)
      ).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // unarchive() Tests
  // ==========================================================================

  describe('unarchive()', () => {
    beforeEach(async () => {
      // Archive gpt-5 first
      await modelService.archive('gpt-5', adminUserId);
    });

    it('should set isArchived=false, isAvailable=true', async () => {
      await modelService.unarchive('gpt-5', adminUserId);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      expect(model?.isArchived).toBe(false);
      expect(model?.isAvailable).toBe(true);
    });

    it('should clear cache', async () => {
      await modelService.listModels();

      await modelService.unarchive('gpt-5', adminUserId);

      const models = await modelService.listModels();
      const gpt5 = models.models.find((m) => m.id === 'gpt-5');
      expect(gpt5).toBeDefined();
      expect(gpt5?.is_archived).toBe(false);
    });

    it('should reject non-existent model', async () => {
      await expect(
        modelService.unarchive('non-existent-model', adminUserId)
      ).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // updateModelMeta() Tests
  // ==========================================================================

  describe('updateModelMeta()', () => {
    it('should update partial meta fields', async () => {
      await modelService.updateModelMeta(
        'gpt-5',
        {
          displayName: 'GPT-5 Updated',
          description: 'New description',
        },
        adminUserId
      );

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });

      const meta = validateModelMeta(model?.meta);
      expect(meta.displayName).toBe('GPT-5 Updated');
      expect(meta.description).toBe('New description');
      // Other fields should remain unchanged
      expect(meta.capabilities).toBeDefined();
      expect(meta.contextLength).toBeDefined();
    });

    it('should merge with existing meta', async () => {
      // Get original meta
      const originalModel = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      const originalMeta = validateModelMeta(originalModel?.meta);

      await modelService.updateModelMeta(
        'gpt-5',
        { creditsPer1kTokens: 10 },
        adminUserId
      );

      const updatedModel = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      const updatedMeta = validateModelMeta(updatedModel?.meta);

      expect(updatedMeta.creditsPer1kTokens).toBe(10);
      expect(updatedMeta.displayName).toBe(originalMeta.displayName);
      expect(updatedMeta.capabilities).toEqual(originalMeta.capabilities);
    });

    it('should validate with Zod', async () => {
      await expect(
        modelService.updateModelMeta(
          'gpt-5',
          { contextLength: -1000 } as any, // Invalid negative
          adminUserId
        )
      ).rejects.toThrow();
    });

    it('should clear cache', async () => {
      await modelService.listModels();

      await modelService.updateModelMeta(
        'gpt-5',
        { displayName: 'GPT-5 New Name' },
        adminUserId
      );

      const models = await modelService.listModels();
      const gpt5 = models.models.find((m) => m.id === 'gpt-5');
      expect(gpt5?.name).toBe('GPT-5 New Name');
    });

    it('should reject invalid meta structure', async () => {
      await expect(
        modelService.updateModelMeta(
          'gpt-5',
          { capabilities: [] } as any, // Empty array not allowed
          adminUserId
        )
      ).rejects.toThrow();
    });

    it('should reject non-existent model', async () => {
      await expect(
        modelService.updateModelMeta(
          'non-existent-model',
          { displayName: 'Test' },
          adminUserId
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getLegacyModels() Tests
  // ==========================================================================

  describe('getLegacyModels()', () => {
    beforeEach(async () => {
      // Mark gpt-5 and claude-3.5-sonnet as legacy
      await modelService.markAsLegacy(
        'gpt-5',
        {
          replacementModelId: 'gemini-2.0-pro',
          deprecationNotice: 'Use Gemini instead',
        },
        adminUserId
      );
      await modelService.markAsLegacy(
        'claude-3.5-sonnet',
        { deprecationNotice: 'Deprecated' },
        adminUserId
      );
    });

    it('should return only legacy models', async () => {
      const result = await modelService.getLegacyModels();

      expect(result.total).toBe(2);
      expect(result.models).toHaveLength(2);

      const modelIds = result.models.map((m) => m.id);
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('claude-3.5-sonnet');
      expect(modelIds).not.toContain('gemini-2.0-pro');
    });

    it('should include replacement info', async () => {
      const result = await modelService.getLegacyModels();

      const gpt5 = result.models.find((m) => m.id === 'gpt-5');
      expect(gpt5?.is_legacy).toBe(true);
    });

    it('should return empty array if no legacy models', async () => {
      // Unmark all legacy models
      await modelService.unmarkLegacy('gpt-5', adminUserId);
      await modelService.unmarkLegacy('claude-3.5-sonnet', adminUserId);

      const result = await modelService.getLegacyModels();
      expect(result.total).toBe(0);
      expect(result.models).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getArchivedModels() Tests
  // ==========================================================================

  describe('getArchivedModels()', () => {
    beforeEach(async () => {
      // Archive gpt-5 and gemini-2.0-pro
      await modelService.archive('gpt-5', adminUserId);
      await modelService.archive('gemini-2.0-pro', adminUserId);
    });

    it('should return only archived models', async () => {
      const result = await modelService.getArchivedModels();

      expect(result.total).toBe(2);
      expect(result.models).toHaveLength(2);

      const modelIds = result.models.map((m) => m.id);
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('gemini-2.0-pro');
      expect(modelIds).not.toContain('claude-3.5-sonnet');
    });

    it('should return empty array if no archived models', async () => {
      // Unarchive all
      await modelService.unarchive('gpt-5', adminUserId);
      await modelService.unarchive('gemini-2.0-pro', adminUserId);

      const result = await modelService.getArchivedModels();
      expect(result.total).toBe(0);
      expect(result.models).toHaveLength(0);
    });
  });
});
