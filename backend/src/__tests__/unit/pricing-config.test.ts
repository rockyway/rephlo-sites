/**
 * Pricing Configuration Service Unit Tests
 *
 * Tests tier-based margin multipliers, cascade lookup logic, and margin calculations.
 * Validates the pricing configuration system for token-to-credit conversion.
 *
 * Test Coverage:
 * - Tier-based multiplier lookups
 * - Provider-specific overrides
 * - Model-specific overrides
 * - Combination (tier + provider + model) configurations
 * - Cascade lookup priority (combination > model > provider > tier > default)
 * - Margin percentage calculations
 * - Historical multiplier lookups
 * - Credit value calculations
 *
 * Total: 30+ test cases
 */

import 'reflect-metadata';
import {
  TIER_MULTIPLIERS,
  PROVIDER_MULTIPLIERS,
  MODEL_MULTIPLIERS,
  HISTORICAL_PRICING_CONFIG,
  MULTIPLIER_LOOKUP_TEST_CASES,
  MARGIN_CALCULATION_TEST_CASES,
  CASCADE_LOOKUP_TEST_CASES,
  calculateMarginPercent,
  calculateCreditValue,
  calculateGrossMargin,
} from '../../../tests/fixtures/pricing-config.fixture';

// Mock service interface (will be replaced with actual service when implemented)
interface MultiplierLookup {
  userId: string;
  tier: string;
  providerId?: string;
  modelId?: string;
  requestTimestamp?: Date;
}

interface MultiplierResult {
  multiplier: number;
  targetMarginPercent: number;
  configId: string;
  scope: 'tier' | 'provider' | 'model' | 'combination' | 'default';
  effectiveDate: Date;
}

interface MarginCalculation {
  vendorCost: number;
  multiplier: number;
  creditValue: number;
  grossMargin: number;
  marginPercent: number;
}

// Mock implementation for testing (will be replaced with actual service)
class PricingConfigService {
  async getApplicableMultiplier(lookup: MultiplierLookup): Promise<MultiplierResult> {
    const timestamp = lookup.requestTimestamp || new Date();

    // Priority cascade: combination > model > provider > tier > default

    // 1. Check combination (tier + provider + model)
    if (lookup.tier && lookup.providerId && lookup.modelId) {
      const config = this.findConfig(
        'combination',
        lookup.tier,
        lookup.providerId,
        lookup.modelId,
        timestamp
      );
      if (config) return config;
    }

    // 2. Check model-specific (provider + model, any tier)
    if (lookup.providerId && lookup.modelId) {
      const config = this.findConfig(
        'model',
        undefined,
        lookup.providerId,
        lookup.modelId,
        timestamp
      );
      if (config) return config;
    }

    // 3. Check provider-specific (provider, any model/tier)
    if (lookup.providerId) {
      const config = this.findConfig(
        'provider',
        undefined,
        lookup.providerId,
        undefined,
        timestamp
      );
      if (config) return config;
    }

    // 4. Check tier-specific (tier, any provider/model)
    if (lookup.tier) {
      const config = this.findConfig(
        'tier',
        lookup.tier,
        undefined,
        undefined,
        timestamp
      );
      if (config) return config;
    }

    // 5. Default fallback
    return {
      multiplier: 1.5,
      targetMarginPercent: 33.33,
      configId: 'default-config',
      scope: 'default',
      effectiveDate: new Date(),
    };
  }

  private findConfig(
    scopeType: string,
    tier?: string,
    providerId?: string,
    modelId?: string,
    timestamp: Date = new Date()
  ): MultiplierResult | null {
    // Combine all configs
    const allConfigs = [
      ...TIER_MULTIPLIERS,
      ...PROVIDER_MULTIPLIERS,
      ...MODEL_MULTIPLIERS,
      ...HISTORICAL_PRICING_CONFIG,
    ];

    const config = allConfigs.find(
      c =>
        c.scopeType === scopeType &&
        (!tier || c.subscriptionTier === tier) &&
        (!providerId || c.providerId === providerId) &&
        (!modelId || c.modelId === modelId) &&
        c.effectiveFrom <= timestamp &&
        (!c.effectiveUntil || c.effectiveUntil >= timestamp)
    );

    if (!config) return null;

    return {
      multiplier: config.marginMultiplier,
      targetMarginPercent: config.targetGrossMarginPercent,
      configId: config.id,
      scope: config.scopeType as any,
      effectiveDate: config.effectiveFrom,
    };
  }

  calculateMargin(vendorCost: number, multiplier: number): MarginCalculation {
    const creditValue = vendorCost * multiplier;
    const grossMargin = creditValue - vendorCost;
    const marginPercent = (grossMargin / creditValue) * 100;

    return {
      vendorCost,
      multiplier,
      creditValue,
      grossMargin,
      marginPercent,
    };
  }
}

