# Dedicated API - Credits & User Endpoints Implementation Plan

**Document:** docs/plan/101-dedicated-api-implementation-plan.md
**Created:** 2025-11-06
**Status:** Implementation Plan
**Priority:** P0 (Critical for Desktop Application)
**Related:**
- docs/plan/100-dedicated-api-credits-user-endpoints.md (API Specification)
- docs/plan/073-dedicated-api-backend-specification.md (Original Backend Spec)

## Executive Summary

This document provides a detailed implementation plan for the Credits & User Information API endpoints required by the desktop application. The plan is organized to leverage our newly completed DI refactoring architecture and delegate implementation to specialized agents.

---

## Current State Analysis

### Existing Infrastructure ✅

**DI Architecture (Phases 1-7 Complete):**
- ✅ TSyringe DI container fully implemented
- ✅ All services use dependency injection
- ✅ Controllers refactored with `@injectable()` decorator
- ✅ Middleware uses container resolution
- ✅ Graceful shutdown and resource cleanup
- ✅ Testing infrastructure with mocks

**Existing Endpoints:**
- ✅ `GET /v1/users/me` - Returns basic user profile
- ✅ `GET /v1/credits/me` - Returns basic credit info
- ✅ `POST /oauth/token` - Standard OAuth token endpoint
- ✅ `GET /v1/models` - Lists available models

### Gap Analysis

| Requirement (from Spec 100) | Current State | Required Change |
|----------------------------|---------------|-----------------|
| Free credits breakdown | ❌ Not separated | Enhance response schema |
| Monthly credit allocation | ❌ Field not returned | Add to CreditService |
| Credit reset date | ❌ Not calculated | Add calculation logic |
| Days until reset | ❌ Not calculated | Add computed field |
| Pro/purchased credits breakdown | ❌ Not tracked separately | Database schema + logic |
| Subscription tier in user profile | ❌ Not included | Add to UserController |
| Subscription status | ❌ Not included | Add to UserController |
| Current period start/end | ❌ Not included | Add to UserController |
| User preferences (model, notifications) | ✅ Exists | Reformat response |
| Enhanced token response | ❌ Not implemented | Add to OAuth controller |
| Enhanced refresh token | ❌ Not implemented | Add to OAuth controller |

---

## Implementation Strategy

### Approach

**Follow DI Architecture Patterns:**
- Use existing DI container and interfaces
- Create/enhance services for business logic
- Update controllers for HTTP handling
- Maintain backward compatibility where needed

**Delegation to Specialized Agents:**
1. **Database Schema Agent** - Update credit/subscription schema
2. **Backend API Implementer** - Implement new endpoints
3. **Testing QA Agent** - Create comprehensive tests

### Database Schema Changes

**Credits Table Enhancement:**

```sql
-- Add new columns to existing credits table
ALTER TABLE credits ADD COLUMN credit_type VARCHAR(10) DEFAULT 'free';
  -- Values: 'free' | 'pro'

ALTER TABLE credits ADD COLUMN monthly_allocation INTEGER DEFAULT 2000;
  -- Free tier: 2000, Pro tier: configurable

ALTER TABLE credits ADD COLUMN reset_day_of_month INTEGER DEFAULT 1;
  -- Day of month when credits reset (1-31)

-- Add index for performance
CREATE INDEX idx_credits_user_type_current
ON credits(user_id, credit_type, is_current);
```

**Subscriptions Table Enhancement:**

```sql
-- Ensure subscription table has all required fields
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free';
  -- Values: 'free' | 'pro' | 'enterprise'

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
  -- Values: 'active' | 'cancelled' | 'expired' | 'trialing'

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
```

**User Preferences Table (New):**

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_model VARCHAR(100),
  email_notifications BOOLEAN DEFAULT TRUE,
  usage_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences(user_id);
