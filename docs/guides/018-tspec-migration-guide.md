# Tspec Migration Guide

**Document Type:** Developer Guide
**Created:** 2025-11-17
**Last Updated:** 2025-11-17
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Why Tspec?](#why-tspec)
3. [Quick Start](#quick-start)
4. [Writing Tspec Specifications](#writing-tspec-specifications)
5. [Common Patterns](#common-patterns)
6. [Schema Reuse](#schema-reuse)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

Tspec is a **type-driven API documentation library** that automatically generates OpenAPI 3.0.3 specifications from TypeScript type definitions. This eliminates the need to maintain separate YAML documentation and ensures our API docs never drift from actual implementation.

### Key Benefits

- **Single source of truth**: TypeScript interfaces define both runtime types and documentation
- **Zero duplication**: Schemas defined once in `shared-types` package
- **Impossible drift**: Generated spec always matches code
- **Type safety**: Compiler ensures schemas are valid
- **IDE support**: Full autocomplete and type checking

---

## Why Tspec?

### Before Tspec (Manual YAML)

```yaml
# docs/openapi/enhanced-api.yaml (4,972 lines, 228 endpoints)
paths:
  /api/user/profile:
    get:
      summary: Get user profile
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: { type: string }
                  email: { type: string }
                  # ... 50 more lines
```

**Problems:**
- Manual synchronization required after every code change
- Easy to forget updating docs
- Schema definitions duplicated across endpoints
- No compile-time validation

### After Tspec (Type-Driven)

```typescript
// specs/routes/user-profile.spec.ts
import { Tspec } from 'tspec';
import { UserProfileResponse, ApiError } from '@rephlo/shared-types';

export type UserProfileApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/user/profile': {
      get: {
        summary: 'Get user profile';
        responses: {
          200: UserProfileResponse;  // Type reference!
          401: ApiError;
        };
      };
    };
  };
}>;
```

**Benefits:**
- Automatic OpenAPI generation
- Schema reuse from shared-types
- Compile-time validation
- 70% less code

---

## Quick Start

### 1. Generate OpenAPI Spec

```bash
npm run generate:openapi
```

This scans `backend/specs/**/*.spec.ts` and generates `docs/openapi/generated-api.json`.

### 2. Validate Generated Spec

```bash
npm run validate:openapi:generated
```

### 3. Serve Documentation Locally

```bash
npm run serve:openapi:generated
```

Access Swagger UI at `http://localhost:3001/docs`

---

## Writing Tspec Specifications

### File Structure

```
backend/
├── specs/
│   ├── routes/
│   │   ├── user-profile.spec.ts
│   │   ├── user-credits.spec.ts
│   │   └── admin-users.spec.ts
│   ├── schemas/
│   │   └── custom-schemas.ts
│   └── components/
│       └── security.ts
└── tspec.config.json
```

### Basic Endpoint Specification

```typescript
import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Response schema with JSDoc descriptions
 * These comments become OpenAPI descriptions
 */
export interface MyEndpointResponse {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** Optional display name */
  name?: string;
}

export type MyApiSpec = Tspec.DefineApiSpec<{
  tags: ['MyTag'];
  paths: {
    '/api/my-endpoint': {
      get: {
        summary: 'Short summary of endpoint';
        description: `Detailed description with markdown support:

- Bullet point 1
- Bullet point 2

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        responses: {
          200: MyEndpointResponse;
          401: ApiError;
          500: ApiError;
        };
      };
    };
  };
}>;
```

### With Query Parameters

```typescript
export interface MyQueryParams {
  /** Page number (0-indexed) */
  page?: number;
  /** Items per page (max 100) */
  limit?: number;
  /** Filter by status */
  status?: 'active' | 'inactive';
}

export type MyApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/my-endpoint': {
      get: {
        summary: 'List items with pagination';
        query: MyQueryParams;
        responses: {
          200: MyEndpointResponse[];
        };
      };
    };
  };
}>;
```

### With Path Parameters

```typescript
export interface MyPathParams {
  /** User ID (UUID format) */
  userId: string;
  /** Invoice ID */
  invoiceId: string;
}

export type MyApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/users/{userId}/invoices/{invoiceId}': {
      get: {
        summary: 'Get invoice by ID';
        path: MyPathParams;
        responses: {
          200: InvoiceResponse;
          404: ApiError;
        };
      };
    };
  };
}>;
```

### With Request Body (POST/PUT/PATCH)

```typescript
export interface CreateUserRequest {
  /** Email address (must be unique) */
  email: string;
  /** Password (min 8 characters) */
  password: string;
  /** Optional first name */
  firstName?: string;
}

