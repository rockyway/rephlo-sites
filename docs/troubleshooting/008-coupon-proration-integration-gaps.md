# Coupon-Proration Integration Analysis

**Document ID**: 008-coupon-proration-integration-gaps.md
**Created**: 2025-11-11
**Status**: Critical Gaps Identified
**Priority**: P1 (High - Affects Billing Accuracy)
**Scope**: Plan 111 (Coupon System) ↔ Plan 110 (Proration Logic) Integration

---

## Executive Summary

**Issue**: The ProrationService and CheckoutIntegrationService do not integrate with the coupon discount system, leading to **incorrect proration calculations** when users upgrade/downgrade tiers mid-cycle while having active coupons.

**Impact**:
- **Financial Risk**: Incorrect billing amounts (overcharging or undercharging)
- **User Experience**: Confusing proration calculations
- **Compliance**: Misaligned with documented plan requirements

**Recommendation**: Implement coupon-aware proration before launching coupon campaigns.

---

## Gap Analysis

### Gap 1: ProrationService Missing Coupon Awareness

**Location**: `backend/src/services/proration.service.ts`

**Current Implementation**:
```typescript
async calculateProration(
  subscriptionId: string,
  newTier: string
): Promise<ProrationCalculation> {
  // Line 92-93: Uses hardcoded TIER_PRICING
  const oldTierPrice = this.TIER_PRICING[subscription.tier] || 0;
  const newTierPrice = this.TIER_PRICING[newTier] || 0;

  // Lines 95-98: Calculates based on BASE prices only
  const unusedCreditValueUsd = (daysRemaining / totalDays) * oldTierPrice;
  const newTierProratedCostUsd = (daysRemaining / totalDays) * newTierPrice;
  const netChargeUsd = newTierProratedCostUsd - unusedCreditValueUsd;

  // ❌ No coupon discount calculation
  // ❌ No active discount check
}
```

**Problem**:
1. **Ignores active coupons**: If user has "25% off Pro" active, proration still uses $19 instead of $14.25
2. **No coupon parameter**: Method signature doesn't accept coupon data for new tier
3. **Mismatched plan spec**: Plan document (line 1788-1843) defines algorithm with `coupon_id`, `coupon_discount_type`, `coupon_discount_value` parameters

**Plan Requirement** (from `docs/plan/111-coupon-discount-code-system.md:1788-1843`):
```typescript
function calculateMidCycleProration(
  currentSubscription: {...},
  upgradeData: {
    new_tier: string;
    new_monthly_price: number;
    coupon_id?: string;  // ❌ Missing
    coupon_discount_type?: 'percentage' | 'fixed_amount';  // ❌ Missing
    coupon_discount_value?: number;  // ❌ Missing
    coupon_duration_months?: number;  // ❌ Missing
  }
): ProrationResult {
  // Lines 1817-1828: Coupon discount calculation
  if (upgradeData.coupon_id) {
    if (upgradeData.coupon_discount_type === 'percentage') {
      couponDiscountAmount =
        (daysRemaining / totalDays) * upgradeData.new_monthly_price *
        (upgradeData.coupon_discount_value / 100);
    } else {
      couponDiscountAmount =
        Math.min(upgradeData.coupon_discount_value, proratedChargeForNew);
    }
  }

  // Line 1831: Final charge includes coupon discount
  const totalChargeToday = Math.max(0,
    proratedChargeForNew - unusedCreditFromOld - couponDiscountAmount
  );
}
```

**Example Scenario Where This Fails**:

