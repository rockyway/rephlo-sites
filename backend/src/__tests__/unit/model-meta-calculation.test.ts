/**
 * Unit Tests for Model Credit Calculation Functions
 *
 * Phase 3: Separate input/output pricing implementation
 *
 * Tests both the legacy calculateCreditsPerKTokens() and new
 * calculateSeparateCreditsPerKTokens() functions
 */

import {
  calculateCreditsPerKTokens,
  calculateSeparateCreditsPerKTokens,
} from '../../types/model-meta';

describe('calculateCreditsPerKTokens (Legacy - DEPRECATED)', () => {
  describe('Bug Fix: Unit Conversion', () => {
    it('should fix the unit mismatch bug (cents vs dollars)', () => {
      // User's example: Input $1.25, Output $10 per 1M tokens
      const inputCents = 125; // $1.25 = 125 cents
      const outputCents = 1000; // $10 = 1000 cents

      const result = calculateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.0005);

      // Expected: 29 credits (not 2812!)
      // Calculation:
      // avgCost = (125 + 1000) / 2 = 562.5 cents/1M
      // costPer1K = 562.5 / 1000 = 0.5625 cents
      // costWithMargin = 0.5625 × 2.5 = 1.40625 cents
      // creditCentValue = 0.0005 × 100 = 0.05 cents
      // credits = ceil(1.40625 / 0.05) = ceil(28.125) = 29
      expect(result).toBe(29);
    });

    it('should handle low-cost models correctly', () => {
      // Input: $0.50, Output: $1.50 per 1M
      const result = calculateCreditsPerKTokens(50, 150, 2.5, 0.0005);

      // avgCost = (50 + 150) / 2 = 100 cents/1M
      // costPer1K = 0.1 cents
      // costWithMargin = 0.25 cents
      // credits = ceil(0.25 / 0.05) = 5
      expect(result).toBe(5);
    });

    it('should handle high-cost models correctly', () => {
      // Input: $3.00, Output: $9.00 per 1M
      const result = calculateCreditsPerKTokens(300, 900, 2.5, 0.0005);

      // avgCost = 600 cents/1M
      // costPer1K = 0.6 cents
      // costWithMargin = 1.5 cents
      // credits = ceil(1.5 / 0.05) = 30
      expect(result).toBe(30);
    });
  });

  describe('Margin Multiplier', () => {
    it('should apply different margin multipliers correctly', () => {
      const inputCents = 125;
      const outputCents = 1000;

      // Free tier: 2.0×
      const freeResult = calculateCreditsPerKTokens(inputCents, outputCents, 2.0, 0.0005);
      expect(freeResult).toBe(23); // ceil((562.5/1000) × 2.0 / 0.05) = 23

      // Pro tier: 1.0× (break-even)
      const proResult = calculateCreditsPerKTokens(inputCents, outputCents, 1.0, 0.0005);
      expect(proResult).toBe(12); // ceil((562.5/1000) × 1.0 / 0.05) = 12

      // Enterprise: 1.25×
      const entResult = calculateCreditsPerKTokens(inputCents, outputCents, 1.25, 0.0005);
      expect(entResult).toBe(15); // ceil((562.5/1000) × 1.25 / 0.05) = 15
    });
  });
});