export type UserApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/users': {
      post: {
        summary: 'Create new user';
        body: CreateUserRequest;
        responses: {
          201: UserResponse;
          400: ApiError;  // Validation errors
          409: ApiError;  // Email already exists
        };
      };
    };
  };
}>;
```

---

## Common Patterns

### Multiple Endpoints in One File

```typescript
export type UserApiSpec = Tspec.DefineApiSpec<{
  tags: ['Users'];
  paths: {
    '/api/users': {
      get: {
        summary: 'List users';
        responses: { 200: UserListResponse };
      };
      post: {
        summary: 'Create user';
        body: CreateUserRequest;
        responses: { 201: UserResponse };
      };
    };
    '/api/users/{id}': {
      get: {
        summary: 'Get user by ID';
        path: { id: string };
        responses: { 200: UserResponse; 404: ApiError };
      };
      patch: {
        summary: 'Update user';
        path: { id: string };
        body: UpdateUserRequest;
        responses: { 200: UserResponse };
      };
      delete: {
        summary: 'Delete user';
        path: { id: string };
        responses: { 204: void };
      };
    };
  };
}>;
```

### With Examples in Responses

```typescript
/**
 * Pro tier user profile example
 *
 * @example
 * {
 *   "userId": "usr_abc123xyz",
 *   "email": "user@example.com",
 *   "subscription": {
 *     "tier": "pro",
 *     "status": "active"
 *   }
 * }
 */
export interface UserProfileResponse {
  userId: string;
  email: string;
  subscription: Subscription;
}
```

### Error Response Patterns

```typescript
import { ApiError } from '@rephlo/shared-types';

export type MyApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/protected-resource': {
      get: {
        security: 'bearerAuth';
        responses: {
          200: ResourceResponse;
          401: ApiError;  // Missing/invalid token
          403: ApiError;  // Insufficient permissions
          429: ApiError;  // Rate limit exceeded
          500: ApiError;  // Internal server error
        };
      };
    };
  };
}>;
```

---

## Schema Reuse

### Using Shared Types

All response types should be defined in the `@rephlo/shared-types` package and reused across specs:

```typescript
// ✅ CORRECT - Reuse shared type
import { User, Subscription, ApiError, PaginationData } from '@rephlo/shared-types';

export type UserApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/users': {
      get: {
        responses: {
          200: {
            users: User[];
            pagination: PaginationData;
          };
        };
      };
    };
  };
}>;
```

```typescript
// ❌ WRONG - Don't duplicate schemas
export interface MyLocalUser {  // This duplicates shared-types/User
  id: string;
  email: string;
  // ...
}
```

### Creating New Shared Types

If a response schema doesn't exist in shared-types, add it there:

```bash
# 1. Add interface to shared-types
# shared-types/src/invoice.types.ts
export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
}

# 2. Export in index.ts
# shared-types/src/index.ts
export * from './invoice.types';

# 3. Build shared-types
cd shared-types && npm run build

# 4. Use in spec
# backend/specs/routes/invoices.spec.ts
import { Invoice } from '@rephlo/shared-types';
```

### Nested Schema Composition

```typescript
import { User, Subscription, CreditBalance } from '@rephlo/shared-types';

export interface UserDashboardResponse {
  user: User;
  subscription: Subscription;
  credits: CreditBalance;
  recentActivity: Activity[];
}

