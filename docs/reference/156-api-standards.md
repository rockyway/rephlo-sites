# API Development Standards

**Document Type**: Reference
**Date**: 2025-01-12
**Status**: Active Standard
**Applies To**: All backend API development
**Related**: docs/reference/155-dto-pattern-guide.md, docs/guides/017-eslint-snake-case-prevention.md

---

## Executive Summary

This document defines the mandatory standards for all API development in the Rephlo backend. These standards ensure consistency, maintainability, and compliance with JavaScript/TypeScript conventions.

**Core Principle**: APIs are contracts with external consumers. Once published, they must be stable, predictable, and follow established conventions.

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Response Format Standards](#response-format-standards)
3. [Database-to-API Layer Separation](#database-to-api-layer-separation)
4. [Error Handling Standards](#error-handling-standards)
5. [Versioning Standards](#versioning-standards)
6. [Code Review Checklist](#code-review-checklist)
7. [Testing Requirements](#testing-requirements)

---

## Naming Conventions

### 1.1 JSON Field Names

**Standard**: All JSON response fields MUST use camelCase.

```json
// ✅ CORRECT
{
  "id": "user-123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "totalCredits": 10000,
  "usedCredits": 2543,
  "remainingCredits": 7457,
  "billingPeriodStart": "2025-01-01T00:00:00Z",
  "billingPeriodEnd": "2025-02-01T00:00:00Z",
  "createdAt": "2024-12-15T10:30:00Z",
  "lastLoginAt": "2025-01-12T08:45:00Z"
}
```

```json
// ❌ INCORRECT
{
  "id": "user-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_credits": 10000,
  "used_credits": 2543,
  "remaining_credits": 7457,
  "billing_period_start": "2025-01-01T00:00:00Z",
  "billing_period_end": "2025-02-01T00:00:00Z",
  "created_at": "2024-12-15T10:30:00Z",
  "last_login_at": "2025-01-12T08:45:00Z"
}
```

**Rationale**:
- JavaScript/TypeScript convention is camelCase
- Frontend code naturally uses camelCase for object properties
- Improves readability and reduces cognitive load
- Aligns with industry standards (Google JSON Style Guide, Airbnb Style Guide)

**Exceptions**:
- None. All public API responses must use camelCase.

### 1.2 Endpoint URLs

**Standard**: Endpoint URLs MUST use kebab-case for multi-word resources.

```
✅ CORRECT:
GET  /v1/usage-history
GET  /v1/user-management
POST /v1/credit-allocation
GET  /admin/perpetual-licenses

❌ INCORRECT:
GET  /v1/usageHistory
GET  /v1/usage_history
GET  /v1/UserManagement
```

**Rationale**:
- URLs are case-insensitive in some systems
- Kebab-case is the REST API standard (RFC 3986)
- Improves readability in browser address bar

### 1.3 Query Parameters

**Standard**: Query parameters MUST use snake_case (exception to JSON camelCase rule).

```
✅ CORRECT:
GET /v1/usage?start_date=2025-01-01&end_date=2025-01-31&model_id=gpt-4

❌ INCORRECT:
GET /v1/usage?startDate=2025-01-01&endDate=2025-01-31&modelId=gpt-4
```

**Rationale**:
- Query parameters are part of the URL, not JSON
- snake_case is the HTTP query parameter convention
- Most HTTP libraries and frameworks expect snake_case

**Note**: While query parameters use snake_case, they should be transformed to camelCase when used internally in TypeScript code.

---

## Response Format Standards

### 2.1 Success Response Structure

**Standard**: All successful responses MUST follow this structure:

```typescript
// Single resource
{
  "id": string,
  "field1": value,
  "field2": value,
  // ... entity fields
}

// List of resources with pagination
{
  "data": Array<Resource>,
  "pagination": {
    "limit": number,
    "offset": number,
    "total": number,
    "hasMore": boolean
  }
}

// Action result
{
  "success": boolean,
  "message": string,
  "data"?: any  // Optional result data
}
```

**Examples**:

```json
// GET /v1/users/123
{
  "id": "user-123",
  "email": "user@example.com",
  "creditBalance": 10000,
  "subscriptionTier": "pro"
}

// GET /v1/users?limit=20&offset=0
{
  "data": [
    { "id": "user-1", ... },
    { "id": "user-2", ... }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 156,
    "hasMore": true
  }
}

// POST /v1/credits/allocate
{
  "success": true,
  "message": "Credits allocated successfully",
  "data": {
    "creditId": "crd-789",
    "allocatedAmount": 10000
  }
}
```

### 2.2 Error Response Structure

**Standard**: All error responses MUST follow this structure:

```typescript
{
  "error": {
    "code": string,           // Machine-readable error code
    "message": string,        // Human-readable error message
    "details"?: any,          // Optional detailed error info
    "validationErrors"?: Array<{
      field: string,
      message: string
    }>
  }
}
```

**Examples**:

```json
// 400 Bad Request
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid query parameters",
    "validationErrors": [
      {
        "field": "start_date",
        "message": "Must be a valid ISO 8601 date"
      },
      {
        "field": "limit",
        "message": "Must be between 1 and 100"
      }
    ]
  }
}

// 404 Not Found
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 'user-123' not found"
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

### 2.3 Date/Time Format

**Standard**: All date/time fields MUST use ISO 8601 format with UTC timezone.

```
✅ CORRECT:
"createdAt": "2025-01-12T14:30:00Z"
"createdAt": "2025-01-12T14:30:00.000Z"
"createdAt": "2025-01-12T14:30:00+00:00"

❌ INCORRECT:
"createdAt": "2025-01-12"              // Missing time
"createdAt": "01/12/2025"              // Wrong format
"createdAt": "2025-01-12 14:30:00"     // Wrong format
"createdAt": 1736693400000             // Unix timestamp
```

**Rationale**:
- ISO 8601 is the international standard
- Unambiguous timezone representation
- Natively supported by JavaScript `Date` objects
- Easy to parse and format

### 2.4 Numeric Values

**Standard**: Monetary values MUST be represented in smallest currency unit (cents for USD).

```typescript
// ✅ CORRECT
{
  "subscriptionPriceUsd": 2999,  // $29.99 in cents
  "totalRevenue": 156430,        // $1,564.30 in cents
  "discountValue": 500           // $5.00 in cents
}

// ❌ INCORRECT
{
  "subscriptionPriceUsd": 29.99,  // Floating point can cause rounding errors
  "subscriptionPriceUsd": "$29.99" // String format
}
```

**Rationale**:
- Avoids floating-point precision errors
- Consistent with Stripe API convention
- Simplifies currency calculations

---

## Database-to-API Layer Separation

### 3.1 Never Expose Prisma Results Directly

**Standard**: Services MUST transform database results to DTOs before returning.

```typescript
// ❌ INCORRECT: Direct Prisma exposure
class UserService {
  async getUser(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        credit_balance: true,    // ❌ snake_case leaked to API
        created_at: true,        // ❌ snake_case leaked to API
      },
    });
  }
}

// ✅ CORRECT: DTO transformation
class UserService {
  async getUser(id: string): Promise<UserDTO> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        credit_balance: true,    // ✅ OK: database layer
        created_at: true,        // ✅ OK: database layer
      },
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    return UserDTO.fromPrisma(dbUser);  // ✅ Transform to camelCase
  }
}
```

**Enforcement**: ESLint rule `no-restricted-syntax` blocks direct Prisma returns.

### 3.2 Prisma Selectors vs API Responses

**Standard**: Clearly distinguish database field names from API field names.

```typescript
// Database layer (Prisma) - snake_case is CORRECT
const dbResult = await this.prisma.user.findUnique({
  select: {
    credit_balance: true,      // ✅ Database field name
    billing_period_start: true, // ✅ Database field name
    last_login_at: true,       // ✅ Database field name
  },
});

// API layer (Response) - camelCase is REQUIRED
return {
  creditBalance: dbResult.credit_balance,         // ✅ Transform here
  billingPeriodStart: dbResult.billing_period_start, // ✅ Transform here
  lastLoginAt: dbResult.last_login_at,           // ✅ Transform here
};
```

### 3.3 DTO Pattern Usage

**Standard**: Use DTOs for all API responses. See [DTO Pattern Guide](155-dto-pattern-guide.md) for detailed examples.

**Required DTO Methods**:
- `static fromPrisma(dbEntity): DTO` - Transform single entity
- `static fromPrismaArray(dbEntities): DTO[]` - Transform array

**Example**:

```typescript
export class UserDTO {
  id: string;
  email: string;
  creditBalance: number;
  createdAt: Date;

  static fromPrisma(dbUser: PrismaUser): UserDTO {
    return {
      id: dbUser.id,
      email: dbUser.email,
      creditBalance: dbUser.credit_balance,
      createdAt: dbUser.created_at,
    };
  }

  static fromPrismaArray(dbUsers: PrismaUser[]): UserDTO[] {
    return dbUsers.map(user => this.fromPrisma(user));
  }
}
```

---

## Error Handling Standards

### 4.1 HTTP Status Codes

**Standard**: Use appropriate HTTP status codes.

| Status Code | Usage | Example |
|-------------|-------|---------|
| 200 OK | Successful GET, PUT, PATCH | User retrieved successfully |
| 201 Created | Successful POST creating a resource | User created successfully |
| 204 No Content | Successful DELETE | Resource deleted |
| 400 Bad Request | Invalid request parameters | Invalid email format |
| 401 Unauthorized | Missing or invalid authentication | Invalid JWT token |
| 403 Forbidden | Authenticated but not authorized | Admin-only endpoint |
| 404 Not Found | Resource not found | User ID doesn't exist |
| 409 Conflict | Resource conflict | Email already exists |
| 422 Unprocessable Entity | Validation error | Required field missing |
| 429 Too Many Requests | Rate limit exceeded | Too many API calls |
| 500 Internal Server Error | Unexpected server error | Database connection failed |

### 4.2 Error Code Naming

**Standard**: Error codes MUST use SCREAMING_SNAKE_CASE.

```
✅ CORRECT:
USER_NOT_FOUND
INVALID_CREDENTIALS
INSUFFICIENT_CREDITS
RATE_LIMIT_EXCEEDED
SUBSCRIPTION_EXPIRED

❌ INCORRECT:
userNotFound
UserNotFound
user-not-found
```

### 4.3 Error Messages

**Standard**: Error messages MUST be:
- Human-readable and actionable
- Not expose internal implementation details
- Consistent in tone and style

```
✅ CORRECT:
"User with ID 'user-123' not found"
"Invalid email format"
"Insufficient credits. Current balance: 500, required: 1000"

❌ INCORRECT:
"prisma.user.findUnique returned null"
"Error in line 42 of user.service.ts"
"Something went wrong"
```

---

## Versioning Standards

### 5.1 API Versioning Strategy

**Standard**: Use URL path versioning (e.g., `/v1/`, `/v2/`).

```
✅ CORRECT:
/v1/users
/v1/credits
/v2/subscriptions

❌ INCORRECT:
/api/users?version=1
/api/users (with Accept header versioning)
```

**Rationale**:
- Simplest to implement and understand
- Clear separation between versions
- Easy to route in Express/nginx

### 5.2 Breaking Changes

**Standard**: Breaking changes require a new API version.

**Breaking Changes Include**:
- Renaming fields (e.g., `user_id` → `userId`)
- Removing fields
- Changing field types (e.g., string → number)
- Changing response structure
- Changing required parameters

**Non-Breaking Changes Include**:
- Adding optional fields
- Adding optional query parameters
- Adding new endpoints
- Deprecating fields (while still returning them)

### 5.3 Deprecation Process

**Standard**: Deprecated fields/endpoints MUST be:
1. Documented in API changelog
2. Include deprecation warning in response headers
3. Supported for at least 6 months
4. Removed only in new major version

```typescript
// Example: Deprecated field with warning
res.set('X-API-Warn', 'Field "userId" is deprecated. Use "id" instead.');
res.json({
  id: user.id,
  userId: user.id,  // Deprecated but still included
  // ... other fields
});
```

---

## Code Review Checklist

### 6.1 API Response Review

When reviewing API endpoint code, verify:

- [ ] ✅ All response fields use camelCase
- [ ] ✅ No snake_case fields in response objects
- [ ] ✅ Database results are transformed via DTOs
- [ ] ✅ No direct Prisma returns (`return await prisma.*`)
- [ ] ✅ Dates use ISO 8601 format with UTC timezone
- [ ] ✅ Monetary values in smallest unit (cents)
- [ ] ✅ Pagination includes `limit`, `offset`, `total`, `hasMore`
- [ ] ✅ Error responses use standard structure
- [ ] ✅ HTTP status codes are appropriate
- [ ] ✅ Type assertions are avoided (use explicit typing)

### 6.2 Documentation Review

- [ ] ✅ **OpenAPI Spec Updated** - If adding/modifying endpoints, update `docs/openapi/enhanced-api.yaml`
  - Request/response schemas match implementation
  - Authentication and rate limits documented
  - Query parameters and validation rules included
  - HTTP status codes and error responses documented
  - Operation ID and tags assigned
  - Run `npm run validate:openapi` to verify coverage

### 6.3 Code Quality Review

- [ ] ✅ TypeScript return types are explicit
- [ ] ✅ Function has clear, single responsibility
- [ ] ✅ Error handling is comprehensive
- [ ] ✅ Logging includes relevant context (userId, requestId)
- [ ] ✅ No sensitive data in logs (passwords, tokens)
- [ ] ✅ Business logic in service layer, not controller

### 6.4 Testing Review

- [ ] ✅ Unit tests for DTO transformations
- [ ] ✅ Integration tests for endpoint responses
- [ ] ✅ Edge cases covered (null values, empty arrays)
- [ ] ✅ Error scenarios tested (404, 400, 500)
- [ ] ✅ Response structure validated against types

---

## Testing Requirements

### 7.1 DTO Transformation Tests

**Standard**: Every DTO MUST have unit tests.

```typescript
describe('UserDTO.fromPrisma', () => {
  it('should transform snake_case to camelCase', () => {
    const dbUser: PrismaUser = {
      id: 'user-123',
      email: 'test@example.com',
      credit_balance: 10000,
      created_at: new Date('2025-01-01'),
      last_login_at: new Date('2025-01-12'),
    };

    const userDTO = UserDTO.fromPrisma(dbUser);

    expect(userDTO).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      creditBalance: 10000,         // ✅ camelCase
      createdAt: expect.any(Date),  // ✅ camelCase
      lastLoginAt: expect.any(Date), // ✅ camelCase
    });
  });

  it('should handle null fields', () => {
    const dbUser: PrismaUser = {
      id: 'user-123',
      email: 'test@example.com',
      last_login_at: null,  // Never logged in
    };

    const userDTO = UserDTO.fromPrisma(dbUser);

    expect(userDTO.lastLoginAt).toBeNull();
  });
});
```

### 7.2 API Response Structure Tests

**Standard**: Every endpoint MUST have integration tests validating response structure.

```typescript
describe('GET /v1/users/:id', () => {
  it('should return user with camelCase fields', async () => {
    const response = await request(app)
      .get('/v1/users/user-123')
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      creditBalance: expect.any(Number),   // ✅ camelCase
      createdAt: expect.any(String),       // ✅ camelCase
      lastLoginAt: expect.any(String),     // ✅ camelCase
    });

    // ❌ Should NOT have snake_case fields
    expect(response.body).not.toHaveProperty('credit_balance');
    expect(response.body).not.toHaveProperty('created_at');
    expect(response.body).not.toHaveProperty('last_login_at');
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/v1/users/non-existent')
      .expect(404);

    expect(response.body).toMatchObject({
      error: {
        code: 'USER_NOT_FOUND',
        message: expect.any(String),
      },
    });
  });
});
```

---

## Quick Reference

### Naming Cheat Sheet

| Context | Convention | Example |
|---------|-----------|---------|
| JSON response fields | camelCase | `userId`, `totalCredits`, `createdAt` |
| Endpoint URLs | kebab-case | `/user-management`, `/usage-history` |
| Query parameters | snake_case | `?start_date=&end_date=` |
| Error codes | SCREAMING_SNAKE_CASE | `USER_NOT_FOUND` |
| Database fields (Prisma) | snake_case | `user_id`, `created_at` |
| TypeScript variables | camelCase | `userId`, `totalCredits` |
| TypeScript types/interfaces | PascalCase | `UserDTO`, `CreditResponse` |

### Response Format Templates

```typescript
// Single resource
GET /v1/users/123
{
  "id": "...",
  "field1": "...",
  "field2": "..."
}

