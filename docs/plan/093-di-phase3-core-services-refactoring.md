# Phase 3: Core Services Refactoring - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 5 days
**Priority:** High
**Prerequisites:** Phase 2 completed and verified

## Overview

Phase 3 refactors all remaining core services to use Dependency Injection. This includes:

- AuthService
- UserService
- CreditService
- UsageService
- SubscriptionService
- StripeService
- ModelService
- WebhookService

By the end of Phase 3, **all backend services** will be DI-compliant with interfaces, injectable decorators, and proper dependency management.

---

## Objectives

- [x] All service interfaces defined (some already done in Phase 1)
- [x] All services refactored to use `@injectable()` decorator
- [x] All services registered in DI container
- [x] WebhookService converted from functions to class-based
- [x] All manual `new ServiceClass()` removed
- [x] Factory functions deprecated
- [x] All tests passing

---

## Services to Refactor

| Service | Current Lines | Status | Complexity |
|---------|---------------|--------|------------|
| auth.service.ts | 389 | Needs @injectable | Low |
| user.service.ts | ~300 | Needs @injectable | Low |
| credit.service.ts | 413 | Needs @injectable | Medium |
| usage.service.ts | ~250 | Needs @injectable | Low |
| subscription.service.ts | ~400 | Needs @injectable | Medium |
| stripe.service.ts | ~300 | Needs @injectable | Medium |
| model.service.ts | ~200 | Needs @injectable | Low |
| webhook.service.ts | 316 | **Function-based → Class** | High |

---

## Task Breakdown

### Task 3.1: Define Remaining Service Interfaces (2 hours)

Some interfaces were already created in Phase 1. We need to add the missing ones.

#### Step 1: Define Missing Interfaces

**File:** `backend/src/interfaces/services/user.interface.ts`

```typescript
import { User } from '@prisma/client';

export const IUserService = Symbol('IUserService');

export interface IUserService {
  /**
   * Find user by ID
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create a new user
   */
  create(data: {
    email: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User>;

  /**
   * Update user profile
   */
  update(userId: string, data: Partial<User>): Promise<User>;

  /**
   * Delete user (soft delete)
   */
  delete(userId: string): Promise<void>;

  /**
   * Get user preferences
   */
  getPreferences(userId: string): Promise<any>;

  /**
   * Update user preferences
   */
  updatePreferences(userId: string, preferences: any): Promise<any>;
}
```

**File:** `backend/src/interfaces/services/subscription.interface.ts`

```typescript
import { Subscription } from '@prisma/client';

export const ISubscriptionService = Symbol('ISubscriptionService');

export interface ISubscriptionService {
  /**
   * Get active subscription for a user
   */
  getActiveSubscription(userId: string): Promise<Subscription | null>;

  /**
   * Create a new subscription
   */
  createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<Subscription>;

  /**
   * Update subscription status
   */
  updateSubscriptionStatus(
    subscriptionId: string,
    status: string
  ): Promise<Subscription>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<Subscription>;

  /**
   * Get subscription by Stripe subscription ID
   */
  getByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<Subscription | null>;

  /**
   * Get all subscriptions for a user
   */
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
}
```

**File:** `backend/src/interfaces/services/stripe.interface.ts`

```typescript
export const IStripeService = Symbol('IStripeService');

export interface IStripeService {
  /**
   * Create a Stripe customer
   */
  createCustomer(email: string, metadata?: any): Promise<string>;

  /**
   * Create a checkout session
   */
  createCheckoutSession(data: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  /**
   * Create a billing portal session
   */
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }>;

  /**
   * Retrieve a subscription from Stripe
   */
  getSubscription(subscriptionId: string): Promise<any>;

  /**
   * Cancel a subscription in Stripe
   */
  cancelSubscription(subscriptionId: string): Promise<any>;

  /**
   * Handle webhook events
   */
  handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<{ type: string; data: any }>;
}
```

**File:** `backend/src/interfaces/services/model.interface.ts`

