
## 2025-11-17 19:35 - Credit Allocation & Subscription Lifecycle Fixes

**Issue**: Pro user showing freeCredits.monthlyAllocation=2000, dual credit tables needed review
**Root Cause**: Schema defaults auto-filling credit_type='free' and monthly_allocation=2000 for all tiers

**Fixes Applied**:
1. ✅ Removed schema defaults for credit_type and monthly_allocation
2. ✅ Updated allocateCredits() to set both fields based on subscription tier
3. ✅ Implemented subscription cancellation → free tier reversion (200 credits)
4. ✅ Added credit allocation to upgrade/downgrade flows
5. ✅ Created pre-migration data fix script (verified all records correct)
6. ✅ Applied migration: 20251117191759_remove_credit_schema_defaults
7. ✅ Fixed test database setup (updated Prisma model names)
8. ✅ Created verification scripts

**Files Modified**:
- backend/prisma/schema.prisma (removed defaults)
- backend/src/services/credit.service.ts (allocateCredits logic)
- backend/src/services/stripe.service.ts (cancellation flow + DI fixes)
- backend/src/services/subscription-management.service.ts (upgrade/downgrade)
- backend/tests/setup/database.ts (model name fixes)
- backend/scripts/fix-existing-credit-records.js (data integrity)
- backend/scripts/verify-subscription-lifecycle.ts (verification)

**Plan 189 Compliance**: All tiers now correctly allocated