```
User State:
- Current tier: Pro ($19/month) with PROMO50 (50% off, active)
- Actual monthly payment: $9.50
- Billing period: Nov 1 - Nov 30 (30 days)
- Upgrade date: Nov 15 (15 days remaining)
- Wants to upgrade to: Pro Max ($49/month) with UPGRADE20 (20% off)

Current (Incorrect) Calculation:
1. Unused credit: (15 / 30) × $19 = $9.50  ← WRONG (should use $9.50 actual payment)
2. Pro Max prorated: (15 / 30) × $49 = $24.50
3. Net charge: $24.50 - $9.50 = $15.00

Correct Calculation (Per Plan):
1. Unused credit: (15 / 30) × $9.50 = $4.75  ← Uses actual discounted price
2. Pro Max prorated: (15 / 30) × $49 = $24.50
3. Coupon discount: (15 / 30) × $49 × 20% = $4.90  ← UPGRADE20 applied
4. Net charge: $24.50 - $4.75 - $4.90 = $14.85

Discrepancy: $15.00 vs $14.85 = $0.15 overcharge
(Scales with tier prices and discount percentages)
```

**Current vs Required Interface**:

```typescript
// Current (proration.service.ts:68-71)
interface ProrationCalculation {
  fromTier: string;
  toTier: string;
  daysRemaining: number;
  daysInCycle: number;
  unusedCreditValueUsd: number;
  newTierProratedCostUsd: number;
  netChargeUsd: number;  // ❌ Missing coupon discount breakdown
}

// Required (from plan docs/plan/111:1780-1786)
interface ProrationResult {
  unused_credit_from_old_tier: number;
  prorated_charge_new_tier: number;
  coupon_discount_amount: number;  // ✅ Missing in current implementation
  total_charge_today: number;
  new_renewal_date: Date;
}
```

---

### Gap 2: CheckoutIntegrationService Hardcoded Tier

**Location**: `backend/src/services/checkout-integration.service.ts:29-84`

**Current Implementation**:
```typescript
async applyUpgradeCouponToCheckout(
  checkoutSession: any,
  couponCode: string
): Promise<any> {
  // Line 36-42: Validation with HARDCODED 'free' tier
  const validation = await this.validationService.validateCoupon(couponCode, checkoutSession.userId, {
    cartTotal: checkoutSession.total,
    subscriptionId: checkoutSession.subscriptionId,
    subscriptionTier: 'free',  // ❌ HARDCODED - should get actual tier
    ipAddress: checkoutSession.ipAddress,
    userAgent: checkoutSession.userAgent,
  });

  // Lines 51-72: Switch statement applies discount to checkout.total
  // ❌ No proration calculation
  // ❌ Doesn't integrate with ProrationService
}
```

**Problem**:
1. **Hardcoded tier**: Always validates against 'free' tier, ignoring user's actual subscription
2. **No proration integration**: Applies discount directly to `checkoutSession.total` without proration
3. **Missing mid-cycle logic**: Doesn't call `ProrationService.calculateProration()` for upgrades

**Example Failure**:

```
Scenario: Pro user ($19/month) wants to upgrade to Pro Max with coupon

Current behavior:
- Validates coupon against tier: 'free' (WRONG)
- Applies discount to checkoutSession.total directly
- Ignores proration for days remaining in billing cycle

Expected behavior:
- Get user's current tier from subscription
- Calculate proration for mid-cycle upgrade
- Apply coupon discount to prorated amount
- Return correct charge with breakdown
```

---

### Gap 3: Missing Service Integration Points

**Required Services Missing**:

1. **`getActiveDiscountForSubscription(subscriptionId: string)`**
   - Purpose: Retrieve active coupon discount currently applied to subscription
   - Returns: `{ couponCode: string, discountType: 'percentage' | 'fixed_amount', discountValue: number, effectivePrice: number }`
   - Used by: ProrationService to get actual price user is paying

2. **`calculateProrationWithCoupon(subscriptionId: string, newTier: string, couponCode?: string)`**
   - Purpose: Enhanced proration calculation accepting coupon for new tier
   - Returns: `ProrationCalculation` with `coupon_discount_amount` field
   - Used by: CheckoutIntegrationService for mid-cycle upgrades

3. **`applyMidCycleCouponUpgrade(subscriptionId: string, newTier: string, couponCode: string)`**
   - Purpose: Orchestrate mid-cycle upgrade with coupon application and proration
   - Returns: `{ prorationDetails: ProrationCalculation, redemption: CouponRedemption, updatedSubscription: Subscription }`
   - Used by: Checkout flow for tier upgrades

---

