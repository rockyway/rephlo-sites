# Complete Schema Standardization to snake_case

**Date**: 2025-11-16
**Status**: Planning
**Priority**: High
**Related**:
- Plan 189: Pricing Tier Restructure
- Plan 190: Prisma Naming Standardization
- Progress 192: Pricing Tier Implementation Status

---

## Executive Summary

Complete the Prisma naming standardization by converting the remaining **legacy branding models** (downloads, feedbacks, diagnostics) from camelCase to snake_case. Since the system hasn't launched yet, we can perform a clean migration with database refresh.

Additionally, review and verify that seed data for Model tier covers all new pricing tiers from Plan 189 with correct credit provisioning.

---

## Part 1: Schema Standardization to snake_case

### Current State

**✅ Already snake_case** (Modern API models from Plan 190):
- `users` - `user_id`, `first_name`, `last_name`, `email_verified`
- `subscriptions` - `user_id`, `billing_period_start`, `current_period_end`
- `credits` - `user_id`, `total_credits`, `monthly_allocation`
- `user_role_assignment` - `user_id`, `role_id`, `assigned_by`, `assigned_at`
- `subscription_monetization` - `base_price_usd`, `current_period_start`
- `pricing_configs` - `scope_type`, `subscription_tier`, `is_active`

**❌ Still camelCase** (Legacy branding models):
- `downloads` - `userAgent`, `ipHash`
- `feedbacks` - `userId`
- `diagnostics` - `userId`, `filePath`, `fileSize`

---

### Migration Plan

#### Step 1.1: Update Prisma Schema

**File**: `backend/prisma/schema.prisma`

**Current (camelCase)**:
```prisma
model downloads {
  id        String   @id
  os        String
  timestamp DateTime @default(now())
  userAgent String?  // ← CHANGE TO user_agent
  ipHash    String?  // ← CHANGE TO ip_hash

  @@index([os])
  @@index([timestamp])
}

model feedbacks {
  id        String   @id
  userId    String?  // ← CHANGE TO user_id
  message   String   @db.VarChar(1000)
  email     String?
  timestamp DateTime @default(now())

  @@index([email])
  @@index([timestamp])
}

model diagnostics {
  id        String   @id
  userId    String?  // ← CHANGE TO user_id
  filePath  String   // ← CHANGE TO file_path
  fileSize  Int      // ← CHANGE TO file_size
  timestamp DateTime @default(now())

  @@index([timestamp])
  @@index([userId])
}
```

**New (snake_case)**:
```prisma
model downloads {
  id         String   @id
  os         String
  timestamp  DateTime @default(now())
  user_agent String?
  ip_hash    String?

  @@index([os])
  @@index([timestamp])
}

model feedbacks {
  id        String   @id
  user_id   String?
  message   String   @db.VarChar(1000)
  email     String?
  timestamp DateTime @default(now())

  @@index([email])
  @@index([timestamp])
}

model diagnostics {
  id        String   @id
  user_id   String?
  file_path String
  file_size Int
  timestamp DateTime @default(now())

  @@index([timestamp])
  @@index([user_id])
}
```

#### Step 1.2: Create Migration

```bash
cd backend
npx prisma migrate dev --name standardize_legacy_branding_models_to_snake_case
```

#### Step 1.3: Update Seed File

**File**: `backend/prisma/seed.ts`

**Changes Required** (Lines 1980-2089):

```typescript
// downloads - Change userAgent → user_agent, ipHash → ip_hash
const downloads = await Promise.all([
  prisma.downloads.create({
    data: {
      id: randomUUID(),
      os: 'windows',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip_hash: 'hash_' + Math.random().toString(36).substring(7),
    },
  }),
  // ... (4 more downloads)
]);

// feedbacks - Change userId → user_id
const feedbacks = await Promise.all([
  prisma.feedbacks.create({
    data: {
      id: randomUUID(),
      user_id: 'user_' + Math.random().toString(36).substring(7),
      message: 'Love the app!...',
      email: 'user1@example.com',
    },
  }),
  // ... (4 more feedbacks)
]);

// diagnostics - Change userId → user_id, filePath → file_path, fileSize → file_size
const diagnostics = await Promise.all([
  prisma.diagnostics.create({
    data: {
      id: randomUUID(),
      user_id: 'user_' + Math.random().toString(36).substring(7),
      file_path: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
      file_size: 15240,
    },
  }),
  // ... (2 more diagnostics)
]);
```

