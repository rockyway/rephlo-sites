/**
 * Coupon Validation Service
 *
 * Implements the 12-step coupon validation algorithm from Plan 111.
 * Handles all eligibility checks, fraud detection, and discount calculations.
 *
 * Features:
 * - 12-step validation algorithm (fail-fast)
 * - Tier eligibility checking
 * - Usage limit enforcement
 * - Campaign budget tracking
 * - Custom validation rules
 * - Fraud detection integration
 * - Velocity limit enforcement
 * - Device fingerprint validation
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 4: 12-Step Validation)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Coupon, SubscriptionTier, ValidationRuleType } from '@prisma/client';
import {
  ValidationContext,
  ValidationResult,
  DiscountCalculation,
} from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class CouponValidationService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('CouponValidationService: Initialized');
  }

  /**
   * 12-Step Coupon Validation Algorithm
   * Returns validated coupon or throws CouponValidationError with specific reason
   */
  async validateCoupon(
    code: string,
    userId: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      coupon: null,
      errors: [],
      discount: null,
    };

    try {
      logger.info('Starting coupon validation', { code, userId, context });

      // Step 1: Check coupon exists
      const coupon = await this.step1_checkExists(code);
      if (!coupon) {
        result.errors.push('COUPON_NOT_FOUND');
        return result;
      }
      result.coupon = coupon;

      // Step 2: Check is active
      if (!(await this.step2_checkIsActive(coupon))) {
        result.errors.push('COUPON_INACTIVE');
        return result;
      }

      // Step 3: Check validity period
      if (!(await this.step3_checkValidityPeriod(coupon))) {
        result.errors.push('COUPON_EXPIRED');
        return result;
      }

      // Step 4: Check tier eligibility
      if (!(await this.step4_checkTierEligibility(coupon, context.subscriptionTier))) {
        result.errors.push('TIER_NOT_ELIGIBLE');
        return result;
      }

      // Step 5: Check max uses (global limit)
      if (!(await this.step5_checkMaxUses(coupon))) {
        result.errors.push('MAX_USES_EXCEEDED');
        return result;
      }

      // Step 6: Check max uses per user
      if (!(await this.step6_checkMaxUsesPerUser(coupon, userId))) {
        result.errors.push('MAX_USER_USES_EXCEEDED');
        return result;
      }

      // Step 7: Check campaign budget
      if (!(await this.step7_checkCampaignBudget(coupon))) {
        result.errors.push('CAMPAIGN_BUDGET_EXCEEDED');
        return result;
      }

      // Step 8: Check minimum purchase amount
      if (!(await this.step8_checkMinPurchaseAmount(coupon, context.cartTotal))) {
        result.errors.push('MIN_PURCHASE_NOT_MET');
        return result;
      }

      // Step 9: Check custom validation rules
      if (!(await this.step9_checkCustomValidationRules(coupon, userId))) {
        result.errors.push('CUSTOM_RULE_FAILED');
        return result;
      }

      // Step 10: Check fraud flags
      if (!(await this.step10_checkFraudFlags(coupon, userId))) {
        result.errors.push('FRAUD_DETECTED');
        return result;
      }

      // Step 11: Check redemption velocity
      if (!(await this.step11_checkRedemptionVelocity(userId))) {
        result.errors.push('VELOCITY_LIMIT_EXCEEDED');
        return result;
      }

      // Step 12: Check device fingerprint
      if (
        context.deviceFingerprint &&
        !(await this.step12_checkDeviceFingerprint(
          userId,
          context.ipAddress || '',
          context.deviceFingerprint
        ))
      ) {
        result.errors.push('DEVICE_FINGERPRINT_MISMATCH');
        return result;
      }

      // All checks passed - calculate discount
      result.isValid = true;
      result.discount = await this.calculateDiscount(coupon, context.cartTotal);

      logger.info('Coupon validation successful', {
        code,
        userId,
        discount: result.discount,
      });

      return result;
    } catch (error) {
      logger.error('Coupon validation failed', { code, userId, error });
      result.errors.push('VALIDATION_ERROR');
      return result;
    }
  }

  // ============================================================================
  // STEP 1: Check coupon exists
  // ============================================================================
  async step1_checkExists(code: string): Promise<Coupon | null> {
    logger.debug('Validation Step 1: Checking coupon exists', { code });

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        campaign: true,
        usageLimits: true,
        validationRules: { where: { isActive: true } },
      },
    });

    return coupon;
  }

  // ============================================================================
  // STEP 2: Check coupon is active
  // ============================================================================
  async step2_checkIsActive(coupon: Coupon): Promise<boolean> {
    logger.debug('Validation Step 2: Checking coupon is active', { couponId: coupon.id });
    return coupon.isActive;
  }

  // ============================================================================
  // STEP 3: Check validity period
  // ============================================================================
  async step3_checkValidityPeriod(coupon: Coupon): Promise<boolean> {
    logger.debug('Validation Step 3: Checking validity period', { couponId: coupon.id });

    const now = new Date();
    const isValid = now >= coupon.validFrom && now <= coupon.validUntil;

    if (!isValid) {
      logger.warn('Coupon expired or not yet valid', {
        couponId: coupon.id,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        now,
      });
    }

    return isValid;
  }

  // ============================================================================
  // STEP 4: Check tier eligibility
  // ============================================================================
  async step4_checkTierEligibility(coupon: Coupon, userTier: SubscriptionTier): Promise<boolean> {
    logger.debug('Validation Step 4: Checking tier eligibility', {
      couponId: coupon.id,
      userTier,
    });

    const isEligible = coupon.tierEligibility.includes(userTier);

    if (!isEligible) {
      logger.warn('User tier not eligible for coupon', {
        couponId: coupon.id,
        userTier,
        requiredTiers: coupon.tierEligibility,
      });
    }

    return isEligible;
  }

  // ============================================================================
  // STEP 5: Check max uses (global limit)
  // ============================================================================
  async step5_checkMaxUses(coupon: any): Promise<boolean> {
    logger.debug('Validation Step 5: Checking max uses', { couponId: coupon.id });

    // NULL = unlimited uses
    if (coupon.maxUses === null) {
      return true;
    }

    const usageLimits = coupon.usageLimits || (await this.getOrCreateUsageLimits(coupon.id));
    const hasUsesRemaining = usageLimits.totalUses < coupon.maxUses;

    if (!hasUsesRemaining) {
      logger.warn('Coupon max uses exceeded', {
        couponId: coupon.id,
        totalUses: usageLimits.totalUses,
        maxUses: coupon.maxUses,
      });
    }

    return hasUsesRemaining;
  }

  // ============================================================================
  // STEP 6: Check max uses per user
  // ============================================================================
  async step6_checkMaxUsesPerUser(coupon: Coupon, userId: string): Promise<boolean> {
    logger.debug('Validation Step 6: Checking max uses per user', {
      couponId: coupon.id,
      userId,
    });

    const userRedemptions = await this.prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId: userId,
        redemptionStatus: 'success',
      },
    });

    const hasUsesRemaining = userRedemptions < coupon.maxUsesPerUser;

    if (!hasUsesRemaining) {
      logger.warn('User exceeded max uses for coupon', {
        couponId: coupon.id,
        userId,
        userRedemptions,
        maxUsesPerUser: coupon.maxUsesPerUser,
      });
    }

    return hasUsesRemaining;
  }

  // ============================================================================
  // STEP 7: Check campaign budget
  // ============================================================================
  async step7_checkCampaignBudget(coupon: any): Promise<boolean> {
    logger.debug('Validation Step 7: Checking campaign budget', { couponId: coupon.id });

    if (!coupon.campaign || !coupon.campaign.budgetLimitUsd) {
      return true; // No campaign or unlimited budget
    }

    const isBudgetAvailable =
      parseFloat(coupon.campaign.totalSpentUsd) < parseFloat(coupon.campaign.budgetLimitUsd);

    if (!isBudgetAvailable) {
      logger.warn('Campaign budget exhausted', {
        campaignId: coupon.campaign.id,
        totalSpent: coupon.campaign.totalSpentUsd,
        budgetLimit: coupon.campaign.budgetLimitUsd,
      });
    }

    return isBudgetAvailable;
  }

  // ============================================================================
  // STEP 8: Check minimum purchase amount
  // ============================================================================
  async step8_checkMinPurchaseAmount(coupon: Coupon, cartTotal: number): Promise<boolean> {
    logger.debug('Validation Step 8: Checking minimum purchase amount', {
      couponId: coupon.id,
      cartTotal,
    });

    if (!coupon.minPurchaseAmount) {
      return true; // No minimum required
    }

    const meetsMinimum = cartTotal >= parseFloat(coupon.minPurchaseAmount.toString());

    if (!meetsMinimum) {
      logger.warn('Cart total below minimum purchase amount', {
        couponId: coupon.id,
        cartTotal,
        minPurchaseAmount: coupon.minPurchaseAmount,
      });
    }

    return meetsMinimum;
  }

  // ============================================================================
  // STEP 9: Check custom validation rules
  // ============================================================================
  async step9_checkCustomValidationRules(coupon: any, userId: string): Promise<boolean> {
    logger.debug('Validation Step 9: Checking custom validation rules', {
      couponId: coupon.id,
      userId,
    });

    if (!coupon.validationRules || coupon.validationRules.length === 0) {
      return true; // No custom rules
    }

    for (const rule of coupon.validationRules) {
      const isValid = await this.validateCustomRule(rule, userId);
      if (!isValid) {
        logger.warn('Custom validation rule failed', {
          couponId: coupon.id,
          ruleType: rule.ruleType,
          userId,
        });
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // STEP 10: Check fraud flags
  // ============================================================================
  async step10_checkFraudFlags(coupon: Coupon, userId: string): Promise<boolean> {
    logger.debug('Validation Step 10: Checking fraud flags', {
      couponId: coupon.id,
      userId,
    });

    const criticalFlags = await this.prisma.couponFraudDetection.count({
      where: {
        couponId: coupon.id,
        userId: userId,
        severity: 'critical',
        isFlagged: true,
        reviewedAt: null, // Not yet reviewed
      },
    });

    if (criticalFlags > 0) {
      logger.warn('Critical fraud flags detected', {
        couponId: coupon.id,
        userId,
        criticalFlags,
      });
    }

    return criticalFlags === 0;
  }

  // ============================================================================
  // STEP 11: Check redemption velocity (max 3 attempts/hour/user)
  // ============================================================================
  async step11_checkRedemptionVelocity(userId: string): Promise<boolean> {
    logger.debug('Validation Step 11: Checking redemption velocity', { userId });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await this.prisma.couponRedemption.count({
      where: {
        userId: userId,
        redemptionDate: { gte: oneHourAgo },
      },
    });

    if (recentAttempts >= 3) {
      logger.warn('Velocity limit exceeded', { userId, recentAttempts });

      // Log velocity abuse
      await this.prisma.couponFraudDetection.create({
        data: {
          couponId: '', // Will be set by caller
          userId: userId,
          detectionType: 'velocity_abuse',
          severity: 'high',
          details: {
            attempts: recentAttempts,
            timeWindow: '1 hour',
          },
          isFlagged: true,
        },
      });

      return false;
    }

    return true;
  }

  // ============================================================================
  // STEP 12: Check device fingerprint consistency
  // ============================================================================
  async step12_checkDeviceFingerprint(
    userId: string,
    currentIp: string,
    _deviceFingerprint: string
  ): Promise<boolean> {
    logger.debug('Validation Step 12: Checking device fingerprint', {
      userId,
      currentIp,
    });

    const userFingerprints = await this.prisma.couponRedemption.findMany({
      where: {
        userId: userId,
        redemptionStatus: 'success',
      },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    });

    // If user has > 5 different IPs, flag for review (but don't block)
    if (userFingerprints.length > 5 && !userFingerprints.some((r) => r.ipAddress === currentIp)) {
      logger.warn('Suspicious IP switching detected', {
        userId,
        uniqueIPs: userFingerprints.length,
        currentIp,
      });

      // Log for review (don't block)
      await this.prisma.couponFraudDetection.create({
        data: {
          couponId: '', // Will be set by caller
          userId: userId,
          detectionType: 'ip_switching',
          severity: 'medium',
          details: {
            uniqueIPs: userFingerprints.length,
            currentIP: currentIp,
            previousIPs: userFingerprints.map((r) => r.ipAddress),
          },
          isFlagged: false, // Don't block, just log
        },
      });
    }

    return true; // Always pass (only logging)
  }

  // ============================================================================
  // Discount Calculation
  // ============================================================================
  async calculateDiscount(coupon: Coupon, originalAmount: number): Promise<DiscountCalculation> {
    logger.debug('Calculating discount', { couponId: coupon.id, originalAmount });

    let discountAmount = 0;

    switch (coupon.discountType) {
      case 'percentage':
        discountAmount = (originalAmount * parseFloat(coupon.discountValue.toString())) / 100;
        break;
      case 'fixed_amount':
        discountAmount = Math.min(parseFloat(coupon.discountValue.toString()), originalAmount);
        break;
      case 'credits':
        // Credits don't reduce subscription price, they grant credits
        discountAmount = 0;
        break;
      case 'months_free':
        // Free months don't reduce current charge, they extend subscription
        discountAmount = 0;
        break;
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    const calculation: DiscountCalculation = {
      couponType: coupon.couponType,
      discountType: coupon.discountType,
      originalAmount,
      discountAmount,
      finalAmount,
      couponId: coupon.id,
      couponCode: coupon.code,
    };

    // Add type-specific fields
    if (coupon.discountType === 'percentage') {
      calculation.percentage = parseFloat(coupon.discountValue.toString());
    } else if (coupon.discountType === 'fixed_amount') {
      calculation.fixedAmount = parseFloat(coupon.discountValue.toString());
    } else if (coupon.discountType === 'credits') {
      calculation.creditAmount = parseFloat(coupon.discountValue.toString());
    } else if (coupon.discountType === 'months_free') {
      calculation.bonusMonths = parseFloat(coupon.discountValue.toString());
    }

    return calculation;
  }

  /**
   * Apply discount to original amount
   */
  async applyDiscount(
    _originalAmount: number,
    discount: DiscountCalculation
  ): Promise<number> {
    return discount.finalAmount;
  }

  /**
   * Get validation errors
   */
  async getValidationErrors(result: ValidationResult): Promise<string[]> {
    return result.errors;
  }

  /**
   * Check if user can retry validation
   */
  async canRetryValidation(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await this.prisma.couponRedemption.count({
      where: {
        userId: userId,
        redemptionDate: { gte: oneHourAgo },
      },
    });

    return recentAttempts < 3;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate custom validation rule
   */
  private async validateCustomRule(rule: any, userId: string): Promise<boolean> {
    switch (rule.ruleType as ValidationRuleType) {
      case 'first_time_user_only':
        const subscriptions = await this.prisma.subscriptionMonetization.count({
          where: { userId: userId },
        });
        return subscriptions === 0;

      case 'specific_email_domain':
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return false;
        const domain = user.email.split('@')[1];
        return rule.ruleValue.domains.includes(domain);

      case 'minimum_credit_balance':
        // TODO: Implement credit balance check (requires integration with Plan 112)
        return true;

      case 'exclude_refunded_users':
        const refundDays = rule.ruleValue.days || 90;
        const cutoffDate = new Date(Date.now() - refundDays * 24 * 60 * 60 * 1000);
        const recentRefunds = await this.prisma.paymentTransaction.count({
          where: {
            userId: userId,
            status: 'refunded',
            createdAt: { gte: cutoffDate },
          },
        });
        return recentRefunds === 0;

      case 'require_payment_method':
        const subscription = await this.prisma.subscriptionMonetization.findFirst({
          where: {
            userId: userId,
            stripeCustomerId: { not: null },
          },
        });
        return subscription !== null;

      default:
        return true; // Unknown rule type = pass
    }
  }

  /**
   * Get or create usage limits for a coupon
   */
  private async getOrCreateUsageLimits(couponId: string) {
    let usageLimits = await this.prisma.couponUsageLimit.findUnique({
      where: { couponId },
    });

    if (!usageLimits) {
      usageLimits = await this.prisma.couponUsageLimit.create({
        data: {
          couponId,
          totalUses: 0,
          uniqueUsers: 0,
          totalDiscountAppliedUsd: 0,
        },
      });
    }

    return usageLimits;
  }
}
