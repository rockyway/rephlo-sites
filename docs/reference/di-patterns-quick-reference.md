# Dependency Injection Patterns - Quick Reference

**Status:** Reference
**Created:** 2025-11-05
**Audience:** All backend developers
**Related:** `docs/plan/090-di-refactoring-master-plan.md`

## Overview

This document provides quick copy-paste examples of common DI patterns used in the refactored codebase. Use this as a reference when implementing new features or refactoring existing code.

---

## Table of Contents

1. [Basic Service Pattern](#basic-service-pattern)
2. [Strategy Pattern (Multiple Implementations)](#strategy-pattern)
3. [Service with Dependencies](#service-with-dependencies)
4. [Middleware Pattern](#middleware-pattern)
5. [Controller Pattern](#controller-pattern)
6. [Testing with Mocks](#testing-with-mocks)

---

## Basic Service Pattern

### Simple Service (No Dependencies)

```typescript
// interfaces/services/example.interface.ts
export const IExampleService = Symbol('IExampleService');

export interface IExampleService {
  doSomething(param: string): Promise<string>;
}
```

```typescript
// services/example.service.ts
import { injectable } from 'tsyringe';
import { IExampleService } from '../interfaces';

@injectable()
export class ExampleService implements IExampleService {
  async doSomething(param: string): Promise<string> {
    return `Processed: ${param}`;
  }
}
```

```typescript
// container.ts
import { ExampleService } from './services/example.service';

container.register('IExampleService', { useClass: ExampleService });
```

```typescript
// Usage
import { container } from './container';
import { IExampleService } from './interfaces';

const service = container.resolve<IExampleService>('IExampleService');
await service.doSomething('test');
```

---

## Service with Dependencies

### Service with Prisma Dependency

```typescript
// services/user.service.ts
import { injectable, inject } from 'tsyringe';
import { PrismaClient, User } from '@prisma/client';
import { IUserService } from '../interfaces';

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async create(email: string): Promise<User> {
    return this.prisma.user.create({
      data: { email },
    });
  }
}
```

### Service with Multiple Dependencies

```typescript
// services/complex.service.ts
import { injectable, inject } from 'tsyringe';
import { IAuthService, ICreditService, IUsageService } from '../interfaces';

@injectable()
export class ComplexService {
  constructor(
    @inject('IAuthService') private authService: IAuthService,
    @inject('ICreditService') private creditService: ICreditService,
    @inject('IUsageService') private usageService: IUsageService
  ) {}

  async processRequest(userId: string): Promise<void> {
    // Use all injected services
    const user = await this.authService.findById(userId);
    const credits = await this.creditService.getCurrentCredits(userId);
    await this.usageService.recordUsage({ ... });
  }
}
```

---

## Strategy Pattern

### Provider Interface + Multiple Implementations

**Use case:** LLM providers (OpenAI, Anthropic, Google), payment processors, notification channels

```typescript
// interfaces/providers/llm-provider.interface.ts
export const ILLMProvider = Symbol('ILLMProvider');

export interface ILLMProvider {
  readonly providerName: string;
  execute(request: any): Promise<any>;
}
```

```typescript
// providers/openai.provider.ts
import { injectable, inject } from 'tsyringe';
import OpenAI from 'openai';
import { ILLMProvider } from '../interfaces';

@injectable()
export class OpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  constructor(@inject('OpenAIClient') private client: OpenAI) {}

  async execute(request: any): Promise<any> {
    // OpenAI-specific implementation
    return await this.client.chat.completions.create(request);
  }
}
```

```typescript
// providers/anthropic.provider.ts
import { injectable, inject } from 'tsyringe';
import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider } from '../interfaces';

@injectable()
export class AnthropicProvider implements ILLMProvider {
  public readonly providerName = 'anthropic';

  constructor(@inject('AnthropicClient') private client: Anthropic) {}

  async execute(request: any): Promise<any> {
    // Anthropic-specific implementation
    return await this.client.messages.create(request);
  }
}
```

```typescript
// container.ts - Register multiple providers
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

container.register('ILLMProvider', { useClass: OpenAIProvider });
container.register('ILLMProvider', { useClass: AnthropicProvider });
```

```typescript
// services/llm.service.ts - Use all providers
import { injectable, injectAll } from 'tsyringe';
import { ILLMProvider } from '../interfaces';

@injectable()
export class LLMService {
  private providerMap: Map<string, ILLMProvider>;

  constructor(@injectAll('ILLMProvider') allProviders: ILLMProvider[]) {
    // Build map for O(1) lookup
    this.providerMap = new Map(
      allProviders.map(p => [p.providerName, p])
    );
  }

  async execute(providerName: string, request: any): Promise<any> {
    const provider = this.providerMap.get(providerName);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    return await provider.execute(request);
  }
}
```

**Benefits:**
- ✅ Add new provider: Just create class and register in container
- ✅ No modification to LLMService (Open/Closed Principle)
- ✅ Easy to test each provider in isolation

---

## Middleware Pattern

### Before (Manual Dependency Passing)

```typescript
// ❌ Old way
export function checkCredits(prisma: PrismaClient) {
  const creditService = createCreditService(prisma);
  return async (req, res, next) => {
    const credit = await creditService.getCurrentCredits(userId);
    // ...
  };
}

// Routes have to pass prisma everywhere
app.use(checkCredits(prisma));
```

### After (DI Container)

```typescript
// ✅ New way
import { container } from '../container';
import { ICreditService } from '../interfaces';

export function checkCredits() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Resolve service from container
    const creditService = container.resolve<ICreditService>('ICreditService');

    const userId = req.user!.sub;
    const credit = await creditService.getCurrentCredits(userId);

    if (!credit) {
      throw forbiddenError('No active subscription');
    }

    next();
  };
}

// Routes don't need to know about dependencies
app.use(checkCredits());
```

**Benefits:**
- ✅ No parameter passing through middleware stack
- ✅ Easy to swap service implementations
- ✅ Testable with mock services

---

## Controller Pattern

### Before (Factory Function)

```typescript
// ❌ Old way
export function createUsersController(prisma: PrismaClient) {
  const userService = new UserService(prisma);
  return new UsersController(userService);
}

// Routes
const usersController = createUsersController(prisma);
app.get('/users/me', usersController.getCurrentUser.bind(usersController));
```

### After (DI Container)

```typescript
// ✅ New way
import { injectable, inject } from 'tsyringe';
import { IUserService } from '../interfaces';

@injectable()
export class UsersController {
  constructor(@inject('IUserService') private userService: IUserService) {}

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const user = await this.userService.findById(userId);

    if (!user) {
      throw notFoundError('User not found');
    }

    res.json({ user });
  }

  async updateCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const user = await this.userService.update(userId, req.body);
    res.json({ user });
  }
}
```

```typescript
// routes/v1.routes.ts
import { container } from '../container';
import { UsersController } from '../controllers/users.controller';

export function createV1Router(): Router {
  const router = Router();

  // Resolve controller from container
  const usersController = container.resolve(UsersController);

  // Register routes
  router.get(
    '/users/me',
    authMiddleware,
    asyncHandler(usersController.getCurrentUser.bind(usersController))
  );

  router.patch(
    '/users/me',
    authMiddleware,
    asyncHandler(usersController.updateCurrentUser.bind(usersController))
  );

  return router;
}
```

**Benefits:**
- ✅ No factory functions
- ✅ Dependencies injected automatically
- ✅ Controllers testable with mocks

---

## Testing with Mocks

### Mock Service Implementation

```typescript
// __tests__/mocks/credit.service.mock.ts
import { Credit } from '@prisma/client';
import { ICreditService, AllocateCreditsInput, DeductCreditsInput } from '../../interfaces';

export class MockCreditService implements ICreditService {
  private mockCredits: Map<string, Credit> = new Map();

  async getCurrentCredits(userId: string): Promise<Credit | null> {
    return this.mockCredits.get(userId) || null;
  }

  async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
    const credit: Credit = {
      id: 'mock-credit-id',
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      totalCredits: input.totalCredits,
      usedCredits: 0,
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockCredits.set(input.userId, credit);
    return credit;
  }

  async deductCredits(input: DeductCreditsInput): Promise<Credit> {
    const credit = this.mockCredits.get(input.userId);
    if (!credit) {
      throw new Error('No credit found');
    }

    credit.usedCredits += input.creditsToDeduct;
    return credit;
  }

  // Implement other interface methods...
}
```

### Test Setup with DI Container

```typescript
// __tests__/services/llm.service.test.ts
import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { LLMService } from '../../services/llm.service';
import { MockCreditService } from '../mocks/credit.service.mock';
import { MockUsageService } from '../mocks/usage.service.mock';
import { MockOpenAIProvider } from '../mocks/openai.provider.mock';

describe('LLMService', () => {
  let testContainer: DependencyContainer;
  let llmService: LLMService;

  beforeEach(() => {
    // Create isolated test container
    testContainer = container.createChildContainer();

    // Register mocks
    testContainer.register('ICreditService', { useClass: MockCreditService });
    testContainer.register('IUsageService', { useClass: MockUsageService });
    testContainer.register('ILLMProvider', { useClass: MockOpenAIProvider });

    // Resolve service under test
    llmService = testContainer.resolve(LLMService);
  });

  afterEach(() => {
    // Clean up test container
    testContainer.reset();
  });

  it('should execute chat completion using OpenAI provider', async () => {
    const request = {
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const response = await llmService.chatCompletion(request, 'openai', 2, 'user-123');

    expect(response).toBeDefined();
    expect(response.choices[0].message.content).toBe('Mock response');
  });

  it('should record usage after completion', async () => {
    const mockUsageService = testContainer.resolve<MockUsageService>('IUsageService');
    const recordSpy = jest.spyOn(mockUsageService, 'recordUsage');

    await llmService.chatCompletion({ ... }, 'openai', 2, 'user-123');

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        modelId: 'gpt-5',
      })
    );
  });
});
```

**Benefits:**
- ✅ True unit tests (no database or API calls)
- ✅ Fast test execution
- ✅ Isolated test containers
- ✅ Easy to verify interactions with mocks

---

## Common Patterns Cheatsheet

### 1. Inject Single Dependency

```typescript
constructor(@inject('ServiceToken') private service: IService) {}
```

### 2. Inject Multiple Services

```typescript
constructor(
  @inject('ServiceA') private serviceA: IServiceA,
  @inject('ServiceB') private serviceB: IServiceB,
  @inject('ServiceC') private serviceC: IServiceC
) {}
```

### 3. Inject All Implementations (Strategy Pattern)

```typescript
constructor(@injectAll('IProvider') private providers: IProvider[]) {
  this.providerMap = new Map(providers.map(p => [p.name, p]));
}
```

### 4. Resolve from Container (Imperative)

```typescript
const service = container.resolve<IService>('ServiceToken');
await service.doSomething();
```

### 5. Register Service

```typescript
// Class registration
container.register('IService', { useClass: ServiceImpl });

// Singleton registration
container.registerSingleton('IService', ServiceImpl);

// Value registration (for clients, configs)
container.register('Config', { useValue: configObject });
```

### 6. Test Container Setup

```typescript
const testContainer = container.createChildContainer();
testContainer.register('IService', { useClass: MockService });
const service = testContainer.resolve(ServiceUnderTest);
```

---

## Anti-Patterns to Avoid

### ❌ Don't: Create Dependencies Manually

```typescript
// BAD
class MyService {
  private otherService = new OtherService(); // ❌ Tight coupling
}
```

### ✅ Do: Inject Dependencies

```typescript
// GOOD
@injectable()
class MyService {
  constructor(@inject('IOtherService') private otherService: IOtherService) {}
}
```

---

### ❌ Don't: Use Global Variables

```typescript
// BAD
const prisma = new PrismaClient(); // ❌ Global state

export async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
```

### ✅ Do: Inject Infrastructure

```typescript
// GOOD
@injectable()
class UserService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

---

### ❌ Don't: Hardcode Provider Selection

```typescript
// BAD
switch (provider) {
  case 'openai':
    return new OpenAIProvider(); // ❌ Violation of Open/Closed
  case 'anthropic':
    return new AnthropicProvider();
}
```

### ✅ Do: Use Provider Map (Strategy Pattern)

```typescript
// GOOD
constructor(@injectAll('ILLMProvider') providers: ILLMProvider[]) {
  this.providerMap = new Map(providers.map(p => [p.name, p]));
}

getProvider(name: string): ILLMProvider {
  return this.providerMap.get(name) || throw new Error('Unknown provider');
}
```

---

## Lifecycle Scopes

### Singleton (Default for Infrastructure)

```typescript
container.registerSingleton('PrismaClient', PrismaClient);
```

**Use for:**
- Database connections
- Redis connections
- SDK clients (OpenAI, Anthropic)
- Configuration objects

### Transient (New Instance Every Time)

```typescript
container.register('IService', { useClass: Service }); // Default is transient
```

**Use for:**
- Stateless services
- Request handlers
- Utilities

---

## Migration Checklist

When refactoring a service to use DI:

- [ ] Create interface in `interfaces/services/`
- [ ] Add `@injectable()` decorator to class
- [ ] Change constructor to accept injected dependencies
- [ ] Remove manual `new` instantiations inside class
- [ ] Update `container.ts` to register service
- [ ] Update consumers to use `container.resolve()` or inject the service
- [ ] Create mock implementation in `__tests__/mocks/`
- [ ] Update tests to use test container

---

## Additional Resources

- **TSyringe Documentation:** https://github.com/microsoft/tsyringe
- **Master Refactoring Plan:** `docs/plan/090-di-refactoring-master-plan.md`
- **Phase 1 Guide:** `docs/plan/091-di-phase1-implementation-guide.md`

---

**Document Metadata:**
- Author: Claude Code
- Version: 1.0
- Last Updated: 2025-11-05
- Category: Reference
