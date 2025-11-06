# Phase 1: DI Infrastructure Setup - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 2 days
**Priority:** Critical (blocking all other phases)

## Overview

This guide provides step-by-step instructions for Phase 1: setting up the Dependency Injection infrastructure using TSyringe. This is the foundation for all subsequent refactoring phases.

---

## Prerequisites

- [x] Review master plan (`090-di-refactoring-master-plan.md`)
- [x] Team approval for DI approach
- [x] Create feature branch: `feature/di-refactoring-phase1`

---

## Task Breakdown

### Task 1.1: Install Dependencies (15 minutes)

#### Step 1: Install TSyringe
```bash
cd backend
npm install tsyringe reflect-metadata
npm install --save-dev @types/node
```

#### Step 2: Verify Installation
```bash
npm list tsyringe reflect-metadata
```

Expected output:
```
rephlo-sites-backend@1.0.0
├── tsyringe@4.8.0
└── reflect-metadata@0.1.14
```

**Acceptance Criteria:**
- [ ] `tsyringe` and `reflect-metadata` appear in `package.json` dependencies
- [ ] No installation errors

---

### Task 1.2: Configure TypeScript (15 minutes)

#### Step 1: Update `tsconfig.json`

**File:** `backend/tsconfig.json`

Add the following compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",

    // ✨ NEW: Required for TSyringe
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Step 2: Rebuild to Verify
```bash
npm run build
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] No warnings about decorators

---

### Task 1.3: Create Directory Structure (10 minutes)

Create the following directories:

```bash
mkdir -p backend/src/interfaces/services
mkdir -p backend/src/interfaces/providers
mkdir -p backend/src/providers
mkdir -p backend/src/__tests__/mocks
```

Expected structure:
```
backend/src/
├── interfaces/
│   ├── services/          # Service interfaces (IAuthService, ICreditService, etc.)
│   ├── providers/         # Provider interfaces (ILLMProvider, etc.)
│   └── index.ts           # Barrel export
├── providers/             # Concrete provider implementations
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   └── google.provider.ts
├── services/              # Existing services (will be refactored)
├── controllers/           # Existing controllers
├── __tests__/
│   └── mocks/            # Mock implementations for testing
└── container.ts           # DI container setup (NEW)
```

**Acceptance Criteria:**
- [ ] All directories created
- [ ] Directory structure matches above

---

### Task 1.4: Create Core Interface Definitions (2 hours)

#### Step 1: Create Base Types

**File:** `backend/src/interfaces/types.ts`

```typescript
/**
 * Common types used across service interfaces
 */

import { User, Credit, UsageHistory, Model, Subscription } from '@prisma/client';

// Re-export Prisma types for convenience
export type { User, Credit, UsageHistory, Model, Subscription };

// Common input types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}
```

#### Step 2: Create Service Interfaces

**File:** `backend/src/interfaces/services/auth.interface.ts`

```typescript
import { User } from '@prisma/client';

export const IAuthService = Symbol('IAuthService');

export interface IAuthService {
  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by ID
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Create a new user account
   */
  createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User>;

  /**
   * Authenticate user with email and password
   */
  authenticate(email: string, password: string): Promise<User | null>;

  /**
   * Find or create user by account ID (for OIDC provider)
   */
  findAccount(accountId: string): Promise<{
    accountId: string;
    claims: (use: string, scope: string) => Promise<any>;
  } | undefined>;

  /**
   * Hash password using bcrypt
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify password against hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Update user's last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Mark email as verified
   */
  verifyEmail(userId: string): Promise<void>;

  /**
   * Update user password
   */
  updatePassword(userId: string, newPassword: string): Promise<void>;

  /**
   * Deactivate user account
   */
  deactivateAccount(userId: string): Promise<void>;

  /**
   * Soft delete user account
   */
  deleteAccount(userId: string): Promise<void>;

  /**
   * Check if email is available (not taken)
   */
  isEmailAvailable(email: string): Promise<boolean>;

  /**
   * Get user statistics (for admin)
   */
  getUserStats(): Promise<{
    total: number;
    active: number;
    verified: number;
    inactive: number;
  }>;
}
```

**File:** `backend/src/interfaces/services/credit.interface.ts`

```typescript
import { Credit } from '@prisma/client';
import { AllocateCreditsInput, DeductCreditsInput } from '../../types/credit-validation';

export const ICreditService = Symbol('ICreditService');

export interface ICreditService {
  /**
   * Get current credit balance for a user
   */
  getCurrentCredits(userId: string): Promise<Credit | null>;

