# Test Data Validation Report

**Date:** November 9, 2025
**Document:** `docs/guides/011-test-data.md` (Version 3.0)
**Status:** ✅ VALIDATED WITH CORRECTIONS REQUIRED
**Severity:** 4 Low-Priority Issues Found (Mathematical Errors)

---

## Executive Summary

The test data documentation has been comprehensively validated against:
- ✅ Database schema (Prisma schema.prisma)
- ✅ All 14 database migrations
- ✅ Foreign key relationships
- ✅ Enum definitions and values
- ✅ Decimal precision specifications
- ✅ Business logic calculations

**Result:** 4 mathematical calculation errors found in token pricing examples. All other content validated successfully. No schema alignment issues.

---

## Validation Checklist

### Schema & Relationships
- ✅ All subscription tier names match schema enums (free, pro, pro_max, enterprise_pro, enterprise_max, perpetual)
- ✅ All subscription status values match enums (trial, active, past_due, cancelled, suspended, grace_period)
- ✅ All license status values correct (pending, active, suspended, revoked, expired)
- ✅ All activation status values correct (active, deactivated, replaced)
- ✅ All upgrade status values correct (pending, completed, failed, refunded)
- ✅ All proration types match enums (upgrade, downgrade, cancellation, reactivation)
- ✅ All coupon types match enums (percentage_discount, fixed_amount_discount, tier_specific_discount, duration_bonus, byok_migration)
- ✅ All discount types correct (percentage, fixed_amount, credits, months_free)
- ✅ All campaign types correct (seasonal, win_back, referral, promotional, early_bird)
- ✅ All fraud detection types correct (velocity_abuse, ip_switching, bot_pattern, device_fingerprint_mismatch, stacking_abuse)
- ✅ All fraud severity levels correct (low, medium, high, critical)
- ✅ All validation rule types correct (first_time_user_only, specific_email_domain, minimum_credit_balance, exclude_refunded_users, require_payment_method)
- ✅ All vendor names correct (openai, anthropic, google, meta, mistral, cohere)
- ✅ All margin strategies correct (fixed_percentage, tiered, dynamic)
- ✅ All deduction types correct (inference, embedding, fine_tuning, custom)

### Foreign Keys & Relationships
- ✅ All user references properly established
- ✅ All subscription references valid
- ✅ All license references correct
- ✅ All coupon references valid
- ✅ Machine fingerprint format valid (SHA-256 example)
- ✅ OAuth client credentials match seed.ts configuration

### Decimal Precision
- ✅ All prices stored as DECIMAL(10,2) format
- ✅ All percentages stored as DECIMAL(5,2) format
- ✅ Token prices use sufficient precision

### Business Logic
- ✅ Proration calculations verified (upgrade, downgrade, cancellation)
- ✅ Margin calculations verified (fixed, tiered, dynamic strategies)
- ⚠️ Token pricing calculations: **4 errors found**
- ✅ Credit allocation logic correct
- ✅ Fraud detection severity levels consistent

---

## Issues Found

### Issue 1: GPT-4 Turbo Token Cost (Line 718)

**Severity:** Low (Calculation Error)

**Location:** `## Plan 112: Token-to-Credit Conversion` → `### Token Usage Ledger Examples` → `Usage 1 (GPT-4 Turbo Inference)`

**Current Value:**
```yaml
total_cost_usd: 0.0065  # (250 * 10 + 150 * 30) / 1,000,000
```

**Calculation:**
- Input tokens: 250 × $10/M = 250 × 10 / 1,000,000 = 0.0025
- Output tokens: 150 × $30/M = 150 × 30 / 1,000,000 = 0.0045
- Total: 0.0025 + 0.0045 = **0.007 USD**

**Correct Value:**
```yaml
total_cost_usd: 0.007  # (250 * 10 + 150 * 30) / 1,000,000
```

**Impact:** Credits deduction should be 17-18, not 16

---

### Issue 2: Gemini 1.5 Pro Token Cost (Line 740)

**Severity:** Low (Calculation Error)

**Location:** `## Plan 112: Token-to-Credit Conversion` → `### Token Usage Ledger Examples` → `Usage 3 (Gemini 1.5 Pro - Large Input)`

**Current Value:**
```yaml
total_cost_usd: 0.0685  # (10000 * 3.5 + 2000 * 10.5) / 1,000,000
```

**Calculation:**
- Input tokens: 10,000 × $3.5/M = 10,000 × 3.5 / 1,000,000 = 0.035
- Output tokens: 2,000 × $10.5/M = 2,000 × 10.5 / 1,000,000 = 0.021
- Total: 0.035 + 0.021 = **0.056 USD**

**Correct Value:**
```yaml
total_cost_usd: 0.056  # (10000 * 3.5 + 2000 * 10.5) / 1,000,000
```

**Impact:** Credits deduction should be 140, not 170

---

### Issue 3: Llama 2 70B Token Cost (Line 751)

**Severity:** Low (Calculation Error)

**Location:** `## Plan 112: Token-to-Credit Conversion` → `### Token Usage Ledger Examples` → `Usage 4 (Llama 2 70B - Cost Effective)`

**Current Value:**
```yaml
total_cost_usd: 0.000575  # (500 * 0.75 + 300 * 1.00) / 1,000,000
```