```

---

## Implementation Tasks

### Phase 1: Database Schema Updates (1 day)

**Agent:** db-schema-architect

**Tasks:**
1. Review current Prisma schema
2. Add new fields to Credit model
3. Add new fields to Subscription model
4. Create UserPreferences model
5. Generate and run migration
6. Update seed data for testing

**Deliverables:**
- Updated `schema.prisma` file
- Migration file
- Updated seed script

**Acceptance Criteria:**
- ✅ All new fields added to database
- ✅ Migration runs without errors
- ✅ Seed data includes test cases for free/pro credits
- ✅ Indexes created for performance

---

### Phase 2: Service Layer Updates (2 days)

**Agent:** api-backend-implementer

**Task 2.1: Enhance ICreditService Interface**

**File:** `backend/src/interfaces/services/credit.interface.ts`

**Add methods:**
```typescript
export interface ICreditService {
  // ... existing methods ...

  // New methods for enhanced credits endpoint
  getFreeCreditsBreakdown(userId: string): Promise<FreeCreditsInfo>;
  getProCreditsBreakdown(userId: string): Promise<ProCreditsInfo>;
  getTotalAvailableCredits(userId: string): Promise<number>;
  calculateResetDate(userId: string): Promise<Date>;
  calculateDaysUntilReset(resetDate: Date): number;
}

export interface FreeCreditsInfo {
  remaining: number;
  monthlyAllocation: number;
  used: number;
  resetDate: Date;
  daysUntilReset: number;
}

export interface ProCreditsInfo {
  remaining: number;
  purchasedTotal: number;
  lifetimeUsed: number;
}
```

**Task 2.2: Enhance CreditService Implementation**

**File:** `backend/src/services/credit.service.ts`

**Implementation:**
```typescript
@injectable()
export class CreditService implements ICreditService {
  // ... existing implementation ...

  async getFreeCreditsBreakdown(userId: string): Promise<FreeCreditsInfo> {
    // Query free credits (credit_type='free', is_current=true)
    const freeCredit = await this.prisma.credit.findFirst({
      where: {
        userId,
        creditType: 'free',
        isCurrent: true
      }
    });

    if (!freeCredit) {
      return {
        remaining: 0,
        monthlyAllocation: 2000,
        used: 0,
        resetDate: this.calculateNextResetDate(1),
        daysUntilReset: this.calculateDaysUntilReset(this.calculateNextResetDate(1))
      };
    }

    return {
      remaining: freeCredit.totalCredits - freeCredit.usedCredits,
      monthlyAllocation: freeCredit.monthlyAllocation,
      used: freeCredit.usedCredits,
      resetDate: freeCredit.billingPeriodEnd,
      daysUntilReset: this.calculateDaysUntilReset(freeCredit.billingPeriodEnd)
    };
  }

  async getProCreditsBreakdown(userId: string): Promise<ProCreditsInfo> {
    // Aggregate all pro credits (credit_type='pro')
    const proCredits = await this.prisma.credit.findMany({
      where: {
        userId,
        creditType: 'pro'
      }
    });

    const purchasedTotal = proCredits.reduce((sum, c) => sum + c.totalCredits, 0);
    const lifetimeUsed = proCredits.reduce((sum, c) => sum + c.usedCredits, 0);
    const remaining = purchasedTotal - lifetimeUsed;

    return {
      remaining,
      purchasedTotal,
      lifetimeUsed
    };
  }

  async getTotalAvailableCredits(userId: string): Promise<number> {
    const free = await this.getFreeCreditsBreakdown(userId);
    const pro = await this.getProCreditsBreakdown(userId);
    return free.remaining + pro.remaining;
  }

  calculateDaysUntilReset(resetDate: Date): number {
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private calculateNextResetDate(resetDayOfMonth: number): Date {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    return new Date(year, month, resetDayOfMonth, 0, 0, 0, 0);
  }
}
```

**Task 2.3: Enhance IUserService Interface**

**File:** `backend/src/interfaces/services/user.interface.ts`

**Add method:**
```typescript
export interface IUserService {
  // ... existing methods ...