  /**
   * Allocate credits to a user for a billing period
   */
  allocateCredits(input: AllocateCreditsInput): Promise<Credit>;

  /**
   * Check if user has sufficient credits
   */
  hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean>;

  /**
   * Deduct credits from user's balance (atomic transaction)
   */
  deductCredits(input: DeductCreditsInput): Promise<Credit>;

  /**
   * Get credit balance for a specific billing period
   */
  getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Credit | null>;

  /**
   * Get all credit records for a user (historical)
   */
  getCreditHistory(userId: string, limit?: number): Promise<Credit[]>;

  /**
   * Calculate remaining credits
   */
  calculateRemainingCredits(credit: Credit): number;

  /**
   * Calculate usage percentage (0-100)
   */
  calculateUsagePercentage(credit: Credit): number;

  /**
   * Check if credits are low (below threshold)
   */
  isCreditsLow(credit: Credit, thresholdPercentage?: number): boolean;
}
```

**File:** `backend/src/interfaces/services/usage.interface.ts`

```typescript
import { UsageHistory } from '@prisma/client';

export const IUsageService = Symbol('IUsageService');

export interface RecordUsageInput {
  userId: string;
  creditId: string;
  modelId: string;
  operation: string;
  creditsUsed: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestDurationMs: number;
  requestMetadata?: any;
}

export interface IUsageService {
  /**
   * Record a single usage entry
   */
  recordUsage(data: RecordUsageInput): Promise<void>;

  /**
   * Get usage history for a user
   */
  getUserUsage(userId: string, limit?: number): Promise<UsageHistory[]>;

  /**
   * Get usage by model for a user
   */
  getUsageByModel(userId: string, modelId: string): Promise<UsageHistory[]>;

  /**
   * Get usage statistics for a user
   */
  getUserUsageStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    byModel: Record<string, { requests: number; tokens: number; credits: number }>;
  }>;
}
```

**File:** `backend/src/interfaces/services/webhook.interface.ts`

```typescript
import { WebhookConfig, WebhookLog } from '@prisma/client';

export const IWebhookService = Symbol('IWebhookService');

export type WebhookEventType =
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'subscription.updated'
  | 'credits.depleted'
  | 'credits.low';

export interface IWebhookService {
  /**
   * Queue a webhook for delivery
   */
  queueWebhook(userId: string, eventType: WebhookEventType, eventData: any): Promise<void>;

  /**
   * Send webhook HTTP POST request
   */
  sendWebhook(
    webhookConfigId: string,
    eventType: WebhookEventType,
    payload: any,
    attempt: number
  ): Promise<{ statusCode: number; responseBody: string }>;

  /**
   * Update webhook log with delivery result
   */
  updateWebhookLog(
    webhookLogId: string,
    status: 'success' | 'failed' | 'pending',
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attempts?: number
  ): Promise<void>;

  /**
   * Get webhook configuration for a user
   */
  getWebhookConfig(userId: string): Promise<WebhookConfig | null>;

  /**
   * Create or update webhook configuration
   */
  upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<WebhookConfig>;

  /**
   * Delete webhook configuration
   */
  deleteWebhookConfig(userId: string): Promise<void>;

  /**
   * Get webhook logs for a webhook configuration
   */
  getWebhookLogs(webhookConfigId: string, limit?: number): Promise<WebhookLog[]>;
}
```

#### Step 3: Create Provider Interfaces

**File:** `backend/src/interfaces/providers/llm-provider.interface.ts`

```typescript
import { Response } from 'express';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
  ChatCompletionResponse,
  TextCompletionResponse,
} from '../../types/model-validation';

export const ILLMProvider = Symbol('ILLMProvider');

/**
 * Common interface for all LLM providers
 * Implements the Strategy Pattern for provider-agnostic inference
 */
export interface ILLMProvider {
  /**
   * Unique provider identifier (e.g., "openai", "anthropic", "google")
   */
  readonly providerName: string;

  /**
   * Execute chat completion
   * Returns response and usage data (without credit calculation)
   */
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;

  /**
   * Execute streaming chat completion
   * Returns total tokens used
   */
  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number>;

  /**
   * Execute text completion
   * Returns response and usage data (without credit calculation)
   */
  textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;

  /**
   * Execute streaming text completion
   * Returns total tokens used
   */
  streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<number>;
}
```

#### Step 4: Create Barrel Export

**File:** `backend/src/interfaces/index.ts`

```typescript
/**
 * Central export for all interfaces
 * Allows clean imports: import { IAuthService, ICreditService } from '../interfaces';
 */

