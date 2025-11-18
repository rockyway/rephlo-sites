# Prisma Naming Standardization Plan

**Date:** 2025-11-15
**Status:** Approved - Ready for Implementation
**Priority:** CRITICAL (Blocks Launch)
**Scope:** 99 backend files with Prisma client naming mismatches

---

## Executive Summary

This plan addresses a systemic Prisma client naming mismatch that prevents the backend server from starting. The issue was exposed during the pricing tier implementation when regenerating the Prisma client.

**Problem:** Service layer code uses incorrect Prisma client naming (camelCase singular) while the schema uses snake_case plural model names.

**Root Cause:** The Prisma schema has ALWAYS used lowercase snake_case plural names (`users`, `user_preferences`, `models`), but 99+ service files reference them with camelCase singular names (`user`, `userPreference`, `model`). The backend worked previously because the Prisma client in `node_modules/.prisma/client` was outdated and hadn't been regenerated.

**Impact:**
- Backend server cannot start (TypeScript compilation errors)
- Zero runtime errors before, but latent type safety issues
- Blocks all development and testing
- **CRITICAL for launch** - must be fixed before going live

**Solution:** Systematically update all 99 files to use correct Prisma naming while maintaining DTO transformation layer for API responses (per API standards doc 156).

---

## Current State Analysis

### Root Cause Investigation

**Timeline:**
1. **Initial Setup**: Prisma schema was created with lowercase snake_case plural model names (`users`, `user_preferences`, `models`)
2. **Service Development**: Services were written using camelCase singular references (`user`, `userPreference`, `model`)
3. **Why It Worked**: Old Prisma client in `node_modules/.prisma/client` had outdated type definitions
4. **What Changed**: Running `npx prisma generate` during pricing tier update (2025-11-15) regenerated client from current schema
5. **Result**: TypeScript compilation now fails due to type mismatches

**Evidence:**
```typescript
// Prisma Schema (ALWAYS been this way)
model users {
  id String @id @db.Uuid
  email String @unique
  credit_balance Int
  created_at DateTime
  // ...
}

// Service Code (INCORRECT)
const user = await this.prisma.user.findUnique({  // ❌ user should be users
  where: { id },
});
```

### Scope Assessment

**Files Affected: 99 total**

Breakdown by category:
- **Services**: 50 files (`backend/src/services/**/*.service.ts`)
- **Controllers**: 15 files (`backend/src/controllers/**/*.controller.ts`)
- **Middleware**: 2 files (auth.middleware.ts, require-mfa.middleware.ts)
- **Routes**: 2 files (index.ts, mfa.routes.ts)
- **Tests**: 20 files (`backend/src/__tests__/**/*.test.ts`)
- **Utilities**: 5 files (typeMappers.ts, tier-access.ts, etc.)
- **Types/Interfaces**: 5 files (interfaces, type definitions)

**Prisma Models Affected:**
All models in the schema use snake_case plural:
- `users` (not `user`)
- `user_preferences` (not `userPreference`)
- `models` (not `model`)
- `subscriptions` (not `subscription`)
- `credits` (not `credit`)
- `usage_history` (not `usageHistory`)
- `oauth_clients` (not `oauthClient`)
- `audit_logs` (not `auditLog`)
- `stripe_webhooks` (not `stripeWebhook`)
- `pricing_configs` (not `pricingConfig`)
- `coupons`, `campaigns`, `feedback`, `downloads`, etc.

**Common Errors Encountered:**

```typescript
// Error 1: Model name mismatch
error TS2551: Property 'user' does not exist on type 'PrismaClient'. Did you mean 'users'?

// Error 2: Type import mismatch
error TS2724: '"@prisma/client"' has no exported member named 'User'. Did you mean 'users'?

// Error 3: Field name mismatch
error TS2551: Property 'creditBalance' does not exist on type 'users'. Did you mean 'credit_balance'?
```

