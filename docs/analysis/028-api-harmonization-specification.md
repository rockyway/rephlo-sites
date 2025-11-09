# API Harmonization Specification

**Document ID**: 028-api-harmonization-specification.md
**Created**: 2025-11-09
**Status**: Design Phase - Awaiting Approval
**Priority**: P1 (High)
**Dependencies**: Document 027 (Analysis), Plan 119 (RBAC Design)
**Target Completion**: 4 weeks after approval

---

## Executive Summary

This specification defines a comprehensive harmonization strategy to unify API endpoints across Plans 109, 110, and 111, establishing production-ready standards for authentication, authorization, error handling, audit logging, and security measures.

**Goals**:
- ✅ Eliminate authentication inconsistencies (15 endpoints at risk)
- ✅ Implement complete audit logging (66 endpoints missing logs)
- ✅ Consolidate route namespace (3 different patterns → 1 unified structure)
- ✅ Standardize error responses with request tracing
- ✅ Prepare for RBAC integration (Plan 119)
- ✅ Achieve SOC 2 and GDPR compliance

**Scope**: 92 endpoints across 3 route files, 21 controllers, and 4 middleware files

---

## Table of Contents

1. [Unified Authentication Strategy](#unified-authentication-strategy)
2. [Standardized Error Response Format](#standardized-error-response-format)
3. [Unified Route Namespace](#unified-route-namespace)
4. [Audit Logging Strategy](#audit-logging-strategy)
5. [Security Headers & CORS](#security-headers--cors)
6. [Rate Limiting Specification](#rate-limiting-specification)
7. [Request ID & Distributed Tracing](#request-id--distributed-tracing)
8. [RBAC Integration Preparation](#rbac-integration-preparation)
9. [Middleware Chain Specification](#middleware-chain-specification)
10. [Migration Strategy](#migration-strategy)
11. [Implementation Phases](#implementation-phases)
12. [Testing Requirements](#testing-requirements)

---

## Unified Authentication Strategy

### Middleware Chain Architecture

**Standard Middleware Chain**:
```typescript
[Request] → [RequestID] → [CORS] → [Security Headers] → [Body Parser]
  → [Rate Limiter] → [Auth] → [Authorization] → [Audit Logger]
  → [Controller] → [Error Handler] → [Response]
```

### Middleware Definitions

#### 1. Authentication Middleware (`authMiddleware`)

**Purpose**: Validate JWT bearer token and populate `req.user`

**Location**: `backend/src/middleware/auth.middleware.ts` (existing)

**Behavior**:
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies signature using Identity Provider's JWKS
- Falls back to token introspection if JWT verification fails
- Populates `req.user` with user context:
  ```typescript
  req.user = {
    sub: string;        // User ID
    email?: string;
    scope: string[];
    clientId: string;
    exp: number;
    iat: number;
  }
  ```
- **Does NOT check roles** (that's authorization's job)

**Error Handling**:
- Missing header → `401 Unauthorized: Missing authorization header`
- Invalid format → `401 Unauthorized: Invalid authorization header format`
- Invalid token → `401 Unauthorized: Invalid or expired token`

#### 2. Authorization Middleware (`requireAdmin`, `requireRole`, `requirePermission`)

**Purpose**: Verify user has required role/permissions

**Current Implementation**: `requireAdmin` (existing)

**Enhanced Implementation** (preparing for RBAC):
```typescript
/**
 * Require admin role
 * Use after authMiddleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw unauthorizedError('Authentication required');
  }

  // Query database for user role with caching
  const cachedRole = roleCache.get(req.user.sub);

  if (cachedRole && Date.now() < cachedRole.expires) {
    if (cachedRole.role !== 'admin') {
      throw forbiddenError('Admin access required');
    }
    return next();
  }

  // Cache miss - query DB
  prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { role: true, isActive: true },
  }).then(user => {
    if (!user || !user.isActive) {
      throw unauthorizedError('User not found or inactive');
    }

    // Cache for 30 seconds
    roleCache.set(req.user.sub, {
      role: user.role,
      expires: Date.now() + 30000
    });

    if (user.role !== 'admin') {
      throw forbiddenError('Admin access required');
    }

    next();
  }).catch(next);
}

/**
 * Future RBAC middleware (Plan 119)
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw unauthorizedError('Authentication required');
    }

    const userPermissions = await permissionService.getUserPermissions(req.user.sub);
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      throw forbiddenError(`Required permission(s): ${permissions.join(', ')}`);
    }

    next();
  };
}
```

#### 3. Optional Authentication (`optionalAuth`)

**Purpose**: Populate `req.user` if token present, but don't fail if missing

**Use Cases**:
- Public endpoints that enhance response with user context
- Tier information endpoints (show user's tier if authenticated)

**Implementation**: Already exists in `auth.middleware.ts:257-297`

### Standardized Route Patterns

**Pattern 1: Public Endpoints (No Auth)**
```typescript
router.post(
  '/api/coupons/validate',
  asyncHandler(couponController.validateCoupon.bind(couponController))
);
```

**Pattern 2: Authenticated User Endpoints**
```typescript
router.post(
  '/api/coupons/redeem',
  authMiddleware,
  asyncHandler(couponController.redeemCoupon.bind(couponController))
);
```

**Pattern 3: Admin Endpoints (Current)**
```typescript
router.post(
  '/admin/coupons',
  authMiddleware,
  requireAdmin,
  asyncHandler(couponController.createCoupon.bind(couponController))
);
```

**Pattern 4: RBAC-Ready Admin Endpoints (Future)**
```typescript
router.post(
  '/admin/coupons',
  authMiddleware,
  requirePermission('coupons.create'),
  asyncHandler(couponController.createCoupon.bind(couponController))
);
```

### Global vs. Per-Route Middleware

**Decision**: **Per-Route Middleware** (Reject global `router.use()` pattern)

**Rationale**:
- More flexible (allows mixing public/authenticated/admin in same router)
- Explicit and self-documenting
- Easier to audit (grep for route definitions shows full middleware chain)
- Prepares for RBAC with fine-grained permissions per endpoint

**Migration Plan**:
- Convert Plan 109's `router.use(authMiddleware, requireAdmin)` to per-route
- Standardize Plan 110 and 111 to consistent per-route pattern

---

## Standardized Error Response Format

### Base Error Response Structure

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Optional structured details
    request_id: string;     // Request tracing ID
    timestamp: string;      // ISO 8601 timestamp
  };
}
```

### Base Success Response Structure

```typescript
interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;                  // Response payload
  meta?: {
    request_id: string;     // Request tracing ID
    timestamp: string;      // ISO 8601 timestamp
    pagination?: {          // If paginated
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### Error Code Standards

**Format**: `{category}_{specific_error}`

| HTTP Status | Error Code | Example Usage |
|------------|-----------|---------------|
| 400 | `invalid_request` | Malformed request body |
| 401 | `unauthorized` | Missing or invalid token |
| 403 | `forbidden` | Insufficient permissions |
| 403 | `insufficient_credits` | Not enough credits |
| 404 | `not_found` | Resource doesn't exist |
| 409 | `conflict` | Duplicate resource |
| 422 | `validation_error` | Request validation failed |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_server_error` | Unexpected server error |
| 503 | `service_unavailable` | Temporary outage |

### Enhanced Error Middleware

**File**: `backend/src/middleware/error.middleware.ts`

**Enhancements**:
```typescript
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || STATUS_CODE_MAP[statusCode] || 'internal_server_error';

  // Log the error with request context
  if (statusCode >= 500) {
    logger.error('Server Error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message: err.message,
      stack: err.stack,
      userId: req.user?.sub,
      requestId: req.id,  // NEW
    });
  }

  // Prepare error response with standard format
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: err.message,
      request_id: req.id,           // NEW
      timestamp: new Date().toISOString(),  // NEW
    },
  };

  // Add details in development or for operational errors
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = {
      stack: err.stack,
      ...err.details,
    };
  } else if (err.isOperational && err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};
```

### Success Response Wrapper

**New Helper Function**:
```typescript
/**
 * Standard success response wrapper
 */
export function successResponse<T>(
  req: Request,
  data: T,
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      request_id: req.id,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}
```

**Controller Usage**:
```typescript
async createCoupon(req: Request, res: Response): Promise<void> {
  const result = await this.couponService.createCoupon(req.body);

  // OLD
  // res.status(201).json({ success: true, data: result });

  // NEW
  res.status(201).json(successResponse(req, result));
}
```

---

## Unified Route Namespace

### Namespace Structure

```
/api/v1                              (All API endpoints)
  │
  ├── /public                        (No authentication required)
  │   ├── POST /coupons/validate
  │   ├── POST /licenses/activate
  │   └── GET  /tiers
  │
  ├── /user                          (Authenticated users)
  │   ├── GET    /subscription
  │   ├── POST   /subscription/upgrade
  │   ├── GET    /licenses
  │   ├── POST   /licenses/purchase
  │   ├── GET    /credits
  │   ├── POST   /coupons/redeem
  │   └── GET    /coupons
  │
  └── /admin                         (Admin authentication required)
      ├── /subscriptions
      │   ├── POST   /
      │   ├── POST   /:id/upgrade
      │   ├── POST   /:id/downgrade
      │   ├── POST   /:id/cancel
      │   └── ...
      ├── /users
      │   ├── GET    /
      │   ├── GET    /:id
      │   ├── PATCH  /:id
      │   ├── POST   /:id/suspend
      │   └── ...
      ├── /billing
      ├── /credits
      ├── /licenses
      ├── /coupons
      ├── /campaigns
      ├── /fraud-detection
      └── /analytics
```

### Route File Organization

**Current Structure** (3 separate route files):
```
backend/src/routes/
  ├── plan109.routes.ts  (49 endpoints)
  ├── plan110.routes.ts  (25 endpoints)
  └── plan111.routes.ts  (18 endpoints)
```

**Proposed Structure** (consolidated by resource):
```
backend/src/routes/
  ├── index.ts                       (Main aggregator)
  ├── public.routes.ts               (Public endpoints)
  ├── user.routes.ts                 (Authenticated user endpoints)
  └── admin/                         (Admin endpoints organized by resource)
      ├── subscriptions.routes.ts    (Plan 109)
      ├── users.routes.ts            (Plan 109)
      ├── billing.routes.ts          (Plan 109)
      ├── credits.routes.ts          (Plan 109)
      ├── analytics.routes.ts        (Plan 109)
      ├── licenses.routes.ts         (Plan 110)
      ├── prorations.routes.ts       (Plan 110)
      ├── coupons.routes.ts          (Plan 111)
      ├── campaigns.routes.ts        (Plan 111)
      └── fraud-detection.routes.ts  (Plan 111)
```

### Migration Approach

**Option 1: Gradual Migration** (Recommended)
- Keep existing plan-based files
- Add new resource-based routes alongside
- Deprecate old routes with 301 redirects
- Remove after 3 months

**Option 2: Big Bang Migration**
- Consolidate all at once
- Update frontend clients simultaneously
- Higher risk but cleaner

**Decision**: Option 1 (Gradual Migration)

### Route Mounting

**File**: `backend/src/routes/index.ts`

**Before**:
```typescript
router.use('/admin', createPlan109Router());
router.use('/api', createPlan110Router());
router.use('/', createPlan110Router());
router.use('/', createPlan111Router());
```

**After**:
```typescript
// Public endpoints
router.use('/api/v1/public', createPublicRouter());

// User endpoints (authenticated)
router.use('/api/v1/user', createUserRouter());

// Admin endpoints (admin role required)
router.use('/api/v1/admin', createAdminRouter());

// Backward compatibility (deprecate after 3 months)
router.use('/admin', createLegacyPlan109Router());  // 301 redirects
router.use('/api', createLegacyPlan110Router());    // 301 redirects
router.use('/', createLegacyPlan111Router());       // 301 redirects
```

---

## Audit Logging Strategy

### Audit Log Schema

**Database Table**: `admin_audit_logs`

```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES "user"(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(100),  -- Correlation with request logs
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_audit_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_request ON admin_audit_logs(request_id);
```

### Audit Log Service

**File**: `backend/src/services/audit-log.service.ts` (new)

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export interface AuditLogEntry {
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@injectable()
export class AuditLogService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Create an audit log entry
   */
  async createLog(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId: entry.adminUserId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          reason: entry.reason,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
        },
      });

      logger.info('Audit log created', {
        action: entry.action,
        resourceType: entry.resourceType,
        adminUserId: entry.adminUserId,
        requestId: entry.requestId,
      });
    } catch (error) {
      logger.error('Failed to create audit log', { error, entry });
      // Don't fail the request if audit logging fails
    }
  }

  /**
   * Get audit logs by admin user
   */
  async getLogsByAdmin(adminUserId: string, limit = 100): Promise<any[]> {
    return this.prisma.adminAuditLog.findMany({
      where: { adminUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by resource
   */
  async getLogsByResource(
    resourceType: string,
    resourceId: string,
    limit = 100
  ): Promise<any[]> {
    return this.prisma.adminAuditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
```

### Audit Logging Middleware

**File**: `backend/src/middleware/audit.middleware.ts` (new)

```typescript
import { Request, Response, NextFunction } from 'express';
import { container } from '../container';
import { AuditLogService } from '../services/audit-log.service';

/**
 * Audit logging middleware for admin actions
 * Captures request/response for audit trail
 *
 * Usage:
 *   router.post('/admin/users/:id/ban',
 *     authMiddleware,
 *     requireAdmin,
 *     auditLog('user_banned', 'user'),  // NEW
 *     asyncHandler(...)
 *   );
 */
export function auditLog(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auditService = container.resolve(AuditLogService);

    // Capture original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (body: any) {
      // Only audit successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract resource ID from params or response
        const resourceId = req.params.id || body?.data?.id;

        auditService.createLog({
          adminUserId: req.user!.sub,
          action,
          resourceType,
          resourceId,
          previousValue: (req as any).previousValue,  // Set by controller if needed
          newValue: body?.data,
          reason: req.body?.reason,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.id,
        }).catch(err => {
          // Log error but don't fail request
          console.error('Audit log failed:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}
```

### Controller Integration Pattern

**Example**: User suspension with audit logging

```typescript
async suspendUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { reason } = req.body;

  // Get current state for audit (store in request)
  const previousState = await this.userService.getUserById(userId);
  (req as any).previousValue = { status: previousState.status };

  // Perform operation
  const result = await this.userService.suspendUser(userId, reason);

  // Audit logging happens automatically via middleware
  res.status(200).json(successResponse(req, result));
}
```

**Route Definition**:
```typescript
router.post(
  '/admin/users/:id/suspend',
  authMiddleware,
  requireAdmin,
  auditLog('user_suspended', 'user'),  // Audit middleware
  asyncHandler(userController.suspendUser.bind(userController))
);
```

### Actions Requiring Audit Logs

| Resource Type | Actions |
|--------------|---------|
| `subscription` | created, upgraded, downgraded, cancelled, reactivated, refunded |
| `user` | created, updated, suspended, unsuspended, banned, unbanned, deleted, credits_adjusted |
| `billing` | invoice_created, payment_failed, payment_retried, refund_issued |
| `license` | created, activated, deactivated, suspended, revoked |
| `coupon` | created, updated, deleted, redeemed |
| `campaign` | created, updated, deleted, budget_changed |
| `credit` | allocated, granted, deducted, expired |
| `model_tier` | updated, bulk_updated, reverted |

---

## Security Headers & CORS

### Helmet.js Configuration

**File**: `backend/src/app.ts`

```typescript
import helmet from 'helmet';

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### CORS Configuration

**File**: `backend/src/middleware/cors.middleware.ts` (new)

```typescript
import cors from 'cors';

// Admin dashboard CORS
export const adminCorsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      'https://admin.rephlo.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
};

// Public API CORS (more permissive)
export const publicCorsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};
```

**Application**:
```typescript
// Admin routes
app.use('/api/v1/admin', cors(adminCorsOptions));

// Public routes
app.use('/api/v1/public', cors(publicCorsOptions));
```

---

## Rate Limiting Specification

### Rate Limit Strategy

**Library**: `express-rate-limit`

**Tiers**:

| Tier | Window | Max Requests | Applies To |
|------|--------|-------------|-----------|
| Public | 1 minute | 20 | /api/v1/public/* |
| Authenticated | 1 minute | 60 | /api/v1/user/* |
| Admin | 1 minute | 120 | /api/v1/admin/* |
| Critical Operations | 1 hour | 10 | Refunds, deletions, bans |

### Implementation

**File**: `backend/src/middleware/ratelimit.middleware.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Public endpoints (unauthenticated)
export const publicRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:public:',
  }),
  message: {
    success: false,
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many requests from this IP, please try again later.',
    }
  },
});

// Authenticated users
export const userRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub || req.ip,  // Per-user rate limit
  store: new RedisStore({
    client: redis,
    prefix: 'rl:user:',
  }),
  message: {
    success: false,
    error: {
      code: 'rate_limit_exceeded',
      message: 'Rate limit exceeded. Please try again in a minute.',
    }
  },
});

// Admin operations
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub || req.ip,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:admin:',
  }),
});

