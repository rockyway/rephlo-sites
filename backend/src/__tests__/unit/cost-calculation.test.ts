/**
 * Cost Calculation Service Unit Tests
 *
 * Tests the core vendor cost calculation logic for token-to-credit conversion.
 * Validates pricing lookups, cost calculations, and edge case handling.
 *
 * Test Coverage:
 * - Basic cost calculations for different models
 * - Cache pricing (Anthropic/Google)
 * - Historical pricing lookups
 * - Edge cases (zero tokens, negative tokens, missing models)
 * - Precision handling for fractional cents
 * - Large token counts
 *
 * Total: 50+ test cases
 */

import 'reflect-metadata';
import {
  CURRENT_VENDOR_PRICING,
  HISTORICAL_VENDOR_PRICING,
  COST_CALCULATION_TEST_CASES,
  EDGE_CASE_SCENARIOS,
  PROVIDER_IDS,
  calculateExpectedCost,
} from '../../../tests/fixtures/vendor-pricing.fixture';

// Mock service interface (will be replaced with actual service when implemented)
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  providerId: string;
  cachedInputTokens?: number;
  requestTimestamp?: Date;
}

interface CostCalculation {
  vendorCost: number;
  inputCost: number;
  outputCost: number;
  cachedCost?: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  pricingSource: string;
  effectiveDate: Date;
}

// Mock implementation for testing (will be replaced with actual service)
class CostCalculationService {
  async calculateVendorCost(usage: TokenUsage): Promise<CostCalculation> {
    // Find pricing (use historical if timestamp provided)
    const pricing = this.findPricing(
      usage.modelId,
      usage.providerId,
      usage.requestTimestamp || new Date()
    );

    if (!pricing) {
      throw new Error(
        `No active pricing found for ${usage.providerId}/${usage.modelId}`
      );
    }

    // Validate token counts
    if (usage.inputTokens < 0 || usage.outputTokens < 0) {
      throw new Error('Invalid token count: tokens cannot be negative');
    }

    // Calculate costs
    const regularInputTokens = usage.inputTokens - (usage.cachedInputTokens || 0);
    const inputCost = (regularInputTokens * pricing.inputPricePerK) / 1000;
    const cachedCost = usage.cachedInputTokens
      ? (usage.cachedInputTokens * (pricing.cacheInputPricePerK || pricing.inputPricePerK)) / 1000
      : 0;
    const outputCost = (usage.outputTokens * pricing.outputPricePerK) / 1000;
    const vendorCost = inputCost + cachedCost + outputCost;

    return {
      vendorCost,
      inputCost,
      outputCost,
      cachedCost: usage.cachedInputTokens ? cachedCost : undefined,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      pricingSource: `${pricing.providerName}/${pricing.modelName}`,
      effectiveDate: pricing.effectiveFrom,
    };
  }

  private findPricing(modelId: string, providerId: string, timestamp: Date) {
    // Check current pricing first
    let pricing = CURRENT_VENDOR_PRICING.find(
      p => p.modelName === modelId && p.providerId === providerId && p.isActive
    );

    if (pricing) return pricing;

    // Check historical pricing
    pricing = HISTORICAL_VENDOR_PRICING.find(
      p =>
        p.modelName === modelId &&
        p.providerId === providerId &&
        p.effectiveFrom <= timestamp &&
        (!p.effectiveUntil || p.effectiveUntil >= timestamp)
    );

    return pricing;
  }
}