### Partially Fixed Files

**`backend/src/services/auth.service.ts`** - ✅ FIXED
- Changed `User` → `users` in imports
- Changed `this.prisma.user.` → `this.prisma.users.`
- Changed all field references to snake_case (e.g., `user.is_active`, `user.password_hash`)
- Added required fields (`id`, `updated_at`) in createUser method

**Remaining Files: 98** - ❌ NOT FIXED

---

## Standards to Follow

All fixes MUST comply with **docs/reference/156-api-standards.md**:

### Key Standards

1. **Database Layer (Prisma)**: snake_case plural model names and fields
   ```typescript
   this.prisma.users.findUnique({
     select: {
       credit_balance: true,  // ✅ snake_case
       created_at: true,      // ✅ snake_case
     }
   });
   ```

2. **API Layer (Response)**: camelCase field names
   ```json
   {
     "creditBalance": 10000,
     "createdAt": "2025-01-15T10:30:00Z"
   }
   ```

3. **DTO Transformation Layer**: Required bridge between database and API
   ```typescript
   class UserDTO {
     static fromPrisma(dbUser: users): UserDTO {
       return {
         id: dbUser.id,
         creditBalance: dbUser.credit_balance,  // Transform here
         createdAt: dbUser.created_at,
       };
     }
   }
   ```

4. **Service Layer**: Must use correct Prisma names AND transform results
   ```typescript
   // ✅ CORRECT
   async getUser(id: string): Promise<UserDTO> {
     const dbUser = await this.prisma.users.findUnique({ where: { id } });
     return UserDTO.fromPrisma(dbUser);
   }

   // ❌ INCORRECT
   async getUser(id: string) {
     return await this.prisma.user.findUnique({ where: { id } });
   }
   ```

---

## Implementation Strategy

### Phase 1: Model Name Corrections (Prisma Client Access)

**Goal**: Fix all `this.prisma.{model}` references to use correct plural snake_case names

**Pattern:**
```typescript
// Before:
this.prisma.user.findUnique()
this.prisma.subscription.findMany()
this.prisma.model.update()

// After:
this.prisma.users.findUnique()
this.prisma.subscriptions.findMany()
this.prisma.models.update()
```

**Tools:**
- Global search/replace with regex
- TypeScript compiler as validator

### Phase 2: Type Import Corrections

**Goal**: Fix all Prisma type imports to use correct names

**Pattern:**
```typescript
// Before:
import { User, Subscription, Model } from '@prisma/client';

// After:
import { users, subscriptions, models } from '@prisma/client';
```

**Note**: Use lowercase plural type names as they match the model names

### Phase 3: Field Access Corrections

**Goal**: Update all field accesses to use snake_case

**Pattern:**
```typescript
// Before:
user.creditBalance
user.createdAt
user.lastLoginAt
user.isActive

// After:
user.credit_balance
user.created_at
user.last_login_at
user.is_active
```

### Phase 4: DTO Transformation Layer

**Goal**: Ensure all service returns are transformed via DTOs

**Pattern:**
```typescript
// Before (WRONG):
async getUser(id: string) {
  return await this.prisma.users.findUnique({ where: { id } });
}

// After (CORRECT):
async getUser(id: string): Promise<UserDTO> {
  const dbUser = await this.prisma.users.findUnique({ where: { id } });
  if (!dbUser) throw new Error('User not found');
  return UserDTO.fromPrisma(dbUser);
}
```

**Existing DTOs** (in `backend/src/utils/typeMappers.ts`):
- ✅ `mapUserToApiType()`
- ✅ `mapCouponToApiType()`
- ✅ `mapSubscriptionToApiType()`
- Need to create: More formal DTO classes for other models

---

## Batch Implementation Plan

### Batch 1: Core Services (Priority: CRITICAL)