export type DashboardApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/dashboard': {
      get: {
        responses: { 200: UserDashboardResponse };
      };
    };
  };
}>;
```

---

## Troubleshooting

### Spec Generation Fails

**Problem:** `npm run generate:openapi` fails with error

**Solutions:**

1. **Check TypeScript compilation:**
   ```bash
   cd backend && npm run build
   ```
   Fix any TypeScript errors first.

2. **Verify spec file syntax:**
   - Ensure `Tspec.DefineApiSpec<{}>` syntax is correct
   - Check for missing imports
   - Validate JSDoc comments (no unclosed strings)

3. **Check tspec.config.json:**
   - Ensure `specPathGlobs` matches your file locations
   - Verify `tsconfigPath` points to correct tsconfig.json

### Spec Validation Fails

**Problem:** `npm run validate:openapi:generated` reports errors

**Common Issues:**

1. **Invalid OpenAPI 3.0.3 syntax**
   - Tspec generates valid OpenAPI, but check for unsupported features
   - Ensure response status codes are strings ('200', not 200)

2. **Missing required fields**
   - All properties in spec must have descriptions
   - Use JSDoc `/** */` comments on interface properties

3. **Security scheme not found**
   - Ensure `security: 'bearerAuth'` matches `tspec.config.json` securityDefinitions

### Endpoint Not Generated

**Problem:** Added spec but endpoint doesn't appear in generated JSON

**Solutions:**

1. **Check file location:**
   - Must match `specPathGlobs` pattern in tspec.config.json
   - Default: `backend/specs/**/*.spec.ts`

2. **Verify export:**
   ```typescript
   // ✅ CORRECT - Must export the type
   export type MyApiSpec = Tspec.DefineApiSpec<{...}>;

   // ❌ WRONG - Not exported
   type MyApiSpec = Tspec.DefineApiSpec<{...}>;
   ```

3. **Re-run generation:**
   ```bash
   npm run generate:openapi
   ```

### Schema Not Resolving

**Problem:** `$ref` components not generated correctly

**Solution:**

Ensure interface is defined in the same file or imported from shared-types:

```typescript
// ✅ CORRECT
import { UserResponse } from '@rephlo/shared-types';

export type MySpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/users': {
      get: { responses: { 200: UserResponse } };  // Resolves to component
    };
  };
}>;
```

---

## Best Practices

### 1. One Spec File Per Route Group

**✅ Good structure:**
```
specs/routes/
├── user-profile.spec.ts  # /api/user/profile, /api/user/preferences
├── user-credits.spec.ts  # /api/user/credits, /api/user/usage
└── admin-users.spec.ts   # /admin/users, /admin/users/:id
```

**❌ Avoid:**
- One file for all 228 endpoints (too large)
- Separate file for each HTTP method (too granular)

### 2. Use JSDoc for Descriptions

```typescript
/**
 * User Profile Response
 * Detailed description of what this schema represents
 */
export interface UserProfile {
  /** User's unique identifier (UUID format) */
  id: string;
  /** Primary email address (validated at registration) */
  email: string;
  /** Optional display name (defaults to firstName + lastName) */
  displayName?: string;
}
```

### 3. Document Rate Limits and Caching

```typescript
export type MyApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/expensive-operation': {
      post: {
        summary: 'Perform expensive operation';
        description: `**Rate Limit**: 10 requests per hour

**Caching**: Responses cached for 5 minutes

**Best Practice**: Use webhooks instead of polling this endpoint`;
        responses: { 200: ResultResponse };
      };
    };
  };
}>;
```

### 4. Group Related Endpoints with Tags

```typescript
export type AdminApiSpec = Tspec.DefineApiSpec<{
  tags: ['Admin - User Management'];  // Shows in Swagger UI sidebar
  paths: {
    '/admin/users': {
      get: { /* ... */ };
    };
    '/admin/users/{id}': {
      get: { /* ... */ };
      patch: { /* ... */ };
    };
  };
}>;
```

### 5. Validate After Every Spec Addition

```bash
# After creating/modifying spec file
npm run generate:openapi && npm run validate:openapi:generated
```

### 6. Commit Generated Spec

```bash
# Add to git after generation
git add docs/openapi/generated-api.json
git commit -m "chore(api): Update generated OpenAPI spec"
```

### 7. Keep Manual YAML for Reference (Temporarily)

During migration, keep `docs/openapi/enhanced-api.yaml` until all endpoints are migrated. Use it for reference when writing Tspec specs.

---

## Next Steps

- **Phase 1:** Migrate 15 pilot endpoints (see checklist in docs/plan/195-swagger-jsdoc-migration-checklist.md)
- **Phase 2-4:** Migrate remaining 213 endpoints
- **Phase 5:** Archive manual YAML, update CI/CD

---

## Resources

- [Tspec GitHub Repository](https://github.com/ts-spec/tspec)
- [Tspec Documentation](https://ts-spec.github.io/tspec/)
- [OpenAPI 3.0.3 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Project Migration Strategy](../plan/194-swagger-jsdoc-migration-strategy.md)
- [Migration Checklist](../plan/195-swagger-jsdoc-migration-checklist.md)

---

**Last Updated:** 2025-11-17
**Next Review:** After Phase 1 Pilot completion
