# DTO Pattern Implementation Guide

**Document Type**: Reference
**Date**: 2025-01-12
**Status**: Active
**Related**: docs/analysis/001-snake-case-api-violations.md

---

## Executive Summary

This guide documents the **Data Transfer Object (DTO) pattern** for transforming database results into API responses. The DTO pattern is the recommended approach for maintaining clean separation between database layer (snake_case) and API layer (camelCase).

**Key Principle**: Database schema should never leak directly into API responses.

---

## Table of Contents

1. [Why DTO Pattern?](#why-dto-pattern)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Examples](#implementation-examples)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)
6. [Testing DTOs](#testing-dtos)
7. [Migration Strategy](#migration-strategy)

---

## Why DTO Pattern?

### Problem Without DTOs

```typescript
// ❌ BAD: Direct Prisma result exposure
class UserService {
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        created_at: true,      // Database field name
        last_login_at: true,   // Database field name
        credit_balance: true,  // Database field name
      }
    });

    return user;  // ❌ Returns snake_case field names to API
  }
}
```

**Issues**:
- API responses contain snake_case field names (violates JavaScript conventions)
- Database schema leaks into public API contract
- Hard to maintain consistency across endpoints
- Type safety doesn't prevent the violation

### Solution With DTOs

```typescript
// ✅ GOOD: DTO transformation layer
class UserService {
  async getUser(id: string): Promise<UserDTO> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        created_at: true,
        last_login_at: true,
        credit_balance: true,
      }
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    return UserDTO.fromPrisma(dbUser);  // ✅ Transforms to camelCase
  }
}
```

**Benefits**:
- ✅ API responses always use camelCase
- ✅ Database schema changes don't affect API contract
- ✅ Centralized transformation logic
- ✅ Type-safe transformations
- ✅ Easy to test independently

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│   Controller Layer                  │
│   - HTTP request/response handling  │
│   - Status codes, headers           │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Service Layer (Business Logic)    │
│   - DTO Transformation happens here │
│   - fromPrisma() / toDTO() methods  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Database Layer (Prisma ORM)       │
│   - Raw database queries            │
│   - snake_case field names          │
└─────────────────────────────────────┘
```

### DTO Transformation Flow

```typescript
// Step 1: Query database (snake_case)
const dbResult = await prisma.user.findUnique({
  select: {
    id: true,
    email: true,
    credit_balance: true,      // snake_case
    created_at: true,          // snake_case
  }
});

// Step 2: Transform to DTO (camelCase)
const userDTO = UserDTO.fromPrisma(dbResult);

// Step 3: Return DTO to controller
return userDTO;  // { id, email, creditBalance, createdAt }
```

---

## Implementation Examples

### Example 1: Simple DTO (User)

```typescript
// backend/src/dto/user.dto.ts

import { User as PrismaUser } from '@prisma/client';

/**
 * User Data Transfer Object
 * Transforms database User to API-safe format
 */
export class UserDTO {
  id: string;
  email: string;
  name: string | null;
  creditBalance: number;
  createdAt: Date;
  lastLoginAt: Date | null;

  /**
   * Transform Prisma User to DTO
   */
  static fromPrisma(dbUser: PrismaUser): UserDTO {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      creditBalance: dbUser.credit_balance,
      createdAt: dbUser.created_at,
      lastLoginAt: dbUser.last_login_at,
    };
  }

  /**
   * Transform array of Prisma Users to DTOs
   */
  static fromPrismaArray(dbUsers: PrismaUser[]): UserDTO[] {
    return dbUsers.map(user => this.fromPrisma(user));
  }
}
```

**Usage in Service**:

```typescript
// backend/src/services/user.service.ts

import { UserDTO } from '../dto/user.dto';

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async getUser(id: string): Promise<UserDTO> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    return UserDTO.fromPrisma(dbUser);
  }

  async listUsers(limit: number = 20): Promise<UserDTO[]> {
    const dbUsers = await this.prisma.user.findMany({
      take: limit
    });

    return UserDTO.fromPrismaArray(dbUsers);
  }
}
```

---

### Example 2: Complex DTO with Relations (Subscription)

```typescript
// backend/src/dto/subscription.dto.ts

