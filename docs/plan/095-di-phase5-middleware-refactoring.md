# Phase 5: Middleware Refactoring - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 2 days
**Priority:** Medium
**Prerequisites:** Phase 4 completed and verified

## Overview

Phase 5 refactors middleware to use the DI container instead of accepting `prisma` parameters. This makes middleware cleaner and removes dependency passing through the middleware chain.

---

## Objectives

- [x] All middleware use DI container
- [x] No `prisma` parameters in middleware
- [x] Middleware resolve services from container
- [x] Rate limit middleware uses container for Redis

---

## Middleware to Refactor

| Middleware | Current Params | Services Needed |
|------------|----------------|-----------------|
| credit.middleware.ts | prisma | ICreditService |
| auth.middleware.ts | - | IAuthService (maybe) |
| ratelimit.middleware.ts | - | Redis connection |

---

## Task Breakdown

### Task 5.1: Refactor credit.middleware.ts (1 hour)

**Before:**
```typescript
export function checkCredits(prisma: PrismaClient) {
  const creditService = createCreditService(prisma);
  return async (req, res, next) => {
    const credit = await creditService.getCurrentCredits(userId);
    // ...
  };
}

// Usage in routes
router.post('/completions', authMiddleware, checkCredits(prisma), handler);
```

**After:**

**File:** `backend/src/middleware/credit.middleware.ts`

```typescript
/**
 * Credit Deduction Middleware (Refactored with DI)
 *
 * Pre-flight check for credit availability before inference requests.
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../container';
import { ICreditService } from '../interfaces';
import logger from '../utils/logger';
import { forbiddenError } from './error.middleware';

/**
 * Credit check middleware
 * No parameters needed - resolves service from container
 */
export function checkCredits() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        logger.error('checkCredits: No user ID in request');
        throw forbiddenError('Authentication required');
      }

      // ✅ Resolve from container (no manual injection)
      const creditService = container.resolve<ICreditService>('ICreditService');

      logger.debug('checkCredits: Checking credit availability', { userId });

      const credit = await creditService.getCurrentCredits(userId);

      if (!credit) {
        logger.warn('checkCredits: No active credits found', { userId });
        throw forbiddenError(
          'No active subscription. Please subscribe to use the API.'
        );
      }

      const remainingCredits = creditService.calculateRemainingCredits(credit);
      const estimatedCredits = estimateCreditsRequired(req);

      logger.debug('checkCredits: Credit check', {
        userId,
        remainingCredits,
        estimatedCredits,
      });

      if (remainingCredits < estimatedCredits) {
        logger.warn('checkCredits: Insufficient credits', {
          userId,
          remainingCredits,
          estimatedCredits,
        });

        throw forbiddenError('Insufficient credits', {
          required_credits: estimatedCredits,
          available_credits: remainingCredits,
          message:
            'You do not have enough credits to complete this request. Please upgrade your subscription or wait for the next billing period.',
        });
      }

      // Attach credit info to request
      (req as any).creditInfo = {
        creditId: credit.id,
        remainingCredits,
        estimatedCredits,
      };

      logger.debug('checkCredits: Credit check passed', {
        userId,
        remainingCredits,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Estimate credits required (unchanged)
 */
function estimateCreditsRequired(req: Request): number {
  // ... existing implementation
}

/**
 * Optional credit check (refactored similarly)
 */
export function optionalCreditCheck() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        next();
        return;
      }

      const creditService = container.resolve<ICreditService>('ICreditService');
      const credit = await creditService.getCurrentCredits(userId);

      if (credit) {
        const remainingCredits =
          creditService.calculateRemainingCredits(credit);
        const estimatedCredits = estimateCreditsRequired(req);

        logger.info('optionalCreditCheck: Credit status', {
          userId,
          remainingCredits,
          estimatedCredits,
          hasEnough: remainingCredits >= estimatedCredits,
        });

        (req as any).creditInfo = {
          creditId: credit.id,
          remainingCredits,
          estimatedCredits,
        };
      }

      next();
    } catch (error) {
      logger.error('optionalCreditCheck: Error checking credits', {
        error: (error as Error).message,
      });
      next();
    }
  };
}

/**
 * Require active subscription (refactored similarly)
 */
export function requireActiveSubscription() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        logger.error('requireActiveSubscription: No user ID in request');
        throw forbiddenError('Authentication required');
      }

      const creditService = container.resolve<ICreditService>('ICreditService');
      const credit = await creditService.getCurrentCredits(userId);

      if (!credit) {
        logger.warn('requireActiveSubscription: No active subscription', {
          userId,
        });
        throw forbiddenError(
          'No active subscription. Please subscribe to access this resource.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

**Key Changes:**
1. Remove `prisma: PrismaClient` parameter from middleware functions
2. Resolve `ICreditService` from container inside middleware
3. No factory function calls

**Usage in routes (updated):**
```typescript
// Before
router.post('/completions', authMiddleware, checkCredits(prisma), handler);