**Files: 8**
- `auth.service.ts` - ✅ DONE
- `user.service.ts`
- `user-management.service.ts`
- `subscription.service.ts`
- `subscription-management.service.ts`
- `credit.service.ts`
- `credit-management.service.ts`
- `model.service.ts`

**Why Critical**: These are foundational services used by almost all other services

**Estimate**: 3 hours

### Batch 2: Admin Services (Priority: HIGH)

**Files: 12**
- `admin-user-detail.service.ts`
- `admin-analytics.service.ts`
- `admin-profitability.service.ts`
- `admin/model-tier-admin.service.ts`
- `user-suspension.service.ts`
- `audit-log.service.ts`
- `approval-workflow.service.ts`
- `platform-analytics.service.ts`
- `revenue-analytics.service.ts`
- `analytics.service.ts`
- `coupon-analytics.service.ts`
- `settings.service.ts`

**Estimate**: 4 hours

### Batch 3: Billing & Credits (Priority: HIGH)

**Files: 10**
- `billing-payments.service.ts`
- `stripe.service.ts`
- `proration.service.ts`
- `checkout-integration.service.ts`
- `credit-deduction.service.ts`
- `cost-calculation.service.ts`
- `pricing-config.service.ts`
- `token-tracking.service.ts`
- `usage.service.ts`
- `webhook.service.ts`

**Estimate**: 3 hours

### Batch 4: Coupons & Campaigns (Priority: MEDIUM)

**Files: 6**
- `coupon-validation.service.ts`
- `coupon-redemption.service.ts`
- `campaign-management.service.ts`
- `fraud-detection.service.ts`
- `ip-whitelist.service.ts`
- `version-upgrade.service.ts`

**Estimate**: 2 hours

### Batch 5: Licenses & Migrations (Priority: MEDIUM)

**Files: 3**
- `license-management.service.ts`
- `device-activation-management.service.ts`
- `migration.service.ts`

**Estimate**: 1.5 hours

### Batch 6: Auth & Permissions (Priority: HIGH)

**Files: 4**
- `role-cache.service.ts`
- `permission-cache.service.ts`
- `middleware/auth.middleware.ts`
- `middleware/require-mfa.middleware.ts`

**Estimate**: 1.5 hours

### Batch 7: Controllers (Priority: HIGH)

**Files: 15**
- `models.controller.ts`
- `admin.controller.ts`
- `auth-management.controller.ts`
- `branding.controller.ts`
- `subscriptions.controller.ts`
- `campaign.controller.ts`
- `coupon.controller.ts`
- `device-activation-management.controller.ts`
- `fraud-detection.controller.ts`
- `social-auth.controller.ts`
- All other controllers

**Note**: Controllers should mostly call service methods, so changes are minimal (mostly type signatures)

**Estimate**: 3 hours

### Batch 8: Utilities & Types (Priority: MEDIUM)

**Files: 7**
- `utils/typeMappers.ts` (review/enhance DTOs)
- `utils/tier-access.ts`
- `types/admin-validation.ts`
- `types/coupon-validation.ts`
- `interfaces/types.ts`
- `interfaces/services/*.interface.ts`
- `config/database.ts`

**Estimate**: 2 hours

### Batch 9: Tests (Priority: HIGH)

**Files: 20**
- All unit tests in `__tests__/unit/`
- All integration tests in `__tests__/integration/`
- All e2e tests in `__tests__/e2e/`
- Mock files in `__tests__/mocks/`

**Note**: Tests are critical for validation

**Estimate**: 4 hours

### Batch 10: Routes & Container (Priority: MEDIUM)

**Files: 4**
- `routes/index.ts`
- `routes/mfa.routes.ts`
- `container.ts`
- `server.ts`

**Estimate**: 1 hour

---

## Detailed Fix Pattern

### Step-by-Step Fix for Each Service File

**Example: user.service.ts**

#### Step 1: Fix Import Statement
```typescript
// Before:
import { PrismaClient, User, UserPreference } from '@prisma/client';

// After:
import { PrismaClient, users, user_preferences } from '@prisma/client';
```