  getUserWithSubscription(userId: string): Promise<UserWithSubscription | null>;
}

export interface UserWithSubscription {
  userId: string;
  email: string;
  displayName: string;
  subscription: {
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired' | 'trialing';
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  };
  preferences: {
    defaultModel: string | null;
    emailNotifications: boolean;
    usageAlerts: boolean;
  };
  accountCreatedAt: Date;
  lastLoginAt: Date | null;
}
```

**Deliverables:**
- Enhanced ICreditService interface
- Enhanced CreditService implementation
- Enhanced IUserService interface
- Enhanced UserService implementation
- Unit tests for all new methods

**Acceptance Criteria:**
- ✅ Free credits breakdown calculated correctly
- ✅ Pro credits breakdown calculated correctly
- ✅ Total available credits = free + pro
- ✅ Reset date calculated based on billing cycle
- ✅ Days until reset calculated correctly
- ✅ All unit tests pass

---

### Phase 3: Controller Updates (2 days)

**Agent:** api-backend-implementer

**Task 3.1: Create Enhanced Credits Endpoint**

**Option A: Update existing `/v1/credits/me`**
**Option B: Create new `/api/user/credits` (Recommended for compatibility)**

**File:** `backend/src/controllers/credits.controller.ts`

**Add method:**
```typescript
/**
 * GET /api/user/credits
 * Get detailed credit usage information
 *
 * Response 200:
 * {
 *   "freeCredits": {
 *     "remaining": 1500,
 *     "monthlyAllocation": 2000,
 *     "used": 500,
 *     "resetDate": "2025-12-01T00:00:00Z",
 *     "daysUntilReset": 25
 *   },
 *   "proCredits": {
 *     "remaining": 0,
 *     "purchasedTotal": 0,
 *     "lifetimeUsed": 0
 *   },
 *   "totalAvailable": 1500,
 *   "lastUpdated": "2025-11-06T14:30:00Z"
 * }
 */
async getDetailedCredits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  logger.info('CreditsController: Getting detailed credits', { userId });

  const [freeCredits, proCredits] = await Promise.all([
    this.creditService.getFreeCreditsBreakdown(userId),
    this.creditService.getProCreditsBreakdown(userId)
  ]);

  const totalAvailable = await this.creditService.getTotalAvailableCredits(userId);

  const response = {
    freeCredits: {
      remaining: freeCredits.remaining,
      monthlyAllocation: freeCredits.monthlyAllocation,
      used: freeCredits.used,
      resetDate: freeCredits.resetDate.toISOString(),
      daysUntilReset: freeCredits.daysUntilReset
    },
    proCredits: {
      remaining: proCredits.remaining,
      purchasedTotal: proCredits.purchasedTotal,
      lifetimeUsed: proCredits.lifetimeUsed
    },
    totalAvailable,
    lastUpdated: new Date().toISOString()
  };

  logger.info('CreditsController: Detailed credits retrieved', {
    userId,
    totalAvailable,
    freeRemaining: freeCredits.remaining,
    proRemaining: proCredits.remaining
  });

  res.status(200).json(response);
}
```

**Task 3.2: Create Enhanced User Profile Endpoint**

**File:** `backend/src/controllers/users.controller.ts`

**Add method:**
```typescript
/**
 * GET /api/user/profile
 * Get authenticated user's profile and account information
 *
 * Response 200:
 * {
 *   "userId": "usr_abc123xyz",
 *   "email": "user@example.com",
 *   "displayName": "John Doe",
 *   "subscription": {
 *     "tier": "pro",
 *     "status": "active",
 *     "currentPeriodStart": "2025-11-01T00:00:00Z",
 *     "currentPeriodEnd": "2025-12-01T00:00:00Z",
 *     "cancelAtPeriodEnd": false
 *   },
 *   "preferences": {
 *     "defaultModel": "gpt-5",
 *     "emailNotifications": true,
 *     "usageAlerts": true
 *   },
 *   "accountCreatedAt": "2024-01-15T10:30:00Z",
 *   "lastLoginAt": "2025-11-06T08:00:00Z"
 * }
 */
async getUserProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  logger.info('UsersController: Getting user profile', { userId });

  const userProfile = await this.userService.getUserWithSubscription(userId);

  if (!userProfile) {
    throw notFoundError('User not found');
  }

  const response = {
    userId: userProfile.userId,
    email: userProfile.email,
    displayName: userProfile.displayName,
    subscription: {
      tier: userProfile.subscription.tier,
      status: userProfile.subscription.status,
      currentPeriodStart: userProfile.subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: userProfile.subscription.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: userProfile.subscription.cancelAtPeriodEnd
    },
    preferences: userProfile.preferences,
    accountCreatedAt: userProfile.accountCreatedAt.toISOString(),
    lastLoginAt: userProfile.lastLoginAt?.toISOString() || null
  };

  logger.info('UsersController: User profile retrieved', { userId });

  res.status(200).json(response);
}
```

**Deliverables:**
- Enhanced CreditsController with getDetailedCredits method
- Enhanced UsersController with getUserProfile method
- Integration tests for both endpoints

**Acceptance Criteria:**
- ✅ Detailed credits endpoint returns correct schema
- ✅ User profile endpoint returns correct schema
- ✅ All fields match specification
- ✅ Error handling for missing users/credits
- ✅ Logging includes userId (not PII)

---

### Phase 4: OAuth Enhancement (2 days)

**Agent:** oidc-auth-implementer

**Task 4.1: Enhance Token Endpoint**

**File:** `backend/src/routes/oauth.routes.ts` or OAuth controller

**Add support for `include_user_data` parameter:**

```typescript
/**
 * POST /oauth/token
 * Enhanced with optional user data
 */
router.post('/token', asyncHandler(async (req, res) => {
  const { grant_type, include_user_data } = req.body;

  // Standard token exchange
  const tokenResponse = await oidcProvider.token(req, res);

  // If include_user_data requested, fetch and append
  if (include_user_data === 'true' && tokenResponse.access_token) {
    const userId = extractUserIdFromToken(tokenResponse.access_token);

    const [userProfile, credits] = await Promise.all([
      userService.getUserWithSubscription(userId),
      creditService.getDetailedCredits(userId)
    ]);

    const enhancedResponse = {
      ...tokenResponse,
      user: {
        userId: userProfile.userId,
        email: userProfile.email,
        displayName: userProfile.displayName,
        subscription: {
          tier: userProfile.subscription.tier,
          status: userProfile.subscription.status
        },
        credits: {
          freeCredits: {
            remaining: credits.freeCredits.remaining,
            monthlyAllocation: credits.freeCredits.monthlyAllocation,
            resetDate: credits.freeCredits.resetDate
          },
          proCredits: {
            remaining: credits.proCredits.remaining,
            purchasedTotal: credits.proCredits.purchasedTotal
          },
          totalAvailable: credits.totalAvailable
        }
      }
    };

    return res.json(enhancedResponse);
  }

  // Standard response
  res.json(tokenResponse);
}));
```

**Task 4.2: Enhance Refresh Token Endpoint**

**Add support for `include_credits` parameter:**

```typescript
/**
 * POST /oauth/token (refresh)
 * Enhanced with optional credits data
 */
