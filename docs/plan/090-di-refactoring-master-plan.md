# Dependency Injection & Strategy Pattern Refactoring - Master Plan

**Status:** Draft
**Created:** 2025-11-05
**Priority:** High
**Complexity:** High
**Estimated Duration:** 3-4 weeks

## Executive Summary

This document outlines a comprehensive refactoring plan to introduce **Dependency Injection (DI)** and the **Strategy Pattern** across the entire backend codebase. The refactoring addresses critical code quality issues including tight coupling, poor testability, hidden dependencies, and violations of the Open/Closed Principle.

### Key Benefits

1. **Massively Improved Testability** - Mock dependencies easily, no database or API calls in unit tests
2. **Loose Coupling** - Services depend on interfaces, not concrete implementations
3. **Open/Closed Principle** - Add new providers/features without modifying existing code
4. **Explicit Dependencies** - All dependencies declared in constructors, no hidden globals
5. **Maintainability** - Clean separation of concerns, focused single-responsibility classes
6. **Scalability** - Easy to swap implementations, add new features, and scale the system

### Current Problems

Based on analysis of the codebase (52 TypeScript files), the following anti-patterns are prevalent:

#### 1. Tight Coupling (Service Self-Construction)
```typescript
// Current: Services create their own dependencies
class LLMService {
  constructor(prisma?: PrismaClient) {
    this.usageService = new UsageService(prisma);    // ❌ Tight coupling
    this.creditService = new CreditService(prisma);  // ❌ Tight coupling
  }
}
```

#### 2. Hidden Global Dependencies
```typescript
// Current: Global module-level variables
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

// Services just assume these exist
private async openaiChatCompletion(...) {
  if (!openaiClient) {  // ❌ Hidden dependency
    throw new Error('OpenAI client not initialized');
  }
}
```

#### 3. Testability Hacks
```typescript
// Current: Optional parameters to "enable" testing
constructor(prisma?: PrismaClient) {
  if (prisma) {
    this.usageService = new UsageService(prisma);
  } else {
    this.usageService = null as any;  // ❌ Type safety violation
  }
}
```

#### 4. Violation of Open/Closed Principle
```typescript
// Current: Switch statements repeated in 4+ methods
switch (modelProvider) {
  case 'openai':
    return await this.openaiChatCompletion(...);
  case 'anthropic':
    return await this.anthropicChatCompletion(...);
  case 'google':
    return await this.googleChatCompletion(...);
  // To add Mistral: modify all 4 methods ❌
}
```

#### 5. Function-Based Services with Global State
```typescript
// Current: webhook.service.ts creates global instances
const prisma = new PrismaClient();  // ❌ Global singleton
const connection = new Redis(...);  // ❌ Global connection
```

---

## Architecture Overview

### Chosen DI Container: **TSyringe**

After evaluation, **TSyringe** is recommended over InversifyJS for these reasons:

1. **Decorator-based** - Clean, minimal boilerplate
2. **TypeScript-first** - Excellent TypeScript support with `reflect-metadata`
3. **Lightweight** - Smaller bundle size, simpler API
4. **Constructor injection** - Natural TypeScript pattern
5. **Microsoft-backed** - Good maintenance and community support

### Core Principles

#### 1. Interface-Based Design (Strategy Pattern)
```typescript
// All providers implement a common interface
interface ILLMProvider {
  readonly providerName: string;
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number>;
}
```

#### 2. Constructor Injection
```typescript
// Dependencies declared explicitly in constructor
@injectable()
class LLMService {
  constructor(
    @inject(IUsageService) private usageService: IUsageService,
    @inject(ICreditService) private creditService: ICreditService,
    @injectAll(ILLMProvider) private providers: ILLMProvider[]
  ) {
    // Initialize provider map
    this.providerMap = new Map(
      providers.map(p => [p.providerName, p])
    );
  }
}
```

