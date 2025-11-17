

## 2025-11-17: Credit Allocation Fix & Tier Management Feature Planning

### Bug Fix: Seed Credit Allocations (Plan 189)
**Issue**: Users in seed data had incorrect credit allocations:
- admin.test@rephlo.ai: 10,000 credits (should be 1,500 for Pro tier)
- pro.user@example.com: 10,000 credits (should be 1,500 for Pro tier)

**Root Cause**: Hardcoded credit allocation in seedCredits() function (line 396):
```typescript
const monthlyAllocation = tier === 'free' ? 100 : 10000; // WRONG!
```

**Fix**: 
- Added tier configuration mapping in seedCredits() to match seedSubscriptions()
- Updated Free: 100 → 200 credits
- Updated Pro: 10000 → 1,500 credits
- All tiers now correctly provision credits per Plan 189 pricing structure

**Verification**: Database reset successful with correct allocations ✅

---

### Feature Implementation: Tier Credit Management (Plan 190)

**Status**: Phase 1 Complete (Database Foundation)

**Completed**:
✅ Created Plan 190 specification document (docs/plan/190-tier-credit-management-feature.md)
✅ Updated Prisma schema with version tracking and audit fields
✅ Created tier_config_history table for audit trail
✅ Applied database migration (20251117155346_add_tier_config_management)
✅ Generated Prisma client with new types

**Schema Changes**:
1. **subscription_tier_config** additions:
   - config_version (Int, default: 1)
   - last_modified_by (UUID, nullable)
   - last_modified_at (DateTime)
   - apply_to_existing_users (Boolean)
   - rollout_start_date (DateTime, nullable)

2. **tier_config_history** (new table):
   - Tracks all tier config changes with full audit trail
   - Records previous/new credits and prices
   - Captures change reason, type, and affected user count
   - Indexed on tier_name + changed_at for fast queries

**Next Steps**:
- [ ] Implement TierConfigService with CRUD operations
- [ ] Implement CreditUpgradeService with upgrade logic
- [ ] Create TierConfigController and API routes
- [ ] Build Admin Tier Management UI
- [ ] Write comprehensive tests

**Estimated Completion**: 5-6 days remaining (6-7 days total)

---

**Commit**: 4377987 - fix(seed): correct credit allocations per Plan 189 pricing structure
**Branch**: feature/update-model-tier-management

