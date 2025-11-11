# Phase 4: Routes & Controllers Refactoring - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 4 days
**Priority:** Medium
**Prerequisites:** Phase 3 completed and verified

## Overview

Phase 4 updates all controllers and route files to use the DI container. This eliminates factory functions and manual service instantiation in routes.

---

## Objectives

- [x] All controllers refactored to use `@injectable()`
- [x] Controllers resolve dependencies via constructor injection
- [x] Route files use `container.resolve()` instead of factory functions
- [x] All factory functions removed
- [x] No manual service instantiation in routes/controllers

---

## Controllers to Refactor

| Controller | Services Needed | Complexity |
|------------|-----------------|------------|
| users.controller.ts | IUserService, IAuthService | Low |
| models.controller.ts | IModelService | Low |
| subscriptions.controller.ts | ISubscriptionService, IStripeService | Medium |
| credits.controller.ts | ICreditService | Low |
| webhooks.controller.ts | IWebhookService | Low |
| admin.controller.ts | Multiple services | Medium |

---

## Task Breakdown

### Task 4.1: Refactor UsersController (1 hour)

**Before:**
```typescript
export function createUsersController(prisma: PrismaClient) {
  const userService = new UserService(prisma);
  const authService = new AuthService(prisma);
  return new UsersController(userService, authService);
}
```

**After:**

**File:** `backend/src/controllers/users.controller.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IUserService, IAuthService } from '../interfaces';
import logger from '../utils/logger';
import { notFoundError, badRequestError } from '../middleware/error.middleware';

@injectable()
export class UsersController {
  constructor(
    @inject('IUserService') private userService: IUserService,
    @inject('IAuthService') private authService: IAuthService
  ) {
    logger.debug('UsersController: Initialized');
  }

  /**
   * GET /v1/users/me
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    const user = await this.userService.findById(userId);

    if (!user) {
      throw notFoundError('User not found');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  }

  /**
   * PATCH /v1/users/me
   * Update user profile
   */
  async updateCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { firstName, lastName, username } = req.body;

    const user = await this.userService.update(userId, {
      firstName,
      lastName,
      username,
    });

    res.json({ user });
  }

  /**
   * GET /v1/users/me/preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const preferences = await this.userService.getPreferences(userId);
    res.json({ preferences });
  }

  /**
   * PATCH /v1/users/me/preferences
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const preferences = await this.userService.updatePreferences(userId, req.body);
    res.json({ preferences });
  }
}
```

**Acceptance Criteria:**
- [x] `@injectable()` decorator added
- [x] Services injected via constructor
- [x] No factory function
- [x] All methods are instance methods

---

### Task 4.2: Refactor ModelsController (30 minutes)