// Critical operations (low limit)
export const criticalRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => req.user?.sub || req.ip,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:critical:',
  }),
  message: {
    success: false,
    error: {
      code: 'rate_limit_exceeded',
      message: 'Critical operation rate limit exceeded. Please contact support.',
    }
  },
});
```

**Application**:
```typescript
// Apply to route groups
app.use('/api/v1/public', publicRateLimit);
app.use('/api/v1/user', userRateLimit);
app.use('/api/v1/admin', adminRateLimit);

// Apply to specific critical endpoints
router.post(
  '/admin/users/:id/delete',
  authMiddleware,
  requireAdmin,
  criticalRateLimit,  // Extra rate limit
  auditLog('user_deleted', 'user'),
  asyncHandler(userController.deleteUser.bind(userController))
);
```

---

## Request ID & Distributed Tracing

### Request ID Middleware

**File**: `backend/src/middleware/request-id.middleware.ts` (new)

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Generate or extract request ID for tracing
 * Prioritizes client-provided ID if valid
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use client-provided ID if present and valid
  const clientRequestId = req.headers['x-request-id'] as string;

  if (clientRequestId && /^[a-zA-Z0-9-_]{8,100}$/.test(clientRequestId)) {
    req.id = clientRequestId;
  } else {
    req.id = `req_${uuidv4()}`;
  }

  // Echo back in response header
  res.setHeader('X-Request-ID', req.id);

  next();
}
```