#### Step 2: Fix Type Signatures
```typescript
// Before:
async findById(id: string): Promise<User | null> {

// After:
async findById(id: string): Promise<users | null> {
```

#### Step 3: Fix Prisma Client Access
```typescript
// Before:
return await this.prisma.user.findUnique({ where: { id } });

// After:
return await this.prisma.users.findUnique({ where: { id } });
```

#### Step 4: Fix Field Access
```typescript
// Before:
if (!user.isActive) return null;
const balance = user.creditBalance;

// After:
if (!user.is_active) return null;
const balance = user.credit_balance;
```

#### Step 5: Add DTO Transformation
```typescript
// Before (direct return):
async getUser(id: string): Promise<User> {
  return await this.prisma.users.findUnique({ where: { id } });
}

// After (with DTO):
async getUser(id: string): Promise<UserDTO> {
  const dbUser = await this.prisma.users.findUnique({ where: { id } });
  if (!dbUser) throw new Error('User not found');
  return UserDTO.fromPrisma(dbUser);
}
```

### Common Field Name Mappings

| Database Field (snake_case) | Code Reference (was wrong) | Correct Reference |
|----------------------------|---------------------------|------------------|
| `credit_balance` | `user.creditBalance` | `user.credit_balance` |
| `created_at` | `user.createdAt` | `user.created_at` |
| `updated_at` | `user.updatedAt` | `user.updated_at` |
| `last_login_at` | `user.lastLoginAt` | `user.last_login_at` |
| `is_active` | `user.isActive` | `user.is_active` |
| `email_verified` | `user.emailVerified` | `user.email_verified` |
| `password_hash` | `user.passwordHash` | `user.password_hash` |
| `first_name` | `user.firstName` | `user.first_name` |
| `last_name` | `user.lastName` | `user.last_name` |
| `profile_picture_url` | `user.profilePictureUrl` | `user.profile_picture_url` |
| `subscription_tier` | `subscription.tier` | `subscription.subscription_tier` |
| `billing_period_start` | `subscription.billingPeriodStart` | `subscription.billing_period_start` |
| `billing_period_end` | `subscription.billingPeriodEnd` | `subscription.billing_period_end` |

---

## Testing Strategy

### Build Validation (Per Batch)

After each batch:
```bash
cd backend
npm run build
```

**Success Criteria**: 0 TypeScript compilation errors

### Unit Testing

For each updated service:
1. Run existing unit tests
2. Verify DTO transformations
3. Add new tests if coverage drops

```bash
npm run test:unit -- user.service.test.ts
```

### Integration Testing

After completing all batches:
```bash
npm run test:integration
```

**Success Criteria**: All integration tests pass

### Server Startup Test

```bash
npm run dev:all
```

**Success Criteria**:
- Backend starts on port 7150 ✅
- Frontend starts on port 7052 ✅
- Identity Provider starts on port 7151 ✅
- No runtime errors ✅

### Manual API Testing

Use Postman or curl to test critical endpoints:
- `POST /auth/login` (auth.service)
- `GET /v1/users/:id` (user.service)
- `GET /v1/models` (model.service)
- `GET /v1/credits/balance` (credit.service)

**Verify**: All responses use camelCase field names (per API standards)

---

## Risk Mitigation

### Risk 1: Breaking API Responses

**Risk**: Accidentally changing API response format (snake_case → camelCase)

**Mitigation**:
- Only fix internal service code (database layer)
- Ensure DTO transformation layer is in place
- Integration tests validate response structure
- API standards doc 156 enforces camelCase responses

### Risk 2: Missing Field Mappings

**Risk**: Some field names might be missed during bulk updates

**Mitigation**:
- TypeScript compiler catches missing fields at build time
- Run builds after each batch
- Unit tests catch runtime issues

### Risk 3: Test Failures

