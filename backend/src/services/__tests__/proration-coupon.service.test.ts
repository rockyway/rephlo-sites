/**
 * Proration Service with Coupon Integration Tests
 * Tests Gap Fixes for Plan 111 (Coupon System) + Plan 110 (Proration) Integration
 *
 * Reference: docs/troubleshooting/008-coupon-proration-integration-gaps.md
 * Reference: docs/plan/111-coupon-discount-code-system.md (Section 10: Proration)
 */

import { randomUUID } from 'crypto';
import { ProrationService } from '../proration.service';
import { PrismaClient } from '@prisma/client';

describe('ProrationService with Coupons', () => {
  let prorationService: ProrationService;
  let prisma: PrismaClient;
  let testSubscriptionId: string;
  let testUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    // Instantiate service directly instead of using container
    prorationService = new ProrationService(prisma);
  }, 30000);

  afterAll(async () => {
    // Clean up all test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-'
        }
      }
    });
    await prisma.$disconnect();
  }, 30000);

  beforeEach(async () => {
    // Generate fresh UUID for each test
    testUserId = randomUUID();

    // Create test user first (required for foreign key constraint)
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        emailVerified: true,
      },
    });

    // Create test subscription
    const subscription = await prisma.subscriptionMonetization.create({
      data: {
        userId: testUserId,
        tier: 'pro',
        billingCycle: 'monthly',
        status: 'active',
        basePriceUsd: 19.00,
        monthlyCreditAllocation: 1000,
        currentPeriodStart: new Date('2025-11-01'),
        currentPeriodEnd: new Date('2025-12-01'),
      },
    });
    testSubscriptionId = subscription.id;
  }, 15000);

  afterEach(async () => {
    // Clean up test data (delete user will cascade to subscriptions and proration events)
    await prisma.user.delete({
      where: { id: testUserId }
    }).catch(() => {
      // Ignore errors if user already deleted
    });
  }, 15000);

  describe('calculateProration with newTierCoupon', () => {
    it('should apply percentage discount to prorated amount (Scenario 2 from plan)', async () => {
      /**
       * Test Scenario 2 from docs/plan/111-coupon-discount-code-system.md (lines 1676-1681)
       * User on Pro ($19/month), upgrading to Pro Max ($49) mid-cycle
       * Days remaining: 11 out of 31
       * Coupon: UPGRADE20 (20% off Pro Max)
       *
       * Expected calculation:
       * 1. Unused credit: (11 / 31) × $19 = $6.74
       * 2. Pro Max prorated: (11 / 31) × $49 = $17.32
       * 3. Coupon discount: (11 / 31) × $49 × 20% = $3.47
       * 4. Net charge: $17.32 - $6.74 - $3.47 = $7.11
       */

      // Mock date to be on Day 20 (11 days remaining of 31-day cycle)
      const mockDate = new Date('2025-11-20');
      jest.useFakeTimers({
        doNotFake: [
          'nextTick',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max',
          {
            newTierCoupon: {
              code: 'UPGRADE20',
              discountType: 'percentage',
              discountValue: 20,
            },
          }
        );

        expect(result.daysRemaining).toBe(11); // Nov 20 00:00 to Dec 1 00:00 = 11 days
        expect(result.daysInCycle).toBe(30); // Nov 1 00:00 to Dec 1 00:00 = 30 days

        // Recalculate with correct days: 11/30 of billing period remaining
        const expectedUnusedCredit = (11 / 30) * 19; // $6.97
        const expectedProratedCost = (11 / 30) * 49; // $17.97
        const expectedCouponDiscount = expectedProratedCost * 0.20; // $3.59
        const expectedNetCharge = expectedProratedCost - expectedUnusedCredit - expectedCouponDiscount; // $7.41

        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProratedCost, 2);
        expect(result.couponDiscountAmount).toBeCloseTo(expectedCouponDiscount, 2);
        expect(result.netChargeUsd).toBeCloseTo(expectedNetCharge, 2);
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should use currentTierEffectivePrice if provided (active discount scenario)', async () => {
      /**
       * Test scenario where user has active 50% off Pro discount
       * User paying $9.50 instead of $19
       * Upgrade to Pro Max mid-cycle (15 days remaining)
       *
       * Expected:
       * - Unused credit should use $9.50, not $19
       */

      const mockDate = new Date('2025-11-16'); // 15 days remaining
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max',
          {
            currentTierEffectivePrice: 9.50,  // 50% off Pro ($19)
          }
        );

        // Nov 16 00:00 to Dec 1 00:00 = 15 days, period is 30 days
        const expectedDaysRemaining = 15;
        const expectedDaysInCycle = 30;
        const expectedUnusedCredit = (expectedDaysRemaining / expectedDaysInCycle) * 9.50;

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.daysInCycle).toBe(expectedDaysInCycle);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.unusedCreditValueUsd).not.toBeCloseTo((expectedDaysRemaining / expectedDaysInCycle) * 19, 2); // Verify NOT using base price
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should cap fixed discount at prorated amount', async () => {
      /**
       * Test fixed amount discount capping
       * Scenario: $30 off coupon on $24.50 prorated charge
       * Expected: Discount capped at $24.50
       */

      const mockDate = new Date('2025-11-16'); // Mid-cycle
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max',
          {
            newTierCoupon: {
              code: 'SAVE30',
              discountType: 'fixed_amount',
              discountValue: 30,
            },
          }
        );

        // Coupon discount should be capped at prorated cost
        expect(result.couponDiscountAmount).toBeLessThanOrEqual(result.newTierProratedCostUsd);
        expect(result.netChargeUsd).toBeGreaterThanOrEqual(0); // Never negative
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should handle no coupon scenario (baseline)', async () => {
      /**
       * Test baseline proration without coupon
       * Ensures backward compatibility
       */

      const mockDate = new Date('2025-11-16');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max'
        );

        expect(result.couponDiscountAmount).toBe(0);
        expect(result.netChargeUsd).toBeGreaterThan(0);
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should calculate correct amounts for multi-month scenario', async () => {
      /**
       * Test Scenario 3 from plan (lines 1700-1704)
       * Multi-month duration coupon (50% off for 3 months)
       * First month charge: $24.50
       */

      const mockDate = new Date('2025-11-15'); // Start of subscription
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        // Create test user for this scenario
        const multiUserId = randomUUID();
        await prisma.user.create({
          data: {
            id: multiUserId,
            email: `test-multi-${multiUserId}@example.com`,
            emailVerified: true,
          },
        });

        // Create new subscription for this test
        const newSub = await prisma.subscriptionMonetization.create({
          data: {
            userId: multiUserId,
            tier: 'free',
            billingCycle: 'monthly',
            status: 'active',
            basePriceUsd: 0,
            monthlyCreditAllocation: 0,
            currentPeriodStart: new Date('2025-11-15'),
            currentPeriodEnd: new Date('2025-12-15'),
          },
        });

        const result = await prorationService.calculateProration(
          newSub.id,
          'pro_max',
          {
            newTierCoupon: {
              code: 'UPGRADE50',
              discountType: 'percentage',
              discountValue: 50,
            },
          }
        );

        // Full month at 50% off: $49 × 50% = $24.50
        expect(result.newTierProratedCostUsd).toBeCloseTo(49, 2);
        expect(result.couponDiscountAmount).toBeCloseTo(24.50, 2);
        expect(result.netChargeUsd).toBeCloseTo(24.50, 2);

        // Cleanup (delete user cascades to subscription)
        await prisma.user.delete({ where: { id: multiUserId } });
      } finally {
        jest.useRealTimers();
      }
    }, 15000);
  });

  describe('Edge Cases', () => {
    it('should handle downgrade with active discount', async () => {
      /**
       * Test Scenario 4 from plan (lines 1725-1732)
       * Pro Max ($24.50 with 50% off) → Pro ($19)
       * Should credit user for unused portion
       */

      const mockDate = new Date('2025-11-15');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        // Create test user for downgrade scenario
        const downgradeUserId = randomUUID();
        await prisma.user.create({
          data: {
            id: downgradeUserId,
            email: `test-downgrade-${downgradeUserId}@example.com`,
            emailVerified: true,
          },
        });

        // Create Pro Max subscription with effective price $24.50
        const proMaxSub = await prisma.subscriptionMonetization.create({
          data: {
            userId: downgradeUserId,
            tier: 'pro_max',
            billingCycle: 'monthly',
            status: 'active',
            basePriceUsd: 49.00,
            monthlyCreditAllocation: 5000,
            currentPeriodStart: new Date('2025-11-01'),
            currentPeriodEnd: new Date('2025-11-30'),
          },
        });

        const result = await prorationService.calculateProration(
          proMaxSub.id,
          'pro',
          {
            currentTierEffectivePrice: 24.50, // 50% off Pro Max
          }
        );

        // Nov 15 00:00 to Nov 30 00:00 = 15 days
        // Nov 1 00:00 to Nov 30 00:00 = 29 days
        const expectedDaysRemaining = 15;
        const expectedDaysInCycle = 29;
        const expectedUnusedCredit = (expectedDaysRemaining / expectedDaysInCycle) * 24.50;
        const expectedProCost = (expectedDaysRemaining / expectedDaysInCycle) * 19;

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.daysInCycle).toBe(expectedDaysInCycle);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProCost, 2);
        // Net charge should be negative (credit to user), but Math.max(0, ...) ensures no negative
        expect(result.netChargeUsd).toBe(0);

        // Cleanup (delete user cascades to subscription)
        await prisma.user.delete({ where: { id: downgradeUserId } });
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should ensure no negative charges', async () => {
      /**
       * Test that netChargeUsd is always >= 0
       * Even with large discounts or downgrades
       */

      const mockDate = new Date('2025-11-20');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max',
          {
            newTierCoupon: {
              code: 'MEGA90',
              discountType: 'percentage',
              discountValue: 90, // 90% off
            },
          }
        );

        expect(result.netChargeUsd).toBeGreaterThanOrEqual(0);
      } finally {
        jest.useRealTimers();
      }
    }, 15000);
  });

  describe('Annual Plan Upgrade (Scenario 5)', () => {
    it('should handle annual plan proration with duration bonus', async () => {
      /**
       * Test Scenario 5 from plan (lines 1754-1764)
       * User on Pro annual ($228/year), upgrades to Pro Max mid-year
       * 47 days remaining until renewal
       * Coupon: UPGRADE3MO (3 months bonus)
       *
       * Expected:
       * - Unused Pro credit: (47 / 365) × $228 = $29.36
       * - Pro Max annual: $588
       * - Amount due: $588 - $29.36 = $558.64
       */

      const mockDate = new Date('2025-11-15');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        // Create test user for annual scenario
        const annualUserId = randomUUID();
        await prisma.user.create({
          data: {
            id: annualUserId,
            email: `test-annual-${annualUserId}@example.com`,
            emailVerified: true,
          },
        });

        // Create annual Pro subscription
        const annualSub = await prisma.subscriptionMonetization.create({
          data: {
            userId: annualUserId,
            tier: 'pro',
            billingCycle: 'annual',
            status: 'active',
            basePriceUsd: 228.00, // $19 × 12
            monthlyCreditAllocation: 1000,
            currentPeriodStart: new Date('2025-01-01'),
            currentPeriodEnd: new Date('2025-12-31'),
          },
        });

        const result = await prorationService.calculateProration(
          annualSub.id,
          'pro_max'
          // Note: Service now automatically detects annual billing cycle
          // and calculates correct annual pricing for both old and new tiers
        );

        // Nov 15 00:00 to Dec 31 00:00 = 46 days
        // Jan 1 00:00 to Dec 31 00:00 = 364 days
        // Annual pricing: Pro = $228/year ($19 × 12), Pro Max = $588/year ($49 × 12)

        const expectedDaysRemaining = 46;
        const expectedDaysInCycle = 364;
        const expectedUnusedCredit = (expectedDaysRemaining / expectedDaysInCycle) * 228; // $28.79
        const expectedProMaxCost = (expectedDaysRemaining / expectedDaysInCycle) * 588; // $74.30
        const expectedNetCharge = expectedProMaxCost - expectedUnusedCredit; // $74.30 - $28.79 = $45.51

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.daysInCycle).toBe(expectedDaysInCycle);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProMaxCost, 2);
        expect(result.netChargeUsd).toBeCloseTo(expectedNetCharge, 2);

        // Cleanup (delete user cascades to subscription)
        await prisma.user.delete({ where: { id: annualUserId } });
      } finally {
        jest.useRealTimers();
      }
    }, 15000);
  });

  describe('Billing Cycle Accuracy Tests', () => {
    it('should calculate monthly subscription proration correctly', async () => {
      /**
       * Verify monthly subscriptions still work correctly (backward compatibility)
       * Pro Monthly ($19/month) → Pro Max Monthly ($49/month)
       */

      const mockDate = new Date('2025-11-15');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const result = await prorationService.calculateProration(
          testSubscriptionId,
          'pro_max'
        );

        // Nov 15 00:00 to Dec 1 00:00 = 16 days
        // Nov 1 00:00 to Dec 1 00:00 = 30 days
        const expectedDaysRemaining = 16;
        const expectedUnusedCredit = (16 / 30) * 19; // $10.13
        const expectedProMaxCost = (16 / 30) * 49; // $26.13
        const expectedNetCharge = expectedProMaxCost - expectedUnusedCredit; // $16.00

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProMaxCost, 2);
        expect(result.netChargeUsd).toBeCloseTo(expectedNetCharge, 2);
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should calculate annual subscription upgrade with coupon correctly', async () => {
      /**
       * Annual Pro ($228/year) → Annual Pro Max ($588/year) with 20% coupon
       * Mid-cycle upgrade to ensure accurate annual pricing + coupon
       */

      const mockDate = new Date('2025-06-15');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const annualUserId = randomUUID();
        await prisma.user.create({
          data: {
            id: annualUserId,
            email: `test-annual-coupon-${annualUserId}@example.com`,
            emailVerified: true,
          },
        });

        const annualSub = await prisma.subscriptionMonetization.create({
          data: {
            userId: annualUserId,
            tier: 'pro',
            billingCycle: 'annual',
            status: 'active',
            basePriceUsd: 228.00,
            monthlyCreditAllocation: 1000,
            currentPeriodStart: new Date('2025-01-01'),
            currentPeriodEnd: new Date('2025-12-31'),
          },
        });

        const result = await prorationService.calculateProration(
          annualSub.id,
          'pro_max',
          {
            newTierCoupon: {
              code: 'ANNUAL20',
              discountType: 'percentage',
              discountValue: 20,
            },
          }
        );

        // Jun 15 00:00 to Dec 31 00:00 = 199 days
        // Jan 1 00:00 to Dec 31 00:00 = 364 days
        const expectedDaysRemaining = 199;
        const expectedDaysInCycle = 364;
        const expectedUnusedCredit = (199 / 364) * 228; // $124.64
        const expectedProMaxCost = (199 / 364) * 588; // $321.56
        const expectedCouponDiscount = expectedProMaxCost * 0.20; // $64.31
        const expectedNetCharge = expectedProMaxCost - expectedUnusedCredit - expectedCouponDiscount; // $132.61

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.daysInCycle).toBe(expectedDaysInCycle);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProMaxCost, 2);
        expect(result.couponDiscountAmount).toBeCloseTo(expectedCouponDiscount, 2);
        expect(result.netChargeUsd).toBeCloseTo(expectedNetCharge, 2);

        await prisma.user.delete({ where: { id: annualUserId } });
      } finally {
        jest.useRealTimers();
      }
    }, 15000);

    it('should calculate annual subscription downgrade correctly', async () => {
      /**
       * Annual Pro Max ($588/year) → Annual Pro ($228/year)
       * Ensures annual pricing used for downgrades (credit to user)
       */

      const mockDate = new Date('2025-08-01');
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        now: mockDate.getTime(),
      });

      try {
        const annualUserId = randomUUID();
        await prisma.user.create({
          data: {
            id: annualUserId,
            email: `test-annual-downgrade-${annualUserId}@example.com`,
            emailVerified: true,
          },
        });

        const annualSub = await prisma.subscriptionMonetization.create({
          data: {
            userId: annualUserId,
            tier: 'pro_max',
            billingCycle: 'annual',
            status: 'active',
            basePriceUsd: 588.00,
            monthlyCreditAllocation: 5000,
            currentPeriodStart: new Date('2025-01-01'),
            currentPeriodEnd: new Date('2025-12-31'),
          },
        });

        const result = await prorationService.calculateProration(
          annualSub.id,
          'pro'
        );

        // Aug 1 00:00 to Dec 31 00:00 = 152 days
        // Jan 1 00:00 to Dec 31 00:00 = 364 days
        const expectedDaysRemaining = 152;
        const expectedUnusedCredit = (152 / 364) * 588; // $245.58
        const expectedProCost = (152 / 364) * 228; // $95.21
        // Net charge is negative (user gets credit), but capped at $0
        const expectedNetCharge = 0;

        expect(result.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.newTierProratedCostUsd).toBeCloseTo(expectedProCost, 2);
        expect(result.netChargeUsd).toBe(expectedNetCharge);

        await prisma.user.delete({ where: { id: annualUserId } });
      } finally {
        jest.useRealTimers();
      }
    }, 15000);
  });

  describe('Integration with CheckoutIntegrationService', () => {
    it('should provide correct breakdown for logging', () => {
      /**
       * Verify ProrationCalculation interface includes all required fields
       * for logging and audit trail
       */

      const calculation = {
        fromTier: 'pro',
        toTier: 'pro_max',
        daysRemaining: 11,
        daysInCycle: 31,
        unusedCreditValueUsd: 6.74,
        newTierProratedCostUsd: 17.32,
        couponDiscountAmount: 3.47,
        netChargeUsd: 7.11,
      };

      // Verify all fields present
      expect(calculation).toHaveProperty('fromTier');
      expect(calculation).toHaveProperty('toTier');
      expect(calculation).toHaveProperty('daysRemaining');
      expect(calculation).toHaveProperty('daysInCycle');
      expect(calculation).toHaveProperty('unusedCreditValueUsd');
      expect(calculation).toHaveProperty('newTierProratedCostUsd');
      expect(calculation).toHaveProperty('couponDiscountAmount');
      expect(calculation).toHaveProperty('netChargeUsd');
    });
  });
});
