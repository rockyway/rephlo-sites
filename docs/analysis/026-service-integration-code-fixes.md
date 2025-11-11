# Service Integration Code Fixes
**Executable Code Changes for Cross-Plan Integration**

**Date:** 2025-11-09
**Reference:** `025-service-layer-integration-report.md`

This document provides **ready-to-implement code** for fixing the critical integration gaps identified in the service layer analysis.

---

## Fix 1: Plan 109 → Plan 112 Credit Balance Updates

### File: `backend/src/services/credit-management.service.ts`

#### Change 1.1: Update `allocateSubscriptionCredits()` Method

**Location:** Lines 95-134

**Current Code:**
```typescript
async allocateSubscriptionCredits(
  userId: string,
  subscriptionId: string
): Promise<CreditAllocation> {
  logger.info('CreditManagementService.allocateSubscriptionCredits', { userId, subscriptionId });

  try {
    const subscription = await this.prisma.subscriptionMonetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw notFoundError('Subscription');
    }

    const allocation = await this.prisma.creditAllocation.create({
      data: {
        userId,
        subscriptionId,
        amount: subscription.monthlyCreditAllocation,
        allocationPeriodStart: subscription.currentPeriodStart,
        allocationPeriodEnd: subscription.currentPeriodEnd,
        source: 'subscription',
      },
    });

    // TODO: Update Plan 112's user_credit_balance
    // await this.updatePlan112Balance(userId, allocation.amount);

    logger.info('CreditManagementService: Subscription credits allocated', {
      allocationId: allocation.id,
      amount: allocation.amount,
    });

    return allocation as CreditAllocation;
  } catch (error) {
    logger.error('CreditManagementService.allocateSubscriptionCredits: Error', { error });
    throw error;
  }
}
```

**Fixed Code:**
```typescript
async allocateSubscriptionCredits(
  userId: string,
  subscriptionId: string
): Promise<CreditAllocation> {
  logger.info('CreditManagementService.allocateSubscriptionCredits', { userId, subscriptionId });

  try {
    const subscription = await this.prisma.subscriptionMonetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw notFoundError('Subscription');
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create credit allocation record
      const allocation = await tx.creditAllocation.create({
        data: {
          userId,
          subscriptionId,
          amount: subscription.monthlyCreditAllocation,
          allocationPeriodStart: subscription.currentPeriodStart,
          allocationPeriodEnd: subscription.currentPeriodEnd,
          source: 'subscription',
        },
      });

      // Step 2: Update Plan 112's user_credit_balance (FIXED)
      await tx.$executeRaw`
        INSERT INTO user_credit_balance (user_id, amount, last_allocation_at, created_at, updated_at)
        VALUES (${userId}::uuid, ${allocation.amount}, NOW(), NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          amount = user_credit_balance.amount + ${allocation.amount},
          last_allocation_at = NOW(),
          updated_at = NOW()
      `;

      return allocation;
    });

    logger.info('CreditManagementService: Subscription credits allocated and balance updated', {
      allocationId: result.id,
      amount: result.amount,
    });

    return result as CreditAllocation;
  } catch (error) {
    logger.error('CreditManagementService.allocateSubscriptionCredits: Error', { error });
    throw error;
  }
}
```

**Changes:**
1. Wrapped operations in `$transaction` for atomicity
2. Added `$executeRaw` to update `user_credit_balance` with `ON CONFLICT` upsert
3. Updated log message to reflect balance update

---

#### Change 1.2: Update `calculateRollover()` Method

**Location:** Lines 258-312

**Current Code (excerpt):**
```typescript
// TODO: Get actual current balance from Plan 112
const currentBalance = 0;
const unusedCredits = currentBalance;
```

**Fixed Code:**
```typescript
// Get actual current balance from Plan 112 (FIXED)
const balanceRecords = await this.prisma.$queryRaw<any[]>`
  SELECT amount FROM user_credit_balance WHERE user_id = ${userId}::uuid
`;
const currentBalance = balanceRecords.length > 0 ? parseInt(balanceRecords[0].amount) : 0;
const unusedCredits = currentBalance;
```

---

#### Change 1.3: Update `getCreditBalance()` Method

**Location:** Lines 426-446

**Current Code:**
```typescript
async getCreditBalance(userId: string): Promise<CreditBalance> {
  logger.debug('CreditManagementService.getCreditBalance', { userId });

  try {
    // TODO: Get actual balance from Plan 112's user_credit_balance
    const balance: CreditBalance = {
      userId,
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      rolloverCredits: 0,
    };

    logger.info('CreditManagementService: Credit balance retrieved', { userId });

    return balance;
  } catch (error) {
    logger.error('CreditManagementService.getCreditBalance: Error', { error });
    throw error;
  }
}
```

**Fixed Code:**
```typescript
async getCreditBalance(userId: string): Promise<CreditBalance> {
  logger.debug('CreditManagementService.getCreditBalance', { userId });

  try {
    // Get actual balance from Plan 112's user_credit_balance (FIXED)
    const balanceRecords = await this.prisma.$queryRaw<any[]>`
      SELECT amount FROM user_credit_balance WHERE user_id = ${userId}::uuid
    `;
    const currentBalance = balanceRecords.length > 0 ? parseInt(balanceRecords[0].amount) : 0;

    // Get total allocated credits (Plan 109)
    const allocations = await this.prisma.creditAllocation.findMany({
      where: { userId },
    });
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

    // Get total used credits from deduction ledger (Plan 112)
    const deductionRecords = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount), 0) as total_used
      FROM credit_deduction_ledger
      WHERE user_id = ${userId}::uuid AND status = 'completed'
    `;
    const totalUsed = deductionRecords.length > 0 ? parseInt(deductionRecords[0].total_used) : 0;

    // Calculate rollover credits (bonus source)
    const rolloverAllocations = await this.prisma.creditAllocation.findMany({
      where: { userId, source: 'bonus' },
    });
    const rolloverCredits = rolloverAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);

    const balance: CreditBalance = {
      userId,
      totalCredits: totalAllocated,
      usedCredits: totalUsed,
      remainingCredits: currentBalance,
      rolloverCredits,
    };

    logger.info('CreditManagementService: Credit balance retrieved', {
      userId,
      balance,
    });

    return balance;
  } catch (error) {
    logger.error('CreditManagementService.getCreditBalance: Error', { error });
    throw error;
  }
}
```

---

## Fix 2: Plan 109 → Plan 112 Tier Multiplier Synchronization

### File: `backend/src/services/subscription-management.service.ts`

#### Change 2.1: Inject PricingConfigService

**Location:** Lines 76-80 (constructor)

**Current Code:**
```typescript
@injectable()
export class SubscriptionManagementService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('SubscriptionManagementService: Initialized');
  }