#### 3. Lifecycle Management
- **Singleton** - Services, infrastructure (Prisma, Redis)
- **Transient** - Per-request objects (rarely needed)
- **Scoped** - Request-scoped services (if needed for request context)

---

## Refactoring Phases

### Phase 1: Infrastructure Setup (Week 1, Days 1-2)

#### 1.1 Install Dependencies
```bash
npm install tsyringe reflect-metadata
npm install --save-dev @types/node
```

#### 1.2 Configure TypeScript
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2020",
    "moduleResolution": "node"
  }
}
```

#### 1.3 Create Interface Definitions

**File:** `backend/src/interfaces/index.ts`

```typescript
// Export all interfaces from a central location
export * from './services/auth.interface';
export * from './services/credit.interface';
export * from './services/llm.interface';
export * from './services/usage.interface';
export * from './services/webhook.interface';
export * from './providers/llm-provider.interface';
```

**Deliverables:**
- [ ] TSyringe installed and configured
- [ ] Interface definitions created for all services
- [ ] DI container bootstrap file created (`backend/src/container.ts`)

---

### Phase 2: LLM Service Refactoring (Week 1, Days 3-5)

This is the **highest priority** as it demonstrates the full DI + Strategy Pattern approach.

#### 2.1 Create Provider Interface

**File:** `backend/src/interfaces/providers/llm-provider.interface.ts`

```typescript
import { Response } from 'express';
import { ChatCompletionRequest, TextCompletionRequest } from '../../types/model-validation';

export const ILLMProvider = Symbol('ILLMProvider');

export interface ILLMProvider {
  /** Unique provider name (e.g., "openai", "anthropic") */
  readonly providerName: string;

  /** Execute chat completion */
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: Omit<ChatCompletionResponse['usage'], 'credits_used'>;
  }>;

  /** Execute streaming chat completion */
  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number>;

  /** Execute text completion */
  textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: Omit<TextCompletionResponse['usage'], 'credits_used'>;
  }>;

  /** Execute streaming text completion */
  streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<number>;
}
```

#### 2.2 Create Concrete Providers

**File:** `backend/src/providers/openai.provider.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import OpenAI from 'openai';
import { ILLMProvider } from '../interfaces/providers/llm-provider.interface';

@injectable()
export class OpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  constructor(@inject('OpenAIClient') private client: OpenAI) {}

  async chatCompletion(request: ChatCompletionRequest): Promise<...> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      // ... other parameters
    });

    return {
      response: {
        id: completion.id,
        object: 'chat.completion',
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content || '',
          },
          finish_reason: choice.finish_reason,
        })),
      },
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  // Implement other methods: streamChatCompletion, textCompletion, streamTextCompletion
}
```

**Files to create:**
- [ ] `backend/src/providers/openai.provider.ts`
- [ ] `backend/src/providers/anthropic.provider.ts`
- [ ] `backend/src/providers/google.provider.ts`

#### 2.3 Refactor LLMService

**File:** `backend/src/services/llm.service.ts` (refactored)

```typescript
import { injectable, inject, injectAll } from 'tsyringe';
import { ILLMProvider } from '../interfaces/providers/llm-provider.interface';
import { IUsageService, ICreditService } from '../interfaces';

@injectable()
export class LLMService {
  private providerMap: Map<string, ILLMProvider>;

  constructor(
    @inject('IUsageService') private usageService: IUsageService,
    @inject('ICreditService') private creditService: ICreditService,
    @injectAll('ILLMProvider') allProviders: ILLMProvider[]
  ) {
    // Build provider map for O(1) lookup
    this.providerMap = new Map(
      allProviders.map(p => [p.providerName, p])
    );
  }

