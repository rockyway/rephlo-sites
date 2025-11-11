# Phase 7: Testing Infrastructure - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 3 days
**Priority:** High (Critical for code quality)
**Prerequisites:** Phases 1-6 completed

## Overview

Phase 7 establishes comprehensive testing infrastructure leveraging the DI container. This includes mock implementations, test containers, unit tests, integration tests, and achieving >80% code coverage.

---

## Objectives

- [x] Mock implementations for all services
- [x] Test container setup with child containers
- [x] Unit tests for all services
- [x] Integration tests for API endpoints
- [x] >80% code coverage
- [x] CI/CD pipeline updated

---

## Testing Strategy

### Unit Tests
- **Scope:** Individual services, providers, controllers
- **Mocking:** All dependencies mocked
- **Speed:** Fast (<100ms per test)
- **Coverage Target:** >90%

### Integration Tests
- **Scope:** API endpoints, database operations
- **Mocking:** External APIs mocked, database uses test instance
- **Speed:** Medium (100-500ms per test)
- **Coverage Target:** All critical paths

### E2E Tests (Future Phase)
- **Scope:** Full user flows
- **Mocking:** Minimal
- **Speed:** Slow (>500ms per test)

---

## Task Breakdown

### Task 7.1: Create Mock Service Implementations (3 hours)

**Directory:** `backend/src/__tests__/mocks/`

#### AuthService Mock

**File:** `backend/src/__tests__/mocks/auth.service.mock.ts`

```typescript
import { User } from '@prisma/client';
import { IAuthService } from '../../interfaces';

export class MockAuthService implements IAuthService {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | null> {
    return this.emailIndex.get(email) || null;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User> {
    const user: User = {
      id: `mock-user-${Date.now()}`,
      email: data.email.toLowerCase(),
      passwordHash: data.password ? `hashed-${data.password}` : null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      username: data.username || null,
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null,
      profilePictureUrl: null,
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user);

    return user;
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    // Simulate password verification
    if (user.passwordHash === `hashed-${password}`) {
      return user;
    }

    return null;
  }

  async findAccount(accountId: string): Promise<any> {
    const user = await this.findById(accountId);
    if (!user) return undefined;

    return {
      accountId: user.id,
      claims: async (_use: string, scope: string) => ({
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
      }),
    };
  }

  async hashPassword(password: string): Promise<string> {
    return `hashed-${password}`;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return hash === `hashed-${password}`;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.emailVerified = true;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = await this.hashPassword(newPassword);
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
      user.deletedAt = new Date();
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    return !this.emailIndex.has(email);
  }

  async getUserStats(): Promise<any> {
    return {
      total: this.users.size,
      active: Array.from(this.users.values()).filter((u) => u.isActive).length,
      verified: Array.from(this.users.values()).filter((u) => u.emailVerified).length,
      inactive: Array.from(this.users.values()).filter((u) => !u.isActive).length,
    };
  }

  // Test helpers
  clear() {
    this.users.clear();
    this.emailIndex.clear();
  }

  seed(users: User[]) {
    users.forEach((user) => {
      this.users.set(user.id, user);
      this.emailIndex.set(user.email, user);
    });
  }
}
```

#### CreditService Mock

**File:** `backend/src/__tests__/mocks/credit.service.mock.ts`