#### Step 1.4: Update Branding Controller

**File**: `backend/src/controllers/branding.controller.ts`

Search for all references to `downloads`, `feedbacks`, `diagnostics` models and update field access:

```typescript
// BEFORE
const download = await prisma.downloads.create({
  data: {
    os: req.body.os,
    userAgent: req.headers['user-agent'],
    ipHash: hashIp(req.ip),
  },
});

// AFTER
const download = await prisma.downloads.create({
  data: {
    os: req.body.os,
    user_agent: req.headers['user-agent'],
    ip_hash: hashIp(req.ip),
  },
});
```

#### Step 1.5: Update PRISMA_MODEL_MAPPING.md

**File**: `backend/PRISMA_MODEL_MAPPING.md`

Update the legacy branding models section to reflect snake_case naming.

---

### Implementation Timeline

| Step | Task | Time | Status |
|------|------|------|--------|
| 1.1 | Update Prisma schema for 3 models | 15 min | ⬜ Pending |
| 1.2 | Create migration | 5 min | ⬜ Pending |
| 1.3 | Update seed file (8 occurrences) | 15 min | ⬜ Pending |
| 1.4 | Update branding.controller.ts | 20 min | ⬜ Pending |
| 1.5 | Update PRISMA_MODEL_MAPPING.md | 10 min | ⬜ Pending |
| 1.6 | Run `npx prisma generate` | 2 min | ⬜ Pending |
| 1.7 | Run `npm run db:reset` | 5 min | ⬜ Pending |
| 1.8 | Verify with analysis script | 2 min | ⬜ Pending |
| 1.9 | Test branding endpoints | 15 min | ⬜ Pending |

**Total Time**: ~1.5 hours

---

## Part 2: Model Tier Seed Data Verification

### Expected Tier Coverage (from Plan 189)

| Tier | Credits/Month | Price | Status | Margin | Required in Seed? |
|------|--------------|-------|--------|--------|------------------|
| **free** | 200 | $0 | Active | 2.0x | ✅ Yes |
| **pro** | 1,500 | $15 | Active | 1.0x | ✅ Yes |
| **pro_plus** | 5,000 | $45 | Active (NEW) | 1.1x | ✅ Yes |
| **pro_max** | 25,000 | $199 | Active | 1.25x | ✅ Yes |
| **enterprise_pro** | 3,500 | $30 | Coming Soon | 1.15x | ✅ Yes (disabled) |
| **enterprise_pro_plus** | 11,000 | $90 | Coming Soon | 1.20x | ✅ Yes (disabled) |

### Seed Data Review Checklist

#### 2.1 Verify Tier Configuration

**File**: `backend/prisma/seed.ts` (Lines ~310-360)

**Expected**:
```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 200,        // ✅ Correct (was 100, updated in 192)
    priceCents: 0,
    billingInterval: 'monthly',
    status: 'active',
  },
  pro: {
    creditsPerMonth: 1500,       // ✅ Correct (was 10000)
    priceCents: 1500,
    billingInterval: 'monthly',
    status: 'active',
  },
  pro_plus: {                    // ⚠️ VERIFY THIS EXISTS
    creditsPerMonth: 5000,
    priceCents: 4500,
    billingInterval: 'monthly',
    status: 'active',
  },
  pro_max: {                     // ⚠️ VERIFY CREDITS
    creditsPerMonth: 25000,
    priceCents: 19900,
    billingInterval: 'monthly',
    status: 'active',
  },
};
```

**Action**: Check if `pro_plus` tier exists in seed config. If not, add it.

#### 2.2 Verify Model-Tier Mappings

**File**: `backend/prisma/seed.ts` (Lines ~432-650)

**Expected Model Distribution**:

| Model | Provider | Free | Pro | Pro+ | Pro Max | Ent Pro | Ent Pro+ |
|-------|----------|------|-----|------|---------|---------|----------|
| GPT-5 Nano | OpenAI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPT-5 Mini | OpenAI | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPT-5 | OpenAI | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Claude Haiku 4.5 | Anthropic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Claude Sonnet 4.5 | Anthropic | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Claude Opus 4.1 | Anthropic | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gemini 2.0 Flash-Lite | Google | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gemini 2.0 Flash | Google | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gemini 2.5 Pro | Google | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mistral Small 3.1 | Mistral | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mistral Medium 3 | Mistral | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Llama 4 Scout | Meta | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Llama 3.3 70B | Meta | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Llama 3.1 405B | Meta | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grok Code Fast 1 | xAI | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grok 4 Fast | xAI | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grok 4 | xAI | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