### Logger Integration

**File**: `backend/src/utils/logger.ts`

**Enhancement**:
```typescript
import { Request } from 'express';

// Add request context to all logs
export function enrichLogger(req: Request) {
  return logger.child({
    requestId: req.id,
    userId: req.user?.sub,
    ip: req.ip,
    method: req.method,
    path: req.path,
  });
}

// Usage in controllers
async createCoupon(req: Request, res: Response): Promise<void> {
  const log = enrichLogger(req);
  log.info('Creating coupon', { body: req.body });

  // ... rest of logic
}
```

---

## RBAC Integration Preparation

### Current State

- **Plan 109**: Uses `requireAdmin` middleware (role check in User table)
- **Plan 119**: Defines full RBAC with roles, permissions, and overrides
- **Gap**: Current implementation not permission-aware

### Preparation Steps

#### 1. Abstract Authorization Middleware

**File**: `backend/src/middleware/auth.middleware.ts`

**Add**:
```typescript
/**
 * Generic authorization checker
 * Can be replaced with RBAC implementation in Plan 119
 */
export function requireAuthorization(check: (req: Request) => Promise<boolean>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorized = await check(req);
      if (!authorized) {
        throw forbiddenError('Insufficient permissions');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Current implementation
export const requireAdmin = requireAuthorization(async (req) => {
  if (!req.user) return false;

  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { role: true, isActive: true },
  });

  return user?.isActive && user.role === 'admin';
});

// Future RBAC implementation (Plan 119)
export function requirePermission(...permissions: string[]) {
  return requireAuthorization(async (req) => {
    if (!req.user) return false;

    const userPermissions = await permissionService.getEffectivePermissions(req.user.sub);
    return permissions.every(p => userPermissions.includes(p));
  });
}
```

