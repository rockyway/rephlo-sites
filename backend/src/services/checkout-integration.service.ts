/**
 * Checkout Integration Service
 *
 * Integrates coupon system with checkout flow, Stripe, subscriptions, and credits.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 3: Integration Points)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Coupon, PerpetualLicense } from '@prisma/client';
import { CouponValidationService } from './coupon-validation.service';
import { CouponRedemptionService } from './coupon-redemption.service';
import { LicenseManagementService } from './license-management.service';
import { DiscountCalculation } from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class CheckoutIntegrationService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService,
    @inject(CouponRedemptionService) private redemptionService: CouponRedemptionService,
    @inject(LicenseManagementService) private licenseManagementService: LicenseManagementService
  ) {
    logger.debug('CheckoutIntegrationService: Initialized');
  }

  async applyUpgradeCouponToCheckout(
    checkoutSession: any,
    couponCode: string
  ): Promise<any> {
    logger.info('Applying coupon to checkout', { couponCode, userId: checkoutSession.userId });

    // Step 1: Validate coupon
    const validation = await this.validationService.validateCoupon(couponCode, checkoutSession.userId, {
      cartTotal: checkoutSession.total,
      subscriptionId: checkoutSession.subscriptionId,
      subscriptionTier: 'free',
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

    const subscription = await this.prisma.subscriptionMonetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newEndDate = new Date(subscription.currentPeriodEnd);
    newEndDate.setMonth(newEndDate.getMonth() + bonusMonths);

    await this.prisma.subscriptionMonetization.update({
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

    const subscription = await this.prisma.subscriptionMonetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const discountedPrice = parseFloat(subscription.basePriceUsd.toString()) * (1 - percentage / 100);

    await this.prisma.subscriptionMonetization.update({
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

    await this.prisma.creditAllocation.create({
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
}