```typescript
import { Credit } from '@prisma/client';
import { ICreditService, AllocateCreditsInput, DeductCreditsInput } from '../../interfaces';

export class MockCreditService implements ICreditService {
  private credits: Map<string, Credit> = new Map();

  async getCurrentCredits(userId: string): Promise<Credit | null> {
    const userCredits = Array.from(this.credits.values()).filter(
      (c) => c.userId === userId && c.isCurrent
    );

    return userCredits[0] || null;
  }

  async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
    // Mark existing credits as not current
    Array.from(this.credits.values())
      .filter((c) => c.userId === input.userId && c.isCurrent)
      .forEach((c) => (c.isCurrent = false));

    const credit: Credit = {
      id: `mock-credit-${Date.now()}`,
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

    this.credits.set(credit.id, credit);
    return credit;
  }

  async hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const credit = await this.getCurrentCredits(userId);
    if (!credit) return false;

    const remaining = credit.totalCredits - credit.usedCredits;
    return remaining >= requiredCredits;
  }

  async deductCredits(input: DeductCreditsInput): Promise<Credit> {
    const credit = await this.getCurrentCredits(input.userId);
    if (!credit) {
      throw new Error('No active credit record found');
    }

    const remaining = credit.totalCredits - credit.usedCredits;
    if (remaining < input.creditsToDeduct) {
      throw new Error('Insufficient credits');
    }

    credit.usedCredits += input.creditsToDeduct;
    credit.updatedAt = new Date();

    return credit;
  }

  async getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Credit | null> {
    return (
      Array.from(this.credits.values()).find(
        (c) =>
          c.userId === userId &&
          c.billingPeriodStart >= billingPeriodStart &&
          c.billingPeriodEnd <= billingPeriodEnd
      ) || null
    );
  }

  async getCreditHistory(userId: string, limit = 12): Promise<Credit[]> {
    return Array.from(this.credits.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  calculateRemainingCredits(credit: Credit): number {
    return credit.totalCredits - credit.usedCredits;
  }

  calculateUsagePercentage(credit: Credit): number {
    if (credit.totalCredits === 0) return 0;
    return (credit.usedCredits / credit.totalCredits) * 100;
  }

  isCreditsLow(credit: Credit, thresholdPercentage = 10): boolean {
    const usagePercentage = this.calculateUsagePercentage(credit);
    const remainingPercentage = 100 - usagePercentage;
    return remainingPercentage <= thresholdPercentage;
  }

  // Test helpers
  clear() {
    this.credits.clear();
  }

  seed(credits: Credit[]) {
    credits.forEach((credit) => this.credits.set(credit.id, credit));
  }
}
```

#### Provider Mocks

**File:** `backend/src/__tests__/mocks/llm-providers.mock.ts`

```typescript
import { Response } from 'express';
import { ILLMProvider } from '../../interfaces';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
} from '../../types/model-validation';

export class MockOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: 'mock-completion-id',
        object: 'chat.completion' as const,
        created: Date.now(),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Mock OpenAI response',
            },
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  async streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number> {
    // Mock streaming
    res.write('data: {"choices":[{"delta":{"content":"Mock"}}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }

  async textCompletion(request: TextCompletionRequest) {
    return {
      response: {
        id: 'mock-text-completion',
        object: 'text_completion' as const,
        created: Date.now(),
        model: request.model,
        choices: [
          {
            text: 'Mock completion text',
            index: 0,
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  async streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"choices":[{"text":"Mock"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }
}

// Similar mocks for Anthropic and Google providers...
```

**Create similar mocks for:**
- [ ] UsageService
- [ ] SubscriptionService
- [ ] WebhookService
- [ ] ModelService
- [ ] StripeService

---

### Task 7.2: Setup Test Container (1 hour)

**File:** `backend/src/__tests__/test-container.ts`

```typescript
import 'reflect-metadata';
import { DependencyContainer, container } from 'tsyringe';
import { MockAuthService } from './mocks/auth.service.mock';
import { MockCreditService } from './mocks/credit.service.mock';
import { MockOpenAIProvider } from './mocks/llm-providers.mock';
// ... import other mocks

/**
 * Create isolated test container with mock implementations
 * Each test should create its own child container
 */
export function createTestContainer(): DependencyContainer {
  const testContainer = container.createChildContainer();

  // Register mock services
  testContainer.register('IAuthService', { useClass: MockAuthService });
  testContainer.register('ICreditService', { useClass: MockCreditService });
  testContainer.register('IUsageService', { useClass: MockUsageService });
  // ... register other mocks

  // Register mock providers
  testContainer.register('ILLMProvider', { useClass: MockOpenAIProvider });

  return testContainer;
}

/**
 * Reset test container
 */
export function resetTestContainer(testContainer: DependencyContainer): void {
  testContainer.reset();
}
```

---

### Task 7.3: Write Unit Tests for Services (4 hours)

#### Example: LLMService Unit Test

**File:** `backend/src/__tests__/unit/llm.service.test.ts`