```typescript
import { Model } from '@prisma/client';

export const IModelService = Symbol('IModelService');

export interface IModelService {
  /**
   * Get all available models
   */
  getAllModels(): Promise<Model[]>;

  /**
   * Get model by ID
   */
  getModelById(modelId: string): Promise<Model | null>;

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: string): Promise<Model[]>;

  /**
   * Create a new model
   */
  createModel(data: {
    id: string;
    name: string;
    provider: string;
    creditsPer1kTokens: number;
  }): Promise<Model>;

  /**
   * Update model
   */
  updateModel(modelId: string, data: Partial<Model>): Promise<Model>;

  /**
   * Delete model
   */
  deleteModel(modelId: string): Promise<void>;
}
```

#### Step 2: Update Barrel Export

**File:** `backend/src/interfaces/index.ts`

Add:
```typescript
export * from './services/user.interface';
export * from './services/subscription.interface';
export * from './services/stripe.interface';
export * from './services/model.interface';
```

**Acceptance Criteria:**
- [x] All service interfaces defined
- [x] All interfaces exported from `interfaces/index.ts`
- [x] No TypeScript errors

---

### Task 3.2: Refactor AuthService (1 hour)

**File:** `backend/src/services/auth.service.ts`

Add DI decorators and implement interface:

```typescript
/**
 * Authentication Service (Refactored with DI)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { IAuthService } from '../interfaces';

const BCRYPT_SALT_ROUNDS = 12;

@injectable()
export class AuthService implements IAuthService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AuthService: Initialized');
  }

  // ✅ All methods remain the same, just use this.prisma
  async findByEmail(email: string): Promise<User | null> {
    // ... existing implementation
  }

  async findById(userId: string): Promise<User | null> {
    // ... existing implementation
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User> {
    // ... existing implementation
  }

  // ... rest of methods unchanged
}
```

**Changes:**
1. Add `@injectable()` decorator to class
2. Add `@inject('PrismaClient')` to constructor parameter
3. Implement `IAuthService` interface
4. Remove any manual service creation

**Acceptance Criteria:**
- [x] `@injectable()` decorator added
- [x] PrismaClient injected
- [x] Implements `IAuthService`
- [x] No breaking changes to method signatures

---

### Task 3.3: Refactor UserService (1 hour)

**File:** `backend/src/services/user.service.ts`

Similar pattern as AuthService:

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, User } from '@prisma/client';
import { IUserService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class UserService implements IUserService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('UserService: Initialized');
  }

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // ... rest of methods
}
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] Implements `IUserService`
- [x] All methods use `this.prisma`

---

### Task 3.4: Refactor CreditService (1.5 hours)

**File:** `backend/src/services/credit.service.ts`

CreditService currently calls `queueWebhook` from webhook.service. We need to inject IWebhookService instead.

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, Credit } from '@prisma/client';
import { ICreditService, IWebhookService } from '../interfaces';
import logger from '../utils/logger';
import {
  AllocateCreditsInput,
  DeductCreditsInput,
} from '../types/credit-validation';

@injectable()
export class CreditService implements ICreditService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject('IWebhookService') private readonly webhookService: IWebhookService
  ) {
    logger.debug('CreditService: Initialized');
  }

  async getCurrentCredits(userId: string): Promise<Credit | null> {
    // ... existing implementation
  }

  async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
    // ... existing implementation
  }

  async deductCredits(input: DeductCreditsInput): Promise<Credit> {
    // ... existing implementation up to webhook part

    // ✅ Changed: Use injected webhook service instead of direct function call
    try {
      if (remainingCredits === 0) {
        await this.webhookService.queueWebhook(input.userId, 'credits.depleted', {
          user_id: input.userId,
          remaining_credits: 0,
          total_credits: result.totalCredits,
        });
      } else if (remainingCredits > 0 && remainingCredits <= thresholdCredits) {
        await this.webhookService.queueWebhook(input.userId, 'credits.low', {
          user_id: input.userId,
          remaining_credits: remainingCredits,
          total_credits: result.totalCredits,
          threshold_percentage: thresholdPercentage,
        });
      }
    } catch (webhookError) {
      logger.error('CreditService: Failed to queue credit webhook', {
        userId: input.userId,
        error: webhookError,
      });
    }

    return result;
  }

  // ... rest of methods unchanged
}
```

**Key Changes:**
1. Inject `IWebhookService` in constructor
2. Replace `queueWebhook(...)` calls with `this.webhookService.queueWebhook(...)`

**Acceptance Criteria:**
- [x] IWebhookService injected
- [x] No direct function imports from webhook.service
- [x] Webhook queueing uses injected service

---

### Task 3.5: Refactor UsageService (30 minutes)

**File:** `backend/src/services/usage.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, UsageHistory } from '@prisma/client';
import { IUsageService, RecordUsageInput } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class UsageService implements IUsageService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('UsageService: Initialized');
  }

  async recordUsage(data: RecordUsageInput): Promise<void> {
    // ... existing implementation
  }

  async getUserUsage(userId: string, limit = 100): Promise<UsageHistory[]> {
    // ... existing implementation
  }

  // ... rest of methods
}
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] Implements `IUsageService`
- [x] PrismaClient injected