**Risk**: Updated services might break existing tests

**Mitigation**:
- Update tests in Batch 9 (dedicated test batch)
- Run test suite after each major batch
- Mock objects updated to match new Prisma types

### Risk 4: DTO Performance Overhead

**Risk**: Adding DTO transformations might slow down API responses

**Mitigation**:
- DTOs are lightweight (simple object mapping)
- No database queries in DTOs
- Performance testing after implementation
- Benchmark critical endpoints

### Risk 5: Large Scope (99 Files)

**Risk**: Overwhelming task might introduce errors

**Mitigation**:
- Break into 10 manageable batches
- Incremental validation (build + test after each batch)
- Automated search/replace reduces human error
- Clear patterns documented for consistency

---

## Timeline Estimate

**Total Effort**: ~25-30 hours

**Per Batch**:
- Batch 1 (Core Services): 3 hours
- Batch 2 (Admin Services): 4 hours
- Batch 3 (Billing & Credits): 3 hours
- Batch 4 (Coupons & Campaigns): 2 hours
- Batch 5 (Licenses & Migrations): 1.5 hours
- Batch 6 (Auth & Permissions): 1.5 hours
- Batch 7 (Controllers): 3 hours
- Batch 8 (Utilities & Types): 2 hours
- Batch 9 (Tests): 4 hours
- Batch 10 (Routes & Container): 1 hour

**Testing & Validation**: 3 hours
- Build validation per batch: 1 hour
- Integration testing: 1 hour
- Manual API testing: 1 hour

**Documentation**: 2 hours
- Update progress document
- Create completion report
- Update API documentation if needed

**Parallelization**: With specialized agents, batches 1-8 can run in parallel, reducing timeline to ~12-15 hours.

---

## Agent Orchestration Strategy

### Master Agent (Current Context)
- Coordinates all specialized agents
- Tracks progress with TodoWrite
- Validates builds between batches
- Consolidates results
- Creates completion report

### Specialized Agent: api-backend-implementer

**Responsibilities**:
- Update all service files (Batches 1-6, 8)
- Update all controller files (Batch 7)
- Update utilities and types
- Ensure DTO transformation layer
- Run builds after each batch

**Batches Assigned**: 1-8 (sequential execution recommended)

### Specialized Agent: testing-qa-specialist

**Responsibilities**:
- Update all test files (Batch 9)
- Run unit tests after service updates
- Run integration tests after all updates
- Validate API response structures
- Create test report

**Batches Assigned**: 9 (after Batches 1-8 complete)

### Validation Workflow

```
1. Batch 1 (Core Services) → Build → Pass? → Continue
2. Batch 2 (Admin Services) → Build → Pass? → Continue
3. Batch 3 (Billing & Credits) → Build → Pass? → Continue
4. Batch 4 (Coupons & Campaigns) → Build → Pass? → Continue
5. Batch 5 (Licenses & Migrations) → Build → Pass? → Continue
6. Batch 6 (Auth & Permissions) → Build → Pass? → Continue
7. Batch 7 (Controllers) → Build → Pass? → Continue
8. Batch 8 (Utilities & Types) → Build → Pass? → Continue
9. Batch 9 (Tests) → Test Suite → Pass? → Continue
10. Batch 10 (Routes & Container) → Build → Pass? → Complete

Final Validation:
- npm run dev:all (all services start successfully)
- Integration tests pass
- Manual API testing
- QA Agent verification
```

---

## Success Criteria

**Definition of Done**:

1. ✅ All 99 files updated with correct Prisma naming
2. ✅ Backend builds with 0 TypeScript errors: `cd backend && npm run build`
3. ✅ All services use snake_case for Prisma access: `this.prisma.users.*`
4. ✅ All services use snake_case for field access: `user.credit_balance`
5. ✅ DTO transformation layer in place for all API responses
6. ✅ API responses use camelCase (validated by integration tests)
7. ✅ All unit tests pass: `npm run test:unit`
8. ✅ All integration tests pass: `npm run test:integration`
9. ✅ Server starts successfully: `npm run dev:all`
10. ✅ No runtime errors in dev server logs
11. ✅ Manual API testing confirms camelCase responses
12. ✅ QA Agent validates implementation against API standards (doc 156)