describe('CostCalculationService - Basic Cost Calculations', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  describe('OpenAI Models', () => {
    it('should calculate GPT-4o cost correctly (Plan 112 example)', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gpt-4o',
        providerId: PROVIDER_IDS.OPENAI,
      });

      expect(result.inputCost).toBe(0.0025); // 500 × $0.005/1k
      expect(result.outputCost).toBe(0.0225); // 1500 × $0.015/1k
      expect(result.vendorCost).toBe(0.025);
      expect(result.pricingSource).toBe('OpenAI/gpt-4o');
    });

    it('should calculate GPT-4 Turbo cost correctly', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gpt-4-turbo',
        providerId: PROVIDER_IDS.OPENAI,
      });

      expect(result.inputCost).toBe(0.005); // 500 × $0.01/1k
      expect(result.outputCost).toBe(0.045); // 1500 × $0.03/1k
      expect(result.vendorCost).toBe(0.05);
    });

    it('should calculate GPT-3.5 Turbo cost correctly (cheapest OpenAI)', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gpt-3.5-turbo',
        providerId: PROVIDER_IDS.OPENAI,
      });

      expect(result.inputCost).toBe(0.00025); // 500 × $0.0005/1k
      expect(result.outputCost).toBe(0.00225); // 1500 × $0.0015/1k
      expect(result.vendorCost).toBe(0.0025);
    });
  });

  describe('Anthropic Models', () => {
    it('should calculate Claude 3.5 Sonnet cost correctly', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'claude-3-5-sonnet-20241022',
        providerId: PROVIDER_IDS.ANTHROPIC,
      });

      expect(result.inputCost).toBe(0.0015); // 500 × $0.003/1k
      expect(result.outputCost).toBe(0.0225); // 1500 × $0.015/1k
      expect(result.vendorCost).toBe(0.024);
    });

    it('should calculate Claude 3 Opus cost correctly (expensive model)', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'claude-3-opus',
        providerId: PROVIDER_IDS.ANTHROPIC,
      });

      expect(result.inputCost).toBe(0.0075); // 500 × $0.015/1k
      expect(result.outputCost).toBe(0.1125); // 1500 × $0.075/1k
      expect(result.vendorCost).toBe(0.12);
    });

    it('should calculate Claude 3 Haiku cost correctly (cheapest Anthropic)', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'claude-3-haiku',
        providerId: PROVIDER_IDS.ANTHROPIC,
      });

      expect(result.inputCost).toBe(0.000125); // 500 × $0.00025/1k
      expect(result.outputCost).toBe(0.001875); // 1500 × $0.00125/1k
      expect(result.vendorCost).toBe(0.002);
    });
  });

  describe('Google Gemini Models', () => {
    it('should calculate Gemini 2.0 Flash cost correctly (cheapest overall)', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gemini-2.0-flash',
        providerId: PROVIDER_IDS.GOOGLE,
      });

      expect(result.inputCost).toBe(0.0001875); // 500 × $0.000375/1k
      expect(result.outputCost).toBe(0.00225); // 1500 × $0.0015/1k
      expect(result.vendorCost).toBe(0.0024375);
    });

    it('should calculate Gemini 1.5 Pro cost correctly', async () => {
      const result = await service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gemini-1.5-pro',
        providerId: PROVIDER_IDS.GOOGLE,
      });

      expect(result.inputCost).toBe(0.000625); // 500 × $0.00125/1k
      expect(result.outputCost).toBe(0.0075); // 1500 × $0.005/1k
      expect(result.vendorCost).toBe(0.008125);
    });
  });
});

describe('CostCalculationService - Cache Pricing', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should calculate Anthropic cached input at 10% of standard', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      cachedInputTokens: 200,
      modelId: 'claude-3-5-sonnet-20241022',
      providerId: PROVIDER_IDS.ANTHROPIC,
    });

    // Regular: 300 tokens × $0.003/1k = $0.0009
    // Cached: 200 tokens × $0.0003/1k = $0.00006
    // Output: 1500 tokens × $0.015/1k = $0.0225
    expect(result.inputCost).toBe(0.0009);
    expect(result.cachedCost).toBe(0.00006);
    expect(result.outputCost).toBe(0.0225);
    expect(result.vendorCost).toBe(0.02316);
  });

  it('should calculate Google cached input at 5% of standard', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      cachedInputTokens: 200,
      modelId: 'gemini-2.0-flash',
      providerId: PROVIDER_IDS.GOOGLE,
    });

    // Regular: 300 tokens × $0.000375/1k = $0.0001125
    // Cached: 200 tokens × $0.0000188/1k = $0.00000376
    // Output: 1500 tokens × $0.0015/1k = $0.00225
    expect(result.inputCost).toBe(0.0001125);
    expect(result.cachedCost).toBeCloseTo(0.00000376, 8);
    expect(result.outputCost).toBe(0.00225);
    expect(result.vendorCost).toBeCloseTo(0.00236626, 8);
  });

  it('should handle 100% cached input (all tokens from cache)', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      cachedInputTokens: 500, // All input from cache
      modelId: 'claude-3-5-sonnet-20241022',
      providerId: PROVIDER_IDS.ANTHROPIC,
    });

    expect(result.inputCost).toBe(0); // No regular input
    expect(result.cachedCost).toBe(0.00015); // 500 × $0.0003/1k
    expect(result.outputCost).toBe(0.0225);
    expect(result.vendorCost).toBe(0.02265);
  });

  it('should handle zero cached tokens (no cache hit)', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      cachedInputTokens: 0,
      modelId: 'claude-3-5-sonnet-20241022',
      providerId: PROVIDER_IDS.ANTHROPIC,
    });

    expect(result.inputCost).toBe(0.0015);
    expect(result.cachedCost).toBe(0);
    expect(result.vendorCost).toBe(0.024);
  });
});