#### 2. Route Annotation for RBAC

**Add comments to routes** indicating required permissions:
```typescript
/**
 * POST /admin/coupons
 * Create a new coupon
 *
 * RBAC Permission: coupons.create (Plan 119)
 */
router.post(
  '/admin/coupons',
  authMiddleware,
  requireAdmin,  // Will be replaced with requirePermission('coupons.create')
  auditLog('coupon_created', 'coupon'),
  asyncHandler(couponController.createCoupon.bind(couponController))
);
```

---

## Middleware Chain Specification

### Standard Middleware Order

**All Routes**:
```typescript
[Request]
  → requestIdMiddleware          // Generate request ID
  → helmet()                     // Security headers
  → cors()                       // CORS policy
  → express.json()               // Body parsing
  → requestLogger                // Log incoming request
```

**Public Routes** (`/api/v1/public/*`):
```typescript
  → publicRateLimit              // 20 req/min per IP
  → [Controller]
  → errorHandler
```

**Authenticated Routes** (`/api/v1/user/*`):
```typescript
  → userRateLimit                // 60 req/min per user
  → authMiddleware               // Validate JWT
  → [Controller]
  → errorHandler
```

**Admin Routes** (`/api/v1/admin/*`):
```typescript
  → adminRateLimit               // 120 req/min per admin
  → authMiddleware               // Validate JWT
  → requireAdmin                 // Check admin role
  → auditLog()                   // Log admin action (optional per route)
  → [Controller]
  → errorHandler
```