describe('calculateSeparateCreditsPerKTokens (Phase 3)', () => {
  describe('Separate Input/Output Calculation', () => {
    it('should calculate separate input/output credits correctly', () => {
      // User's example: Input $1.25, Output $10 per 1M tokens
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.0005);

      // Input: (125/1000) × 2.5 / 0.05 = ceil(6.25) = 7
      expect(result.inputCreditsPerK).toBe(7);

      // Output: (1000/1000) × 2.5 / 0.05 = ceil(50) = 50
      expect(result.outputCreditsPerK).toBe(50);

      // Estimated total (1:10 ratio): (1×7 + 10×50) / 11 = 507/11 = ceil(46.09) = 47
      expect(result.estimatedTotalPerK).toBe(47);
    });

    it('should reflect real-world cost more accurately than legacy', () => {
      const inputCents = 125;
      const outputCents = 1000;

      const legacy = calculateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.0005);
      const separate = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.0005);

      // Legacy: 29 credits (assumes 50/50 split)
      expect(legacy).toBe(29);

      // Separate estimated (1:10): 47 credits (reflects real usage)
      expect(separate.estimatedTotalPerK).toBe(47);

      // Real-world usage costs 62% more than simple averaging suggests
      expect(separate.estimatedTotalPerK).toBeGreaterThan(legacy);
      expect(separate.estimatedTotalPerK / legacy).toBeCloseTo(1.62, 1);
    });

    it('should handle symmetric pricing (input = output)', () => {
      // Input: $5.00, Output: $5.00 per 1M
      const result = calculateSeparateCreditsPerKTokens(500, 500, 2.5, 0.0005);

      // Both should be the same
      expect(result.inputCreditsPerK).toBe(25);
      expect(result.outputCreditsPerK).toBe(25);

      // Estimated total should also be 25 (same regardless of ratio)
      expect(result.estimatedTotalPerK).toBe(25);
    });

    it('should handle asymmetric pricing (vision model example)', () => {
      // Vision model: Input $1.25 (image tokens), Output $10 (text)
      // But vision models have inverse ratio: 8:5 (more input than output)
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.0005);

      expect(result.inputCreditsPerK).toBe(7);
      expect(result.outputCreditsPerK).toBe(50);

      // For vision with 8:5 ratio, actual usage would be:
      // (8×7 + 5×50) / 13 = 306/13 = ~24 credits
      // This is cheaper than the 1:10 estimate of 47 credits
      const visionEstimate = Math.ceil((8 * result.inputCreditsPerK + 5 * result.outputCreditsPerK) / 13);
      expect(visionEstimate).toBe(24);
    });
  });

  describe('Edge Cases', () => {
    it('should round up to ensure costs are covered', () => {
      // Scenario where fractional credits would underprice
      const result = calculateSeparateCreditsPerKTokens(1, 2, 2.5, 0.0005);

      // Input: (1/1000) × 2.5 / 0.05 = 0.05 → ceil = 1
      expect(result.inputCreditsPerK).toBe(1);

      // Output: (2/1000) × 2.5 / 0.05 = 0.1 → ceil = 1
      expect(result.outputCreditsPerK).toBe(1);
    });

    it('should handle zero input cost (hypothetical)', () => {
      const result = calculateSeparateCreditsPerKTokens(0, 1000, 2.5, 0.0005);

      expect(result.inputCreditsPerK).toBe(0);
      expect(result.outputCreditsPerK).toBe(50);
      expect(result.estimatedTotalPerK).toBe(46); // (1×0 + 10×50)/11 = 45.45 → 46
    });

    it('should handle zero output cost (hypothetical)', () => {
      const result = calculateSeparateCreditsPerKTokens(1000, 0, 2.5, 0.0005);

      expect(result.inputCreditsPerK).toBe(50);
      expect(result.outputCreditsPerK).toBe(0);
      expect(result.estimatedTotalPerK).toBe(5); // (1×50 + 10×0)/11 = 4.54 → 5
    });
  });

  describe('Different Margin Multipliers', () => {
    it('should apply margin to both input and output separately', () => {
      const inputCents = 125;
      const outputCents = 1000;

      // Free tier: 2.0×
      const free = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 2.0, 0.0005);
      expect(free.inputCreditsPerK).toBe(5); // (125/1000) × 2.0 / 0.05 = 5
      expect(free.outputCreditsPerK).toBe(40); // (1000/1000) × 2.0 / 0.05 = 40

      // Pro: 1.0× (break-even)
      const pro = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 1.0, 0.0005);
      expect(pro.inputCreditsPerK).toBe(3); // ceil(2.5) = 3
      expect(pro.outputCreditsPerK).toBe(20);

      // Enterprise: 1.25×
      const ent = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 1.25, 0.0005);
      expect(ent.inputCreditsPerK).toBe(4); // ceil(3.125) = 4
      expect(ent.outputCreditsPerK).toBe(25);
    });
  });

  describe('Real-World Examples', () => {
    it('should calculate GPT-5 Chat pricing correctly', () => {
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.0005);

      expect(result).toEqual({
        inputCreditsPerK: 7,
        outputCreditsPerK: 50,
        estimatedTotalPerK: 47,
      });
    });

    it('should calculate Claude Opus pricing correctly', () => {
      // Claude Opus: Input $15, Output $75 per 1M tokens
      const result = calculateSeparateCreditsPerKTokens(1500, 7500, 2.5, 0.0005);

      // Input: (1500/1000) × 2.5 / 0.05 = 75
      expect(result.inputCreditsPerK).toBe(75);

      // Output: (7500/1000) × 2.5 / 0.05 = 375
      expect(result.outputCreditsPerK).toBe(375);

      // Estimated: (1×75 + 10×375) / 11 = 3825/11 = 348
      expect(result.estimatedTotalPerK).toBe(348);
    });

    it('should calculate GPT-4o Mini pricing correctly', () => {
      // GPT-4o Mini: Input $0.15, Output $0.60 per 1M tokens
      const result = calculateSeparateCreditsPerKTokens(15, 60, 2.5, 0.0005);

      // Input: (15/1000) × 2.5 / 0.05 = 0.75 → 1
      expect(result.inputCreditsPerK).toBe(1);

      // Output: (60/1000) × 2.5 / 0.05 = 3
      expect(result.outputCreditsPerK).toBe(3);

      // Estimated: (1×1 + 10×3) / 11 = 31/11 = 3
      expect(result.estimatedTotalPerK).toBe(3);
    });
  });
});

describe('Comparison: Legacy vs Separate Pricing', () => {
  const testCases = [
    {
      name: 'GPT-5 Chat',
      input: 125,
      output: 1000,
      legacyExpected: 29,
      separateEstimate: 47,
    },
    {
      name: 'Claude Opus',
      input: 1500,
      output: 7500,
      legacyExpected: 225,
      separateEstimate: 348,
    },
    {
      name: 'GPT-4o Mini',
      input: 15,
      output: 60,
      legacyExpected: 2, // ceil((15+60)/2/1000 × 2.5 / 0.05) = ceil(1.875) = 2
      separateEstimate: 3,
    },
  ];

  testCases.forEach(({ name, input, output, legacyExpected, separateEstimate }) => {
    it(`${name}: separate pricing better reflects real usage`, () => {
      const legacy = calculateCreditsPerKTokens(input, output, 2.5, 0.0005);
      const separate = calculateSeparateCreditsPerKTokens(input, output, 2.5, 0.0005);

      expect(legacy).toBe(legacyExpected);
      expect(separate.estimatedTotalPerK).toBe(separateEstimate);

      // Separate pricing should be higher for models with expensive output
      if (output > input) {
        expect(separate.estimatedTotalPerK).toBeGreaterThan(legacy);
      }
    });
  });
});