```

**Fixed Code:**
```typescript
import { PricingConfigService } from './pricing-config.service'; // Add import

@injectable()
export class SubscriptionManagementService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(PricingConfigService) private pricingConfigService: PricingConfigService // Add injection
  ) {
    logger.debug('SubscriptionManagementService: Initialized');
  }
```

---

#### Change 2.2: Update `upgradeTier()` Method

**Location:** Lines 176-242

**Add after line 225 (after updating subscription):**

```typescript
// Update Plan 112 tier-based multiplier (FIXED)
const tierMultipliers: Record<string, number> = {
  'free': 1.8,
  'pro': 1.5,
  'pro_max': 1.4,
  'enterprise_pro': 1.3,
  'enterprise_max': 1.2,
  'perpetual': 1.0,
};

try {
  await this.pricingConfigService.createPricingConfig({
    scopeType: 'tier',
    subscriptionTier: newTier,
    providerId: null,
    modelId: null,
    marginMultiplier: tierMultipliers[newTier] || 1.5,
    targetGrossMarginPercent: ((tierMultipliers[newTier] - 1) / tierMultipliers[newTier]) * 100,
    effectiveFrom: new Date(),
    effectiveUntil: null,
    reason: 'tier_upgrade',
    reasonDetails: `Automatic multiplier update for tier upgrade: ${subscription.tier} → ${newTier}`,
    previousMultiplier: tierMultipliers[subscription.tier] || null,
    changePercent: null,
    expectedMarginChangeDollars: null,
    expectedRevenueImpact: null,
    createdBy: subscription.userId,
    requiresApproval: false, // Auto-approve tier changes
    approvalStatus: 'approved',
  });

  logger.info('SubscriptionManagementService: Tier multiplier updated', {
    subscriptionId,
    oldTier: subscription.tier,
    newTier,
    newMultiplier: tierMultipliers[newTier],
  });
} catch (multiplierError) {
  // Log error but don't fail subscription upgrade
  logger.error('SubscriptionManagementService: Failed to update tier multiplier', {
    error: multiplierError,
    subscriptionId,
    newTier,
  });
}