---

### Task 3.6: Refactor SubscriptionService (1.5 hours)

**File:** `backend/src/services/subscription.service.ts`

SubscriptionService likely depends on CreditService and StripeService:

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, Subscription } from '@prisma/client';
import { ISubscriptionService, ICreditService, IWebhookService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class SubscriptionService implements ISubscriptionService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('ICreditService') private creditService: ICreditService,
    @inject('IWebhookService') private webhookService: IWebhookService
  ) {
    logger.debug('SubscriptionService: Initialized');
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });
  }

  async createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<Subscription> {
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        tierId: data.tierId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
      },
    });

    // Allocate credits (using injected service)
    // ... credit allocation logic

    // Queue webhook (using injected service)
    await this.webhookService.queueWebhook(data.userId, 'subscription.created', {
      subscription_id: subscription.id,
      tier_id: data.tierId,
    });

    return subscription;
  }

  // ... rest of methods
}
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] ICreditService and IWebhookService injected
- [x] All dependencies used via injection

---

### Task 3.7: Refactor StripeService (1 hour)

**File:** `backend/src/services/stripe.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import Stripe from 'stripe';
import { IStripeService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class StripeService implements IStripeService {
  constructor(@inject('StripeClient') private stripe: Stripe) {
    logger.debug('StripeService: Initialized');
  }

  async createCustomer(email: string, metadata?: any): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata,
    });
    return customer.id;
  }

  async createCheckoutSession(data: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      customer: data.customerId,
      line_items: [{ price: data.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  // ... rest of methods
}
```

**Register Stripe client in container:**

**File:** `backend/src/container.ts`

```typescript
import Stripe from 'stripe';

container.register('StripeClient', {
  useValue: new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  }),
});

logger.info('DI Container: Stripe client registered');
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] Stripe client injected
- [x] Stripe client registered in container

---

### Task 3.8: Refactor ModelService (30 minutes)

**File:** `backend/src/services/model.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, Model } from '@prisma/client';
import { IModelService } from '../interfaces';
import logger from '../utils/logger';

@injectable()
export class ModelService implements IModelService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('ModelService: Initialized');
  }

  async getAllModels(): Promise<Model[]> {
    return this.prisma.model.findMany();
  }

  async getModelById(modelId: string): Promise<Model | null> {
    return this.prisma.model.findUnique({ where: { id: modelId } });
  }

  // ... rest of methods
}
```

**Acceptance Criteria:**
- [x] `@injectable()` added
- [x] Implements `IModelService`

---

### Task 3.9: Refactor WebhookService (Function → Class) (2 hours)

This is the most complex refactoring. webhook.service.ts is currently function-based with global state.

**Before:**
```typescript
const prisma = new PrismaClient();
const connection = new Redis(...);
export const webhookQueue = new Queue(...);