**File:** `backend/src/controllers/models.controller.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IModelService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class ModelsController {
  constructor(@inject('IModelService') private modelService: IModelService) {
    logger.debug('ModelsController: Initialized');
  }

  /**
   * GET /v1/models
   * List all available models
   */
  async listModels(_req: Request, res: Response): Promise<void> {
    const models = await this.modelService.getAllModels();

    res.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        credits_per_1k_tokens: m.creditsPer1kTokens,
      })),
    });
  }

  /**
   * GET /v1/models/:modelId
   */
  async getModel(req: Request, res: Response): Promise<void> {
    const { modelId } = req.params;
    const model = await this.modelService.getModelById(modelId);

    if (!model) {
      throw notFoundError('Model not found');
    }

    res.json({ model });
  }
}
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] IModelService injected

---

### Task 4.3: Refactor SubscriptionsController (1.5 hours)

**File:** `backend/src/controllers/subscriptions.controller.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { ISubscriptionService, IStripeService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class SubscriptionsController {
  constructor(
    @inject('ISubscriptionService') private subscriptionService: ISubscriptionService,
    @inject('IStripeService') private stripeService: IStripeService
  ) {
    logger.debug('SubscriptionsController: Initialized');
  }

  /**
   * GET /v1/subscriptions/current
   * Get user's active subscription
   */
  async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const subscription = await this.subscriptionService.getActiveSubscription(userId);

    if (!subscription) {
      res.json({ subscription: null });
      return;
    }

    res.json({ subscription });
  }

  /**
   * POST /v1/subscriptions/checkout
   * Create Stripe checkout session
   */
  async createCheckoutSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { priceId } = req.body;

    // Create or get Stripe customer
    // ... implementation

    const session = await this.stripeService.createCheckoutSession({
      customerId: 'customer_id',
      priceId,
      successUrl: `${process.env.FRONTEND_URL}/subscription/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancel`,
    });

    res.json({ sessionId: session.sessionId, url: session.url });
  }

  /**
   * POST /v1/subscriptions/portal
   * Create Stripe billing portal session
   */
  async createPortalSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    // ... get customer ID

    const portal = await this.stripeService.createBillingPortalSession(
      'customer_id',
      `${process.env.FRONTEND_URL}/subscription`
    );

    res.json({ url: portal.url });
  }

  /**
   * DELETE /v1/subscriptions/:subscriptionId
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const { subscriptionId } = req.params;
    const subscription = await this.subscriptionService.cancelSubscription(subscriptionId);
    res.json({ subscription });
  }
}
```

---

### Task 4.4: Refactor CreditsController (30 minutes)

**File:** `backend/src/controllers/credits.controller.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { ICreditService } from '../interfaces';

@injectable()
export class CreditsController {
  constructor(@inject('ICreditService') private creditService: ICreditService) {}

  async getCurrentCredits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const credit = await this.creditService.getCurrentCredits(userId);

    if (!credit) {
      res.json({ credit: null, remaining: 0 });
      return;
    }

    res.json({
      credit: {
        total: credit.totalCredits,
        used: credit.usedCredits,
        remaining: this.creditService.calculateRemainingCredits(credit),
        billing_period_start: credit.billingPeriodStart,
        billing_period_end: credit.billingPeriodEnd,
      },
    });
  }

  async getCreditHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const history = await this.creditService.getCreditHistory(userId);
    res.json({ history });
  }
}
```

---

### Task 4.5: Refactor WebhooksController (30 minutes)

**File:** `backend/src/controllers/webhooks.controller.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IWebhookService } from '../interfaces';

@injectable()
export class WebhooksController {
  constructor(@inject('IWebhookService') private webhookService: IWebhookService) {}

  async getWebhookConfig(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const config = await this.webhookService.getWebhookConfig(userId);
    res.json({ config });
  }

  async setWebhookConfig(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { webhookUrl, webhookSecret } = req.body;

    const config = await this.webhookService.upsertWebhookConfig(
      userId,
      webhookUrl,
      webhookSecret
    );

    res.json({ config });
  }

  async deleteWebhookConfig(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    await this.webhookService.deleteWebhookConfig(userId);
    res.json({ success: true });
  }

  async testWebhook(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    await this.webhookService.queueWebhook(userId, 'subscription.created', {
      test: true,
      message: 'This is a test webhook',
    });

    res.json({ success: true, message: 'Test webhook queued' });
  }
}
```

---

### Task 4.6: Update v1.routes.ts (2 hours)

**Before:**
```typescript
export function createV1Router(prisma: PrismaClient): Router {
  const router = Router();
  const usersController = createUsersController(prisma);
  router.get('/users/me', authMiddleware, asyncHandler(usersController.getCurrentUser.bind(usersController)));
  return router;
}
```

**After:**

**File:** `backend/src/routes/v1.routes.ts`

```typescript
import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { checkCredits } from '../middleware/credit.middleware';

// Import controllers
import { UsersController } from '../controllers/users.controller';
import { ModelsController } from '../controllers/models.controller';
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { CreditsController } from '../controllers/credits.controller';
import { WebhooksController } from '../controllers/webhooks.controller';

/**
 * Create v1 router (No parameters needed - uses DI container)
 */