  private getProvider(providerName: string): ILLMProvider {
    const provider = this.providerMap.get(providerName);
    if (!provider) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
    return provider;
  }

  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string
  ): Promise<ChatCompletionResponse> {
    // 1. Get provider (Strategy Pattern)
    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();

    try {
      // 2. Delegate provider-specific work
      const { response, usage } = await provider.chatCompletion(request);

      // 3. Business logic (credit calculation)
      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil((usage.total_tokens / 1000) * creditsPer1kTokens);

      const finalResponse: ChatCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          credits_used: creditsUsed,
        },
      };

      // 4. Cross-cutting concerns (logging, usage recording)
      await this.recordUsage(userId, request.model, 'chat', finalResponse.usage, duration);

      return finalResponse;
    } catch (error) {
      logger.error('LLMService: Chat completion failed', { error });
      throw error;
    }
  }

  private async recordUsage(...) {
    // Consolidated usage recording logic
    if (this.usageService && this.creditService) {
      const credit = await this.creditService.getCurrentCredits(userId);
      if (credit) {
        await this.usageService.recordUsage({ ... });
      }
    }
  }

  // Other methods: streamChatCompletion, textCompletion, streamTextCompletion
  // All follow the same pattern: get provider -> delegate -> handle business logic
}
```

#### 2.4 Register in DI Container

**File:** `backend/src/container.ts`

```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { LLMService } from './services/llm.service';
import { UsageService } from './services/usage.service';
import { CreditService } from './services/credit.service';

// Register SDK clients (singletons)
container.register('OpenAIClient', {
  useValue: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
});

