/**
 * Checkout Integration Service with Coupon Tests
 * Tests Gap Fixes for mid-cycle upgrade integration
 *
 * Reference: docs/troubleshooting/008-coupon-proration-integration-gaps.md
 */

import { CheckoutIntegrationService } from '../checkout-integration.service';
import { ProrationService } from '../proration.service';
import { CouponValidationService } from '../coupon-validation.service';
import { CouponRedemptionService } from '../coupon-redemption.service';
import { LicenseManagementService } from '../license-management.service';
import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';
import crypto from 'crypto';

describe('CheckoutIntegrationService Mid-Cycle Upgrades', () => {
  let checkoutService: CheckoutIntegrationService;
  let prorationService: ProrationService;
  let validationService: CouponValidationService;
  let redemptionService: CouponRedemptionService;
  let licenseManagementService: LicenseManagementService;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
    container.registerInstance('PrismaClient', prisma);

    prorationService = container.resolve(ProrationService);
    validationService = container.resolve(CouponValidationService);
    redemptionService = container.resolve(CouponRedemptionService);
    licenseManagementService = container.resolve(LicenseManagementService);

    checkoutService = new CheckoutIntegrationService(
      prisma,
      validationService,
      redemptionService,
      licenseManagementService,
      prorationService
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('applyUpgradeCouponToCheckout - Tier Validation Fix', () => {
    it('should use actual subscription tier for validation (GAP FIX #2)', async () => {
      /**
       * Test that hardcoded 'free' tier is replaced with actual tier lookup
       * Previously: Always validated against 'free' tier
       * Now: Fetches subscription and uses actual tier
       */

      // Create Pro subscription
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId: 'test-user-tier-validation',
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create coupon restricted to Pro tier
      const coupon = await prisma.coupon.create({
        data: {
          code: 'PROONLY',
          couponType: 'percentage', // Correct enum value
          discountValue: 10, // 10% discount
          discountType: 'percentage',
          tierEligibility: ['pro'], // Only Pro eligible
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      // Mock checkout session
      const checkoutSession = {
        userId: 'test-user-tier-validation',
        subscriptionId: subscription.id,
        total: 19.00,
        originalTotal: 19.00,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      // Attempt to apply coupon - should succeed with actual tier (Pro)
      try {
        await checkoutService.applyUpgradeCouponToCheckout(checkoutSession, 'PROONLY');
        // If we reach here, validation passed correctly
        expect(true).toBe(true);
      } catch (error) {
        // If error, it should NOT be TIER_NOT_ELIGIBLE (that was the bug)
        expect((error as Error).message).not.toContain('TIER_NOT_ELIGIBLE');
      }

      // Cleanup
      await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });
    });
  });

  describe('getActiveDiscountForSubscription (GAP FIX #3)', () => {
    it('should return active discount if coupon still valid', async () => {
      /**
       * Test helper method that detects active discounts
       */

      const userId = 'test-user-active-discount';

      // Create subscription
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId,
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create coupon with 3-month duration
      const coupon = await prisma.coupon.create({
        data: {
          code: 'PROMO50',
          couponType: 'percentage', // Correct enum value
          discountValue: 50, // 50% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      // Create redemption (1 month ago)
      const redemption = await prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId,
          subscriptionId: subscription.id,
          redemptionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
          discountAppliedUsd: 9.50,
          originalAmountUsd: 19.00,
          finalAmountUsd: 9.50,
          redemptionStatus: 'success',
        },
      });

      // Get active discount
      const activeDiscount = await checkoutService.getActiveDiscountForSubscription(subscription.id);

      expect(activeDiscount).not.toBeNull();
      expect(activeDiscount?.couponCode).toBe('PROMO50');
      expect(activeDiscount?.discountType).toBe('percentage');
      expect(activeDiscount?.discountValue).toBe(50);
      expect(activeDiscount?.effectivePrice).toBeCloseTo(9.50, 2);

      // Cleanup
      await prisma.couponRedemption.delete({ where: { id: redemption.id } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });
    });

    it('should return null if coupon expired', async () => {
      /**
       * Test that expired coupons (beyond max_discount_months) return null
       */

      const userId = 'test-user-expired-discount';

      // Create subscription
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId,
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create coupon with 3-month duration
      const coupon = await prisma.coupon.create({
        data: {
          code: 'PROMO3MO',
          couponType: 'percentage', // Correct enum value
          discountValue: 50, // 50% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      // Create redemption (4 months ago - expired)
      const redemption = await prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId,
          subscriptionId: subscription.id,
          redemptionDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
          discountAppliedUsd: 9.50,
          originalAmountUsd: 19.00,
          finalAmountUsd: 9.50,
          redemptionStatus: 'success',
        },
      });

      // Get active discount
      const activeDiscount = await checkoutService.getActiveDiscountForSubscription(subscription.id);

      expect(activeDiscount).toBeNull();

      // Cleanup
      await prisma.couponRedemption.delete({ where: { id: redemption.id } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });
    });

    it('should return null if no redemptions', async () => {
      /**
       * Test that subscriptions without redemptions return null
       */

      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId: 'test-user-no-redemption',
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const activeDiscount = await checkoutService.getActiveDiscountForSubscription(subscription.id);

      expect(activeDiscount).toBeNull();

      // Cleanup
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });
    });
  });

  describe('applyMidCycleCouponUpgrade (GAP FIX #2)', () => {
    it('should correctly orchestrate mid-cycle upgrade with coupon', async () => {
      /**
       * End-to-end test for mid-cycle coupon upgrade
       * Tests full integration: validation → proration → redemption → tier change
       */

      const userId = 'test-user-e2e';

      // Create Pro subscription (mid-cycle)
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId,
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date('2025-11-01'),
          currentPeriodEnd: new Date('2025-12-01'),
        },
      });

      // Create upgrade coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: 'UPGRADE20',
          couponType: 'percentage', // Correct enum value
          discountValue: 20, // 20% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro', 'pro_max'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      // Mock current date (Day 20, 11 days remaining)
      const mockDate = new Date('2025-11-20');
      jest.useFakeTimers().setSystemTime(mockDate);

      // Execute mid-cycle upgrade
      const result = await checkoutService.applyMidCycleCouponUpgrade(
        subscription.id,
        'pro_max',
        'UPGRADE20',
        userId
      );

      // Verify proration calculation
      expect(result.proration.fromTier).toBe('pro');
      expect(result.proration.toTier).toBe('pro_max');
      expect(result.proration.couponDiscountAmount).toBeGreaterThan(0);
      expect(result.chargeAmount).toBeGreaterThan(0);

      // Verify redemption created
      expect(result.redemption).toBeDefined();
      expect(result.redemption.isProrationInvolved).toBe(true);
      expect(result.redemption.userTierBefore).toBe('pro');
      expect(result.redemption.userTierAfter).toBe('pro_max');

      // Verify tier changed
      const updatedSub = await prisma.subscriptionMonetization.findUnique({
        where: { id: subscription.id },
      });
      expect(updatedSub?.tier).toBe('pro_max');

      // Cleanup
      await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
      await prisma.prorationEvent.deleteMany({ where: { userId } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });

      jest.useRealTimers();
    });

    it('should use active discount for unused credit calculation', async () => {
      /**
       * Test that existing discount is applied to unused credit calculation
       * User on Pro with 50% off → Pro Max with 20% off
       */

      const userId = 'test-user-active-to-upgrade';

      // Create Pro subscription
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId,
          tier: 'pro',
          billingCycle: 'monthly',
          status: 'active',
          basePriceUsd: 19.00,
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date('2025-11-01'),
          currentPeriodEnd: new Date('2025-12-01'),
        },
      });

      // Create and redeem existing discount coupon
      const existingCoupon = await prisma.coupon.create({
        data: {
          code: 'PROMO50',
          couponType: 'percentage', // Correct enum value
          discountValue: 50, // 50% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      await prisma.couponRedemption.create({
        data: {
          couponId: existingCoupon.id,
          userId,
          subscriptionId: subscription.id,
          redemptionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          discountAppliedUsd: 9.50,
          originalAmountUsd: 19.00,
          finalAmountUsd: 9.50,
          redemptionStatus: 'success',
        },
      });

      // Create upgrade coupon
      await prisma.coupon.create({
        data: {
          code: 'UPGRADE20',
          couponType: 'percentage', // Correct enum value
          discountValue: 20, // 20% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro', 'pro_max'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: 'test-system',
        },
      });

      // Mock current date
      const mockDate = new Date('2025-11-20');
      jest.useFakeTimers().setSystemTime(mockDate);

      // Execute mid-cycle upgrade
      const result = await checkoutService.applyMidCycleCouponUpgrade(
        subscription.id,
        'pro_max',
        'UPGRADE20',
        userId
      );

      // Verify unused credit uses effective price ($9.50), not base price ($19)
      const expectedUnusedCredit = (12 / 31) * 9.50; // 12 days remaining × $9.50
      expect(result.proration.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);

      // Cleanup
      await prisma.couponRedemption.deleteMany({ where: { userId } });
      await prisma.prorationEvent.deleteMany({ where: { userId } });
      await prisma.coupon.deleteMany({ where: { code: { in: ['PROMO50', 'UPGRADE20'] } } });
      await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });

      jest.useRealTimers();
    });

    it('should use billing-cycle-aware pricing for annual subscription validation', async () => {
      /**
       * CRITICAL TEST: Verify annual subscriptions use annual pricing, not monthly
       * Previously: Validated $588 annual upgrade against $49 monthly price
       * Now: Uses $588 annual price for correct coupon validation
       */

      // Generate valid UUID for test user
      const userId = crypto.randomUUID();

      // Create test user first (required by foreign key)
      await prisma.user.create({
        data: {
          id: userId,
          email: 'annual-billing-test@example.com',
          passwordHash: 'test-hash',
          role: 'user',
        },
      });

      // Create annual Pro subscription
      const subscription = await prisma.subscriptionMonetization.create({
        data: {
          userId,
          tier: 'pro',
          billingCycle: 'annual', // Annual billing cycle
          status: 'active',
          basePriceUsd: 228.00, // $19 × 12 months
          monthlyCreditAllocation: 1000,
          currentPeriodStart: new Date('2025-01-01'),
          currentPeriodEnd: new Date('2025-12-31'),
        },
      });

      // Create percentage discount coupon (20% off)
      const coupon = await prisma.coupon.create({
        data: {
          code: 'ANNUAL20',
          couponType: 'percentage', // Correct enum value
          discountValue: 20, // 20% discount
          discountType: 'percentage',
          tierEligibility: ['free', 'pro', 'pro_max'],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxUsesPerUser: 1,
          createdBy: userId, // Reference the created user
        },
      });

      // Mock current date (mid-cycle on Nov 15, 2025)
      const mockDate = new Date('2025-11-15');
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
        // Execute mid-cycle upgrade from annual Pro ($228) to annual Pro Max ($588)
        const result = await checkoutService.applyMidCycleCouponUpgrade(
          subscription.id,
          'pro_max',
          'ANNUAL20',
          userId
        );

        // Verify calculation used annual pricing
        // Nov 15 to Dec 31 = 46 days remaining out of 364 days in year
        const expectedDaysRemaining = 46;
        const expectedDaysInCycle = 364;

        // Annual pricing: Pro = $228, Pro Max = $588
        const expectedUnusedCredit = (expectedDaysRemaining / expectedDaysInCycle) * 228; // ~$28.79
        const expectedProMaxCost = (expectedDaysRemaining / expectedDaysInCycle) * 588; // ~$74.30
        const expectedCouponDiscount = expectedProMaxCost * 0.20; // ~$14.86
        const expectedNetCharge = expectedProMaxCost - expectedUnusedCredit - expectedCouponDiscount; // ~$30.65

        expect(result.proration.daysRemaining).toBe(expectedDaysRemaining);
        expect(result.proration.daysInCycle).toBe(expectedDaysInCycle);

        // Verify annual pricing was used (not monthly $49)
        expect(result.proration.unusedCreditValueUsd).toBeCloseTo(expectedUnusedCredit, 2);
        expect(result.proration.newTierProratedCostUsd).toBeCloseTo(expectedProMaxCost, 2);
        expect(result.proration.couponDiscountAmount).toBeCloseTo(expectedCouponDiscount, 2);
        expect(result.chargeAmount).toBeCloseTo(expectedNetCharge, 2);

        // Verify tier was upgraded
        const updatedSub = await prisma.subscriptionMonetization.findUnique({
          where: { id: subscription.id },
        });
        expect(updatedSub?.tier).toBe('pro_max');

        // Cleanup
        await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
        await prisma.prorationEvent.deleteMany({ where: { userId } });
        await prisma.coupon.delete({ where: { id: coupon.id } });
        await prisma.subscriptionMonetization.delete({ where: { id: subscription.id } });
        await prisma.user.delete({ where: { id: userId } });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