describe('PricingConfigService - Tier-Based Multipliers', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should return 2.0x multiplier for Free tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-free-001',
      tier: 'free',
    });

    expect(result.multiplier).toBe(2.0);
    expect(result.targetMarginPercent).toBe(50.0);
    expect(result.scope).toBe('tier');
    expect(result.configId).toBe('config-tier-free');
  });

  it('should return 1.5x multiplier for Pro tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
    });

    expect(result.multiplier).toBe(1.5);
    expect(result.targetMarginPercent).toBe(33.33);
    expect(result.scope).toBe('tier');
  });

  it('should return 1.2x multiplier for Pro Max tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-max-001',
      tier: 'pro_max',
    });

    expect(result.multiplier).toBe(1.2);
    expect(result.targetMarginPercent).toBe(16.67);
  });

  it('should return 1.1x multiplier for Enterprise Pro tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-enterprise-001',
      tier: 'enterprise_pro',
    });

    expect(result.multiplier).toBe(1.1);
    expect(result.targetMarginPercent).toBe(9.09);
  });

  it('should return 1.05x multiplier for Enterprise Max tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-enterprise-max-001',
      tier: 'enterprise_max',
    });

    expect(result.multiplier).toBe(1.05);
    expect(result.targetMarginPercent).toBe(4.76);
  });

  it('should return 1.3x multiplier for Perpetual tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-perpetual-001',
      tier: 'perpetual',
    });

    expect(result.multiplier).toBe(1.3);
    expect(result.targetMarginPercent).toBe(23.08);
  });

  it('should return default 1.5x for unknown tier', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-unknown-001',
      tier: 'unknown_tier',
    });

    expect(result.multiplier).toBe(1.5);
    expect(result.scope).toBe('default');
  });
});

describe('PricingConfigService - Provider-Specific Overrides', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should override tier multiplier for Anthropic provider', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      providerId: 'anthropic-provider-uuid-002',
    });

    // Provider override (1.1x) takes precedence over tier default (1.5x)
    expect(result.multiplier).toBe(1.1);
    expect(result.scope).toBe('provider');
    expect(result.configId).toBe('config-provider-anthropic-premium');
  });

  it('should use tier default if no provider override exists', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      providerId: 'openai-provider-uuid-001', // No specific override
    });

    expect(result.multiplier).toBe(1.5); // Falls back to tier default
    expect(result.scope).toBe('tier');
  });
});

describe('PricingConfigService - Model-Specific Overrides', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should override tier multiplier for Gemini Flash', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-free-001',
      tier: 'free',
      providerId: 'google-provider-uuid-003',
      modelId: 'gemini-2.0-flash',
    });

    // Model override (1.2x) takes precedence over tier (2.0x)
    expect(result.multiplier).toBe(1.2);
    expect(result.scope).toBe('model');
    expect(result.configId).toBe('config-model-gemini-flash-discount');
  });

  it('should use tier default if no model override exists', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      providerId: 'openai-provider-uuid-001',
      modelId: 'gpt-3.5-turbo', // No specific override
    });

    expect(result.multiplier).toBe(1.5);
    expect(result.scope).toBe('tier');
  });
});

describe('PricingConfigService - Combination Overrides', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should use combination config (most specific)', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      providerId: 'openai-provider-uuid-001',
      modelId: 'gpt-4-turbo',
    });

    // Combination config (1.65x) beats all others
    expect(result.multiplier).toBe(1.65);
    expect(result.targetMarginPercent).toBe(39.39);
    expect(result.scope).toBe('combination');
    expect(result.configId).toBe('config-model-gpt4o-pro');
  });

  it('should verify combination beats model-specific', async () => {
    // Even if model-specific exists, combination should win
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      providerId: 'openai-provider-uuid-001',
      modelId: 'gpt-4-turbo',
    });

    expect(result.scope).toBe('combination'); // Not 'model'
    expect(result.multiplier).toBe(1.65);
  });
});

describe('PricingConfigService - Cascade Lookup Priority', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  CASCADE_LOOKUP_TEST_CASES.forEach(testCase => {
    it(`should handle ${testCase.name}`, async () => {
      const result = await service.getApplicableMultiplier({
        userId: 'test-user',
        tier: testCase.tier,
        providerId: testCase.providerId,
        modelId: testCase.modelId,
      });

      expect(result.multiplier).toBe(testCase.expectedMultiplier);
      if (testCase.expectedConfigId) {
        expect(result.configId).toBe(testCase.expectedConfigId);
      }
    });
  });
});