import { Subscription as PrismaSubscription, User, StripeWebhook } from '@prisma/client';

/**
 * Subscription DTO with related entities
 */
export class SubscriptionDTO {
  id: string;
  userId: string;
  tier: string;
  status: string;
  billingCycle: 'monthly' | 'annual';
  monthlyPriceUsd: number;
  creditAllocation: number;
  startedAt: Date;
  endedAt: Date | null;
  nextBillingDate: Date | null;
  cancelledAt: Date | null;

  // Optional related entities
  user?: {
    id: string;
    email: string;
    name: string | null;
  };

  recentWebhooks?: {
    id: string;
    eventType: string;
    processedAt: Date;
  }[];

  /**
   * Transform Prisma Subscription (with optional relations)
   */
  static fromPrisma(
    dbSub: PrismaSubscription & {
      user?: User;
      stripeWebhooks?: StripeWebhook[];
    }
  ): SubscriptionDTO {
    const dto: SubscriptionDTO = {
      id: dbSub.id,
      userId: dbSub.user_id,
      tier: dbSub.tier,
      status: dbSub.status,
      billingCycle: dbSub.billing_cycle as 'monthly' | 'annual',
      monthlyPriceUsd: dbSub.monthly_price_usd,
      creditAllocation: dbSub.credits_per_month,
      startedAt: dbSub.started_at,
      endedAt: dbSub.ended_at,
      nextBillingDate: dbSub.next_billing_date,
      cancelledAt: dbSub.cancelled_at,
    };

    // Transform related user if included
    if (dbSub.user) {
      dto.user = {
        id: dbSub.user.id,
        email: dbSub.user.email,
        name: dbSub.user.name,
      };
    }

    // Transform recent webhooks if included
    if (dbSub.stripeWebhooks) {
      dto.recentWebhooks = dbSub.stripeWebhooks.map(webhook => ({
        id: webhook.id,
        eventType: webhook.event_type,
        processedAt: webhook.processed_at,
      }));
    }

    return dto;
  }
}
```

**Usage with Relations**:

```typescript
// backend/src/services/subscription.service.ts

export class SubscriptionService {
  async getSubscriptionWithDetails(id: string): Promise<SubscriptionDTO> {
    const dbSub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: true,
        stripeWebhooks: {
          take: 5,
          orderBy: { processed_at: 'desc' },
        },
      },
    });

    if (!dbSub) {
      throw new Error('Subscription not found');
    }

    return SubscriptionDTO.fromPrisma(dbSub);
  }
}
```

---

### Example 3: DTO with Computed Fields (Credit)

```typescript
// backend/src/dto/credit.dto.ts

import { Credit as PrismaCredit } from '@prisma/client';

/**
 * Credit DTO with computed fields
 */
export class CreditDTO {
  id: string;
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;       // ← Computed field
  usagePercentage: number;        // ← Computed field
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  isExpired: boolean;             // ← Computed field

  static fromPrisma(dbCredit: PrismaCredit): CreditDTO {
    const remaining = dbCredit.total_credits - dbCredit.used_credits;
    const usagePercentage = dbCredit.total_credits > 0
      ? (dbCredit.used_credits / dbCredit.total_credits) * 100
      : 0;
    const isExpired = dbCredit.billing_period_end < new Date();

    return {
      id: dbCredit.id,
      userId: dbCredit.user_id,
      totalCredits: dbCredit.total_credits,
      usedCredits: dbCredit.used_credits,
      remainingCredits: remaining,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      billingPeriodStart: dbCredit.billing_period_start,
      billingPeriodEnd: dbCredit.billing_period_end,
      isExpired,
    };
  }
}
```

---

### Example 4: Partial DTO (List vs Detail Views)

```typescript
// backend/src/dto/usage-history.dto.ts