## Integration Flow (Proposed)

### Scenario: Mid-Cycle Tier Upgrade with Coupon

```
┌─────────────────────────────────────────────────┐
│ 1. User Request                                 │
│    POST /api/subscriptions/:id/upgrade          │
│    { newTier: 'pro_max', couponCode: 'UPG20' }  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. CheckoutIntegrationService                   │
│    .applyMidCycleCouponUpgrade()                │
└─────────────────┬───────────────────────────────┘
                  │
                  ├─► [A] Validate coupon
                  │    CouponValidationService.validateCoupon(
                  │      couponCode,
                  │      userId,
                  │      { subscriptionTier: currentTier }  ← Get from DB
                  │    )
                  │
                  ├─► [B] Get active discount (if any)
                  │    getActiveDiscountForSubscription(subscriptionId)
                  │    Returns: { effectivePrice: $9.50 } (if PROMO50 active)
                  │
                  ├─► [C] Calculate proration with coupons
                  │    ProrationService.calculateProrationWithCoupon(
                  │      subscriptionId,
                  │      newTier: 'pro_max',
                  │      newTierCoupon: {
                  │        code: 'UPG20',
                  │        discountType: 'percentage',
                  │        discountValue: 20
                  │      },
                  │      currentTierDiscount: {
                  │        effectivePrice: $9.50  ← From [B]
                  │      }
                  │    )
                  │    Returns: {
                  │      unusedCreditValueUsd: $4.75,
                  │      newTierProratedCostUsd: $24.50,
                  │      couponDiscountAmount: $4.90,
                  │      netChargeUsd: $14.85
                  │    }
                  │
                  ├─► [D] Create Stripe charge
                  │    stripe.charges.create({
                  │      amount: 1485,  // $14.85
                  │      metadata: { proration: {...}, coupon: 'UPG20' }
                  │    })
                  │
                  ├─► [E] Record redemption
                  │    CouponRedemptionService.redeemCoupon(...)
                  │    with is_proration_involved: true
                  │    and proration_amount: $4.90
                  │
                  ├─► [F] Create proration event
                  │    ProrationService.applyTierChange(...)
                  │    with coupon metadata
                  │
                  └─► [G] Update subscription tier
                       SubscriptionService.updateTier(...)

┌─────────────────────────────────────────────────┐
│ 3. Response                                     │
│    {                                            │
│      chargedAmount: $14.85,                     │
│      proration: {                               │
│        unusedCredit: $4.75,                     │
│        newTierCost: $24.50,                     │
│        couponDiscount: $4.90                    │
│      },                                         │
│      nextBillingDate: '2025-12-01',             │
│      nextBillingAmount: $49.00                  │
│    }                                            │
└─────────────────────────────────────────────────┘
```

---

## Database Schema Integration

### CouponRedemption Table (Already Exists)

From `docs/plan/111-coupon-discount-code-system.md:562-574`:

```sql
CREATE TABLE coupon_redemption (
  -- ... other fields ...

  -- Proration (if applicable)
  is_proration_involved BOOLEAN DEFAULT false,
  proration_amount DECIMAL(10,2),

  -- Usage Context
  user_tier_before VARCHAR(50),
  user_tier_after VARCHAR(50),
  -- ... other fields ...
);
```

**Fields to populate during mid-cycle upgrade**:
- `is_proration_involved` = `true`
- `proration_amount` = `coupon_discount_amount` from proration calculation
- `user_tier_before` = current tier
- `user_tier_after` = new tier
- `redemption_type` = `'upgrade'`
- `order_value_before_discount` = `newTierProratedCostUsd`
- `discount_applied_amount` = `couponDiscountAmount`
- `order_value_after_discount` = `netChargeUsd`

---

## Recommendations

### Priority 1: Fix ProrationService

**Task**: Add coupon awareness to proration calculations

**Files to modify**:
- `backend/src/services/proration.service.ts`
- `backend/src/types/proration.types.ts` (create)