**Critical Admin Routes** (deletes, refunds, bans):
```typescript
  → criticalRateLimit            // 10 req/hour per admin
  → authMiddleware
  → requireAdmin
  → auditLog()                   // Always required
  → [Controller]
  → errorHandler
```

### Middleware Application Pattern

**File**: `backend/src/app.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

const app = express();

// ===== Global Middleware (Order Matters!) =====
app.use(requestIdMiddleware);              // 1. Generate request ID
app.use(helmet());                         // 2. Security headers
app.use(cors());                           // 3. CORS (will be overridden per route)
app.use(express.json({ limit: '10mb' })); // 4. Body parser
app.use(requestLogger);                    // 5. Log requests

// ===== Routes =====
app.use('/', routes);

// ===== Error Handling (Must Be Last!) =====
app.use(notFoundHandler);                  // 404 handler
app.use(errorHandler);                     // Error handler

export default app;
```

---

## Migration Strategy

### Phase 0: Preparation (Week 1)

**Tasks**:
1. Create new middleware files:
   - `request-id.middleware.ts`
   - `audit.middleware.ts`
   - `cors.middleware.ts`
2. Create AuditLogService
3. Add Prisma migration for `admin_audit_logs` table
4. Set up Redis for rate limiting (optional, can use in-memory for now)
5. Update error middleware with request ID and timestamp