import { UsageHistory as PrismaUsageHistory } from '@prisma/client';

/**
 * Usage History List DTO (minimal fields for list views)
 */
export class UsageHistoryListDTO {
  id: string;
  modelId: string;
  operation: string;
  creditsUsed: number;
  totalTokens: number | null;
  createdAt: Date;

  static fromPrisma(dbUsage: PrismaUsageHistory): UsageHistoryListDTO {
    return {
      id: dbUsage.id,
      modelId: dbUsage.model_id,
      operation: dbUsage.operation,
      creditsUsed: dbUsage.credits_used,
      totalTokens: dbUsage.total_tokens,
      createdAt: dbUsage.created_at,
    };
  }
}

/**
 * Usage History Detail DTO (full fields for detail views)
 */
export class UsageHistoryDetailDTO extends UsageHistoryListDTO {
  inputTokens: number | null;
  outputTokens: number | null;
  requestDurationMs: number | null;
  requestMetadata: Record<string, any> | null;

  static fromPrisma(dbUsage: PrismaUsageHistory): UsageHistoryDetailDTO {
    const base = UsageHistoryListDTO.fromPrisma(dbUsage);

    return {
      ...base,
      inputTokens: dbUsage.input_tokens,
      outputTokens: dbUsage.output_tokens,
      requestDurationMs: dbUsage.request_duration_ms,
      requestMetadata: dbUsage.request_metadata as Record<string, any> | null,
    };
  }
}
```

---

## Best Practices

### 1. DTO Naming Convention

```typescript
// ✅ GOOD: Clear, consistent naming
UserDTO
SubscriptionDTO
CreditDTO
UsageHistoryDTO

// ❌ BAD: Inconsistent naming
UserResponse
SubscriptionOutput
CreditModel
```

### 2. One DTO per Domain Entity

```typescript
// ✅ GOOD: One DTO per entity
class UserDTO { ... }
class SubscriptionDTO { ... }

// ❌ BAD: Multiple DTOs for same entity without clear purpose
class UserDTO1 { ... }
class UserDTO2 { ... }
class UserDTOv2 { ... }
```

Use variants only when there's a clear semantic difference:
```typescript
// ✅ GOOD: Clear semantic difference
class UserDTO { ... }           // Full user details
class UserListDTO { ... }       // Minimal fields for lists
class UserPublicDTO { ... }     // Public profile (no sensitive data)
```

### 3. Static Factory Methods

```typescript
// ✅ GOOD: Static factory method
class UserDTO {
  static fromPrisma(dbUser: PrismaUser): UserDTO {
    return { /* transformation */ };
  }
}

// Usage
const userDTO = UserDTO.fromPrisma(dbUser);

// ❌ BAD: Constructor with transformation
class UserDTO {
  constructor(dbUser: PrismaUser) {
    this.id = dbUser.id;
    // ... transformation in constructor
  }
}
```

### 4. Avoid Business Logic in DTOs

```typescript
// ✅ GOOD: Pure transformation
class CreditDTO {
  static fromPrisma(dbCredit: PrismaCredit): CreditDTO {
    return {
      id: dbCredit.id,
      totalCredits: dbCredit.total_credits,
      // Simple computation OK
      remainingCredits: dbCredit.total_credits - dbCredit.used_credits,
    };
  }
}

// ❌ BAD: Business logic in DTO
class CreditDTO {
  static fromPrisma(dbCredit: PrismaCredit): CreditDTO {
    // ❌ Complex business logic belongs in service
    const shouldAllocateMore = /* complex logic */;
    if (shouldAllocateMore) {
      // ❌ Side effects in DTO transformation
      await allocateMoreCredits(dbCredit.user_id);
    }
    return { /* ... */ };
  }
}
```

### 5. Handle Null/Undefined Safely

```typescript
// ✅ GOOD: Safe null handling
class UserDTO {
  static fromPrisma(dbUser: PrismaUser | null): UserDTO | null {
    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      lastLoginAt: dbUser.last_login_at ?? null,  // Explicit null coalescing
    };
  }
}