if (grant_type === 'refresh_token' && req.body.include_credits === 'true') {
  const userId = extractUserIdFromToken(tokenResponse.access_token);

  const credits = await creditService.getDetailedCredits(userId);

  const enhancedResponse = {
    ...tokenResponse,
    credits: {
      freeCredits: {
        remaining: credits.freeCredits.remaining,
        monthlyAllocation: credits.freeCredits.monthlyAllocation,
        resetDate: credits.freeCredits.resetDate
      },
      proCredits: {
        remaining: credits.proCredits.remaining,
        purchasedTotal: credits.proCredits.purchasedTotal
      },
      totalAvailable: credits.totalAvailable
    }
  };

  return res.json(enhancedResponse);
}
```

**Deliverables:**
- Enhanced token endpoint with `include_user_data` support
- Enhanced refresh endpoint with `include_credits` support
- Integration tests for enhanced responses
- Backward compatibility tests

**Acceptance Criteria:**
- ✅ Token endpoint returns user data when requested
- ✅ Token endpoint works without parameter (backward compatible)
- ✅ Refresh token returns credits when requested
- ✅ No breaking changes to existing clients
- ✅ Performance: Enhanced response < 1 second

---

### Phase 5: Routes Configuration (1 day)

**Agent:** api-backend-implementer

**Task 5.1: Add New Routes**

**File:** `backend/src/routes/v1.routes.ts` or create `backend/src/routes/api.routes.ts`

**Option A: Add to existing v1.routes.ts**
```typescript
// Enhanced Credits Endpoint
router.get(
  '/user/credits',
  authMiddleware,
  requireScope('credits.read'),
  asyncHandler(creditsController.getDetailedCredits.bind(creditsController))
);

// Enhanced User Profile Endpoint
router.get(
  '/user/profile',
  authMiddleware,
  requireScope('user.info'),
  asyncHandler(usersController.getUserProfile.bind(usersController))
);
```

**Option B: Create new API router (Recommended)**
```typescript
// backend/src/routes/api.routes.ts
import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { UsersController } from '../controllers/users.controller';
import { CreditsController } from '../controllers/credits.controller';

export function createAPIRouter(): Router {
  const router = Router();

  const usersController = container.resolve(UsersController);
  const creditsController = container.resolve(CreditsController);

  // User Profile
  router.get(
    '/user/profile',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getUserProfile.bind(usersController))
  );

  // Detailed Credits
  router.get(
    '/user/credits',
    authMiddleware,
    requireScope('credits.read'),
    asyncHandler(creditsController.getDetailedCredits.bind(creditsController))
  );

  return router;
}
```

**Update main routes:**
```typescript
// backend/src/routes/index.ts
import { createAPIRouter } from './api.routes';