**Changes**:
1. Add optional coupon parameters to `calculateProration()`:
   ```typescript
   async calculateProration(
     subscriptionId: string,
     newTier: string,
     options?: {
       newTierCoupon?: {
         code: string;
         discountType: 'percentage' | 'fixed_amount';
         discountValue: number;
       };
       currentTierEffectivePrice?: number;  // Override for active discounts
     }
   ): Promise<ProrationCalculation>
   ```

2. Update `ProrationCalculation` interface to include `couponDiscountAmount`:
   ```typescript
   export interface ProrationCalculation {
     fromTier: string;
     toTier: string;
     daysRemaining: number;
     daysInCycle: number;
     unusedCreditValueUsd: number;
     newTierProratedCostUsd: number;
     couponDiscountAmount: number;  // ✅ Add this field
     netChargeUsd: number;
   }
   ```

3. Implement coupon discount calculation (lines ~95-112):
   ```typescript
   // Use effective price if provided (for active discounts)
   const oldTierPrice = options?.currentTierEffectivePrice ||
                        this.TIER_PRICING[subscription.tier] || 0;
   const newTierPrice = this.TIER_PRICING[newTier] || 0;

   // Calculate base proration
   const unusedCreditValueUsd = (daysRemaining / totalDays) * oldTierPrice;
   const newTierProratedCostUsd = (daysRemaining / totalDays) * newTierPrice;

   // Apply coupon discount if provided
   let couponDiscountAmount = 0;
   if (options?.newTierCoupon) {
     if (options.newTierCoupon.discountType === 'percentage') {
       couponDiscountAmount = newTierProratedCostUsd *
                             (options.newTierCoupon.discountValue / 100);
     } else {
       couponDiscountAmount = Math.min(
         options.newTierCoupon.discountValue,
         newTierProratedCostUsd
       );
     }
   }

   // Final net charge
   const netChargeUsd = Math.max(0,
     newTierProratedCostUsd - unusedCreditValueUsd - couponDiscountAmount
   );

   return {
     // ... existing fields ...
     couponDiscountAmount: this.roundToTwoDecimals(couponDiscountAmount),
     netChargeUsd: this.roundToTwoDecimals(netChargeUsd),
   };
   ```

**Estimated Effort**: 2-3 hours

---

### Priority 2: Fix CheckoutIntegrationService

**Task**: Integrate proration and remove hardcoded tier

**Files to modify**:
- `backend/src/services/checkout-integration.service.ts`

**Changes**:
1. Get actual subscription tier instead of hardcoding 'free' (line 39):
   ```typescript
   // Fetch subscription to get actual tier
   const subscription = await this.prisma.subscriptionMonetization.findUnique({
     where: { id: checkoutSession.subscriptionId }
   });

   const validation = await this.validationService.validateCoupon(couponCode, checkoutSession.userId, {
     cartTotal: checkoutSession.total,
     subscriptionId: checkoutSession.subscriptionId,
     subscriptionTier: subscription?.tier || 'free',  // ✅ Use actual tier
     ipAddress: checkoutSession.ipAddress,
     userAgent: checkoutSession.userAgent,
   });
   ```

2. Add mid-cycle upgrade handling (new method):
   ```typescript
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
     // Step 1: Validate coupon
     const subscription = await this.prisma.subscriptionMonetization.findUnique({
       where: { id: subscriptionId }
     });

     const validation = await this.validationService.validateCoupon(
       couponCode,
       userId,
       {
         subscriptionTier: subscription.tier,
         cartTotal: this.TIER_PRICING[newTier] || 0,
       }
     );

     if (!validation.isValid) {
       throw new Error(`Coupon validation failed: ${validation.errors.join(', ')}`);
     }

     // Step 2: Get active discount (if any)
     const activeDiscount = await this.getActiveDiscountForSubscription(subscriptionId);

     // Step 3: Calculate proration with coupon
     const proration = await this.prorationService.calculateProration(
       subscriptionId,
       newTier,
       {
         newTierCoupon: {
           code: couponCode,
           discountType: validation.discount.couponType as any,
           discountValue: validation.discount.percentage || validation.discount.fixedAmount || 0,
         },
         currentTierEffectivePrice: activeDiscount?.effectivePrice,
       }
     );

     // Step 4: Redeem coupon
     const redemption = await this.redemptionService.redeemCoupon(
       validation.discount.couponId,
       userId,
       {
         code: couponCode,
         subscriptionId,
         originalAmount: proration.newTierProratedCostUsd,
         ipAddress: '',  // Pass from request
         userAgent: '',  // Pass from request
         prorationAmount: proration.couponDiscountAmount,
         isProrationInvolved: true,
         tierBefore: subscription.tier,
         tierAfter: newTier,
       }
     );

     // Step 5: Apply tier change
     await this.prorationService.applyTierUpgrade(subscriptionId, newTier);

     return {
       proration,
       redemption,
       chargeAmount: proration.netChargeUsd,
     };
   }
   ```

