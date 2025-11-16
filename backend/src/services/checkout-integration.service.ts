/**
 * Checkout Integration Service
 *
 * Integrates coupon system with checkout flow, Stripe, subscriptions, and credits.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 3: Integration Points)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Coupon, PerpetualLicense, CouponRedemption } from '@prisma/client';
import { CouponValidationService } from './coupon-validation.service';
import { CouponRedemptionService } from './coupon-redemption.service';
import { LicenseManagementService } from './license-management.service';
import { ProrationService, ProrationCalculation } from './proration.service';
import { DiscountCalculation } from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class CheckoutIntegrationService {
  // Tier pricing (monthly rates in USD) - DEPRECATED
  // Use getTierPriceForBillingCycle() instead for billing-cycle-aware pricing
  private readonly TIER_PRICING: Record<string, number> = {
    free: 0,
    pro: 19.0,
    pro_max: 49.0,
    enterprise_pro: 149.0,
    enterprise_max: 499.0,
    perpetual: 0,
  };

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService,
    @inject(CouponRedemptionService) private redemptionService: CouponRedemptionService,
    @inject(LicenseManagementService) private licenseManagementService: LicenseManagementService,
    @inject(ProrationService) private prorationService: ProrationService
  ) {
    logger.debug('CheckoutIntegrationService: Initialized');
  }

  async applyUpgradeCouponToCheckout(
    checkoutSession: any,
    couponCode: string
  ): Promise<any> {
    logger.info('Applying coupon to checkout', { couponCode, userId: checkoutSession.userId });

    // Step 1: Fetch subscription to get actual tier (GAP FIX #2)
    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: checkoutSession.subscriptionId }
    });

    // Step 2: Validate coupon against actual tier
    const validation = await this.validationService.validateCoupon(couponCode, checkoutSession.userId, {
      cartTotal: checkoutSession.total,
      subscriptionId: checkoutSession.subscriptionId,
      subscriptionTier: subscription?.tier || 'free',  // Use actual tier, not hardcoded 'free'
      ipAddress: checkoutSession.ipAddress,
      userAgent: checkoutSession.userAgent,
    });

    if (!validation.isValid) {
      throw new Error(`Coupon validation failed: ${validation.errors.join(', ')}`);
    }

    const discount = validation.discount!;

    // Step 2: Apply discount based on type
    switch (discount.couponType) {
      case 'percentage':
        checkoutSession.total = checkoutSession.total * (1 - (discount.percentage || 0) / 100);
        break;
      case 'fixed_amount':
        checkoutSession.total = Math.max(0, checkoutSession.total - (discount.fixedAmount || 0));
        break;
      case 'tier_specific':
        await this.applyPercentageDiscount(
          checkoutSession.subscriptionId,
          discount.percentage || 0,
          discount.durationMonths || 1
        );
        break;
      case 'duration_bonus':
        await this.applyDurationBonus(checkoutSession.subscriptionId, discount.bonusMonths || 0);
        break;
      case 'perpetual_migration':
        await this.grantPerpetualLicense(checkoutSession.userId, discount.couponId);
        checkoutSession.total = 0; // 100% off
        break;
    }

    // Step 3: Redeem coupon
    await this.redemptionService.redeemCoupon(discount.couponId, checkoutSession.userId, {
      code: couponCode,
      subscriptionId: checkoutSession.subscriptionId,
      originalAmount: checkoutSession.originalTotal,
      ipAddress: checkoutSession.ipAddress,
      userAgent: checkoutSession.userAgent,
    });

    return checkoutSession;
  }

  async validateCouponForCheckout(
    couponCode: string,
    userId: string,
    cartTotal: number
  ): Promise<any> {
    return await this.validationService.validateCoupon(couponCode, userId, {
      cartTotal,
      subscriptionTier: 'free',
    });
  }

  async calculateFinalPrice(originalPrice: number, coupon: Coupon): Promise<number> {
    const discount = await this.validationService.calculateDiscount(coupon, originalPrice);
    return discount.finalAmount;
  }

  async createStripeCheckoutWithCoupon(subscription: any, coupon: Coupon): Promise<string> {
    // TODO: Integrate with Stripe service
    // Create Stripe checkout session with discount applied
    logger.info('Creating Stripe checkout with coupon', {
      subscriptionId: subscription.id,
      couponCode: coupon.code,
    });

    return 'stripe_session_id_placeholder';
  }

  async applyDiscountToStripeInvoice(invoiceId: string, discount: DiscountCalculation): Promise<void> {
    // TODO: Integrate with Stripe service
    logger.info('Applying discount to Stripe invoice', { invoiceId, discount });
  }

  async applyDurationBonus(subscriptionId: string, bonusMonths: number): Promise<void> {
    logger.info('Applying duration bonus', { subscriptionId, bonusMonths });

    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newEndDate = new Date(subscription.currentPeriodEnd);
    newEndDate.setMonth(newEndDate.getMonth() + bonusMonths);

    await this.prisma.subscription_monetization.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: newEndDate },
    });
  }

  async applyPercentageDiscount(
    subscriptionId: string,
    percentage: number,
    durationMonths: number
  ): Promise<void> {
    logger.info('Applying percentage discount', { subscriptionId, percentage, durationMonths });

    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const discountedPrice = parseFloat(subscription.basePriceUsd.toString()) * (1 - percentage / 100);

    await this.prisma.subscription_monetization.update({
      where: { id: subscriptionId },
      data: {
        basePriceUsd: discountedPrice,
        // TODO: Store discount duration and revert after N months
      },
    });
  }

  async applyFixedDiscount(invoiceId: string, amount: number): Promise<void> {
    logger.info('Applying fixed discount to invoice', { invoiceId, amount });

    await this.prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: {
        amountDue: { decrement: amount },
      },
    });
  }

  async grantCouponCredits(userId: string, amount: number, couponId: string): Promise<void> {
    logger.info('Granting coupon credits', { userId, amount, couponId });

    await this.prisma.credit_allocation.create({
      data: {
        userId,
        subscriptionId: null,
        amount,
        allocationPeriodStart: new Date(),
        allocationPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        source: 'coupon',
      },
    });
  }

  async grantPerpetualLicense(userId: string, couponId: string): Promise<PerpetualLicense> {
    logger.info('Granting perpetual license from BYOK coupon', { userId, couponId });

    try {
      // Create perpetual license with $0 purchase price (coupon-granted)
      const license = await this.licenseManagementService.createPerpetualLicense(
        userId,
        0, // purchase_price_usd (coupon-granted licenses are free)
        '1.0.0' // current version
      );

      logger.info('CheckoutIntegrationService: Perpetual license granted successfully', {
        userId,
        licenseId: license.id,
        licenseKey: license.licenseKey,
      });

      return license;
    } catch (error) {
      logger.error('CheckoutIntegrationService: Failed to grant perpetual license', {
        error,
        userId,
        couponId,
      });
      throw new Error('Failed to grant perpetual license');
    }
  }

  /**
   * Get active discount for a subscription (GAP FIX #3)
   * Returns current effective discount if coupon is still active
   * @param subscriptionId - Subscription ID
   * @returns Active discount details or null
   */
  async getActiveDiscountForSubscription(
    subscriptionId: string
  ): Promise<{
    couponCode: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    effectivePrice: number;
  } | null> {
    logger.debug('CheckoutIntegrationService: Getting active discount', { subscriptionId });

    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
      include: {
        coupon_redemptions: {
          where: {
            redemptionStatus: 'success', // Successfully redeemed coupons only
          },
          include: {
            coupon: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription || !subscription.couponRedemptions.length) {
      return null;
    }

    const redemption = subscription.couponRedemptions[0];
    const coupon = redemption.coupon;

    // Calculate effective price based on discount type
    const basePriceUsd = parseFloat(subscription.basePriceUsd.toString());
    let effectivePrice = basePriceUsd;
    const discountType = coupon.discountType as 'percentage' | 'fixed_amount';
    const discountValue = parseFloat(coupon.discountValue.toString());

    if (discountType === 'percentage') {
      effectivePrice = basePriceUsd * (1 - discountValue / 100);
    } else if (discountType === 'fixed_amount') {
      effectivePrice = Math.max(0, basePriceUsd - discountValue);
    }

    logger.info('CheckoutIntegrationService: Active discount found', {
      couponCode: coupon.code,
      discountType,
      discountValue,
      basePriceUsd,
      effectivePrice,
    });

    return {
      couponCode: coupon.code,
      discountType,
      discountValue,
      effectivePrice,
    };
  }

  /**
   * Get tier price based on billing cycle (billing-cycle-aware pricing)
   * @param tier - Tier name
   * @param billingCycle - Billing cycle (monthly, annual, lifetime)
   * @returns Price for the tier based on billing cycle
   */
  private async getTierPriceForBillingCycle(
    tier: string,
    billingCycle: string
  ): Promise<number> {
    const tierConfig = await this.prisma.subscription_tier_configs.findUnique({
      where: { tierName: tier },
    });

    if (!tierConfig) {
      logger.warn('CheckoutIntegrationService: Tier config not found, using fallback pricing', {
        tier,
      });
      return this.TIER_PRICING[tier] || 0;
    }

    // Calculate based on billing cycle
    if (billingCycle === 'annual') {
      return Number(tierConfig.annualPriceUsd);
    } else {
      return Number(tierConfig.monthlyPriceUsd);
    }
  }

  /**
   * Apply mid-cycle coupon upgrade with proration (GAP FIX #2)
   * Orchestrates: validation, proration calculation, redemption, and tier change
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier
   * @param couponCode - Coupon code to apply
   * @param userId - User ID
   * @returns Proration details, redemption, and charge amount
   */
  async applyMidCycleCouponUpgrade(
    subscriptionId: string,
    newTier: string,
    couponCode: string,
    userId: string
  ): Promise<{
    proration: ProrationCalculation;
    redemption: CouponRedemption;
    chargeAmount: number;
  }> {
    logger.info('CheckoutIntegrationService: Applying mid-cycle coupon upgrade', {
      subscriptionId,
      newTier,
      couponCode,
      userId,
    });

    // Step 1: Validate coupon against actual subscription tier
    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get billing-cycle-aware pricing for new tier
    const newTierPrice = await this.getTierPriceForBillingCycle(
      newTier,
      subscription.billingCycle
    );

    logger.debug('CheckoutIntegrationService: Billing-cycle-aware validation pricing', {
      newTier,
      billingCycle: subscription.billingCycle,
      newTierPrice,
    });

    const validation = await this.validationService.validateCoupon(couponCode, userId, {
      subscriptionTier: subscription.tier,
      cartTotal: newTierPrice, // Use billing-cycle-aware pricing
    });

    if (!validation.isValid) {
      throw new Error(`Coupon validation failed: ${validation.errors.join(', ')}`);
    }

    const discount = validation.discount!;

    // Step 2: Get active discount for current subscription (if any)
    const activeDiscount = await this.getActiveDiscountForSubscription(subscriptionId);

    // Step 3: Calculate proration with coupon
    const proration = await this.prorationService.calculateProration(subscriptionId, newTier, {
      newTierCoupon: {
        code: couponCode,
        discountType: discount.discountType === 'percentage' ? 'percentage' : 'fixed_amount',
        discountValue: discount.percentage || discount.fixedAmount || 0,
      },
      currentTierEffectivePrice: activeDiscount?.effectivePrice,
    });

    logger.info('CheckoutIntegrationService: Proration calculated with coupon', {
      unusedCredit: proration.unusedCreditValueUsd,
      newTierCost: proration.newTierProratedCostUsd,
      couponDiscount: proration.couponDiscountAmount,
      netCharge: proration.netChargeUsd,
    });

    // Step 4: Redeem coupon with proration fields
    const redemption = await this.redemptionService.redeemCoupon(discount.couponId, userId, {
      code: couponCode,
      subscriptionId,
      originalAmount: proration.newTierProratedCostUsd,
      ipAddress: '',
      userAgent: '',
      prorationAmount: proration.couponDiscountAmount,
      isProrationInvolved: true,
      tierBefore: subscription.tier,
      tierAfter: newTier,
    });

    // Step 5: Apply tier change via ProrationService
    await this.prorationService.applyTierUpgrade(subscriptionId, newTier);

    logger.info('CheckoutIntegrationService: Mid-cycle upgrade completed', {
      subscriptionId,
      fromTier: subscription.tier,
      toTier: newTier,
      chargeAmount: proration.netChargeUsd,
      redemptionId: redemption.id,
    });

    return {
      proration,
      redemption,
      chargeAmount: proration.netChargeUsd,
    };
  }
}