container.register('AnthropicClient', {
  useValue: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

container.register('GoogleClient', {
  useValue: new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!),
});

// Register Prisma (singleton)
container.register('PrismaClient', {
  useValue: new PrismaClient(),
});

// Register providers (implement ILLMProvider)
container.register('ILLMProvider', { useClass: OpenAIProvider });
container.register('ILLMProvider', { useClass: AnthropicProvider });
container.register('ILLMProvider', { useClass: GoogleProvider });

// Register services
container.register('IUsageService', { useClass: UsageService });
container.register('ICreditService', { useClass: CreditService });
container.registerSingleton(LLMService);

export { container };
```

**Deliverables:**
- [ ] Provider interface defined
- [ ] OpenAI provider implemented
- [ ] Anthropic provider implemented
- [ ] Google provider implemented
- [ ] LLMService refactored to use DI
- [ ] Container registration complete
- [ ] Tests pass

---

### Phase 3: Core Services Refactoring (Week 2)

Refactor remaining services to use DI pattern.

#### 3.1 Service Interfaces

**File:** `backend/src/interfaces/services/usage.interface.ts`

```typescript
export const IUsageService = Symbol('IUsageService');

export interface IUsageService {
  recordUsage(data: RecordUsageInput): Promise<void>;
  getUserUsage(userId: string, options?: UsageQueryOptions): Promise<UsageHistory[]>;
  getUsageByModel(userId: string, modelId: string): Promise<UsageHistory[]>;
  // ... other methods
}
```

**File:** `backend/src/interfaces/services/credit.interface.ts`

```typescript
export const ICreditService = Symbol('ICreditService');

export interface ICreditService {
  getCurrentCredits(userId: string): Promise<Credit | null>;
  allocateCredits(input: AllocateCreditsInput): Promise<Credit>;
  deductCredits(input: DeductCreditsInput): Promise<Credit>;
  hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean>;
  // ... other methods
}
```

#### 3.2 Refactor Services

**Services to refactor:**
1. [ ] `auth.service.ts` - Add `@injectable()`, inject `PrismaClient`
2. [ ] `user.service.ts` - Add `@injectable()`, inject `PrismaClient`
3. [ ] `usage.service.ts` - Add `@injectable()`, inject `PrismaClient`
4. [ ] `model.service.ts` - Add `@injectable()`, inject `PrismaClient`
5. [ ] `subscription.service.ts` - Add `@injectable()`, inject dependencies
6. [ ] `stripe.service.ts` - Add `@injectable()`, inject Stripe client
7. [ ] `credit.service.ts` - Remove `queueWebhook` direct call, inject `IWebhookService`

**Pattern for each service:**

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { IAuthService } from '../interfaces';

@injectable()
export class AuthService implements IAuthService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  // Methods remain the same, just use this.prisma
}
```

#### 3.3 Webhook Service Refactoring

This service needs special attention as it currently uses global state.

**Before:**
```typescript
const prisma = new PrismaClient();
const connection = new Redis(redisUrl, { ... });

export async function queueWebhook(...) {
  const webhookConfig = await prisma.webhookConfig.findUnique(...);
  await webhookQueue.add(...);
}
```

**After:**
```typescript
@injectable()
export class WebhookService implements IWebhookService {
  private webhookQueue: Queue<WebhookJobData>;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('RedisConnection') redisConnection: Redis
  ) {
    this.webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
      connection: redisConnection,
      defaultJobOptions: { ... },
    });
  }

  async queueWebhook(userId: string, eventType: WebhookEventType, eventData: any): Promise<void> {
    const webhookConfig = await this.prisma.webhookConfig.findUnique({ where: { userId } });
    // ... rest of logic
  }
}
```

**Deliverables:**
- [ ] All service interfaces defined
- [ ] All services refactored to use `@injectable()`
- [ ] Webhook service converted from functions to class
- [ ] Container registrations updated

---

### Phase 4: Route & Controller Refactoring (Week 2-3)

Update routes and controllers to use DI container instead of manual instantiation.

#### 4.1 Controller Pattern

**Before:**
```typescript
export function createUsersController(prisma: PrismaClient) {
  const userService = new UserService(prisma);
  return new UsersController(userService);
}
```

**After:**
```typescript
import { injectable, inject } from 'tsyringe';
import { IUserService } from '../interfaces';

@injectable()
export class UsersController {
  constructor(@inject('IUserService') private userService: IUserService) {}

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const user = await this.userService.findById(userId);
    res.json(user);
  }
}
```

#### 4.2 Route Registration

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
```typescript
import { container } from '../container';
import { UsersController } from '../controllers/users.controller';

export function createV1Router(): Router {
  const router = Router();
  const usersController = container.resolve(UsersController);

  router.get('/users/me', authMiddleware, asyncHandler(usersController.getCurrentUser.bind(usersController)));
  return router;
}
```

**Controllers to refactor:**
- [ ] `users.controller.ts`
- [ ] `models.controller.ts`
- [ ] `subscriptions.controller.ts`
- [ ] `credits.controller.ts`
- [ ] `webhooks.controller.ts`
- [ ] `admin.controller.ts` (if exists)

**Deliverables:**
- [ ] All controllers refactored to use `@injectable()`
- [ ] All routes updated to use `container.resolve()`
- [ ] Factory functions removed

---

### Phase 5: Middleware Refactoring (Week 3)

Update middleware to use DI container.

#### 5.1 Credit Middleware

**Before:**
```typescript
export function checkCredits(prisma: PrismaClient) {
  const creditService = createCreditService(prisma);
  return async (req, res, next) => {
    const credit = await creditService.getCurrentCredits(userId);
    // ...
  };
}
```

**After:**
```typescript
import { container } from '../container';
import { ICreditService } from '../interfaces';

export function checkCredits() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const creditService = container.resolve<ICreditService>('ICreditService');
    const credit = await creditService.getCurrentCredits(userId);
    // ...
  };
}
```

**Middleware to refactor:**
- [ ] `credit.middleware.ts` - Remove `prisma` parameter, use container
- [ ] `auth.middleware.ts` - Inject dependencies if needed
- [ ] `ratelimit.middleware.ts` - Use container for Redis connection

**Deliverables:**
- [ ] All middleware updated to use container
- [ ] Middleware no longer accept `prisma` parameters

---

### Phase 6: Application Bootstrap (Week 3)

Update application entry point to initialize DI container.

#### 6.1 Update `index.ts` or `server.ts`

**Before:**
```typescript
const prisma = new PrismaClient();
const app = express();

app.use('/v1', createV1Router(prisma));
```

**After:**
```typescript
import 'reflect-metadata'; // Must be first import
import { container } from './container';
import express from 'express';

// Container is already initialized in container.ts
const app = express();

app.use('/v1', createV1Router()); // No parameters needed
```

#### 6.2 Graceful Shutdown

Update shutdown logic to dispose of container resources:

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Dispose container resources
  const prisma = container.resolve<PrismaClient>('PrismaClient');
  await prisma.$disconnect();

  const redis = container.resolve<Redis>('RedisConnection');
  await redis.quit();

  process.exit(0);
});
```

**Deliverables:**
- [ ] Application bootstrap updated
- [ ] `reflect-metadata` imported first
- [ ] Graceful shutdown handles DI cleanup

---

### Phase 7: Testing Infrastructure (Week 4)

Create mock implementations and test harness.

#### 7.1 Mock Service Implementations

**File:** `backend/src/__tests__/mocks/services.mock.ts`

```typescript
import { ILLMProvider, ICreditService, IUsageService } from '../../interfaces';