**Deliverables**:
- All middleware files created and tested
- Database migration complete
- No breaking changes yet

### Phase 1: Fix Critical Bug (Week 1)

**Target**: Plan 111 authentication bug

**Tasks**:
1. Add `authMiddleware` before `requireAdmin` in all 15 Plan 111 admin routes
2. Test all affected endpoints
3. Deploy hotfix

**Files Modified**:
- `backend/src/routes/plan111.routes.ts` (15 route definitions)

**Testing**:
- Manual testing of all 15 endpoints
- Integration tests for authentication flow

### Phase 2: Implement Audit Logging (Week 2)

**Target**: All admin endpoints

**Tasks**:
1. Register AuditLogService in DI container
2. Add `auditLog()` middleware to all admin routes
3. Update controllers to set `req.previousValue` where needed
4. Test audit log creation

**Files Modified**:
- `backend/src/routes/plan109.routes.ts` (49 routes)
- `backend/src/routes/plan110.routes.ts` (3 admin routes)
- `backend/src/routes/plan111.routes.ts` (15 admin routes)
- Controllers as needed

**Testing**:
- Verify audit logs created for each action
- Test audit log querying

### Phase 3: Add Rate Limiting (Week 2)

**Target**: All routes

**Tasks**:
1. Install `express-rate-limit` and `rate-limit-redis`
2. Configure rate limiters
3. Apply to route groups
4. Test rate limit enforcement