describe('PricingConfigService - Margin Calculations', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should calculate 50% margin for Free tier (2.0x)', () => {
    const result = service.calculateMargin(0.024, 2.0);

    expect(result.vendorCost).toBe(0.024);
    expect(result.multiplier).toBe(2.0);
    expect(result.creditValue).toBe(0.048);
    expect(result.grossMargin).toBe(0.024);
    expect(result.marginPercent).toBeCloseTo(50.0, 1);
  });

  it('should calculate 33.33% margin for Pro tier (1.5x)', () => {
    const result = service.calculateMargin(0.024, 1.5);

    expect(result.creditValue).toBe(0.036);
    expect(result.grossMargin).toBe(0.012);
    expect(result.marginPercent).toBeCloseTo(33.33, 2);
  });

  it('should calculate 9.09% margin for Enterprise tier (1.1x)', () => {
    const result = service.calculateMargin(0.024, 1.1);

    expect(result.creditValue).toBe(0.0264);
    expect(result.grossMargin).toBeCloseTo(0.0024, 4);
    expect(result.marginPercent).toBeCloseTo(9.09, 2);
  });

  it('should calculate 4.76% margin for Enterprise Max (1.05x)', () => {
    const result = service.calculateMargin(0.024, 1.05);

    expect(result.creditValue).toBe(0.0252);
    expect(result.grossMargin).toBeCloseTo(0.0012, 4);
    expect(result.marginPercent).toBeCloseTo(4.76, 2);
  });

  MARGIN_CALCULATION_TEST_CASES.forEach(testCase => {
    it(`should calculate ${testCase.name}`, () => {
      const result = service.calculateMargin(
        testCase.vendorCost,
        testCase.multiplier
      );

      expect(result.creditValue).toBeCloseTo(testCase.expectedCreditValue, 8);
      expect(result.grossMargin).toBeCloseTo(testCase.expectedGrossMargin, 8);
      expect(result.marginPercent).toBeCloseTo(testCase.expectedMarginPercent, 2);
    });
  });
});

describe('PricingConfigService - Historical Multipliers', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should use current multiplier for recent requests', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      requestTimestamp: new Date('2025-11-08'),
    });

    expect(result.multiplier).toBe(1.5); // Current Pro multiplier
  });

  it('should use historical multiplier for old requests', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      requestTimestamp: new Date('2025-09-15'),
    });

    expect(result.multiplier).toBe(1.4); // Old Pro multiplier
    expect(result.configId).toBe('config-tier-pro-old');
  });

  it('should handle multiplier transition correctly', async () => {
    // Request exactly at transition time
    const result = await service.getApplicableMultiplier({
      userId: 'user-pro-001',
      tier: 'pro',
      requestTimestamp: new Date('2025-11-01'),
    });

    // Should use new multiplier (effective from Nov 1)
    expect(result.multiplier).toBe(1.5);
  });
});

describe('PricingConfigService - Multiplier Lookup Test Cases', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  MULTIPLIER_LOOKUP_TEST_CASES.forEach(testCase => {
    it(`should handle ${testCase.name}`, async () => {
      const result = await service.getApplicableMultiplier({
        userId: 'test-user',
        tier: testCase.tier,
        providerId: testCase.providerId,
        modelId: testCase.modelId,
      });

      expect(result.multiplier).toBe(testCase.expectedMultiplier);
      expect(result.targetMarginPercent).toBeCloseTo(testCase.expectedMarginPercent, 2);
    });
  });
});

describe('PricingConfigService - Margin Percentage Formula', () => {
  it('should calculate margin percentage correctly for 2.0x', () => {
    const percent = calculateMarginPercent(2.0);
    expect(percent).toBeCloseTo(50.0, 2);
  });

  it('should calculate margin percentage correctly for 1.5x', () => {
    const percent = calculateMarginPercent(1.5);
    expect(percent).toBeCloseTo(33.33, 2);
  });

  it('should calculate margin percentage correctly for 1.2x', () => {
    const percent = calculateMarginPercent(1.2);
    expect(percent).toBeCloseTo(16.67, 2);
  });

  it('should calculate margin percentage correctly for 1.1x', () => {
    const percent = calculateMarginPercent(1.1);
    expect(percent).toBeCloseTo(9.09, 2);
  });

  it('should calculate margin percentage correctly for 1.05x', () => {
    const percent = calculateMarginPercent(1.05);
    expect(percent).toBeCloseTo(4.76, 2);
  });

  it('should return 0% margin for 1.0x (break-even)', () => {
    const percent = calculateMarginPercent(1.0);
    expect(percent).toBe(0);
  });

  it('should handle very high multipliers (5.0x = 80% margin)', () => {
    const percent = calculateMarginPercent(5.0);
    expect(percent).toBeCloseTo(80.0, 2);
  });
});