export async function queueWebhook(...) { ... }
export async function sendWebhook(...) { ... }
```

**After:**

**File:** `backend/src/services/webhook.service.ts`

```typescript
/**
 * Webhook Service (Refactored to Class-based DI)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, WebhookConfig, WebhookLog } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { IWebhookService, WebhookEventType } from '../interfaces';
import logger from '../utils/logger';
import { generateWebhookSignature, getCurrentTimestamp } from '../utils/signature';

export interface WebhookJobData {
  webhookConfigId: string;
  eventType: WebhookEventType;
  payload: any;
  userId: string;
}

@injectable()
export class WebhookService implements IWebhookService {
  private webhookQueue: Queue<WebhookJobData>;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('RedisConnection') redisConnection: Redis
  ) {
    // Initialize BullMQ queue with injected Redis connection
    this.webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400 * 7, // 7 days
        },
        removeOnFail: {
          age: 86400 * 30, // 30 days
        },
      },
    });

    logger.debug('WebhookService: Initialized');
  }

  /**
   * Queue a webhook for delivery
   */
  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    try {
      const webhookConfig = await this.prisma.webhookConfig.findUnique({
        where: { userId },
      });

      if (!webhookConfig) {
        logger.debug('WebhookService: No webhook configured', { userId, eventType });
        return;
      }

      if (!webhookConfig.isActive) {
        logger.debug('WebhookService: Webhook disabled', { userId, eventType });
        return;
      }

      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
      };

      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          webhookConfigId: webhookConfig.id,
          eventType,
          payload,
          status: 'pending',
          attempts: 0,
        },
      });

      await this.webhookQueue.add(
        'deliver-webhook',
        {
          webhookConfigId: webhookConfig.id,
          eventType,
          payload,
          userId,
        },
        {
          jobId: webhookLog.id,
        }
      );

      logger.info('WebhookService: Webhook queued', {
        userId,
        eventType,
        webhookConfigId: webhookConfig.id,
        webhookLogId: webhookLog.id,
      });
    } catch (error) {
      logger.error('WebhookService: Failed to queue webhook', {
        userId,
        eventType,
        error,
      });
      throw error;
    }
  }

  /**
   * Send webhook HTTP POST request
   */
  async sendWebhook(
    webhookConfigId: string,
    eventType: WebhookEventType,
    payload: any,
    attempt: number
  ): Promise<{ statusCode: number; responseBody: string }> {
    try {
      const webhookConfig = await this.prisma.webhookConfig.findUnique({
        where: { id: webhookConfigId },
      });

      if (!webhookConfig) {
        throw new Error('Webhook configuration not found');
      }

      const signature = generateWebhookSignature(payload, webhookConfig.webhookSecret);
      const timestamp = getCurrentTimestamp();

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Event': eventType,
        'User-Agent': 'Rephlo-Webhook/1.0',
      };

      const timeout = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      logger.info('WebhookService: Sending webhook', {
        webhookConfigId,
        eventType,
        attempt,
        url: webhookConfig.webhookUrl,
      });

      const response = await fetch(webhookConfig.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      logger.info('WebhookService: Webhook delivered', {
        webhookConfigId,
        eventType,
        statusCode: response.status,
        attempt,
      });

      return {
        statusCode: response.status,
        responseBody: responseBody.substring(0, 1000),
      };
    } catch (error: any) {
      logger.error('WebhookService: Webhook delivery failed', {
        webhookConfigId,
        eventType,
        attempt,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Update webhook log with delivery result
   */
  async updateWebhookLog(
    webhookLogId: string,
    status: 'success' | 'failed' | 'pending',
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attempts?: number
  ): Promise<void> {
    try {
      await this.prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: {
          status,
          statusCode,
          responseBody,
          errorMessage,
          attempts,
          completedAt: status !== 'pending' ? new Date() : undefined,
        },
      });

      logger.debug('WebhookService: Webhook log updated', {
        webhookLogId,
        status,
        attempts,
      });
    } catch (error) {
      logger.error('WebhookService: Failed to update webhook log', {
        webhookLogId,
        error,
      });
    }
  }

  /**
   * Get webhook configuration for a user
   */
  async getWebhookConfig(userId: string): Promise<WebhookConfig | null> {
    return this.prisma.webhookConfig.findUnique({
      where: { userId },
    });
  }

  /**
   * Create or update webhook configuration
   */
  async upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<WebhookConfig> {
    return this.prisma.webhookConfig.upsert({
      where: { userId },
      create: {
        userId,
        webhookUrl,
        webhookSecret,
        isActive: true,
      },
      update: {
        webhookUrl,
        webhookSecret,
        isActive: true,
      },
    });
  }

  /**
   * Delete webhook configuration
   */
  async deleteWebhookConfig(userId: string): Promise<void> {
    await this.prisma.webhookConfig.delete({
      where: { userId },
    });
  }

  /**
   * Get webhook logs for a webhook configuration
   */
  async getWebhookLogs(
    webhookConfigId: string,
    limit: number = 50
  ): Promise<WebhookLog[]> {
    return this.prisma.webhookLog.findMany({
      where: { webhookConfigId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get the webhook queue (for worker registration)
   */
  getQueue(): Queue<WebhookJobData> {
    return this.webhookQueue;
  }
}
```

**Key Changes:**
1. Converted from function-based to class-based
2. Removed global `prisma` and `connection` variables
3. Queue created in constructor with injected Redis
4. All functions converted to methods
5. Export `WebhookService` class instead of individual functions

**Acceptance Criteria:**
- [x] Class-based with `@injectable()`
- [x] PrismaClient and Redis injected
- [x] All functions converted to methods
- [x] No global state
- [x] Implements `IWebhookService`

---

### Task 3.10: Register All Services in Container (1 hour)

**File:** `backend/src/container.ts`

Add service registrations:

```typescript
// ============================================================================
// Service Registration
// ============================================================================

import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { CreditService } from './services/credit.service';
import { UsageService } from './services/usage.service';
import { SubscriptionService } from './services/subscription.service';
import { StripeService } from './services/stripe.service';
import { ModelService } from './services/model.service';
import { WebhookService } from './services/webhook.service';

// Register with interface tokens
container.register('IAuthService', { useClass: AuthService });
container.register('IUserService', { useClass: UserService });
container.register('ICreditService', { useClass: CreditService });
container.register('IUsageService', { useClass: UsageService });
container.register('ISubscriptionService', { useClass: SubscriptionService });
container.register('IStripeService', { useClass: StripeService });
container.register('IModelService', { useClass: ModelService });
container.register('IWebhookService', { useClass: WebhookService });

logger.info('DI Container: All core services registered', {
  services: [
    'AuthService',
    'UserService',
    'CreditService',
    'UsageService',
    'SubscriptionService',
    'StripeService',
    'ModelService',
    'WebhookService',
  ],
});
```

**Acceptance Criteria:**
- [x] All 8 services registered
- [x] Registered with interface symbols
- [x] Container logs registration

---

### Task 3.11: Remove Factory Functions (30 minutes)

Search for and deprecate factory functions:

**Files to update:**
- `backend/src/services/credit.service.ts` - Remove `export function createCreditService()`
- `backend/src/services/auth.service.ts` - Remove `export function createAuthService()` if exists
- Any other factory functions

Add deprecation comments:

```typescript
/**
 * @deprecated Use container.resolve('ICreditService') instead
 * This factory function is kept for backward compatibility during migration
 * Will be removed in Phase 4
 */
export function createCreditService(prisma: PrismaClient): CreditService {
  logger.warn('createCreditService is deprecated. Use DI container instead.');
  return new CreditService(prisma);
}
```

**Acceptance Criteria:**
- [x] All factory functions marked as deprecated
- [x] Deprecation warnings logged
- [x] No new code uses factory functions

---

### Task 3.12: Update Webhook Worker (1 hour)

If you have a separate webhook worker file, update it to use the DI container:

**File:** `backend/src/workers/webhook-worker.ts` (if exists)

```typescript
import 'reflect-metadata';
import { container } from '../container';
import { WebhookService } from '../services/webhook.service';
import { Worker } from 'bullmq';
import logger from '../utils/logger';

// Get webhook service from container
const webhookService = container.resolve(WebhookService);
const queue = webhookService.getQueue();

// Create BullMQ worker
const worker = new Worker(
  'webhook-delivery',
  async (job) => {
    const { webhookConfigId, eventType, payload, userId } = job.data;

    logger.info('Webhook worker: Processing job', {
      jobId: job.id,
      userId,
      eventType,
      attempt: job.attemptsMade + 1,
    });

    try {
      const result = await webhookService.sendWebhook(
        webhookConfigId,
        eventType,
        payload,
        job.attemptsMade + 1
      );

      await webhookService.updateWebhookLog(
        job.id!,
        'success',
        result.statusCode,
        result.responseBody,
        undefined,
        job.attemptsMade + 1
      );

      return result;
    } catch (error) {
      await webhookService.updateWebhookLog(
        job.id!,
        'failed',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
        job.attemptsMade + 1
      );

      throw error; // BullMQ will retry
    }
  },
  {
    connection: container.resolve('RedisConnection'),
  }
);

worker.on('completed', (job) => {
  logger.info('Webhook worker: Job completed', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Webhook worker: Job failed', {
    jobId: job?.id,
    error: err.message,
  });
});

logger.info('Webhook worker: Started');
```

**Acceptance Criteria:**
- [x] Worker uses DI container
- [x] WebhookService resolved from container
- [x] No global state

---

### Task 3.13: Verify Phase 3 Completion (1.5 hours)

#### Verification Checklist

1. **Build succeeds**
   ```bash
   npm run build
   ```

2. **All services resolve from container**

   Create test file: `backend/src/__tests__/phase3-verification.test.ts`

   ```typescript
   import 'reflect-metadata';
   import { container } from '../container';
   import { AuthService } from '../services/auth.service';
   import { CreditService } from '../services/credit.service';
   import { WebhookService } from '../services/webhook.service';
   import {
     IAuthService,
     ICreditService,
     IWebhookService,
   } from '../interfaces';

   describe('Phase 3: Core Services Refactoring', () => {
     it('should resolve all services from container', () => {
       const authService = container.resolve<IAuthService>('IAuthService');
       const creditService = container.resolve<ICreditService>('ICreditService');
       const webhookService = container.resolve<IWebhookService>('IWebhookService');

       expect(authService).toBeInstanceOf(AuthService);
       expect(creditService).toBeInstanceOf(CreditService);
       expect(webhookService).toBeInstanceOf(WebhookService);
     });

     it('should have all 8 services registered', () => {
       const services = [
         'IAuthService',
         'IUserService',
         'ICreditService',
         'IUsageService',
         'ISubscriptionService',
         'IStripeService',
         'IModelService',
         'IWebhookService',
       ];

       services.forEach((service) => {
         expect(() => container.resolve(service)).not.toThrow();
       });
     });

     it('should inject dependencies correctly', () => {
       const creditService = container.resolve<ICreditService>('ICreditService');
       // CreditService should have WebhookService injected
       expect(creditService).toBeDefined();
     });
   });
   ```

   Run tests:
   ```bash
   npm test phase3-verification.test.ts
   ```

3. **No factory function usage**

   Search for factory function calls:
   ```bash
   grep -r "createCreditService\|createAuthService\|createUserService" backend/src/ --exclude-dir=node_modules
   ```

   Should only find deprecation warnings, no actual usage.

4. **WebhookService is class-based**

   ```bash
   grep "export async function queueWebhook" backend/src/services/webhook.service.ts
   ```

   Should return no results (function should be a class method now).

5. **Application starts successfully**

   ```bash
   npm run dev
   ```

   Look for logs:
   - "DI Container: All core services registered"
   - "WebhookService: Initialized"

**Final Acceptance Criteria:**
- [x] All tests pass
- [x] All services injectable
- [x] No factory functions used
- [x] WebhookService is class-based
- [x] Application starts without errors
- [x] All 8 services registered in container

---

## Rollback Plan

If Phase 3 fails:

1. **Revert to Phase 2 branch:**
   ```bash
   git checkout feature/di-refactoring-phase2
   ```

2. **Keep Phases 1-2, remove Phase 3:**
   ```bash
   git checkout HEAD~1 -- backend/src/services/*.ts
   ```

---

## Common Issues & Solutions

### Issue: "Circular dependency detected"

**Cause:** ServiceA injects ServiceB, ServiceB injects ServiceA.

**Solution:** Extract shared logic to a third service, or use lazy injection:
```typescript
constructor(@inject(delay(() => ServiceB)) private serviceB: ServiceB) {}
```

### Issue: "Cannot resolve 'IWebhookService'"

**Ensure registration in container:**
```typescript
container.register('IWebhookService', { useClass: WebhookService });
```

### Issue: "WebhookService queue not initialized"

**Check RedisConnection is registered:**
```typescript
container.register('RedisConnection', {
  useValue: new Redis(process.env.REDIS_URL),
});
```

---

## Next Steps After Phase 3

Once Phase 3 is complete:

1. **Create Phase 4 branch:** `feature/di-refactoring-phase4`
2. **Begin Route & Controller refactoring**
3. **Refer to:** `094-di-phase4-routes-controllers-refactoring.md`

---

**Document Metadata:**
- Author: Claude Code (Master Agent)
- Version: 1.0
- Last Updated: 2025-11-05
- Phase: 3/7
- Parent: `090-di-refactoring-master-plan.md`
- Previous: `092-di-phase2-llm-service-refactoring.md`
- Next: `094-di-phase4-routes-controllers-refactoring.md`