**Estimated Effort**: 3-4 hours

---

### Priority 3: Add Helper Service Method

**Task**: Create service to get active discount for subscription

**Files to modify**:
- `backend/src/services/checkout-integration.service.ts`

**Changes**:
```typescript
async getActiveDiscountForSubscription(
  subscriptionId: string
): Promise<{
  couponCode: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  effectivePrice: number;
} | null> {
  const subscription = await this.prisma.subscriptionMonetization.findUnique({
    where: { id: subscriptionId },
    include: {
      redemptions: {
        where: {
          redemptionType: { in: ['new_subscription', 'upgrade'] },
          processedAt: { not: null },
        },
        include: {
          coupon: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!subscription || !subscription.redemptions.length) {
    return null;
  }

  const redemption = subscription.redemptions[0];
  const coupon = redemption.coupon;

  // Check if coupon is still active (within duration)
  const monthsSinceRedemption = Math.floor(
    (Date.now() - redemption.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (coupon.max_discount_months && monthsSinceRedemption >= coupon.max_discount_months) {
    return null;  // Discount expired
  }

  // Calculate effective price
  const basePriceUsd = parseFloat(subscription.basePriceUsd.toString());
  let effectivePrice = basePriceUsd;
  let discountType: 'percentage' | 'fixed_amount' = 'percentage';
  let discountValue = 0;

  if (coupon.discount_percentage) {
    discountType = 'percentage';
    discountValue = parseFloat(coupon.discount_percentage.toString());
    effectivePrice = basePriceUsd * (1 - discountValue / 100);
  } else if (coupon.discount_amount) {
    discountType = 'fixed_amount';
    discountValue = parseFloat(coupon.discount_amount.toString());
    effectivePrice = Math.max(0, basePriceUsd - discountValue);
  }

  return {
    couponCode: coupon.code,
    discountType,
    discountValue,
    effectivePrice,
  };
}
```

**Estimated Effort**: 1-2 hours

---

## Testing Requirements

### Unit Tests

**File**: `backend/src/services/__tests__/proration.service.test.ts`

**New test cases**:
```typescript
describe('ProrationService with Coupons', () => {
  describe('calculateProration with newTierCoupon', () => {
    it('should apply percentage discount to prorated amount', async () => {
      // Scenario: Pro ($19) → Pro Max ($49) with 20% off
      // Mid-cycle (15 days remaining of 30)
      const result = await prorationService.calculateProration(
        subscriptionId,
        'pro_max',
        {
          newTierCoupon: {
            code: 'UPGRADE20',
            discountType: 'percentage',
            discountValue: 20,
          },
        }
      );

      expect(result.newTierProratedCostUsd).toBe(24.50);  // (15/30) × $49
      expect(result.couponDiscountAmount).toBe(4.90);     // 20% × $24.50
      expect(result.netChargeUsd).toBe(10.10);            // $24.50 - $9.50 - $4.90
    });

    it('should use currentTierEffectivePrice if provided', async () => {
      // Scenario: User paying $9.50 (50% off Pro)
      const result = await prorationService.calculateProration(
        subscriptionId,
        'pro_max',
        {
          currentTierEffectivePrice: 9.50,  // 50% off Pro ($19)
        }
      );

      expect(result.unusedCreditValueUsd).toBe(4.75);  // (15/30) × $9.50, not $9.50
    });

    it('should cap fixed discount at prorated amount', async () => {
      // Scenario: $30 off coupon on $24.50 prorated charge
      const result = await prorationService.calculateProration(
        subscriptionId,
        'pro_max',
        {
          newTierCoupon: {
            code: 'SAVE30',
            discountType: 'fixed_amount',
            discountValue: 30,
          },
        }
      );

      expect(result.couponDiscountAmount).toBe(24.50);  // Capped at prorated amount
      expect(result.netChargeUsd).toBe(0);              // Free upgrade (after unused credit)
    });
  });

  describe('Edge Cases', () => {
    it('should handle downgrade with active discount', async () => {
      // Scenario: Pro Max ($24.50 with 50% off) → Pro ($19)
      // Result: Credit to user
    });

    it('should handle multi-month coupon proration', async () => {
      // Scenario: 3-month discount, mid-cycle upgrade
      // Result: Correct proration for remaining duration
    });
  });
});
```