---

## Migration Checklist (Per File)

### For Service Files

- [ ] **Import Statement**
  - [ ] Replace `User` → `users`
  - [ ] Replace `Subscription` → `subscriptions`
  - [ ] Replace `Model` → `models`
  - [ ] (All other model types)

- [ ] **Prisma Client Access**
  - [ ] Replace `this.prisma.user.` → `this.prisma.users.`
  - [ ] Replace `this.prisma.subscription.` → `this.prisma.subscriptions.`
  - [ ] Replace `this.prisma.model.` → `this.prisma.models.`

- [ ] **Field Access**
  - [ ] Replace `user.creditBalance` → `user.credit_balance`
  - [ ] Replace `user.createdAt` → `user.created_at`
  - [ ] (All camelCase fields → snake_case)

- [ ] **Return Type Signatures**
  - [ ] Update from `Promise<User>` → `Promise<users>`
  - [ ] Better: Update to `Promise<UserDTO>` with transformation

- [ ] **DTO Transformation**
  - [ ] Add `UserDTO.fromPrisma(dbUser)` before returning
  - [ ] Never return raw Prisma results directly

- [ ] **Build Validation**
  - [ ] Run `npm run build` - 0 errors expected

### For Controller Files

- [ ] **Type Imports**
  - [ ] Update Prisma type imports if used

- [ ] **Service Method Calls**
  - [ ] Update to expect DTO types (not Prisma types)

- [ ] **Response Structure**
  - [ ] Verify responses use camelCase (already should be via DTOs)

### For Test Files

- [ ] **Mock Objects**
  - [ ] Update mock Prisma types (User → users)
  - [ ] Update mock field names (camelCase → snake_case)

- [ ] **Type Assertions**
  - [ ] Update `as User` → `as users`

- [ ] **Test Data**
  - [ ] Update fixture objects to use snake_case fields

---

## Deliverables

### 1. Updated Code

- 99 backend files with correct Prisma naming
- DTO transformation layer for all services
- Updated TypeScript type definitions

### 2. Documentation

- This plan document: `docs/plan/190-prisma-naming-standardization-plan.md`
- Completion report: `docs/progress/190-prisma-naming-standardization-complete.md`
- Updated API standards if needed

### 3. Testing Evidence

- Backend build log (0 errors)
- Unit test results (all passing)
- Integration test results (all passing)
- Server startup logs (all services running)
- Manual API test results (camelCase responses confirmed)

### 4. QA Validation

- QA Agent verification report
- Compliance check against doc 156 standards
- Pre-launch readiness confirmation

---

## References

- **API Standards**: `docs/reference/156-api-standards.md`
- **DTO Pattern Guide**: `docs/reference/155-dto-pattern-guide.md`
- **Prisma Schema**: `backend/prisma/schema.prisma`
- **Type Mappers**: `backend/src/utils/typeMappers.ts`
- **Related Issue**: Exposed during pricing tier implementation (doc 189)

---

## Approval & Next Steps

**Status**: ✅ Approved for Implementation

**Next Actions**:
1. Create todos in TodoWrite tool
2. Start with Batch 1 (Core Services) - CRITICAL priority
3. Validate build after each batch
4. Proceed sequentially through all batches
5. Run comprehensive testing after Batch 9
6. QA validation before marking complete
7. Create completion report

**Estimated Completion**: 12-15 hours with parallel agent execution

---

**Document Owner**: Claude Code
**Created**: 2025-11-15
**Priority**: CRITICAL (Blocks Launch)
**Compliance**: Mandatory for production deployment