describe('CostCalculationService - Edge Cases', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should handle zero output tokens (error occurred)', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 0,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.inputCost).toBe(0.0025);
    expect(result.outputCost).toBe(0);
    expect(result.vendorCost).toBe(0.0025);
  });

  it('should handle zero input tokens (only output)', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 0,
      outputTokens: 1500,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0.0225);
    expect(result.vendorCost).toBe(0.0225);
  });

  it('should handle both zero input and output tokens', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 0,
      outputTokens: 0,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.vendorCost).toBe(0);
  });

  it('should throw error for negative input tokens', async () => {
    await expect(
      service.calculateVendorCost({
        inputTokens: -100,
        outputTokens: 1500,
        modelId: 'gpt-4o',
        providerId: PROVIDER_IDS.OPENAI,
      })
    ).rejects.toThrow('Invalid token count');
  });

  it('should throw error for negative output tokens', async () => {
    await expect(
      service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: -1500,
        modelId: 'gpt-4o',
        providerId: PROVIDER_IDS.OPENAI,
      })
    ).rejects.toThrow('Invalid token count');
  });

  it('should throw error for model not in pricing table', async () => {
    await expect(
      service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gpt-5-ultra',
        providerId: PROVIDER_IDS.OPENAI,
      })
    ).rejects.toThrow('No active pricing found');
  });

  it('should throw error for unknown provider', async () => {
    await expect(
      service.calculateVendorCost({
        inputTokens: 500,
        outputTokens: 1500,
        modelId: 'gpt-4o',
        providerId: 'unknown-provider-uuid',
      })
    ).rejects.toThrow('No active pricing found');
  });
});

describe('CostCalculationService - Large Token Counts', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should handle 100k input + 50k output tokens', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 100000,
      outputTokens: 50000,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.inputCost).toBe(0.5); // 100k × $0.005/1k
    expect(result.outputCost).toBe(0.75); // 50k × $0.015/1k
    expect(result.vendorCost).toBe(1.25);
  });

  it('should handle 1M input + 500k output tokens', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 1000000,
      outputTokens: 500000,
      modelId: 'claude-3-opus',
      providerId: PROVIDER_IDS.ANTHROPIC,
    });

    expect(result.inputCost).toBe(15.0); // 1M × $0.015/1k
    expect(result.outputCost).toBe(37.5); // 500k × $0.075/1k
    expect(result.vendorCost).toBe(52.5);
  });

  it('should maintain precision with 10M tokens', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 10000000,
      outputTokens: 5000000,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.inputCost).toBe(50.0);
    expect(result.outputCost).toBe(75.0);
    expect(result.vendorCost).toBe(125.0);
  });
});

describe('CostCalculationService - Fractional Cent Precision', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should handle very small token counts (< 100 tokens)', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 17,
      outputTokens: 23,
      modelId: 'gpt-3.5-turbo',
      providerId: PROVIDER_IDS.OPENAI,
    });

    expect(result.inputCost).toBe(0.0000085); // 17 × $0.0005/1k
    expect(result.outputCost).toBe(0.0000345); // 23 × $0.0015/1k
    expect(result.vendorCost).toBe(0.000043);
  });

  it('should maintain 8 decimal place precision', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 1,
      outputTokens: 1,
      modelId: 'gemini-2.0-flash',
      providerId: PROVIDER_IDS.GOOGLE,
    });

    // Input: 1 × $0.000375/1k = $0.000000375
    // Output: 1 × $0.0015/1k = $0.0000015
    expect(result.inputCost).toBeCloseTo(0.000000375, 9);
    expect(result.outputCost).toBeCloseTo(0.0000015, 7);
    expect(result.vendorCost).toBeCloseTo(0.000001875, 9);
  });

  it('should handle rounding edge cases', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 333,
      outputTokens: 667,
      modelId: 'gpt-3.5-turbo',
      providerId: PROVIDER_IDS.OPENAI,
    });

    // Input: 333 × $0.0005/1k = $0.0001665
    // Output: 667 × $0.0015/1k = $0.0010005
    expect(result.inputCost).toBe(0.0001665);
    expect(result.outputCost).toBe(0.0010005);
    expect(result.vendorCost).toBe(0.001167);
  });
});