**Files Modified**:
- `backend/src/routes/index.ts`
- Individual route files for critical endpoints

**Testing**:
- Load testing to verify rate limits
- Test rate limit headers
- Test error responses

### Phase 4: Consolidate Routes (Week 3)

**Target**: Unified namespace

**Tasks**:
1. Create new route files (`public.routes.ts`, `user.routes.ts`, admin folder)
2. Copy routes from plan files to new resource-based files
3. Update route mounting in `index.ts`
4. Add 301 redirects for old routes
5. Update API documentation

**Files Created**:
- `backend/src/routes/public.routes.ts`
- `backend/src/routes/user.routes.ts`
- `backend/src/routes/admin/*.routes.ts` (10 files)

**Files Modified**:
- `backend/src/routes/index.ts`

**Testing**:
- Verify all endpoints accessible at new paths
- Test redirects from old paths
- Update frontend clients

### Phase 5: Standardize Responses (Week 3-4)

**Target**: All controllers

**Tasks**:
1. Create `successResponse()` helper
2. Update all controllers to use `successResponse()`
3. Verify error responses include request_id and timestamp
4. Update API documentation

**Files Modified**:
- 21 controller files
- `backend/src/middleware/error.middleware.ts`

**Testing**:
- Verify response format consistency
- Test request ID propagation

### Phase 6: Add Security Headers & CORS (Week 4)

**Target**: All routes

**Tasks**:
1. Configure Helmet.js
2. Apply CORS policies
3. Test cross-origin requests

**Files Modified**:
- `backend/src/app.ts`
- `backend/src/middleware/cors.middleware.ts`

**Testing**:
- Security header verification
- CORS preflight testing

---

## Implementation Phases

### Timeline

| Phase | Duration | Effort (Days) | Risk |
|-------|----------|--------------|------|
| 0. Preparation | Week 1 | 3 | Low |
| 1. Fix Critical Bug | Week 1 | 1 | Low |
| 2. Audit Logging | Week 2 | 4 | Medium |
| 3. Rate Limiting | Week 2 | 3 | Low |
| 4. Route Consolidation | Week 3 | 5 | Medium |
| 5. Response Standardization | Week 3-4 | 4 | Low |
| 6. Security Headers | Week 4 | 2 | Low |
| **Total** | **4 weeks** | **22 days** | **Medium** |

### Resource Allocation