app.use('/api', createAPIRouter());
```

**Deliverables:**
- New routes configured
- Rate limiting applied (60 req/min for credits, 30 req/min for profile)
- Proper middleware chain (auth → scope → handler)

**Acceptance Criteria:**
- ✅ `/api/user/credits` route accessible
- ✅ `/api/user/profile` route accessible
- ✅ Authentication required
- ✅ Proper scopes validated
- ✅ Rate limiting enforced

---

### Phase 6: Testing (2 days)

**Agent:** testing-qa-specialist

**Task 6.1: Unit Tests**

**Files to create:**
- `backend/src/__tests__/unit/credit-enhanced.service.test.ts`
- `backend/src/__tests__/unit/user-enhanced.service.test.ts`

**Coverage:**
- Free credits breakdown calculation
- Pro credits breakdown calculation
- Total available credits calculation
- Reset date calculation
- Days until reset calculation
- User profile with subscription retrieval
- Edge cases (no credits, no subscription, etc.)

**Task 6.2: Integration Tests**

**Files to create:**
- `backend/src/__tests__/integration/credits-api.test.ts`
- `backend/src/__tests__/integration/user-api.test.ts`
- `backend/src/__tests__/integration/oauth-enhanced.test.ts`

**Coverage:**
- GET /api/user/credits returns correct schema
- GET /api/user/profile returns correct schema
- POST /oauth/token with include_user_data=true
- POST /oauth/token refresh with include_credits=true
- Error handling (401, 403, 404, 429, 500)
- Rate limiting enforcement

**Task 6.3: End-to-End Tests**

**Flow tests:**
1. Complete OAuth flow with enhanced token response
2. Fetch credits after login
3. Use credits (make LLM request)
4. Refresh credits to see updated counts
5. Test credit reset logic

**Deliverables:**
- 30+ unit tests with >90% coverage
- 20+ integration tests
- 5+ E2E flow tests
- All tests passing

**Acceptance Criteria:**
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Code coverage >85%
- ✅ E2E flows work correctly

---

### Phase 7: Documentation & API Specs (1 day)

**Tasks:**
1. Update OpenAPI/Swagger documentation
2. Add examples for all new endpoints
3. Document error responses
4. Add rate limiting documentation
5. Update README with new endpoints

**Deliverables:**
- Updated swagger.json
- API documentation in docs/api/
- Postman collection with examples

---

## Timeline & Resource Allocation

| Phase | Agent | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1. Database Schema | db-schema-architect | 1 day | None |
| 2. Service Layer | api-backend-implementer | 2 days | Phase 1 |
| 3. Controllers | api-backend-implementer | 2 days | Phase 2 |
| 4. OAuth Enhancement | oidc-auth-implementer | 2 days | Phase 2, 3 |
| 5. Routes | api-backend-implementer | 1 day | Phase 3, 4 |
| 6. Testing | testing-qa-specialist | 2 days | Phase 1-5 |
| 7. Documentation | api-backend-implementer | 1 day | Phase 1-6 |

**Total Duration:** 11 days (with parallel work: ~7 days)

**Parallelization:**
- Phases 2 & 4 can run in parallel after Phase 1
- Phase 6 can start after Phase 3 (partial testing)

---

## Acceptance Criteria (Overall)

### API Functionality
- ✅ GET /api/user/credits returns detailed breakdown
- ✅ GET /api/user/profile returns user with subscription
- ✅ POST /oauth/token supports include_user_data parameter
- ✅ POST /oauth/token (refresh) supports include_credits parameter
- ✅ All responses match specification exactly
- ✅ Error handling covers all error codes (401, 403, 429, 500, 503)

### Performance
- ✅ Credits endpoint responds in <500ms (p95)
- ✅ Profile endpoint responds in <300ms (p95)
- ✅ Enhanced token response completes in <1 second
- ✅ Cache hit rate >80% for credits (if implemented)

### Quality
- ✅ Code coverage >85%
- ✅ All tests passing
- ✅ No security vulnerabilities
- ✅ PII not logged
- ✅ Rate limiting enforced

### Compatibility
- ✅ Backward compatible with existing clients
- ✅ New parameters are optional
- ✅ Existing endpoints unchanged

---

## Risk Mitigation

### Risk 1: Database Schema Changes
**Mitigation:**
- Run migration in staging first
- Create rollback migration
- Test with production data volume

### Risk 2: OAuth Enhancement Breaking Changes
**Mitigation:**
- Make all new parameters optional
- Maintain existing behavior by default
- Comprehensive backward compatibility tests

### Risk 3: Performance Impact
**Mitigation:**
- Implement caching at service layer
- Use database indexes
- Monitor response times
- Load testing before production

### Risk 4: Client Integration Issues
**Mitigation:**
- Provide detailed API documentation
- Create Postman collection
- Provide example code
- Beta testing period

---

## Next Steps

1. **Review and Approve Plan** - Stakeholder review
2. **Delegate Phase 1** - Launch db-schema-architect agent
3. **Delegate Phase 2** - Launch api-backend-implementer agent
4. **Progressive Implementation** - Follow phases sequentially
5. **Continuous Testing** - Test after each phase
6. **Integration with Desktop App** - Coordinate with client team

---

## Success Metrics

**Development:**
- All phases completed on schedule
- All tests passing
- Code coverage >85%

**Production:**
- API response time <500ms (p95)
- Error rate <0.1%
- Cache hit rate >80%
- Zero security incidents

**User Experience:**
- Initial login completes in <3 seconds
- Credits display updates within 100ms
- Zero client-side errors related to API

---

**Document Metadata:**
- Phase: Planning
- Related Docs: 100-dedicated-api-credits-user-endpoints.md
- Total Estimated Effort: 11 days
- Start Date: TBD
- Target Completion: TBD