### Integration Tests

**File**: `backend/src/services/__tests__/checkout-integration.service.test.ts`

**New test cases**:
```typescript
describe('CheckoutIntegrationService Mid-Cycle Upgrades', () => {
  it('should correctly calculate mid-cycle upgrade with coupon', async () => {
    // Setup: User on Pro ($19/month), 15 days remaining
    // Action: Upgrade to Pro Max with UPGRADE20
    // Assert: Correct proration + coupon discount
  });

  it('should use actual subscription tier for validation', async () => {
    // Setup: User on Pro Max
    // Action: Apply coupon restricted to Pro tier
    // Assert: Validation fails with TIER_NOT_ELIGIBLE
  });

  it('should detect and use active discounts', async () => {
    // Setup: User on Pro with PROMO50 active
    // Action: Upgrade to Pro Max
    // Assert: Proration uses $9.50 effective price, not $19
  });
});
```

---

## Acceptance Criteria

### ✅ Definition of Done

- [ ] ProrationService.calculateProration() accepts optional coupon parameters
- [ ] ProrationCalculation interface includes `couponDiscountAmount` field
- [ ] CheckoutIntegrationService.applyUpgradeCouponToCheckout() uses actual subscription tier
- [ ] CheckoutIntegrationService.applyMidCycleCouponUpgrade() orchestrates proration + coupon redemption
- [ ] Helper method `getActiveDiscountForSubscription()` returns current discount info
- [ ] CouponRedemption records populated with proration fields (`is_proration_involved`, `proration_amount`)
- [ ] Unit tests pass with >90% coverage
- [ ] Integration tests verify end-to-end mid-cycle upgrade flow
- [ ] Manual testing confirms correct billing amounts

### 📊 Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| New subscription with coupon | Apply discount to base price, no proration |
| Mid-cycle upgrade with coupon | Prorate both unused credit and new tier discount |
| Mid-cycle upgrade, active discount on old tier | Use effective price for unused credit calculation |
| Mid-cycle downgrade with active discount | Credit user for unused portion |
| Annual plan upgrade with duration bonus | Apply proration to annual amount |

---

## References

1. **Plan 111 Coupon System**: `docs/plan/111-coupon-discount-code-system.md`
   - Section 10 (lines 1647-1845): Proration Handling for Coupons
   - Algorithm definition (lines 1777-1844)

2. **Plan 110 Proration Strategy**: `docs/plan/110-perpetual-plan-and-proration-strategy.md`

3. **Integration Spec**: `docs/reference/021-plan-111-coupon-system-integration.md`
   - Section 3.2 (lines 238-302): Plan 110 Integration Points

4. **Current Implementation**:
   - ProrationService: `backend/src/services/proration.service.ts`
   - CheckoutIntegrationService: `backend/src/services/checkout-integration.service.ts`

---

**Document Status**: Ready for Implementation
**Estimated Total Effort**: 6-9 hours (P1 + P2 + P3 + Tests)
**Recommended Sprint**: Include in current sprint before launching coupon campaigns
