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

      const result = calculateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.01);

      // Expected: 2 credits with new credit value
      // Calculation:
      // avgCost = (125 + 1000) / 2 = 562.5 cents/1M
      // costPer1K = 562.5 / 1000 = 0.5625 cents
      // costWithMargin = 0.5625 × 2.5 = 1.40625 cents
      // creditCentValue = 0.01 × 100 = 1.0 cent
      // credits = ceil(1.40625 / 1.0) = ceil(1.40625) = 2
      expect(result).toBe(2);
    });

    it('should handle low-cost models correctly', () => {
      // Input: $0.50, Output: $1.50 per 1M
      const result = calculateCreditsPerKTokens(50, 150, 2.5, 0.01);

      // avgCost = (50 + 150) / 2 = 100 cents/1M
      // costPer1K = 0.1 cents
      // costWithMargin = 0.25 cents
      // credits = ceil(0.25 / 1.0) = 1
      expect(result).toBe(1);
    });

    it('should handle high-cost models correctly', () => {
      // Input: $3.00, Output: $9.00 per 1M
      const result = calculateCreditsPerKTokens(300, 900, 2.5, 0.01);

      // avgCost = 600 cents/1M
      // costPer1K = 0.6 cents
      // costWithMargin = 1.5 cents
      // credits = ceil(1.5 / 1.0) = 2
      expect(result).toBe(2);
    });
  });

  describe('Margin Multiplier', () => {
    it('should apply different margin multipliers correctly', () => {
      const inputCents = 125;
      const outputCents = 1000;

      // Free tier: 2.0×
      const freeResult = calculateCreditsPerKTokens(inputCents, outputCents, 2.0, 0.01);
      expect(freeResult).toBe(2); // ceil((562.5/1000) × 2.0 / 1.0) = ceil(1.125) = 2

      // Pro tier: 1.0× (break-even)
      const proResult = calculateCreditsPerKTokens(inputCents, outputCents, 1.0, 0.01);
      expect(proResult).toBe(1); // ceil((562.5/1000) × 1.0 / 1.0) = ceil(0.5625) = 1

      // Enterprise: 1.25×
      const entResult = calculateCreditsPerKTokens(inputCents, outputCents, 1.25, 0.01);
      expect(entResult).toBe(1); // ceil((562.5/1000) × 1.25 / 1.0) = ceil(0.703125) = 1
    });
  });
});