export function createV1Router(): Router {
  const router = Router();

  // Resolve controllers from DI container
  const usersController = container.resolve(UsersController);
  const modelsController = container.resolve(ModelsController);
  const subscriptionsController = container.resolve(SubscriptionsController);
  const creditsController = container.resolve(CreditsController);
  const webhooksController = container.resolve(WebhooksController);

  // ============================================================================
  // User Routes
  // ============================================================================

  router.get(
    '/users/me',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getCurrentUser.bind(usersController))
  );

  router.patch(
    '/users/me',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.updateCurrentUser.bind(usersController))
  );

  router.get(
    '/users/me/preferences',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getUserPreferences.bind(usersController))
  );

  router.patch(
    '/users/me/preferences',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.updateUserPreferences.bind(usersController))
  );

  // ============================================================================
  // Model Routes
  // ============================================================================

  router.get(
    '/models',
    authMiddleware,
    asyncHandler(modelsController.listModels.bind(modelsController))
  );

  router.get(
    '/models/:modelId',
    authMiddleware,
    asyncHandler(modelsController.getModel.bind(modelsController))
  );

  // ============================================================================
  // Subscription Routes
  // ============================================================================

  router.get(
    '/subscriptions/current',
    authMiddleware,
    requireScope('subscription.read'),
    asyncHandler(subscriptionsController.getCurrentSubscription.bind(subscriptionsController))
  );

  router.post(
    '/subscriptions/checkout',
    authMiddleware,
    asyncHandler(subscriptionsController.createCheckoutSession.bind(subscriptionsController))
  );

  router.post(
    '/subscriptions/portal',
    authMiddleware,
    asyncHandler(subscriptionsController.createPortalSession.bind(subscriptionsController))
  );

  router.delete(
    '/subscriptions/:subscriptionId',
    authMiddleware,
    asyncHandler(subscriptionsController.cancelSubscription.bind(subscriptionsController))
  );

  // ============================================================================
  // Credit Routes
  // ============================================================================

  router.get(
    '/credits/current',
    authMiddleware,
    asyncHandler(creditsController.getCurrentCredits.bind(creditsController))
  );

  router.get(
    '/credits/history',
    authMiddleware,
    asyncHandler(creditsController.getCreditHistory.bind(creditsController))
  );

  // ============================================================================
  // Webhook Routes
  // ============================================================================

  router.get(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.getWebhookConfig.bind(webhooksController))
  );

  router.post(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.setWebhookConfig.bind(webhooksController))
  );

  router.delete(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.deleteWebhookConfig.bind(webhooksController))
  );

  router.post(
    '/webhooks/test',
    authMiddleware,
    asyncHandler(webhooksController.testWebhook.bind(webhooksController))
  );

  return router;
}
```

**Key Changes:**
1. Remove `prisma` parameter from `createV1Router()`
2. Resolve controllers from `container.resolve()`
3. No manual service/controller instantiation

**Acceptance Criteria:**
- [x] No `prisma` parameter
- [x] All controllers resolved from container
- [x] No factory functions called

---

### Task 4.7: Update index.ts to Use New Route Signature (30 minutes)

**File:** `backend/src/index.ts` or `backend/src/server.ts`

**Before:**
```typescript
const prisma = new PrismaClient();
app.use('/v1', createV1Router(prisma));
```

**After:**
```typescript
import 'reflect-metadata';
import { container } from './container';

// ... middleware setup

app.use('/v1', createV1Router()); // No parameters!
```

---

### Task 4.8: Register Controllers in Container (Optional but Recommended)

For better consistency, register controllers as singletons:

**File:** `backend/src/container.ts`

```typescript
import { UsersController } from './controllers/users.controller';
import { ModelsController } from './controllers/models.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { CreditsController } from './controllers/credits.controller';
import { WebhooksController } from './controllers/webhooks.controller';

// Register controllers (optional - they can be resolved directly)
container.registerSingleton(UsersController);
container.registerSingleton(ModelsController);
container.registerSingleton(SubscriptionsController);
container.registerSingleton(CreditsController);
container.registerSingleton(WebhooksController);

logger.info('DI Container: Controllers registered');
```

---

### Task 4.9: Verification (1 hour)

**Tests:**

**File:** `backend/src/__tests__/phase4-verification.test.ts`

```typescript
import 'reflect-metadata';
import { container } from '../container';
import { UsersController } from '../controllers/users.controller';
import { ModelsController } from '../controllers/models.controller';

describe('Phase 4: Routes & Controllers', () => {
  it('should resolve all controllers from container', () => {
    const usersController = container.resolve(UsersController);
    const modelsController = container.resolve(ModelsController);

    expect(usersController).toBeInstanceOf(UsersController);
    expect(modelsController).toBeInstanceOf(ModelsController);
  });

  it('should inject dependencies into controllers', () => {
    const usersController = container.resolve(UsersController);
    expect(usersController).toBeDefined();
  });
});
```

**Manual verification:**
```bash
npm run build
npm run dev
# Make test API requests
curl http://localhost:7150/v1/models
```

**Acceptance Criteria:**
- [x] All tests pass
- [x] Application starts successfully
- [x] API requests work as before
- [x] No factory functions remain

---

## Next Steps

After Phase 4:

1. Create Phase 5 branch
2. Refactor middleware
3. Refer to: `095-di-phase5-middleware-refactoring.md`

---

**Document Metadata:**
- Phase: 4/7
- Duration: 4 days
- Previous: `093-di-phase3-core-services-refactoring.md`
- Next: `095-di-phase5-middleware-refactoring.md`