// ❌ BAD: Unsafe null handling
class UserDTO {
  static fromPrisma(dbUser: PrismaUser): UserDTO {
    return {
      id: dbUser.id,
      lastLoginAt: dbUser.last_login_at,  // Could be undefined
    };
  }
}
```

---

## Common Patterns

### Pattern 1: Pagination Response DTO

```typescript
// backend/src/dto/pagination.dto.ts

export class PaginationMetadataDTO {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;

  static create(limit: number, offset: number, total: number): PaginationMetadataDTO {
    return {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    };
  }
}

export class PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationMetadataDTO;

  static create<T>(
    data: T[],
    limit: number,
    offset: number,
    total: number
  ): PaginatedResponseDTO<T> {
    return {
      data,
      pagination: PaginationMetadataDTO.create(limit, offset, total),
    };
  }
}
```

**Usage**:

```typescript
async listUsers(limit: number, offset: number): Promise<PaginatedResponseDTO<UserDTO>> {
  const [dbUsers, total] = await Promise.all([
    this.prisma.user.findMany({ take: limit, skip: offset }),
    this.prisma.user.count(),
  ]);

  const users = UserDTO.fromPrismaArray(dbUsers);
  return PaginatedResponseDTO.create(users, limit, offset, total);
}
```

---

### Pattern 2: Summary/Aggregate DTO

```typescript
// backend/src/dto/usage-summary.dto.ts

export class UsageSummaryDTO {
  totalCreditsUsed: number;
  totalRequests: number;
  totalTokens: number;
  averageDurationMs: number;

  static fromAggregateResult(result: {
    _sum: {
      credits_used: number | null;
      total_tokens: number | null;
      request_duration_ms: number | null;
    };
    _count: number;
    _avg: {
      request_duration_ms: number | null;
    };
  }): UsageSummaryDTO {
    return {
      totalCreditsUsed: result._sum.credits_used ?? 0,
      totalRequests: result._count,
      totalTokens: result._sum.total_tokens ?? 0,
      averageDurationMs: result._avg.request_duration_ms ?? 0,
    };
  }
}
```

---

### Pattern 3: Nested DTO Composition

```typescript
// backend/src/dto/admin-user-detail.dto.ts

import { UserDTO } from './user.dto';
import { SubscriptionDTO } from './subscription.dto';
import { CreditDTO } from './credit.dto';

/**
 * Admin user detail DTO - composition of multiple DTOs
 */
export class AdminUserDetailDTO {
  user: UserDTO;
  activeSubscription: SubscriptionDTO | null;
  currentCredit: CreditDTO | null;
  subscriptionHistory: SubscriptionDTO[];

  static create(
    user: UserDTO,
    activeSubscription: SubscriptionDTO | null,
    currentCredit: CreditDTO | null,
    subscriptionHistory: SubscriptionDTO[]
  ): AdminUserDetailDTO {
    return {
      user,
      activeSubscription,
      currentCredit,
      subscriptionHistory,
    };
  }
}
```

---

## Testing DTOs

### Unit Test Example

```typescript
// backend/src/__tests__/dto/user.dto.test.ts

import { UserDTO } from '../../dto/user.dto';
import { User as PrismaUser } from '@prisma/client';