export class MockOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: 'mock-completion',
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Mock response' },
          finish_reason: 'stop',
        }],
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  // Implement other methods with mock data
}

export class MockCreditService implements ICreditService {
  private mockCredits: Map<string, Credit> = new Map();

  async getCurrentCredits(userId: string): Promise<Credit | null> {
    return this.mockCredits.get(userId) || null;
  }

  // Implement other methods with in-memory state
}
```

#### 7.2 Test Container Setup

**File:** `backend/src/__tests__/test-container.ts`

```typescript
import { container } from 'tsyringe';
import { MockOpenAIProvider, MockCreditService } from './mocks/services.mock';

export function setupTestContainer() {
  const testContainer = container.createChildContainer();

  // Register mocks
  testContainer.register('ILLMProvider', { useClass: MockOpenAIProvider });
  testContainer.register('ICreditService', { useClass: MockCreditService });

  return testContainer;
}
```

#### 7.3 Example Unit Test

**File:** `backend/src/__tests__/services/llm.service.test.ts`

```typescript
import { setupTestContainer } from '../test-container';
import { LLMService } from '../../services/llm.service';

describe('LLMService', () => {
  let testContainer: DependencyContainer;
  let llmService: LLMService;

  beforeEach(() => {
    testContainer = setupTestContainer();
    llmService = testContainer.resolve(LLMService);
  });

  it('should complete chat request using OpenAI provider', async () => {
    const request: ChatCompletionRequest = {
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const response = await llmService.chatCompletion(request, 'openai', 2, 'user-123');

    expect(response.choices[0].message.content).toBe('Mock response');
    expect(response.usage.total_tokens).toBe(30);
  });

  afterEach(() => {
    testContainer.reset();
  });
});
```

**Deliverables:**
- [ ] Mock implementations for all services
- [ ] Test container setup
- [ ] Unit tests for LLMService
- [ ] Unit tests for other core services
- [ ] Integration tests updated

---

## File Size Management (SOLID Compliance)

As part of this refactoring, we'll address the **1,200 line per file** guideline.

### Files to Split

#### 1. `llm.service.ts` (1,142 lines → split into modules)

**New structure:**
```
backend/src/services/llm/
  ├── llm.service.ts          (200 lines) - Main orchestration
  ├── usage-recorder.ts       (100 lines) - Usage recording logic
  └── error-handler.ts        (100 lines) - Error handling

backend/src/providers/
  ├── openai.provider.ts      (300 lines) - OpenAI implementation
  ├── anthropic.provider.ts   (300 lines) - Anthropic implementation
  └── google.provider.ts      (300 lines) - Google implementation
```

#### 2. Other Large Files

Analyze and split if needed:
- [ ] `v1.routes.ts` - If > 1,200 lines, split by domain (users, models, etc.)
- [ ] Controller files - Split by feature if too large

---

## Migration Strategy

### Approach: Gradual Migration (Not Big Bang)

1. **Phase-by-phase rollout** - Complete one phase before starting the next
2. **Parallel operation** - Old and new patterns coexist temporarily
3. **Feature flags** - Use environment variable to toggle DI on/off
4. **Backward compatibility** - Keep factory functions during transition

### Risk Mitigation

1. **Comprehensive testing** - All existing tests must pass after each phase
2. **Code reviews** - Peer review for each major service refactoring
3. **Rollback plan** - Git branches for each phase, easy to revert
4. **Monitoring** - Track errors and performance during rollout

---

## Success Metrics

### Code Quality Metrics

- [ ] **Test Coverage:** > 80% (up from current ~60%)
- [ ] **File Size:** All files < 1,200 lines
- [ ] **Cyclomatic Complexity:** Average < 10 per method
- [ ] **Dependency Graph:** No circular dependencies

### Functional Metrics

- [ ] **All existing tests pass**
- [ ] **No regressions** in API functionality
- [ ] **Build time:** No significant increase
- [ ] **Runtime performance:** No degradation

### Developer Experience

- [ ] **Add new LLM provider:** < 1 hour (create provider class, register in container)
- [ ] **Write unit test:** < 15 minutes (use mock container)
- [ ] **Onboard new developer:** Understand DI pattern in < 1 day

---

## Appendix

### A. TSyringe Quick Reference

```typescript
// Registration
container.register('Token', { useClass: ConcreteClass });
container.register('Token', { useValue: instance });
container.registerSingleton('Token', ConcreteClass);

// Resolution
const service = container.resolve<IService>('Token');

// Multi-registration (for strategies)
container.register('ILLMProvider', { useClass: OpenAIProvider });
container.register('ILLMProvider', { useClass: AnthropicProvider });
const providers = container.resolveAll<ILLMProvider>('ILLMProvider');
```

### B. Common Patterns

#### Provider Pattern (Strategy)
```typescript
interface IProvider {
  readonly name: string;
  execute(...): Promise<Result>;
}

class ServiceA {
  private providerMap: Map<string, IProvider>;

  constructor(@injectAll('IProvider') providers: IProvider[]) {
    this.providerMap = new Map(providers.map(p => [p.name, p]));
  }

  async execute(providerName: string, ...) {
    const provider = this.providerMap.get(providerName);
    return await provider.execute(...);
  }
}
```

#### Factory Pattern (when needed)
```typescript
@injectable()
class ProviderFactory {
  constructor(@injectAll('IProvider') private providers: IProvider[]) {}

  create(name: string): IProvider {
    return this.providers.find(p => p.name === name)!;
  }
}
```

### C. Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Infrastructure | 2 days | TSyringe setup, interfaces, container bootstrap |
| Phase 2: LLM Service | 3 days | Providers, LLM service refactor, tests |
| Phase 3: Core Services | 5 days | All services refactored with DI |
| Phase 4: Routes/Controllers | 4 days | Controllers and routes using container |
| Phase 5: Middleware | 2 days | Middleware using container |
| Phase 6: Bootstrap | 1 day | Application entry point updated |
| Phase 7: Testing | 3 days | Mock implementations, unit tests |
| **Total** | **20 days** | **Fully DI-enabled codebase** |

---

## Next Steps

1. **Review this plan** with the team
2. **Get approval** for the refactoring approach
3. **Create Phase 1 implementation plan** (detailed task breakdown)
4. **Set up feature branch** for Phase 1 work
5. **Begin implementation** with LLM service (highest impact)

---

**Document Metadata:**
- Author: Claude Code
- Version: 1.0
- Last Updated: 2025-11-05
- Related Documents:
  - `073-dedicated-api-backend-specification.md` (API endpoints)
  - `089-comprehensive-qa-verification-report.md` (QA baseline)