// TODO: Implement proration logic (integration with Plan 110)
// For now, upgrade takes effect immediately at renewal
```

---

#### Change 2.3: Update `downgradeTier()` Method

**Location:** Lines 250-312

**Add same tier multiplier update logic after line 298** (identical to `upgradeTier()`).

---

## Fix 3: Plan 111 → Plan 110 BYOK License Grant

### File: `backend/src/services/checkout-integration.service.ts`

#### Change 3.1: Inject LicenseManagementService

**Location:** Lines 18-25 (constructor)

**Current Code:**
```typescript
@injectable()
export class CheckoutIntegrationService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService,
    @inject(CouponRedemptionService) private redemptionService: CouponRedemptionService
  ) {
    logger.debug('CheckoutIntegrationService: Initialized');
  }
```

**Fixed Code:**
```typescript
import { LicenseManagementService } from './license-management.service'; // Add import
import { PerpetualLicense } from '@prisma/client'; // Add import

@injectable()
export class CheckoutIntegrationService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService,
    @inject(CouponRedemptionService) private redemptionService: CouponRedemptionService,
    @inject(LicenseManagementService) private licenseManagementService: LicenseManagementService // Add injection
  ) {
    logger.debug('CheckoutIntegrationService: Initialized');
  }
```

---

#### Change 3.2: Implement `grantPerpetualLicense()` Method

**Location:** Lines 188-198

**Current Code:**
```typescript
async grantPerpetualLicense(userId: string, couponId: string): Promise<any> {
  logger.info('Granting perpetual license', { userId, couponId });

  // TODO: Integrate with Plan 110 license management
  // This is a placeholder - actual implementation would create a perpetual license
  return {
    userId,
    licenseKey: `REPHLO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    status: 'active',
  };
}
```

**Fixed Code:**
```typescript
async grantPerpetualLicense(userId: string, couponId: string): Promise<PerpetualLicense> {
  logger.info('Granting perpetual license from BYOK coupon', { userId, couponId });

  try {
    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create perpetual license (Plan 110)
      const license = await this.licenseManagementService.createPerpetualLicense(
        userId,
        0, // $0 purchase price (from coupon)
        '1.0.0' // Current version
      );

      // Step 2: Grant 100% off first month subscription (if user has active subscription)
      const subscription = await tx.subscriptionMonetization.findFirst({
        where: { userId, status: { in: ['trial', 'active'] } },
      });

      if (subscription) {
        // Apply 100% discount for 1 month
        const discountedPrice = 0;
        await tx.subscriptionMonetization.update({
          where: { id: subscription.id },
          data: {
            basePriceUsd: discountedPrice,
            // Store original price in metadata for restoration after 1 month
            // TODO: Add scheduled job to restore original price after 1 month
          },
        });

        logger.info('CheckoutIntegrationService: Applied 100% discount to subscription', {
          subscriptionId: subscription.id,
          duration: '1 month',
        });
      }

      // Step 3: Record coupon usage metadata
      await tx.$executeRaw`
        INSERT INTO coupon_redemption_metadata (
          user_id, coupon_id, granted_license_id, granted_at
        ) VALUES (
          ${userId}::uuid, ${couponId}::uuid, ${license.id}::uuid, NOW()
        )
      `;

      return license;
    });

    logger.info('CheckoutIntegrationService: Perpetual license granted successfully', {
      userId,
      licenseId: result.id,
      licenseKey: result.licenseKey,
    });

    return result;
  } catch (error) {
    logger.error('CheckoutIntegrationService: Failed to grant perpetual license', {
      error,
      userId,
      couponId,
    });
    throw new Error('Failed to grant perpetual license');
  }
}
```

---

## Fix 4: Plan 111 → Plan 109 Subscription Discount Application

### File: `backend/src/services/coupon-redemption.service.ts`

#### Change 4.1: Update `applyCouponToSubscription()` Method

**Location:** Lines 297-314

**Current Code:**
```typescript
async applyCouponToSubscription(
  subscriptionId: string,
  discount: DiscountCalculation,
  tx?: any
): Promise<void> {
  logger.debug('Applying coupon to subscription', { subscriptionId, discount });

  const prismaClient = tx || this.prisma;

  // Update subscription with discount metadata
  // Note: Actual Stripe discount application happens in CheckoutIntegrationService
  await prismaClient.subscriptionMonetization.update({
    where: { id: subscriptionId },
    data: {
      // Store coupon discount in subscription metadata if needed
      // This is a placeholder - actual implementation may vary
    },
  });
}
```

**Fixed Code:**
```typescript
async applyCouponToSubscription(
  subscriptionId: string,
  discount: DiscountCalculation,
  tx?: any
): Promise<void> {
  logger.debug('Applying coupon to subscription', { subscriptionId, discount });

  const prismaClient = tx || this.prisma;

  // Get current subscription
  const subscription = await prismaClient.subscriptionMonetization.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Calculate new price based on discount type
  let newPrice = parseFloat(subscription.basePriceUsd.toString());

  switch (discount.discountType) {
    case 'percentage':
      newPrice = newPrice * (1 - (discount.percentage || 0) / 100);
      break;
    case 'fixed_amount':
      newPrice = Math.max(0, newPrice - (discount.fixedAmount || 0));
      break;
    case 'months_free':
      // Extend subscription period instead of reducing price
      const extendBy = discount.bonusMonths || 0;
      const newEndDate = new Date(subscription.currentPeriodEnd);
      newEndDate.setMonth(newEndDate.getMonth() + extendBy);

      await prismaClient.subscriptionMonetization.update({
        where: { id: subscriptionId },
        data: {
          currentPeriodEnd: newEndDate,
        },
      });

      logger.info('CouponRedemptionService: Extended subscription period', {
        subscriptionId,
        bonusMonths: extendBy,
        newEndDate,
      });
      return; // Exit early, no price change
    case 'credits':
      // Credits don't affect subscription price
      logger.debug('CouponRedemptionService: Credit coupon, no subscription price change', {
        subscriptionId,
      });
      return; // Exit early
  }

  // Update subscription price
  await prismaClient.subscriptionMonetization.update({
    where: { id: subscriptionId },
    data: {
      basePriceUsd: newPrice,
      // Store original price for restoration (if temporary discount)
      // TODO: Add field for original_price_usd in schema
    },
  });

  // TODO: Update Stripe subscription if Stripe integration exists
  if (subscription.stripeSubscriptionId) {
    logger.warn('CouponRedemptionService: Stripe discount application not yet implemented', {
      subscriptionId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      newPrice,
    });
    // await this.stripeService.updateSubscriptionPrice(
    //   subscription.stripeSubscriptionId,
    //   newPrice
    // );
  }

  logger.info('CouponRedemptionService: Coupon applied to subscription', {
    subscriptionId,
    discountType: discount.discountType,
    originalPrice: subscription.basePriceUsd,
    newPrice,
  });
}
```

---

## Fix 5: Shared Utilities Extraction

### File: `backend/src/utils/date.ts` (NEW FILE)

```typescript
/**
 * Date and Time Utility Functions
 *
 * Shared date utilities used across Plans 109, 110, 111.
 */

export class DateUtils {
  /**
   * Calculate days between two dates
   * @param start - Start date
   * @param end - End date
   * @returns Number of days (rounded up)
   */
  static daysBetween(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / msPerDay);
  }

  /**
   * Add months to a date
   * @param date - Base date
   * @param months - Number of months to add
   * @returns New date with months added
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Add years to a date
   * @param date - Base date
   * @param years - Number of years to add
   * @returns New date with years added
   */
  static addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Calculate months between two dates (approximate)
   * @param start - Start date
   * @param end - End date
   * @returns Number of months (approximate)
   */
  static monthsBetween(start: Date, end: Date): number {
    const msPerMonth = 1000 * 60 * 60 * 24 * 30; // Approximate
    return (end.getTime() - start.getTime()) / msPerMonth;
  }

  /**
   * Check if date is in the past
   * @param date - Date to check
   * @returns True if date is in the past
   */
  static isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Check if date is in the future
   * @param date - Date to check
   * @returns True if date is in the future
   */
  static isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Get start of day (midnight)
   * @param date - Date to truncate
   * @returns Date at 00:00:00
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day (23:59:59)
   * @param date - Date to extend
   * @returns Date at 23:59:59
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}
```

---

### File: `backend/src/utils/currency.ts` (NEW FILE)

```typescript
/**
 * Currency and Decimal Utility Functions
 *
 * Shared currency utilities used across Plans 109, 110, 111, 112.
 */

import { Prisma } from '@prisma/client';

export class CurrencyUtils {
  /**
   * Round to 2 decimal places (USD standard)
   * @param value - Value to round
   * @returns Rounded value
   */
  static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Format USD amount as string with $ symbol
   * @param value - Amount in USD
   * @returns Formatted string (e.g., "$19.99")
   */
  static formatUSD(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  /**
   * Format USD amount with comma separators
   * @param value - Amount in USD
   * @returns Formatted string (e.g., "$1,234.56")
   */
  static formatUSDWithCommas(value: number): string {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /**
   * Convert Prisma Decimal to number
   * @param decimal - Prisma Decimal value
   * @returns Number value
   */
  static decimalToNumber(decimal: Prisma.Decimal | null | undefined): number {
    if (!decimal) return 0;
    return parseFloat(decimal.toString());
  }

  /**
   * Calculate percentage of amount
   * @param amount - Base amount
   * @param percent - Percentage (0-100)
   * @returns Calculated percentage amount (rounded)
   */
  static percentage(amount: number, percent: number): number {
    return this.round((amount * percent) / 100);
  }

  /**
   * Calculate percentage change between two values
   * @param oldValue - Original value
   * @param newValue - New value
   * @returns Percentage change (e.g., 25 for 25% increase)
   */
  static percentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return this.round(((newValue - oldValue) / oldValue) * 100);
  }

  /**
   * Convert credits to USD (assuming 1000 credits = $1)
   * @param credits - Number of credits
   * @returns USD amount
   */
  static creditsToUSD(credits: number): number {
    return this.round(credits / 1000);
  }

  /**
   * Convert USD to credits (assuming 1000 credits = $1)
   * @param usd - USD amount
   * @returns Number of credits
   */
  static usdToCredits(usd: number): number {
    return Math.round(usd * 1000);
  }
}
```

---

### Usage Example: Update ProrationService

**File:** `backend/src/services/proration.service.ts`

**Before:**
```typescript
private daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / msPerDay);
}

private roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
```

**After:**
```typescript
import { DateUtils } from '../utils/date';
import { CurrencyUtils } from '../utils/currency';

// Remove private methods, use utilities instead:
const daysRemaining = DateUtils.daysBetween(now, periodEnd);
const netChargeUsd = CurrencyUtils.round(newTierProratedCostUsd - unusedCreditValueUsd);
```

---

## Fix 6: Error Class Standardization

### File: `backend/src/utils/errors.ts`

**Add the following classes:**

```typescript
/**
 * Subscription Error (400)
 */
export class SubscriptionError extends ApiError {
  constructor(message: string = 'Subscription operation failed') {
    super(message, 400);
    this.name = 'SubscriptionError';
  }
}

/**
 * License Error (400)
 */
export class LicenseError extends ApiError {
  constructor(message: string = 'License operation failed') {
    super(message, 400);
    this.name = 'LicenseError';
  }
}

/**
 * Credit Deduction Error (400)
 */
export class CreditDeductionError extends ApiError {
  constructor(message: string = 'Credit deduction failed') {
    super(message, 400);
    this.name = 'CreditDeductionError';
  }
}

/**
 * Insufficient Credits Error (402)
 */
export class InsufficientCreditsError extends ApiError {
  constructor(message: string = 'Insufficient credits') {
    super(message, 402); // 402 Payment Required
    this.name = 'InsufficientCreditsError';
  }
}
```

---

### File: `backend/src/services/credit-deduction.service.ts`

**Update Error Import:**

**Before:**
```typescript
// Custom error classes
export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}
```

**After:**
```typescript
import { InsufficientCreditsError, CreditDeductionError } from '../utils/errors';

// Remove local error class definition
```

---

## Testing Checklist

After applying these fixes, test the following scenarios:

### Test 1: Subscription Credit Allocation
1. Create new subscription
2. Verify `credit_allocation` record created
3. **VERIFY** `user_credit_balance` updated with correct amount
4. Check logs for "balance updated" message

### Test 2: Tier Upgrade with Multiplier Sync
1. Create user with Pro subscription
2. Upgrade to Enterprise tier
3. **VERIFY** `pricing_config` table has new tier entry
4. Call pricing API to confirm new multiplier applied

### Test 3: BYOK Coupon Redemption
1. Create BYOK coupon
2. Redeem coupon for user
3. **VERIFY** `perpetual_license` created
4. **VERIFY** Subscription price = $0 for first month
5. Check logs for license grant success

### Test 4: Subscription Discount Application
1. Create percentage discount coupon
2. Apply to active subscription
3. **VERIFY** `subscription_monetization.base_price_usd` reduced
4. Check logs for price update

### Test 5: Shared Utilities
1. Replace all `daysBetween()` calls with `DateUtils.daysBetween()`
2. Replace all `roundToTwoDecimals()` calls with `CurrencyUtils.round()`
3. Run tests to ensure behavior unchanged

---

## Deployment Checklist

- [ ] Apply Fix 1 (Credit balance updates)
- [ ] Apply Fix 2 (Tier multiplier sync)
- [ ] Apply Fix 3 (BYOK license grant)
- [ ] Apply Fix 4 (Subscription discount application)
- [ ] Apply Fix 5 (Shared utilities)
- [ ] Apply Fix 6 (Error class standardization)
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Test in staging environment
- [ ] Monitor logs for errors
- [ ] Deploy to production with feature flag
- [ ] Monitor production metrics

---

**Generated By:** Service Integration Fix Generator
**Date:** 2025-11-09
**Version:** 1.0