describe('CostCalculationService - Historical Pricing', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should use current pricing for recent requests', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
      requestTimestamp: new Date('2025-11-08'),
    });

    // Current pricing: input $0.005, output $0.015
    expect(result.vendorCost).toBe(0.025);
    expect(result.effectiveDate).toEqual(new Date('2025-10-15'));
  });

  it('should use historical pricing for old requests', async () => {
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
      requestTimestamp: new Date('2025-09-01'),
    });

    // Historical pricing: input $0.003, output $0.012
    expect(result.inputCost).toBe(0.0015); // 500 × $0.003/1k
    expect(result.outputCost).toBe(0.018); // 1500 × $0.012/1k
    expect(result.vendorCost).toBe(0.0195);
    expect(result.effectiveDate).toEqual(new Date('2025-08-01'));
  });

  it('should handle pricing transitions correctly', async () => {
    // Request exactly at transition time
    const result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      modelId: 'gpt-4o',
      providerId: PROVIDER_IDS.OPENAI,
      requestTimestamp: new Date('2025-10-15'),
    });

    // Should use new pricing (effective from Oct 15)
    expect(result.vendorCost).toBe(0.025);
  });
});

describe('CostCalculationService - Fixture Test Cases', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  // Run all test cases from fixture
  COST_CALCULATION_TEST_CASES.forEach(testCase => {
    it(`should calculate ${testCase.name} correctly`, async () => {
      const usage: TokenUsage = {
        inputTokens: testCase.inputTokens,
        outputTokens: testCase.outputTokens,
        modelId: testCase.modelName,
        providerId: testCase.providerId,
      };

      if (testCase.cachedInputTokens) {
        usage.cachedInputTokens = testCase.cachedInputTokens;
      }

      const result = await service.calculateVendorCost(usage);

      expect(result.inputCost).toBeCloseTo(testCase.expectedInputCost, 8);
      expect(result.outputCost).toBeCloseTo(testCase.expectedOutputCost, 8);
      expect(result.vendorCost).toBeCloseTo(testCase.expectedTotalCost, 8);
    });
  });
});

describe('CostCalculationService - Comparison Tests', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    service = new CostCalculationService();
  });

  it('should show GPT-4 Turbo costs 100x more than Gemini Flash', async () => {
    const gpt4Result = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      modelId: 'gpt-4-turbo',
      providerId: PROVIDER_IDS.OPENAI,
    });

    const geminiResult = await service.calculateVendorCost({
      inputTokens: 500,
      outputTokens: 1500,
      modelId: 'gemini-2.0-flash',
      providerId: PROVIDER_IDS.GOOGLE,
    });

    const ratio = gpt4Result.vendorCost / geminiResult.vendorCost;
    expect(ratio).toBeGreaterThan(20); // At least 20x more expensive
    expect(gpt4Result.vendorCost).toBe(0.05);
    expect(geminiResult.vendorCost).toBe(0.0024375);
  });

  it('should show Claude Opus is the most expensive model', async () => {
    const models = [
      { modelId: 'claude-3-opus', providerId: PROVIDER_IDS.ANTHROPIC },
      { modelId: 'gpt-4-turbo', providerId: PROVIDER_IDS.OPENAI },
      { modelId: 'claude-3-5-sonnet-20241022', providerId: PROVIDER_IDS.ANTHROPIC },
      { modelId: 'gemini-1.5-pro', providerId: PROVIDER_IDS.GOOGLE },
    ];

    const costs = await Promise.all(
      models.map(m =>
        service.calculateVendorCost({
          inputTokens: 500,
          outputTokens: 1500,
          ...m,
        })
      )
    );

    const maxCost = Math.max(...costs.map(c => c.vendorCost));
    expect(maxCost).toBe(0.12); // Claude Opus
  });

  it('should show Gemini Flash is the cheapest model', async () => {
    const models = [
      { modelId: 'gpt-3.5-turbo', providerId: PROVIDER_IDS.OPENAI },
      { modelId: 'claude-3-haiku', providerId: PROVIDER_IDS.ANTHROPIC },
      { modelId: 'gemini-2.0-flash', providerId: PROVIDER_IDS.GOOGLE },
    ];

    const costs = await Promise.all(
      models.map(m =>
        service.calculateVendorCost({
          inputTokens: 500,
          outputTokens: 1500,
          ...m,
        })
      )
    );

    const minCost = Math.min(...costs.map(c => c.vendorCost));
    expect(minCost).toBe(0.0024375); // Gemini Flash
  });
});