describe('UserDTO', () => {
  describe('fromPrisma', () => {
    it('should transform Prisma User to DTO with camelCase fields', () => {
      // Arrange: Create mock Prisma user with snake_case fields
      const dbUser: PrismaUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        credit_balance: 10000,
        created_at: new Date('2025-01-01'),
        last_login_at: new Date('2025-01-12'),
        // ... other fields
      };

      // Act: Transform to DTO
      const userDTO = UserDTO.fromPrisma(dbUser);

      // Assert: DTO has camelCase fields
      expect(userDTO).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        creditBalance: 10000,           // ✅ camelCase
        createdAt: expect.any(Date),    // ✅ camelCase
        lastLoginAt: expect.any(Date),  // ✅ camelCase
      });

      // Assert: Original object unchanged
      expect(dbUser.credit_balance).toBe(10000);  // Still snake_case
    });

    it('should handle null fields correctly', () => {
      const dbUser: PrismaUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,                // Null name
        last_login_at: null,       // Never logged in
        // ...
      };

      const userDTO = UserDTO.fromPrisma(dbUser);

      expect(userDTO.name).toBeNull();
      expect(userDTO.lastLoginAt).toBeNull();
    });
  });

  describe('fromPrismaArray', () => {
    it('should transform array of users', () => {
      const dbUsers: PrismaUser[] = [
        { id: 'user-1', /* ... */ },
        { id: 'user-2', /* ... */ },
      ];

      const userDTOs = UserDTO.fromPrismaArray(dbUsers);

      expect(userDTOs).toHaveLength(2);
      expect(userDTOs[0].id).toBe('user-1');
      expect(userDTOs[1].id).toBe('user-2');
    });
  });
});
```

---

## Migration Strategy

### Phase 1: Create DTO Directory Structure

```bash
backend/src/dto/
├── user.dto.ts
├── subscription.dto.ts
├── credit.dto.ts
├── usage-history.dto.ts
├── pagination.dto.ts
└── index.ts  # Barrel export
```

### Phase 2: Implement DTOs Gradually

**Priority Order**:
1. **High-traffic endpoints** (user profile, credits, usage)
2. **Admin endpoints** (user management, analytics)
3. **Internal services** (webhooks, background jobs)

### Phase 3: Update Services One at a Time

```typescript
// Before
async getUser(id: string) {
  return await this.prisma.user.findUnique({ where: { id } });
}

// After
async getUser(id: string): Promise<UserDTO> {
  const dbUser = await this.prisma.user.findUnique({ where: { id } });
  if (!dbUser) {
    throw new Error('User not found');
  }
  return UserDTO.fromPrisma(dbUser);
}
```

### Phase 4: Deprecate Direct Prisma Returns

Add ESLint rule to catch direct Prisma returns:

```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ReturnStatement > CallExpression[callee.object.property.name="prisma"]',
      message: 'Do not return Prisma results directly. Use DTO transformation.',
    },
  ],
}
```

---

## Summary

### DTO Pattern Benefits

✅ **Clean API contracts** - camelCase field names consistently
✅ **Database independence** - Schema changes don't break API
✅ **Type safety** - Compile-time guarantees for transformations
✅ **Testability** - Easy to unit test transformations
✅ **Maintainability** - Centralized transformation logic

### When to Use DTOs

**Always use DTOs for**:
- Public API endpoints
- Admin API endpoints
- Webhook payloads
- External integrations

**Optional for**:
- Internal service-to-service calls (if both use TypeScript)
- Background job data (if not exposed externally)

### Quick Reference

```typescript
// 1. Create DTO class
export class EntityDTO {
  // camelCase fields

  static fromPrisma(dbEntity: PrismaEntity): EntityDTO {
    return {
      // Transform snake_case → camelCase
    };
  }
}

// 2. Use in service
async getEntity(id: string): Promise<EntityDTO> {
  const dbEntity = await this.prisma.entity.findUnique({ where: { id } });
  return EntityDTO.fromPrisma(dbEntity);
}

// 3. Return from controller
const entity = await this.service.getEntity(id);
res.json(entity);  // ✅ camelCase response
```

---

**Document Owner**: Claude Code
**Last Updated**: 2025-01-12
**Status**: Active Reference Guide