// Service interfaces
export * from './services/auth.interface';
export * from './services/credit.interface';
export * from './services/usage.interface';
export * from './services/webhook.interface';

// Provider interfaces
export * from './providers/llm-provider.interface';

// Common types
export * from './types';
```

**Acceptance Criteria:**
- [ ] All interface files created
- [ ] No TypeScript compilation errors
- [ ] Barrel export works (test with `import { IAuthService } from './interfaces'`)

---

### Task 1.5: Create DI Container Bootstrap (1 hour)

**File:** `backend/src/container.ts`

```typescript
/**
 * Dependency Injection Container Configuration
 *
 * This file sets up the TSyringe container and registers all services,
 * providers, and infrastructure dependencies.
 *
 * Usage:
 *   import { container } from './container';
 *   const service = container.resolve<IAuthService>('IAuthService');
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './utils/logger';

// ============================================================================
// Infrastructure Registration (Singletons)
// ============================================================================

/**
 * Register Prisma Client (singleton)
 * Shared across all services for database access
 */
container.register('PrismaClient', {
  useValue: new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  }),
});

/**
 * Register Redis Connection (singleton)
 * Used for caching, sessions, and BullMQ queues
 */
container.register('RedisConnection', {
  useValue: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  }),
});

// ============================================================================
// LLM SDK Clients (Singletons)
// ============================================================================

/**
 * Register OpenAI Client
 */
if (process.env.OPENAI_API_KEY) {
  container.register('OpenAIClient', {
    useValue: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });
  logger.info('DI Container: OpenAI client registered');
} else {
  logger.warn('DI Container: OPENAI_API_KEY not set, OpenAI provider will not be available');
}

/**
 * Register Anthropic Client
 */
if (process.env.ANTHROPIC_API_KEY) {
  container.register('AnthropicClient', {
    useValue: new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  });
  logger.info('DI Container: Anthropic client registered');
} else {
  logger.warn('DI Container: ANTHROPIC_API_KEY not set, Anthropic provider will not be available');
}

/**
 * Register Google AI Client
 */
if (process.env.GOOGLE_API_KEY) {
  container.register('GoogleClient', {
    useValue: new GoogleGenerativeAI(process.env.GOOGLE_API_KEY),
  });
  logger.info('DI Container: Google AI client registered');
} else {
  logger.warn('DI Container: GOOGLE_API_KEY not set, Google provider will not be available');
}

// ============================================================================
// Service Registration
// ============================================================================

// Services will be registered in Phase 2 and 3
// Example (to be uncommented when services are refactored):
// import { AuthService } from './services/auth.service';
// container.register('IAuthService', { useClass: AuthService });

// ============================================================================
// Provider Registration
// ============================================================================

// Providers will be registered in Phase 2
// Example (to be uncommented when providers are created):
// import { OpenAIProvider } from './providers/openai.provider';
// container.register('ILLMProvider', { useClass: OpenAIProvider });

// ============================================================================
// Container Health Check
// ============================================================================

/**
 * Verify container is properly configured
 * Logs registered services for debugging
 */
