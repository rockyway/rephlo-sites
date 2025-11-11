/**
 * Unit Tests for ModelService - Tier Access Methods
 *
 * Tests the tier access functionality in ModelService:
 * - canUserAccessModel() method
 * - listModels() with tier context
 * - getModelDetails() with tier context
 *
 * Uses mock Prisma client for isolated testing.
 *
 * Reference: docs/plan/108-model-tier-access-control-architecture.md
 */

// Mock logger MUST be before imports
jest.mock('../../utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { SubscriptionTier } from '@prisma/client';
import { ModelService } from '../../services/model.service';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ModelService - Tier Access Control', () => {
  let modelService: ModelService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    // Create mock Prisma client
    prismaMock = mockDeep<PrismaClient>();
    modelService = new ModelService(prismaMock as unknown as PrismaClient);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  // ==========================================================================
  // canUserAccessModel - Success Cases
  // ==========================================================================

  describe('canUserAccessModel - access allowed scenarios', () => {
    it('should allow free user to access free model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('gpt-4-mini', SubscriptionTier.free);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredTier).toBeUndefined();
      expect(prismaMock.model.findUnique).toHaveBeenCalledWith({
        where: { id: 'gpt-4-mini' },
        select: {
          requiredTier: true,
          tierRestrictionMode: true,
          allowedTiers: true,
        },
      });
    });

    it('should allow pro user to access free model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('gpt-4-mini', SubscriptionTier.pro);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredTier).toBeUndefined();
    });

    it('should allow pro user to access pro model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('claude-3.5-sonnet', SubscriptionTier.pro);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow enterprise user to access enterprise model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.enterprise,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('gpt-5', SubscriptionTier.enterprise);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow enterprise user to access all tiers (minimum mode)', async () => {
      const models = [
        { id: 'free-model', tier: SubscriptionTier.free },
        { id: 'pro-model', tier: SubscriptionTier.pro },
        { id: 'enterprise-model', tier: SubscriptionTier.enterprise },
      ];

      for (const model of models) {
        prismaMock.model.findUnique.mockResolvedValue({
          requiredTier: model.tier,
          tierRestrictionMode: 'minimum',
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
        } as any);

        const result = await modelService.canUserAccessModel(model.id, SubscriptionTier.enterprise);
        expect(result.allowed).toBe(true);
      }
    });

    it('should allow exact tier match (exact mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'exact',
        allowedTiers: [SubscriptionTier.pro],
      } as any);

      const result = await modelService.canUserAccessModel('pro-only-model', SubscriptionTier.pro);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow user in whitelist (whitelist mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'whitelist',
        allowedTiers: [SubscriptionTier.free, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('whitelist-model', SubscriptionTier.enterprise);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  // ==========================================================================
  // canUserAccessModel - Access Denied Cases
  // ==========================================================================

  describe('canUserAccessModel - access denied scenarios', () => {
    it('should deny free user access to pro model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('claude-3.5-sonnet', SubscriptionTier.free);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Requires Pro tier or higher');
      expect(result.requiredTier).toBe(SubscriptionTier.pro);
    });

    it('should deny free user access to enterprise model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.enterprise,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('gpt-5', SubscriptionTier.free);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Requires Enterprise tier or higher');
      expect(result.requiredTier).toBe(SubscriptionTier.enterprise);
    });

    it('should deny pro user access to enterprise model (minimum mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.enterprise,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('gpt-5', SubscriptionTier.pro);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Requires Enterprise tier or higher');
      expect(result.requiredTier).toBe(SubscriptionTier.enterprise);
    });

    it('should deny higher tier access in exact mode', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: 'exact',
        allowedTiers: [SubscriptionTier.free],
      } as any);

      const result = await modelService.canUserAccessModel('free-only-model', SubscriptionTier.pro);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Only available for Free tier');
      expect(result.requiredTier).toBe(SubscriptionTier.free);
    });

    it('should deny lower tier access in exact mode', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'exact',
        allowedTiers: [SubscriptionTier.pro],
      } as any);

      const result = await modelService.canUserAccessModel('pro-only-model', SubscriptionTier.free);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Only available for Pro tier');
      expect(result.requiredTier).toBe(SubscriptionTier.pro);
    });

    it('should deny user not in whitelist (whitelist mode)', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'whitelist',
        allowedTiers: [SubscriptionTier.free, SubscriptionTier.enterprise],
      } as any);

      const result = await modelService.canUserAccessModel('whitelist-model', SubscriptionTier.pro);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Available for: Free, Enterprise');
      expect(result.requiredTier).toBe(SubscriptionTier.pro);
    });
  });

  // ==========================================================================
  // canUserAccessModel - Error Cases
  // ==========================================================================

  describe('canUserAccessModel - error handling', () => {
    it('should return access denied when model not found', async () => {
      prismaMock.model.findUnique.mockResolvedValue(null);

      const result = await modelService.canUserAccessModel('non-existent-model', SubscriptionTier.pro);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Model not found');
      expect(result.requiredTier).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.model.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        modelService.canUserAccessModel('gpt-5', SubscriptionTier.pro)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid tier restriction mode', async () => {
      prismaMock.model.findUnique.mockResolvedValue({
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'invalid-mode',
        allowedTiers: [SubscriptionTier.pro],
      } as any);

      const result = await modelService.canUserAccessModel('invalid-model', SubscriptionTier.pro);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid tier restriction mode');
    });
  });

  // ==========================================================================
  // listModels with tier context
  // ==========================================================================

  describe('listModels with tier context', () => {
    const mockModels = [
      {
        id: 'free-model',
        displayName: 'Free Model',
        provider: 'openai',
        description: 'Free tier model',
        capabilities: ['text'],
        contextLength: 4096,
        maxOutputTokens: 2048,
        creditsPer1kTokens: 1,
        isAvailable: true,
        version: '1.0',
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
      },
      {
        id: 'pro-model',
        displayName: 'Pro Model',
        provider: 'anthropic',
        description: 'Pro tier model',
        capabilities: ['text', 'vision'],
        contextLength: 8192,
        maxOutputTokens: 4096,
        creditsPer1kTokens: 5,
        isAvailable: true,
        version: '1.0',
        requiredTier: SubscriptionTier.pro,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
      },
      {
        id: 'enterprise-model',
        displayName: 'Enterprise Model',
        provider: 'openai',
        description: 'Enterprise tier model',
        capabilities: ['text', 'vision', 'function-calling'],
        contextLength: 16384,
        maxOutputTokens: 8192,
        creditsPer1kTokens: 10,
        isAvailable: true,
        version: '1.0',
        requiredTier: SubscriptionTier.enterprise,
        tierRestrictionMode: 'minimum',
        allowedTiers: [SubscriptionTier.enterprise],
      },
    ];

    it('should mark models as accessible or restricted for free user', async () => {
      prismaMock.model.findMany.mockResolvedValue(mockModels as any);

      const result = await modelService.listModels({}, SubscriptionTier.free);

      expect(result.models).toHaveLength(3);
      expect(result.models[0].access_status).toBe('allowed'); // free model
      expect(result.models[1].access_status).toBe('upgrade_required'); // pro model
      expect(result.models[2].access_status).toBe('upgrade_required'); // enterprise model
      expect(result.user_tier).toBe(SubscriptionTier.free);
    });

    it('should mark models as accessible or restricted for pro user', async () => {
      prismaMock.model.findMany.mockResolvedValue(mockModels as any);

      const result = await modelService.listModels({}, SubscriptionTier.pro);

      expect(result.models).toHaveLength(3);
      expect(result.models[0].access_status).toBe('allowed'); // free model
      expect(result.models[1].access_status).toBe('allowed'); // pro model
      expect(result.models[2].access_status).toBe('upgrade_required'); // enterprise model
      expect(result.user_tier).toBe(SubscriptionTier.pro);
    });

    it('should mark all models as accessible for enterprise user', async () => {
      prismaMock.model.findMany.mockResolvedValue(mockModels as any);

      const result = await modelService.listModels({}, SubscriptionTier.enterprise);

      expect(result.models).toHaveLength(3);
      expect(result.models[0].access_status).toBe('allowed'); // free model
      expect(result.models[1].access_status).toBe('allowed'); // pro model
      expect(result.models[2].access_status).toBe('allowed'); // enterprise model
      expect(result.user_tier).toBe(SubscriptionTier.enterprise);
    });

    it('should include tier metadata in response', async () => {
      prismaMock.model.findMany.mockResolvedValue(mockModels as any);

      const result = await modelService.listModels({}, SubscriptionTier.pro);

      expect(result.models[0]).toMatchObject({
        required_tier: SubscriptionTier.free,
        tier_restriction_mode: 'minimum',
        allowed_tiers: expect.arrayContaining([SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise]),
      });

      expect(result.models[1]).toMatchObject({
        required_tier: SubscriptionTier.pro,
        tier_restriction_mode: 'minimum',
        allowed_tiers: expect.arrayContaining([SubscriptionTier.pro, SubscriptionTier.enterprise]),
      });
    });
  });

  // ==========================================================================
  // getModelDetails with tier context
  // ==========================================================================

  describe('getModelDetails with tier context', () => {
    const mockModel = {
      id: 'gpt-5',
      name: 'gpt-5',
      displayName: 'GPT-5',
      provider: 'openai',
      description: 'Enterprise-grade model',
      capabilities: ['text', 'vision'],
      contextLength: 128000,
      maxOutputTokens: 16384,
      inputCostPerMillionTokens: 500,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 50,
      isAvailable: true,
      isDeprecated: false,
      version: '1.0',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      requiredTier: SubscriptionTier.enterprise,
      tierRestrictionMode: 'minimum',
      allowedTiers: [SubscriptionTier.enterprise],
    };

    it('should include access_status "allowed" when user has sufficient tier', async () => {
      prismaMock.model.findUnique.mockResolvedValue(mockModel as any);

      const result = await modelService.getModelDetails('gpt-5', SubscriptionTier.enterprise);

      expect(result.access_status).toBe('allowed');
      expect(result.upgrade_info).toBeUndefined();
    });

    it('should include access_status "upgrade_required" and upgrade info when tier insufficient', async () => {
      prismaMock.model.findUnique.mockResolvedValue(mockModel as any);

      const result = await modelService.getModelDetails('gpt-5', SubscriptionTier.free);

      expect(result.access_status).toBe('upgrade_required');
      expect(result.upgrade_info).toEqual({
        required_tier: SubscriptionTier.enterprise,
        upgrade_url: '/subscriptions/upgrade',
      });
    });

    it('should include tier metadata in response', async () => {
      prismaMock.model.findUnique.mockResolvedValue(mockModel as any);

      const result = await modelService.getModelDetails('gpt-5', SubscriptionTier.enterprise);

      expect(result).toMatchObject({
        required_tier: SubscriptionTier.enterprise,
        tier_restriction_mode: 'minimum',
        allowed_tiers: [SubscriptionTier.enterprise],
      });
    });

    it('should work without tier context (backward compatibility)', async () => {
      prismaMock.model.findUnique.mockResolvedValue(mockModel as any);

      const result = await modelService.getModelDetails('gpt-5');

      expect(result.access_status).toBe('allowed');
      expect(result.upgrade_info).toBeUndefined();
    });
  });
});