**Calculation:**
- Input tokens: 500 × $0.75/M = 500 × 0.75 / 1,000,000 = 0.000375
- Output tokens: 300 × $1.00/M = 300 × 1.00 / 1,000,000 = 0.0003
- Total: 0.000375 + 0.0003 = **0.000675 USD**

**Correct Value:**
```yaml
total_cost_usd: 0.000675  # (500 * 0.75 + 300 * 1.00) / 1,000,000
```

**Impact:** Credits deduction should be 1-2, not 1

---

### Issue 4: "Unlimited" max_uses Value (Line 440)

**Severity:** Low (Data Type Issue)

**Location:** `## Plan 111: Coupon & Discount System` → `### Coupon Examples` → `Coupon 3 (Credits Bonus)`

**Current Value:**
```yaml
max_uses: unlimited
```

**Issue:** The schema expects an integer for max_uses, not a string. "unlimited" should be represented as `null` (for unlimited) or a specific integer.

**Correct Value:**
```yaml
max_uses: null  # null indicates unlimited uses
```

or if using a specific number:
```yaml
max_uses: 10000
```

---

## Verified Correct

### Proration Calculations ✅
All proration examples verified mathematically correct:
- **Upgrade Example** (Line 314): Net charge = $100.00 ✓
- **Downgrade Example** (Line 329): Net charge refund = -$66.66 ✓
- **Cancellation Example** (Line 343): Net charge refund = -$23.33 ✓

### Claude 3.5 Sonnet Calculation ✅
- Input: 1500 × $3/M = 0.0045
- Output: 800 × $15/M = 0.012
- Total: 0.0165 USD ✓
- Credits: 0.0165 × 2500 = 41 ✓

### Margin Calculations ✅
Example in Scenario 6 (Line 1099):
- Base cost: $0.014 ✓
- Margin 40%: $0.014 × 1.4 = $0.0196 ✓
- Credits: 0.0196 × 2500 = 49 ✓

---

## Enum Validation Summary

| Enum Type | Expected Values | Document Uses | Status |
|-----------|-----------------|----------------|--------|
| SubscriptionTier | 6 values | All correct | ✅ |
| SubscriptionStatus | 7 values | Partial (4 used) | ✅ |
| LicenseStatus | 5 values | All correct | ✅ |
| ActivationStatus | 3 values | All correct | ✅ |
| UpgradeStatus | 4 values | All correct | ✅ |
| ProrationType | 4 values | All correct | ✅ |
| CouponType | 5 values | All correct | ✅ |
| DiscountType | 4 values | All correct | ✅ |
| CampaignType | 5 values | All correct | ✅ |
| RedemptionStatus | 4 values | All correct | ✅ |
| FraudDetectionType | 5 values | All correct | ✅ |
| FraudSeverity | 4 values | All correct | ✅ |
| ValidationRuleType | 5 values | All correct | ✅ |
| VendorName | 6 values | All correct | ✅ |
| MarginStrategy | 3 values | All correct | ✅ |
| DeductionType | 4 values | All correct | ✅ |

**Summary:** 100% enum alignment ✓

---

## Schema Constraint Validation

### Foreign Keys
- ✅ All user_id references are valid (users table exists)
- ✅ All subscription_id references are valid (subscriptions_monetization table exists)
- ✅ All coupon_id references are valid (coupons table exists)
- ✅ All license_id references are valid (perpetual_licenses table exists)
- ✅ Machine fingerprint format valid for unique constraint

### Unique Constraints
- ✅ OAuth client credentials documented as unique
- ✅ License keys documented as unique
- ✅ Coupon codes can be unique
- ✅ Machine fingerprint + license combination is unique

### Cascade Deletes
- ✅ Proper deletion order documented in reset procedures (dependency order respected)

---

## Recommendations

### Critical (Must Fix)
None - no schema breaks, no data integrity issues

### High Priority
1. **Fix mathematical errors in token cost examples** - These are used for documentation and examples:
   - Update GPT-4 Turbo: 0.0065 → 0.007
   - Update Gemini 1.5: 0.0685 → 0.056
   - Update Llama 2 70B: 0.000575 → 0.000675

2. **Fix max_uses value** - Change "unlimited" to `null`

### Medium Priority
None

### Low Priority
1. Consider clarifying proration calculation format to show formula more explicitly
2. Add credit conversion multiplier (2500) to pricing section for reference

---

## Migration Alignment

All 14 migrations verified:
- ✅ 20251109070000_add_subscription_monetization_system
- ✅ 20251109080000_add_perpetual_licensing_system
- ✅ 20251109080100_add_coupon_discount_system
- ✅ 20251109111300_add_plan_112_and_fix_enums

**Latest enum additions:** All Plan 112 enums (vendor_name, margin_strategy, deduction_type) properly documented.

---

## Sign-Off

**Validation Complete:** ✅
**Schema Alignment:** ✅ 100% Compatible
**No Breaking Issues:** ✅
**Ready for Seeding:** ⏳ After corrections applied
**Issues Requiring Fix:** 4 (All low priority)

**Validating Engineer:** Claude Code
**Validation Date:** November 9, 2025
**Next Step:** Apply corrections to document

---