// List with pagination
GET /v1/users?limit=20&offset=0
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 156,
    "hasMore": true
  }
}

// Error
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Enforcement

### Automated Checks

✅ **ESLint**: Catches snake_case in return statements
✅ **TypeScript**: Type checking prevents many violations
✅ **Jest Tests**: Integration tests validate response structure
✅ **CI/CD**: GitHub Actions runs linting on every PR

### Manual Checks

✅ **Code Review**: All PRs must pass code review checklist
✅ **API Testing**: Manual testing of new endpoints before merge

---

## Summary

### Core Standards

1. ✅ **JSON fields**: camelCase only
2. ✅ **No direct Prisma returns**: Always use DTOs
3. ✅ **Database ≠ API**: Separate snake_case (DB) from camelCase (API)
4. ✅ **Standard errors**: Consistent error structure
5. ✅ **ISO 8601 dates**: Always use UTC timezone
6. ✅ **Cents for currency**: Avoid floating-point errors

### Rationale

These standards exist to:
- Ensure API contracts are stable and predictable
- Follow JavaScript/TypeScript conventions
- Prevent breaking changes from internal refactoring
- Improve developer experience (both internal and external)
- Maintain consistency across all endpoints

---

**Document Owner**: Claude Code
**Last Updated**: 2025-01-12
**Status**: Active Standard
**Compliance**: Mandatory for all new API development