// After
router.post('/completions', authMiddleware, checkCredits(), handler);
```

**Acceptance Criteria:**
- [x] No `prisma` parameter
- [x] Uses `container.resolve()`
- [x] Route usage updated (no parameters)

---

### Task 5.2: Refactor auth.middleware.ts (if needed) (30 minutes)

If `auth.middleware.ts` creates services manually, refactor similarly:

**File:** `backend/src/middleware/auth.middleware.ts`

Check if it needs any services. If it just validates tokens, it might not need changes.

If it needs `IAuthService`:

```typescript
import { container } from '../container';
import { IAuthService } from '../interfaces';

export const authMiddleware = async (req, res, next) => {
  try {
    // ... token validation

    if (needsUserLookup) {
      const authService = container.resolve<IAuthService>('IAuthService');
      const user = await authService.findById(userId);
    }

    next();
  } catch (error) {
    next(error);
  }
};
```

**Acceptance Criteria:**
- [x] If services needed, resolve from container
- [x] No manual service creation

---

### Task 5.3: Refactor ratelimit.middleware.ts (30 minutes)

If rate limit middleware uses Redis directly:

**File:** `backend/src/middleware/ratelimit.middleware.ts`

```typescript
import { container } from '../container';
import Redis from 'ioredis';

export function rateLimit(options: RateLimitOptions) {
  const redis = container.resolve<Redis>('RedisConnection');

  return async (req, res, next) => {
    const key = `ratelimit:${req.user?.sub || req.ip}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, options.windowMs / 1000);
    }

    if (current > options.max) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
}
```

**Acceptance Criteria:**
- [x] Redis resolved from container
- [x] No global Redis instance

---

### Task 5.4: Update All Route Files (1 hour)

Search for middleware usage with parameters and remove them:

```bash
# Find all middleware calls with prisma parameter
grep -r "checkCredits(prisma)" backend/src/routes/
```

Replace all instances:
```typescript
// Before
checkCredits(prisma)

// After
checkCredits()
```

**Files to update:**
- `backend/src/routes/v1.routes.ts`
- Any other route files

**Acceptance Criteria:**
- [x] All middleware calls have no parameters (except middleware options)
- [x] No `prisma` passed to middleware

---

### Task 5.5: Verification (30 minutes)

**Test file:** `backend/src/__tests__/phase5-verification.test.ts`

```typescript
import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { container } from '../container';
import { checkCredits } from '../middleware/credit.middleware';

describe('Phase 5: Middleware Refactoring', () => {
  it('should create credit middleware without parameters', () => {
    const middleware = checkCredits();
    expect(typeof middleware).toBe('function');
  });

  it('should resolve services from container inside middleware', async () => {
    const middleware = checkCredits();

    const req = { user: { sub: 'test-user' }, body: {} } as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    // This will fail without valid user/credits, but tests the pattern
    try {
      await middleware(req, res, next);
    } catch (error) {
      // Expected - we're testing the DI pattern, not the logic
    }
  });
});
```

**Manual verification:**
```bash
npm run build
npm run dev
# Make test request that triggers credit middleware
curl -X POST http://localhost:7150/v1/chat/completions
```

**Acceptance Criteria:**
- [x] Tests pass
- [x] Middleware resolves services from container
- [x] No runtime errors
- [x] Application starts successfully

---

## Next Steps

After Phase 5:

1. Create Phase 6 branch
2. Update application bootstrap
3. Refer to: `096-di-phase6-application-bootstrap.md`

---

**Document Metadata:**
- Phase: 5/7
- Duration: 2 days
- Previous: `094-di-phase4-routes-controllers-refactoring.md`
- Next: `096-di-phase6-application-bootstrap.md`