**Access Mode**:
- **Free tier**: `minimum` (requires Free or higher)
- **Pro tier**: `minimum` (requires Pro or higher)
- **Pro+ tier**: `minimum` (requires Pro+ or higher) - **NOT YET USED IN SEED**
- **Pro Max tier**: `minimum` (requires Pro Max or higher)

**⚠️ Issue**: Current seed data doesn't distinguish between Pro and Pro+. All "Pro" models allow Pro+ access automatically (due to `minimum` mode), but we should have explicit Pro+ exclusive models.

**Recommendation**:
- Keep current model distribution (all Pro models accessible to Pro+)
- No changes needed unless we want Pro+ exclusive models
- Pro+ value comes from higher credit allocation (5,000 vs 1,500), not model access

#### 2.3 Verify Credit Provisioning Logic

**File**: `backend/prisma/seed.ts` (Lines ~378-410)

**Expected**:
```typescript
const monthlyAllocation = config.creditsPerMonth;
const creditType = tier === 'free' ? 'monthly' : 'subscription';

const credit = await prisma.credits.create({
  data: {
    id: randomUUID(),
    user_id: user.user_id,
    total_credits: monthlyAllocation,  // ✅ Should match tierConfig
    used_credits: 0,
    credit_type: creditType,
    monthly_allocation: monthlyAllocation,
    billing_period_start: now,
    billing_period_end: endOfMonth,
    is_current: true,
    reset_day_of_month: 1,
  },
});
```

**Verification**:
- Free user gets 200 credits
- Pro user gets 1,500 credits
- Pro+ user gets 5,000 credits
- Pro Max user gets 25,000 credits

#### 2.4 Add Enterprise Tiers (Coming Soon)

**File**: `backend/prisma/seed.ts`

Add enterprise tier configurations with `coming_soon` status:

```typescript
const tierConfig = {
  // ... existing tiers ...

  enterprise_pro: {
    creditsPerMonth: 3500,
    priceCents: 3000,
    billingInterval: 'monthly',
    status: 'coming_soon',       // Mark as coming soon
    availableFrom: '2026-04-01', // Q2 2026
  },
  enterprise_pro_plus: {
    creditsPerMonth: 11000,
    priceCents: 9000,
    billingInterval: 'monthly',
    status: 'coming_soon',
    availableFrom: '2026-04-01',
  },
};
```

**Note**: Don't create subscriptions for enterprise tiers in seed, just document them in tierConfig.

---

## Implementation Plan

### Task 1: Schema Standardization (snake_case)

```bash
# Step 1: Update Prisma schema
# Edit: backend/prisma/schema.prisma
# - downloads: userAgent → user_agent, ipHash → ip_hash
# - feedbacks: userId → user_id
# - diagnostics: userId → user_id, filePath → file_path, fileSize → file_size

# Step 2: Generate Prisma client
cd backend
npx prisma generate

# Step 3: Create migration
npx prisma migrate dev --name standardize_legacy_branding_models_to_snake_case

# Step 4: Update seed file (Lines 1980-2089)
# Replace all camelCase field names with snake_case

# Step 5: Update branding controller
# Replace all model field access with snake_case

# Step 6: Reset database and verify
npm run db:reset

# Step 7: Run analysis script
node scripts/analyze-seed-naming.js

# Expected: Exit code 0 (no camelCase found)
```

### Task 2: Model Tier Verification

```bash
# Step 1: Verify tierConfig has all 6 tiers
grep -A 6 "const tierConfig" backend/prisma/seed.ts

# Step 2: Check if pro_plus exists
grep "pro_plus" backend/prisma/seed.ts

# Step 3: Verify credit allocations match Plan 189
# Free: 200, Pro: 1500, Pro+: 5000, Pro Max: 25000

# Step 4: Run seed and check models table
npm run seed
psql -d rephlo-dev -c "SELECT tier, COUNT(*) FROM models GROUP BY tier;"

# Expected output:
#  tier  | count
# -------+-------
#  free  |   4
#  pro   |   11
#  pro_max |  4
```

### Task 3: Create Verification Script

**File**: `backend/scripts/verify-tier-coverage.js`