describe('calculateSeparateCreditsPerKTokens (Phase 3)', () => {
  describe('Separate Input/Output Calculation', () => {
    it('should calculate separate input/output credits correctly', () => {
      // User's example: Input $1.25, Output $10 per 1M tokens (with 2.5x margin)
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.01);

      // Input: $0.00125/1K × 2.5 margin = $0.003125, credits = ceil(0.003125 × 100) = 1
      expect(result.inputCreditsPerK).toBe(1);

      // Output: $0.01/1K × 2.5 margin = $0.025, credits = ceil(0.025 × 100) = 3
      expect(result.outputCreditsPerK).toBe(3);

      // Estimated total (1:10 ratio): (1×1 + 10×3) / 11 = 31/11 = ceil(2.818) = 3
      expect(result.estimatedTotalPerK).toBe(3);
    });

    it('should reflect real-world cost more accurately than legacy', () => {
      const inputCents = 125;
      const outputCents = 1000;

      const legacy = calculateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.01);
      const separate = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 2.5, 0.01);

      // Legacy: 2 credits (assumes 50/50 split)
      expect(legacy).toBe(2);

      // Separate estimated (1:10): 3 credits (reflects real usage)
      expect(separate.estimatedTotalPerK).toBe(3);

      // Real-world usage costs 50% more than simple averaging suggests
      expect(separate.estimatedTotalPerK).toBeGreaterThan(legacy);
      expect(separate.estimatedTotalPerK / legacy).toBeCloseTo(1.5, 1);
    });

    it('should handle symmetric pricing (input = output)', () => {
      // Input: $5.00, Output: $5.00 per 1M
      const result = calculateSeparateCreditsPerKTokens(500, 500, 2.5, 0.01);

      // Both should be the same: $0.005/1K × 2.5 = $0.0125, credits = ceil(1.25) = 2
      expect(result.inputCreditsPerK).toBe(2);
      expect(result.outputCreditsPerK).toBe(2);

      // Estimated total should also be 2 (same regardless of ratio)
      expect(result.estimatedTotalPerK).toBe(2);
    });

    it('should handle asymmetric pricing (vision model example)', () => {
      // Vision model: Input $1.25 (image tokens), Output $10 (text)
      // But vision models have inverse ratio: 8:5 (more input than output)
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.01);

      expect(result.inputCreditsPerK).toBe(1);
      expect(result.outputCreditsPerK).toBe(3);

      // For vision with 8:5 ratio, actual usage would be:
      // (8×1 + 5×3) / 13 = 23/13 = ceil(1.77) = 2 credits
      // This is cheaper than the 1:10 estimate of 3 credits
      const visionEstimate = Math.ceil((8 * result.inputCreditsPerK + 5 * result.outputCreditsPerK) / 13);
      expect(visionEstimate).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should round up to ensure costs are covered', () => {
      // Scenario where fractional credits would underprice
      const result = calculateSeparateCreditsPerKTokens(1, 2, 2.5, 0.01);

      // Input: (1/1000) × 2.5 / 1.0 = 0.0025 → ceil = 1
      expect(result.inputCreditsPerK).toBe(1);

      // Output: (2/1000) × 2.5 / 1.0 = 0.005 → ceil = 1
      expect(result.outputCreditsPerK).toBe(1);
    });

    it('should handle zero input cost (hypothetical)', () => {
      const result = calculateSeparateCreditsPerKTokens(0, 1000, 2.5, 0.01);

      expect(result.inputCreditsPerK).toBe(0);
      expect(result.outputCreditsPerK).toBe(3);
      expect(result.estimatedTotalPerK).toBe(3); // (1×0 + 10×3)/11 = 2.73 → 3
    });

    it('should handle zero output cost (hypothetical)', () => {
      const result = calculateSeparateCreditsPerKTokens(1000, 0, 2.5, 0.01);

      expect(result.inputCreditsPerK).toBe(3);
      expect(result.outputCreditsPerK).toBe(0);
      expect(result.estimatedTotalPerK).toBe(1); // (1×3 + 10×0)/11 = 0.27 → 1
    });
  });

  describe('Different Margin Multipliers', () => {
    it('should apply margin to both input and output separately', () => {
      const inputCents = 125;
      const outputCents = 1000;

      // Free tier: 2.0×
      const free = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 2.0, 0.01);
      expect(free.inputCreditsPerK).toBe(1); // $0.00125 × 2.0 × 100 = ceil(0.25) = 1
      expect(free.outputCreditsPerK).toBe(2); // $0.01 × 2.0 × 100 = ceil(2.0) = 2

      // Pro: 1.0× (break-even)
      const pro = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 1.0, 0.01);
      expect(pro.inputCreditsPerK).toBe(1); // $0.00125 × 1.0 × 100 = ceil(0.125) = 1
      expect(pro.outputCreditsPerK).toBe(1); // $0.01 × 1.0 × 100 = ceil(1.0) = 1

      // Enterprise: 1.25×
      const ent = calculateSeparateCreditsPerKTokens(inputCents, outputCents, 1.25, 0.01);
      expect(ent.inputCreditsPerK).toBe(1); // $0.00125 × 1.25 × 100 = ceil(0.15625) = 1
      expect(ent.outputCreditsPerK).toBe(2); // $0.01 × 1.25 × 100 = ceil(1.25) = 2
    });
  });

  describe('Real-World Examples', () => {
    it('should calculate GPT-5 Chat pricing correctly', () => {
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.01);

      expect(result).toEqual({
        inputCreditsPerK: 1,
        outputCreditsPerK: 3,
        estimatedTotalPerK: 3,
      });
    });

    it('should calculate Claude Opus pricing correctly', () => {
      // Claude Opus: Input $15, Output $75 per 1M tokens
      const result = calculateSeparateCreditsPerKTokens(1500, 7500, 2.5, 0.01);

      // Input: $0.015/1K × 2.5 = $0.0375, credits = ceil(3.75) = 4
      expect(result.inputCreditsPerK).toBe(4);

      // Output: $0.075/1K × 2.5 = $0.1875, credits = ceil(18.75) = 19
      expect(result.outputCreditsPerK).toBe(19);

      // Estimated: (1×4 + 10×19) / 11 = 194/11 = ceil(17.64) = 18
      expect(result.estimatedTotalPerK).toBe(18);
    });

    it('should calculate GPT-4o Mini pricing correctly', () => {
      // GPT-4o Mini: Input $0.15, Output $0.60 per 1M tokens
      const result = calculateSeparateCreditsPerKTokens(15, 60, 2.5, 0.01);

      // Input: $0.00015/1K × 2.5 = $0.000375, credits = ceil(0.0375) = 1
      expect(result.inputCreditsPerK).toBe(1);

      // Output: $0.0006/1K × 2.5 = $0.0015, credits = ceil(0.15) = 1
      expect(result.outputCreditsPerK).toBe(1);

      // Estimated: (1×1 + 10×1) / 11 = 11/11 = 1
      expect(result.estimatedTotalPerK).toBe(1);
    });
  });
});

describe('Comparison: Legacy vs Separate Pricing', () => {
  const testCases = [
    {
      name: 'GPT-5 Chat',
      input: 125,
      output: 1000,
      legacyExpected: 2,
      separateEstimate: 3,
    },
    {
      name: 'Claude Opus',
      input: 1500,
      output: 7500,
      legacyExpected: 12,
      separateEstimate: 18,
    },
    {
      name: 'GPT-4o Mini',
      input: 15,
      output: 60,
      legacyExpected: 1, // ceil((15+60)/2/1000 × 2.5 / 1.0) = ceil(0.09375) = 1
      separateEstimate: 1,
    },
  ];

  testCases.forEach(({ name, input, output, legacyExpected, separateEstimate }) => {
    it(`${name}: separate pricing better reflects real usage`, () => {
      const legacy = calculateCreditsPerKTokens(input, output, 2.5, 0.01);
      const separate = calculateSeparateCreditsPerKTokens(input, output, 2.5, 0.01);

      expect(legacy).toBe(legacyExpected);
      expect(separate.estimatedTotalPerK).toBe(separateEstimate);

      // Separate pricing should be higher or equal for models with expensive output
      if (output > input * 2) {
        expect(separate.estimatedTotalPerK).toBeGreaterThanOrEqual(legacy);
      }
    });
  });
});
