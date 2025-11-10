/**
 * Unit tests for plan109.utils.ts formatting functions
 * Tests the fix for undefined/null handling
 */

import { formatNumber, formatCurrency, formatPercentage } from '../plan109.utils';

describe('formatNumber', () => {
  test('formats valid numbers correctly', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  test('handles undefined safely', () => {
    expect(formatNumber(undefined)).toBe('0');
  });

  test('handles null safely', () => {
    expect(formatNumber(null)).toBe('0');
  });

  test('handles NaN safely', () => {
    expect(formatNumber(NaN)).toBe('0');
  });

  test('handles Infinity safely', () => {
    expect(formatNumber(Infinity)).toBe('0');
    expect(formatNumber(-Infinity)).toBe('0');
  });

  test('handles zero correctly', () => {
    expect(formatNumber(0)).toBe('0');
  });

  test('handles negative numbers correctly', () => {
    expect(formatNumber(-42)).toBe('-42');
    expect(formatNumber(-1500)).toBe('-1.5K');
  });
});

describe('formatCurrency', () => {
  test('formats valid amounts correctly', () => {
    expect(formatCurrency(42.50)).toBe('$42.50');
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  test('handles undefined safely', () => {
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  test('handles null safely', () => {
    expect(formatCurrency(null)).toBe('$0.00');
  });

  test('handles NaN safely', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
  });

  test('respects decimal places', () => {
    expect(formatCurrency(42.50, 0)).toBe('$42');
    expect(formatCurrency(42.567, 3)).toBe('$42.567');
  });
});

describe('formatPercentage', () => {
  test('formats valid percentages correctly', () => {
    expect(formatPercentage(42.5)).toBe('42.5%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(0.123, 2)).toBe('0.12%');
  });

  test('handles undefined safely', () => {
    expect(formatPercentage(undefined)).toBe('0.0%');
  });

  test('handles null safely', () => {
    expect(formatPercentage(null)).toBe('0.0%');
  });

  test('handles NaN safely', () => {
    expect(formatPercentage(NaN)).toBe('0.0%');
  });

  test('respects decimal places', () => {
    expect(formatPercentage(42.567, 0)).toBe('43%');
    expect(formatPercentage(42.567, 2)).toBe('42.57%');
  });
});

// Integration test mimicking the SubscriptionManagement.tsx usage
describe('SubscriptionManagement integration', () => {
  test('handles stats with undefined values (mimics API response issue)', () => {
    const stats = {
      totalActive: undefined as any, // This is what causes the runtime error
      mrr: 5000,
      pastDueCount: 2,
      trialConversionsThisMonth: 10,
    };

    // This should not throw an error anymore
    expect(() => formatNumber(stats.totalActive)).not.toThrow();
    expect(formatNumber(stats.totalActive)).toBe('0');

    // Valid values should still work
    expect(formatCurrency(stats.mrr, 0)).toBe('$5,000');
    expect(formatNumber(stats.pastDueCount)).toBe('2');
    expect(formatNumber(stats.trialConversionsThisMonth)).toBe('10');
  });

  test('handles partial API response', () => {
    const partialStats = {
      mrr: 12500.50,
    } as any;

    // Accessing undefined properties should not throw
    expect(() => formatNumber(partialStats.totalActive)).not.toThrow();
    expect(formatNumber(partialStats.totalActive)).toBe('0');
    expect(formatCurrency(partialStats.mrr, 0)).toBe('$12,501');
  });
});