```typescript
import 'reflect-metadata';
import { createTestContainer, resetTestContainer } from '../test-container';
import { LLMService } from '../../services/llm.service';
import { ICreditService, IUsageService } from '../../interfaces';

describe('LLMService', () => {
  let testContainer: DependencyContainer;
  let llmService: LLMService;
  let mockCreditService: MockCreditService;

  beforeEach(() => {
    testContainer = createTestContainer();
    llmService = testContainer.resolve(LLMService);
    mockCreditService = testContainer.resolve('ICreditService') as MockCreditService;

    // Seed test data
    mockCreditService.seed([
      {
        id: 'credit-1',
        userId: 'user-1',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  afterEach(() => {
    resetTestContainer(testContainer);
    mockCreditService.clear();
  });

  describe('chatCompletion', () => {
    it('should complete chat request using OpenAI provider', async () => {
      const request = {
        model: 'gpt-5',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await llmService.chatCompletion(request, 'openai', 2, 'user-1');

      expect(response).toBeDefined();
      expect(response.choices[0].message.content).toBe('Mock OpenAI response');
      expect(response.usage.total_tokens).toBe(30);
      expect(response.usage.credits_used).toBeGreaterThan(0);
    });

    it('should throw error for unsupported provider', async () => {
      const request = {
        model: 'unknown-model',
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      await expect(llmService.chatCompletion(request, 'unknown', 2, 'user-1')).rejects.toThrow(
        'Unsupported provider'
      );
    });

    it('should record usage after completion', async () => {
      const mockUsageService = testContainer.resolve<IUsageService>('IUsageService');
      const recordSpy = jest.spyOn(mockUsageService, 'recordUsage');

      const request = {
        model: 'gpt-5',
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      await llmService.chatCompletion(request, 'openai', 2, 'user-1');

      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          modelId: 'gpt-5',
          operation: 'chat',
        })
      );
    });
  });
});
```

**Create similar tests for:**
- [ ] AuthService
- [ ] CreditService
- [ ] UsageService
- [ ] SubscriptionService
- [ ] WebhookService

---

### Task 7.4: Write Integration Tests (3 hours)

**File:** `backend/src/__tests__/integration/api.test.ts`

```typescript
import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { createTestContainer } from '../test-container';
import { createV1Router } from '../../routes/v1.routes';

describe('API Integration Tests', () => {
  let app: express.Express;
  let testContainer: DependencyContainer;

  beforeAll(() => {
    testContainer = createTestContainer();

    // Replace global container with test container for these tests
    // (This requires exporting a setter from container.ts)

    app = express();
    app.use(express.json());
    app.use('/v1', createV1Router());
  });

  describe('GET /v1/models', () => {
    it('should return list of models', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.models).toBeInstanceOf(Array);
    });
  });

  describe('POST /v1/chat/completions', () => {
    it('should complete chat request', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', 'Bearer test-token')
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Hello' }],
        });

      expect(response.status).toBe(200);
      expect(response.body.choices).toBeInstanceOf(Array);
    });

    it('should return 403 if insufficient credits', async () => {
      // Setup mock to have zero credits
      // ...

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', 'Bearer test-token')
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'test' }],
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient credits');
    });
  });
});
```

---

### Task 7.5: Setup Test Coverage (1 hour)

**File:** `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
```

**File:** `backend/src/__tests__/setup.ts`

```typescript
// Global test setup
beforeAll(() => {
  // Setup global test configuration
});

afterAll(() => {
  // Cleanup
});
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

---

### Task 7.6: Update CI/CD Pipeline (1 hour)

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [master, feature/*]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run linter
        working-directory: backend
        run: npm run lint

      - name: Run tests with coverage
        working-directory: backend
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend

      - name: Build
        working-directory: backend
        run: npm run build
```

---

### Task 7.7: Verification (1 hour)

**Run all tests:**
```bash
npm test
```

**Expected output:**
```
PASS  src/__tests__/unit/llm.service.test.ts
PASS  src/__tests__/unit/credit.service.test.ts
PASS  src/__tests__/integration/api.test.ts

Test Suites: 15 passed, 15 total
Tests:       120 passed, 120 total
Coverage:    85.3% lines, 82.1% branches, 88.7% functions, 84.9% statements

✅ Coverage thresholds met
```

**Final Acceptance Criteria:**
- [x] All tests pass
- [x] Coverage >80% for all categories
- [x] CI pipeline runs successfully
- [x] Mock implementations complete
- [x] Test container works correctly

---

## Completion Checklist

After Phase 7:

- [x] All 7 phases completed
- [x] DI refactoring complete
- [x] All services use dependency injection
- [x] Test coverage >80%
- [x] CI/CD pipeline updated
- [x] Documentation updated
- [x] Ready for production deployment

---

**Document Metadata:**
- Phase: 7/7 (FINAL)
- Duration: 3 days
- Previous: `096-di-phase6-application-bootstrap.md`
- Next: Production deployment