```javascript
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTierCoverage() {
  console.log('🔍 Verifying Model Tier Coverage...\n');

  // Expected tiers from Plan 189
  const expectedTiers = {
    free: 200,
    pro: 1500,
    pro_plus: 5000,
    pro_max: 25000,
    enterprise_pro: 3500,
    enterprise_pro_plus: 11000,
  };

  // Check subscription tier config
  const subscriptions = await prisma.subscriptions.findMany({
    select: { tier: true, credits_per_month: true },
  });

  console.log('✅ Subscription Tier Configuration:\n');
  subscriptions.forEach(sub => {
    const expected = expectedTiers[sub.tier];
    const match = sub.credits_per_month === expected ? '✅' : '❌';
    console.log(`  ${match} ${sub.tier}: ${sub.credits_per_month} credits (expected: ${expected})`);
  });

  // Check model distribution
  const modelsByTier = await prisma.models.groupBy({
    by: ['minimum_tier'],
    _count: true,
  });

  console.log('\n📊 Model Distribution by Minimum Tier:\n');
  modelsByTier.forEach(({ minimum_tier, _count }) => {
    console.log(`  ${minimum_tier}: ${_count} models`);
  });

  // Check for pro_plus specific models
  const proPlusModels = await prisma.models.findMany({
    where: { minimum_tier: 'pro_plus' },
  });

  if (proPlusModels.length === 0) {
    console.log('\n⚠️  Warning: No Pro+ exclusive models found');
    console.log('   All Pro models are accessible to Pro+ (via minimum tier logic)');
  }

  await prisma.$disconnect();
}

verifyTierCoverage();
```

---

## Verification Checklist

### Part 1: Schema Standardization
- [ ] All 3 legacy models updated in Prisma schema
- [ ] Migration created and applied
- [ ] Seed file updated (8 occurrences)
- [ ] Branding controller updated
- [ ] PRISMA_MODEL_MAPPING.md updated
- [ ] Analysis script shows exit code 0
- [ ] All tests pass
- [ ] Branding endpoints tested manually

### Part 2: Tier Coverage
- [ ] tierConfig includes all 6 tiers
- [ ] pro_plus tier exists with 5,000 credits
- [ ] enterprise tiers marked as coming_soon
- [ ] Model distribution matches Plan 189
- [ ] Free tier has 4 basic models
- [ ] Pro tier has 11 models
- [ ] Pro Max has all 19 models
- [ ] Credit allocations match exactly
- [ ] Verification script passes

---

## Expected Outcomes

### After Schema Standardization
1. ✅ **100% snake_case** - All Prisma models use consistent naming
2. ✅ **Analysis script passes** - Exit code 0, no camelCase found
3. ✅ **No breaking changes** - Branding website still works
4. ✅ **Clean codebase** - Ready for production launch

### After Tier Verification
1. ✅ **6 tiers defined** - Free, Pro, Pro+, Pro Max, Ent Pro, Ent Pro+
2. ✅ **Correct credit provisioning** - Matches Plan 189 exactly
3. ✅ **Model access control** - Tiered model access working
4. ✅ **Coming soon tiers** - Enterprise tiers documented but not active

---

## Rollback Plan

If issues arise during migration:

```bash
# Rollback migration
cd backend
npx prisma migrate resolve --rolled-back <migration_name>

# Restore previous schema
git checkout HEAD -- prisma/schema.prisma
git checkout HEAD -- prisma/seed.ts
git checkout HEAD -- src/controllers/branding.controller.ts

# Regenerate Prisma client
npx prisma generate

# Reset database
npm run db:reset
```

---

## Next Steps

1. **Immediate**: Get approval for this plan
2. **Day 1**: Execute schema standardization (1.5 hours)
3. **Day 1**: Verify tier coverage (30 min)
4. **Day 1**: Create verification script (30 min)
5. **Day 1**: Test all endpoints (30 min)
6. **Day 2**: Document changes in work log

**Total Time**: ~3 hours

---

## Success Criteria

- ✅ Analysis script: `node scripts/analyze-seed-naming.js` returns exit code 0
- ✅ Verification script: All tier credit allocations match Plan 189
- ✅ Build succeeds: `npm run build` completes without errors
- ✅ Seed succeeds: `npm run seed` completes without errors
- ✅ All 19 models seeded correctly
- ✅ Branding endpoints return 200 OK
- ✅ No TypeScript compilation errors

---

**Ready for Implementation**: Yes
**Estimated Risk**: Low (system not launched, can refresh data)
**Recommended Start**: Immediately