describe('PricingConfigService - Credit Value Calculations', () => {
  it('should calculate credit value with 2.0x multiplier', () => {
    const creditValue = calculateCreditValue(0.024, 2.0);
    expect(creditValue).toBe(0.048);
  });

  it('should calculate credit value with 1.5x multiplier', () => {
    const creditValue = calculateCreditValue(0.024, 1.5);
    expect(creditValue).toBe(0.036);
  });

  it('should handle very small vendor costs', () => {
    const creditValue = calculateCreditValue(0.000043, 1.5);
    expect(creditValue).toBeCloseTo(0.0000645, 8);
  });

  it('should handle large vendor costs', () => {
    const creditValue = calculateCreditValue(52.5, 1.1);
    expect(creditValue).toBeCloseTo(57.75, 2);
  });
});

describe('PricingConfigService - Gross Margin Calculations', () => {
  it('should calculate gross margin for Free tier', () => {
    const margin = calculateGrossMargin(0.024, 2.0);
    expect(margin).toBe(0.024); // 50% of credit value
  });

  it('should calculate gross margin for Pro tier', () => {
    const margin = calculateGrossMargin(0.024, 1.5);
    expect(margin).toBe(0.012); // 33.33% of credit value
  });

  it('should calculate gross margin for Enterprise tier', () => {
    const margin = calculateGrossMargin(0.024, 1.1);
    expect(margin).toBeCloseTo(0.0024, 4); // 9.09% of credit value
  });

  it('should return zero margin for 1.0x multiplier', () => {
    const margin = calculateGrossMargin(0.024, 1.0);
    expect(margin).toBe(0);
  });
});

describe('PricingConfigService - Edge Cases', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should handle null/undefined tier gracefully', async () => {
    const result = await service.getApplicableMultiplier({
      userId: 'test-user',
      tier: null as any,
    });

    expect(result.multiplier).toBe(1.5); // Default
    expect(result.scope).toBe('default');
  });

  it('should handle missing user ID', async () => {
    const result = await service.getApplicableMultiplier({
      userId: null as any,
      tier: 'pro',
    });

    expect(result.multiplier).toBe(1.5);
  });

  it('should handle zero vendor cost in margin calculation', () => {
    const result = service.calculateMargin(0, 1.5);

    expect(result.creditValue).toBe(0);
    expect(result.grossMargin).toBe(0);
    expect(result.marginPercent).toBe(0); // Handle division by zero
  });

  it('should handle negative vendor cost (error scenario)', () => {
    const result = service.calculateMargin(-0.024, 1.5);

    expect(result.creditValue).toBe(-0.036);
    expect(result.grossMargin).toBe(-0.012);
  });
});

describe('PricingConfigService - Multiplier Comparison Tests', () => {
  let service: PricingConfigService;

  beforeEach(() => {
    service = new PricingConfigService();
  });

  it('should verify Free tier has highest multiplier', async () => {
    const tiers = ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'];

    const results = await Promise.all(
      tiers.map(tier =>
        service.getApplicableMultiplier({
          userId: 'test-user',
          tier,
        })
      )
    );

    const multipliers = results.map(r => r.multiplier);
    const maxMultiplier = Math.max(...multipliers);

    expect(maxMultiplier).toBe(2.0); // Free tier
  });

  it('should verify Enterprise Max has lowest multiplier', async () => {
    const tiers = ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'];

    const results = await Promise.all(
      tiers.map(tier =>
        service.getApplicableMultiplier({
          userId: 'test-user',
          tier,
        })
      )
    );

    const multipliers = results.map(r => r.multiplier);
    const minMultiplier = Math.min(...multipliers);

    expect(minMultiplier).toBe(1.05); // Enterprise Max
  });

  it('should verify multipliers decrease as tier increases (profitability strategy)', async () => {
    const tiers = [
      { tier: 'free', expectedMultiplier: 2.0 },
      { tier: 'pro', expectedMultiplier: 1.5 },
      { tier: 'pro_max', expectedMultiplier: 1.2 },
      { tier: 'enterprise_pro', expectedMultiplier: 1.1 },
      { tier: 'enterprise_max', expectedMultiplier: 1.05 },
    ];

    for (let i = 0; i < tiers.length - 1; i++) {
      const current = await service.getApplicableMultiplier({
        userId: 'test-user',
        tier: tiers[i].tier,
      });

      const next = await service.getApplicableMultiplier({
        userId: 'test-user',
        tier: tiers[i + 1].tier,
      });

      expect(current.multiplier).toBeGreaterThan(next.multiplier);
    }
  });
});