**Team**: 2 backend engineers

**Responsibilities**:
- Engineer 1: Middleware, services, migrations
- Engineer 2: Route updates, controller modifications

**Review Process**:
- Code review for each phase
- Security review for Phases 1, 2, 6
- QA testing after each phase

---

## Testing Requirements

### Unit Tests

**Coverage Targets**:
- Middleware: 100%
- Services: 95%
- Controllers: 80%

**Test Files**:
```
backend/src/__tests__/
  ├── middleware/
  │   ├── auth.middleware.test.ts
  │   ├── audit.middleware.test.ts
  │   ├── request-id.middleware.test.ts
  │   └── ratelimit.middleware.test.ts
  ├── services/
  │   └── audit-log.service.test.ts
  └── controllers/
      └── ... (existing tests updated)
```

### Integration Tests

**Scenarios**:
1. Full authentication flow (JWT → role check → audit log)
2. Rate limiting enforcement (exceed limits, verify 429)
3. Error response format (verify request_id and timestamp)
4. CORS preflight requests
5. Audit log creation for all admin actions

### Security Tests

**Tools**: OWASP ZAP, Burp Suite

**Tests**:
1. Authentication bypass attempts
2. Authorization escalation attempts
3. Rate limit evasion
4. SQL injection (error handling)
5. XSS in error messages

### Load Tests

**Tool**: k6

**Scenarios**:
1. Public endpoints: 100 req/sec for 5 minutes
2. Authenticated endpoints: 500 req/sec for 10 minutes
3. Admin endpoints: 50 req/sec for 10 minutes

**Metrics**:
- p95 latency < 200ms
- Error rate < 0.1%
- Rate limiting accuracy > 99%

---

## Backward Compatibility

### Deprecation Strategy

**Phase 1** (Months 1-2): Dual operation
- Old routes work with deprecation warnings in logs
- New routes available

**Phase 2** (Month 3): Redirects
- Old routes return 301 Moved Permanently with new location
- Warning emails sent to API consumers

**Phase 3** (Month 4+): Removal
- Old routes return 410 Gone
- Remove legacy route files

### Client Migration Guide

**Document**: `docs/guides/api-migration-guide.md` (to be created)

**Contents**:
- Mapping of old → new endpoints
- Changes in request/response format
- New authentication requirements
- Rate limit information
- Code examples (before/after)

---

## Success Criteria

### Technical Metrics

- [ ] Zero authentication bugs (all routes have proper middleware chain)
- [ ] 100% audit logging coverage on admin endpoints
- [ ] Rate limiting enforced on all routes
- [ ] Request ID in all logs and responses
- [ ] Standard error/success format on all responses
- [ ] Security headers on all responses
- [ ] CORS properly configured

### Quality Metrics

- [ ] Unit test coverage > 90%
- [ ] Integration test coverage for all critical paths
- [ ] Security scan passes (no high/critical issues)
- [ ] Load test passes (p95 < 200ms)
- [ ] Zero production incidents during rollout

### Business Metrics

- [ ] SOC 2 audit requirements met (audit logging)
- [ ] GDPR compliance achieved (data access logging)
- [ ] API documentation updated and accurate
- [ ] Zero breaking changes for clients (via deprecation)

---

## Approval & Sign-Off

**Required Approvals**:
- [ ] Engineering Lead: Technical design and implementation plan
- [ ] Security Team: Authentication, authorization, audit logging
- [ ] Product Owner: Timeline and backward compatibility
- [ ] DevOps: Infrastructure requirements (Redis, monitoring)
- [ ] Legal/Compliance: Audit logging and data retention

**Next Steps After Approval**:
1. Kickoff meeting with engineering team
2. Create implementation checklist (Document 029)
3. Set up project tracking (Jira/Linear tickets)
4. Begin Phase 0 (Preparation)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Next Review**: After approval, before implementation
**Author**: API Architecture Design Team
**Reviewers**: Security, Engineering, Product