export function verifyContainer(): void {
  try {
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    const redis = container.resolve<Redis>('RedisConnection');

    logger.info('DI Container: Verified infrastructure dependencies', {
      prisma: !!prisma,
      redis: !!redis,
    });
  } catch (error) {
    logger.error('DI Container: Verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Clean up container resources on shutdown
 */
export async function disposeContainer(): Promise<void> {
  try {
    logger.info('DI Container: Disposing resources...');

    const prisma = container.resolve<PrismaClient>('PrismaClient');
    await prisma.$disconnect();
    logger.info('DI Container: Prisma disconnected');

    const redis = container.resolve<Redis>('RedisConnection');
    await redis.quit();
    logger.info('DI Container: Redis disconnected');

    logger.info('DI Container: All resources disposed successfully');
  } catch (error) {
    logger.error('DI Container: Error during disposal', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Export Container
// ============================================================================

export { container };

// Log container initialization
logger.info('DI Container: Initialized successfully');
```

**Acceptance Criteria:**
- [ ] Container file compiles without errors
- [ ] Prisma and Redis registered successfully
- [ ] LLM clients registered (if API keys present)
- [ ] Container verification function works

---

### Task 1.6: Update Application Entry Point (30 minutes)

**File:** `backend/src/index.ts` or `backend/src/server.ts`

Add at the very top (before any other imports):

```typescript
/**
 * ⚠️ CRITICAL: This import must be FIRST
 * reflect-metadata must be imported before any other imports
 * for TSyringe decorators to work correctly
 */
import 'reflect-metadata';

// Now import container to initialize it
import { container, verifyContainer, disposeContainer } from './container';

// Rest of your imports
import express from 'express';
import { PrismaClient } from '@prisma/client';
// ... other imports

// Verify container is properly configured
verifyContainer();

// Your existing application setup
const app = express();

// ... middleware, routes, etc.

// Update graceful shutdown to use container disposal
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disposeContainer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disposeContainer();
  process.exit(0);
});
```

**Acceptance Criteria:**
- [ ] `reflect-metadata` imported first
- [ ] Container verification runs on startup
- [ ] Graceful shutdown uses `disposeContainer()`
- [ ] Application starts without errors

---

### Task 1.7: Verify Phase 1 Completion (30 minutes)

#### Verification Checklist

1. **Dependencies Installed**
   ```bash
   npm list tsyringe reflect-metadata
   ```

2. **TypeScript Compiles**
   ```bash
   npm run build
   ```
   - [ ] No errors
   - [ ] No decorator warnings

3. **Container Initializes**
   ```bash
   npm run dev
   ```
   - [ ] See log: "DI Container: Initialized successfully"
   - [ ] See log: "DI Container: Verified infrastructure dependencies"
   - [ ] Application starts normally

4. **Import Test**
   Create a test file to verify interfaces can be imported:

   **File:** `backend/src/__tests__/container.test.ts`

   ```typescript
   import 'reflect-metadata';
   import { container } from '../container';
   import { IAuthService, ICreditService } from '../interfaces';
   import { PrismaClient } from '@prisma/client';

   describe('DI Container', () => {
     it('should resolve PrismaClient', () => {
       const prisma = container.resolve<PrismaClient>('PrismaClient');
       expect(prisma).toBeDefined();
     });

     it('should verify container successfully', () => {
       expect(() => {
         const { verifyContainer } = require('../container');
         verifyContainer();
       }).not.toThrow();
     });
   });
   ```

   Run test:
   ```bash
   npm test container.test.ts
   ```

5. **File Structure Verification**
   ```bash
   tree backend/src/interfaces
   tree backend/src/providers
   ```

   Expected output:
   ```
   backend/src/interfaces/
   ├── index.ts
   ├── types.ts
   ├── services/
   │   ├── auth.interface.ts
   │   ├── credit.interface.ts
   │   ├── usage.interface.ts
   │   └── webhook.interface.ts
   └── providers/
       └── llm-provider.interface.ts

   backend/src/providers/
   (empty for now, will be populated in Phase 2)
   ```

**Final Acceptance Criteria:**
- [ ] All verification steps pass
- [ ] No TypeScript errors
- [ ] Application starts and runs normally
- [ ] Container test passes
- [ ] Graceful shutdown works

---

## Rollback Plan

If any step fails critically:

1. **Revert TypeScript Config:**
   ```bash
   git checkout backend/tsconfig.json
   ```

2. **Remove Dependencies:**
   ```bash
   npm uninstall tsyringe reflect-metadata
   ```

3. **Delete New Files:**
   ```bash
   rm -rf backend/src/interfaces
   rm -rf backend/src/providers
   rm backend/src/container.ts
   ```

4. **Restore Entry Point:**
   ```bash
   git checkout backend/src/index.ts
   ```

---

## Next Steps After Phase 1

Once Phase 1 is complete and verified:

1. **Create Phase 2 branch:** `feature/di-refactoring-phase2`
2. **Begin LLM Service refactoring** (highest impact)
3. **Refer to:** `090-di-refactoring-master-plan.md` Phase 2 section

---

## Troubleshooting

### Issue: "Cannot find module 'reflect-metadata'"

**Solution:**
```bash
npm install reflect-metadata
# Ensure it's imported first in index.ts
```

### Issue: "Decorators are not valid here"

**Solution:**
Verify `tsconfig.json` has:
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

### Issue: "Cannot resolve 'PrismaClient' from container"

**Solution:**
Verify `container.ts` is imported in `index.ts`:
```typescript
import { container, verifyContainer } from './container';
verifyContainer(); // Should log success
```

---

**Document Metadata:**
- Author: Claude Code
- Version: 1.0
- Last Updated: 2025-11-05
- Parent: `090-di-refactoring-master-plan.md`
- Next: Phase 2 LLM Service Refactoring
