# Identity Provider Enhancement - Comprehensive TODO Tasks

**Document ID**: 127
**Created**: 2025-11-09
**Status**: Ready for Orchestration
**Parent Plan**: 126 (Identity Provider Enhancement Plan)
**Target Version**: v2.2.0

---

## Task Orchestration Strategy

This document provides a comprehensive task breakdown designed for **subagent orchestration**. Each task is:
- **Self-contained**: Can be completed by a specialized agent independently
- **Well-defined**: Clear acceptance criteria and deliverables
- **Trackable**: Status updates via TodoWrite tool
- **Prioritized**: P0 (critical) → P2 (nice-to-have)

**Recommended Approach**: Use `Task` tool to launch specialized agents for each phase.

---

## Phase 1: Performance Optimizations (P0)

**Goal**: Add `role` to JWT claims and implement role caching
**Duration**: 1.5 weeks
**Agent**: `api-backend-implementer` or `general-purpose`

### Task 1.1: Add `role` to JWT Claims

**Priority**: P0
**Effort**: 2 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Modify OIDC provider to include `role` claim in access tokens when `admin` scope is requested.

**Files to Modify**:
1. `identity-provider/src/config/oidc.ts`

**Implementation Steps**:
1. Read current `getClaimsForUser()` function (around line 350)
2. Add conditional logic to include `role` when `admin` scope is in scopes array
3. Query database for `user.role` field
4. Add `role` to claims object
5. Add TypeScript type for new claim

**Acceptance Criteria**:
- [ ] When user logs in with `admin` scope, JWT contains `role` claim
- [ ] `role` claim value is 'admin' or 'user' (matches database)
- [ ] When user logs in without `admin` scope, `role` claim is NOT included
- [ ] TypeScript types updated for JWTPayload
- [ ] No breaking changes to existing login flows

**Code Template**:
```typescript
// In getClaimsForUser() function
if (scopes.includes('admin')) {
  const userWithRole = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  claims.role = userWithRole?.role || 'user';

  // Future: Add permissions when RBAC implemented
  // claims.permissions = await getUserPermissions(userId);
}
```

**Testing Requirements**:
- Unit test: JWT includes `role` claim with `admin` scope
- Unit test: JWT excludes `role` claim without `admin` scope
- Integration test: End-to-end login flow with `admin` scope

---

### Task 1.2: Create RoleCacheService

**Priority**: P0
**Effort**: 4 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Implement Redis-based caching service for user roles using cache-aside pattern.

**Files to Create**:
1. `backend/src/services/role-cache.service.ts`

**Implementation Steps**:
1. Create `RoleCacheService` class with TSyringe `@injectable()` decorator
2. Implement `getUserRole(userId: string): Promise<string>`
   - Check Redis cache first
   - On cache miss, query database
   - Update cache with 5-minute TTL
3. Implement `getUserRoleAndStatus(userId: string)`
   - Returns `{ role: string, isActive: boolean }`
   - Same caching logic
4. Implement `invalidateUserRole(userId: string)`
   - Delete cache entry
5. Add Redis connection handling
6. Add error handling and logging

**Acceptance Criteria**:
- [ ] Cache hit: Returns role from Redis (no database query)
- [ ] Cache miss: Queries database and updates cache
- [ ] Cache TTL: 5 minutes (300 seconds)
- [ ] Invalidation: `invalidateUserRole()` clears cache entry
- [ ] Error handling: Redis errors don't crash the service
- [ ] Logging: Cache hits/misses logged for monitoring
- [ ] TypeScript: Fully typed service

**Code Template**:
```typescript
import { injectable } from 'tsyringe';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

@injectable()
export class RoleCacheService {
  private redis: Redis;
  private prisma: PrismaClient;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.prisma = new PrismaClient();
  }

  async getUserRole(userId: string): Promise<string> {
    const cacheKey = `user:${userId}:role`;

    // 1. Check cache
    const cachedRole = await this.redis.get(cacheKey);
    if (cachedRole) {
      console.log(`[RoleCache] Cache HIT for user ${userId}`);
      return cachedRole;
    }

    console.log(`[RoleCache] Cache MISS for user ${userId}`);

    // 2. Query database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 3. Update cache
    await this.redis.setex(cacheKey, this.CACHE_TTL, user.role);

    return user.role;
  }

  async getUserRoleAndStatus(userId: string): Promise<{
    role: string;
    isActive: boolean;
  }> {
    const cacheKey = `user:${userId}:role_status`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const result = { role: user.role, isActive: user.isActive };
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async invalidateUserRole(userId: string): Promise<void> {
    const cacheKey = `user:${userId}:role`;
    const cacheKey2 = `user:${userId}:role_status`;
    await this.redis.del(cacheKey, cacheKey2);
    console.log(`[RoleCache] Invalidated cache for user ${userId}`);
  }
}
```

**Testing Requirements**:
- Unit test: Cache hit scenario
- Unit test: Cache miss scenario
- Unit test: Invalidation clears cache
- Unit test: Error handling (Redis connection failure)
- Integration test: Full cache lifecycle

---

### Task 1.3: Update requireAdmin Middleware

**Priority**: P0
**Effort**: 3 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Modify `requireAdmin` middleware to use JWT claims and role caching instead of direct database queries.

**Files to Modify**:
1. `backend/src/middleware/auth.middleware.ts` (lines 425-474)

**Implementation Steps**:
1. Read current `requireAdmin` implementation
2. Add logic to check `req.user.role` from JWT claims first
3. If role not in JWT, fall back to `RoleCacheService`
4. Keep `isActive` check (query database or add to JWT claims)
5. Maintain existing error messages
6. Add logging for cache hits

**Acceptance Criteria**:
- [ ] If JWT contains `role` claim, use it (no database query)
- [ ] If JWT lacks `role`, use `RoleCacheService` (cache-aside pattern)
- [ ] Always verify `isActive` status (security requirement)
- [ ] Same error messages as before (backward compatible)
- [ ] Logging added for monitoring
- [ ] No breaking changes to existing admin endpoints

**Code Template**:
```typescript
import { container } from '../container';
import { RoleCacheService } from '../services/role-cache.service';

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw unauthorizedError('Authentication required');
  }

  // Option 1: Use role from JWT claims (if admin scope included)
  if (req.user.role) {
    console.log(`[Auth] Using role from JWT: ${req.user.role}`);

    if (req.user.role !== 'admin') {
      throw forbiddenError('Admin access required');
    }

    // Still need to check isActive from database
    // TODO: Add isActive to JWT claims in future
    prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { isActive: true }
    })
    .then((user) => {
      if (!user || !user.isActive) {
        throw forbiddenError('Account is inactive');
      }
      next();
    })
    .catch((error) => {
      next(error);
    });
    return;
  }

  // Option 2: Use cached role lookup
  console.log(`[Auth] Role not in JWT, using cache`);
  const roleCacheService = container.resolve(RoleCacheService);

  roleCacheService.getUserRoleAndStatus(req.user.sub)
    .then((user) => {
      if (!user.isActive) {
        throw forbiddenError('Account is inactive');
      }

      if (user.role !== 'admin') {
        throw forbiddenError('Admin access required');
      }

      next();
    })
    .catch((error) => {
      if (error.message === 'User not found') {
        throw unauthorizedError('User not found');
      }
      next(error);
    });
}
```

**Testing Requirements**:
- Unit test: Admin user with `role` in JWT
- Unit test: Admin user without `role` in JWT (cache path)
- Unit test: Regular user with `role='user'` in JWT (should block)
- Unit test: Inactive admin user (should block)
- Integration test: All 15 admin endpoints still work

---

### Task 1.4: Add Cache Invalidation on Role Changes

**Priority**: P0
**Effort**: 2 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Add cache invalidation hooks when user role is updated.

**Files to Modify**:
1. `backend/src/services/auth.service.ts` (if role update logic exists)
2. `backend/src/controllers/admin.controller.ts` (if admin can change user roles)

**Implementation Steps**:
1. Search for all locations where `user.role` is updated
2. After successful role update, call `roleCacheService.invalidateUserRole(userId)`
3. Add logging for cache invalidation
4. Handle errors gracefully (cache invalidation failure shouldn't block role update)

**Acceptance Criteria**:
- [ ] When user role changes, cache is invalidated
- [ ] Logging confirms cache invalidation
- [ ] Cache invalidation errors logged but don't block role update
- [ ] Next request after role change uses fresh data from database

**Code Template**:
```typescript
// In admin.controller.ts or auth.service.ts
async updateUserRole(userId: string, newRole: string): Promise<void> {
  // Update database
  await this.prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  // Invalidate cache
  try {
    await this.roleCacheService.invalidateUserRole(userId);
    console.log(`[Admin] Role updated and cache invalidated for user ${userId}`);
  } catch (error) {
    console.error(`[Admin] Failed to invalidate cache for user ${userId}:`, error);
    // Don't throw - cache invalidation failure shouldn't block role update
  }
}
```

**Testing Requirements**:
- Integration test: Update user role, verify cache invalidated
- Integration test: Next admin request uses fresh role

---

### Task 1.5: Testing & Documentation

**Priority**: P0
**Effort**: 4 hours
**Agent Type**: `testing-qa-specialist`

**Objective**:
Create comprehensive tests and documentation for role caching implementation.

**Deliverables**:
1. Unit tests for `RoleCacheService`
2. Unit tests for updated `requireAdmin` middleware
3. Integration tests for admin endpoints
4. Performance benchmarks (before/after latency)
5. Documentation update

**Testing Checklist**:
- [ ] `RoleCacheService.getUserRole()` - cache hit
- [ ] `RoleCacheService.getUserRole()` - cache miss
- [ ] `RoleCacheService.getUserRole()` - user not found
- [ ] `RoleCacheService.invalidateUserRole()` - success
- [ ] `RoleCacheService` - Redis connection failure
- [ ] `requireAdmin` - admin user with role in JWT
- [ ] `requireAdmin` - admin user without role in JWT
- [ ] `requireAdmin` - regular user blocked
- [ ] `requireAdmin` - inactive admin blocked
- [ ] Integration: All 15 admin endpoints work
- [ ] Performance: Latency reduced by ≥15ms
- [ ] Performance: Cache hit rate ≥90%

**Documentation Requirements**:
- Update API documentation with new JWT claims
- Add caching architecture diagram
- Document cache TTL and invalidation strategy
- Add monitoring guide (cache metrics)

---

## Phase 2: Admin Scope Implementation (P0)

**Goal**: Add dedicated `admin` scope for administrative operations
**Duration**: 3 days
**Agent**: `oidc-auth-implementer` or `api-backend-implementer`

### Task 2.1: Add `admin` Scope to OIDC Configuration

**Priority**: P0
**Effort**: 1 hour
**Agent Type**: `oidc-auth-implementer`

**Objective**:
Add `admin` scope to OIDC provider configuration and define its claims.

**Files to Modify**:
1. `identity-provider/src/config/oidc.ts`

**Implementation Steps**:
1. Add `'admin'` to `scopes` array (around line 50)
2. Add `'admin': ['role', 'permissions']` to `claims` mapping
3. Update TypeScript types if needed
4. Restart identity-provider to load new config

**Acceptance Criteria**:
- [ ] `admin` appears in `/.well-known/openid-configuration` scopes
- [ ] Requesting `admin` scope during login works (no errors)
- [ ] `role` claim included when `admin` scope requested (Task 1.1 dependency)
- [ ] Backward compatible (existing flows still work)

**Code Template**:
```typescript
const configuration = {
  // ... other config

  scopes: [
    'openid',
    'email',
    'profile',
    'llm.inference',
    'models.read',
    'user.info',
    'credits.read',
    'admin'  // NEW
  ],

  claims: {
    openid: ['sub'],
    email: ['email', 'email_verified'],
    profile: ['name', 'picture'],
    'user.info': ['created_at', 'last_login_at', 'is_active'],
    'admin': ['role', 'permissions']  // NEW
  },

  // ... rest of config
};
```

**Testing Requirements**:
- Integration test: Login with `admin` scope, verify JWT contains `role`
- Integration test: Login without `admin` scope, verify JWT excludes `role`
- Integration test: Discovery endpoint includes `admin` in scopes

---

### Task 2.2: Update OAuth Client Configurations

**Priority**: P0
**Effort**: 30 minutes
**Agent Type**: `general-purpose`

**Objective**:
Update OAuth client configurations to support `admin` scope.

**Files to Modify**:
1. Database seed script: `backend/prisma/seed.ts`
2. OAuth client configuration in database

**Implementation Steps**:
1. Read current OAuth client seed data
2. Add `admin` to allowed scopes for relevant clients
3. Re-run seed script or manually update database
4. Verify changes in database

**Acceptance Criteria**:
- [ ] Desktop client allows `admin` scope
- [ ] Admin dashboard client (if separate) allows `admin` scope
- [ ] Regular API clients do NOT allow `admin` scope (security)
- [ ] Database updated successfully

**Code Template**:
```typescript
// In prisma/seed.ts
await prisma.oAuthClient.upsert({
  where: { clientId: 'admin-dashboard' },
  create: {
    clientId: 'admin-dashboard',
    clientName: 'Admin Dashboard',
    redirectUris: ['http://localhost:5173/oauth/callback'],
    grantTypes: ['authorization_code', 'refresh_token'],
    scopes: [
      'openid',
      'email',
      'profile',
      'llm.inference',
      'models.read',
      'user.info',
      'admin'  // NEW
    ],
    skipConsentScreen: true,
    pkceRequired: true
  },
  update: {
    scopes: [
      'openid',
      'email',
      'profile',
      'llm.inference',
      'models.read',
      'user.info',
      'admin'  // NEW
    ]
  }
});
```

**Testing Requirements**:
- Manual test: Admin dashboard can request `admin` scope
- Manual test: Regular client cannot request `admin` scope (403 error)

---

### Task 2.3: Update Frontend to Request `admin` Scope

**Priority**: P0
**Effort**: 2 hours
**Agent Type**: `general-purpose`

**Objective**:
Modify admin dashboard frontend to request `admin` scope during login.

**Files to Modify**:
1. `frontend/src/lib/auth.ts` (or wherever OAuth flow is initiated)

**Implementation Steps**:
1. Locate OAuth authorization URL construction
2. Add `admin` to scopes array for admin users
3. Store scopes in state for token refresh
4. Update TypeScript types

**Acceptance Criteria**:
- [ ] Admin dashboard requests `admin` scope during login
- [ ] Access token received contains `role` claim
- [ ] Frontend stores and uses access token correctly
- [ ] Refresh token flow preserves `admin` scope

**Code Template**:
```typescript
// In auth.ts
export async function initiateAdminLogin(): Promise<void> {
  const scopes = [
    'openid',
    'email',
    'profile',
    'llm.inference',
    'models.read',
    'user.info',
    'admin'  // NEW
  ];

  const authUrl = `${IDENTITY_PROVIDER_URL}/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256&` +
    `state=${state}`;

  window.location.href = authUrl;
}
```

**Testing Requirements**:
- Manual test: Login to admin dashboard, inspect JWT
- Manual test: Verify `role` claim present in access token
- Manual test: Admin API calls succeed with new token

---

### Task 2.4: Testing & Documentation

**Priority**: P0
**Effort**: 2 hours
**Agent Type**: `testing-qa-specialist`

**Objective**:
Test admin scope implementation and update documentation.

**Testing Checklist**:
- [ ] OIDC discovery endpoint lists `admin` scope
- [ ] Admin client can request `admin` scope
- [ ] Regular client cannot request `admin` scope
- [ ] JWT contains `role` claim with `admin` scope
- [ ] JWT excludes `role` claim without `admin` scope
- [ ] Admin endpoints accept tokens with `admin` scope
- [ ] Refresh token preserves `admin` scope

**Documentation Requirements**:
- Update OAuth documentation with `admin` scope
- Add security note: Only grant `admin` scope to trusted clients
- Document JWT claims structure

---

## Phase 3: Permission Caching Layer (P1)

**Goal**: Implement Redis-based caching for user permissions
**Duration**: 1 week
**Agent**: `api-backend-implementer`

### Task 3.1: Create PermissionCacheService

**Priority**: P1
**Effort**: 6 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Create permission caching service in preparation for granular RBAC (Plan 119).

**Files to Create**:
1. `backend/src/services/permission-cache.service.ts`

**Implementation Steps**:
1. Create `PermissionCacheService` class
2. Implement `getUserPermissions(userId: string): Promise<string[]>`
3. Implement cache-aside pattern (same as role caching)
4. Implement `invalidateUserPermissions(userId: string)`
5. Add bulk operations for efficiency
6. Configure shorter TTL for admin users (1 minute vs 5 minutes)

**Acceptance Criteria**:
- [ ] Cache hit: Returns permissions from Redis
- [ ] Cache miss: Queries database and updates cache
- [ ] TTL: 5 minutes for regular users, 1 minute for admin users
- [ ] Invalidation: Clears cache on permission changes
- [ ] Error handling: Graceful fallback on Redis failure
- [ ] Future-proof: Ready for Plan 119 RBAC tables

**Code Template**:
```typescript
import { injectable } from 'tsyringe';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

@injectable()
export class PermissionCacheService {
  private redis: Redis;
  private prisma: PrismaClient;
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly ADMIN_TTL = 60;    // 1 minute

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.prisma = new PrismaClient();
  }

  /**
   * Get user permissions with caching
   *
   * Current implementation: Simple role-based permissions
   * Future: Query RolePermission tables (Plan 119)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `user:${userId}:permissions`;

    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      console.log(`[PermissionCache] Cache HIT for user ${userId}`);
      return JSON.parse(cached);
    }

    console.log(`[PermissionCache] Cache MISS for user ${userId}`);

    // 2. Query database
    // Current: Simple role-based permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Convert role to permissions
    const permissions = this.roleToPermissions(user.role);

    // 3. Determine TTL based on role
    const ttl = user.role === 'admin' ? this.ADMIN_TTL : this.DEFAULT_TTL;

    // 4. Update cache
    await this.redis.setex(cacheKey, ttl, JSON.stringify(permissions));

    return permissions;
  }

  /**
   * Convert role to permissions array
   *
   * Current: Simple mapping
   * Future: Query RolePermission table
   */
  private roleToPermissions(role: string): string[] {
    // Current simple implementation
    if (role === 'admin') {
      return ['*'];  // Wildcard: all permissions
    }

    return ['api.read'];  // Default user permissions
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = `user:${userId}:permissions`;
    await this.redis.del(cacheKey);
    console.log(`[PermissionCache] Invalidated permissions for user ${userId}`);
  }

  /**
   * Bulk invalidate permissions (e.g., when role permissions change)
   */
  async invalidateAllPermissions(): Promise<void> {
    const keys = await this.redis.keys('user:*:permissions');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      console.log(`[PermissionCache] Invalidated ${keys.length} permission caches`);
    }
  }
}
```

**Testing Requirements**:
- Unit test: Cache hit scenario
- Unit test: Cache miss scenario
- Unit test: Admin user gets 1-minute TTL
- Unit test: Regular user gets 5-minute TTL
- Unit test: Invalidation clears cache
- Unit test: Bulk invalidation

---

### Task 3.2: Create requirePermission Middleware

**Priority**: P1
**Effort**: 4 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Create permission-based middleware for future RBAC implementation.

**Files to Create**:
1. `backend/src/middleware/permission.middleware.ts`

**Implementation Steps**:
1. Create `requirePermission(permission: string)` middleware factory
2. Use `PermissionCacheService` to get user permissions
3. Check if user has required permission
4. Support wildcard permissions (`*` for admin)
5. Add logging for permission checks

**Acceptance Criteria**:
- [ ] `requirePermission('users.view')` grants access to admin users
- [ ] `requirePermission('users.view')` blocks regular users
- [ ] Wildcard `*` permission matches all permission checks
- [ ] Caching works (uses `PermissionCacheService`)
- [ ] Error handling for missing permissions

**Code Template**:
```typescript
import { Request, Response, NextFunction } from 'express';
import { container } from '../container';
import { PermissionCacheService } from '../services/permission-cache.service';
import { forbiddenError, unauthorizedError } from '../utils/errors';

/**
 * Middleware factory: Require specific permission
 *
 * Usage: router.get('/users', requirePermission('users.view'), ...)
 */
export function requirePermission(permission: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw unauthorizedError('Authentication required');
    }

    const permissionCacheService = container.resolve(PermissionCacheService);

    try {
      const permissions = await permissionCacheService.getUserPermissions(req.user.sub);

      // Check wildcard permission
      if (permissions.includes('*')) {
        console.log(`[Permission] User ${req.user.sub} has wildcard permission`);
        next();
        return;
      }

      // Check specific permission
      if (permissions.includes(permission)) {
        console.log(`[Permission] User ${req.user.sub} has permission: ${permission}`);
        next();
        return;
      }

      console.log(`[Permission] User ${req.user.sub} lacks permission: ${permission}`);
      throw forbiddenError(`Permission required: ${permission}`);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory: Require ANY of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw unauthorizedError('Authentication required');
    }

    const permissionCacheService = container.resolve(PermissionCacheService);

    try {
      const userPermissions = await permissionCacheService.getUserPermissions(req.user.sub);

      if (userPermissions.includes('*')) {
        next();
        return;
      }

      const hasPermission = permissions.some(p => userPermissions.includes(p));

      if (hasPermission) {
        next();
        return;
      }

      throw forbiddenError(`One of these permissions required: ${permissions.join(', ')}`);
    } catch (error) {
      next(error);
    }
  };
}
```

**Testing Requirements**:
- Unit test: Admin user with wildcard permission
- Unit test: User with specific permission granted
- Unit test: User without permission blocked
- Unit test: `requireAnyPermission` with multiple options

---

### Task 3.3: Testing & Documentation

**Priority**: P1
**Effort**: 3 hours
**Agent Type**: `testing-qa-specialist`

**Deliverables**:
- Unit tests for `PermissionCacheService`
- Unit tests for `requirePermission` middleware
- Integration tests
- Documentation

**Testing Checklist**:
- [ ] Permission caching - cache hit/miss
- [ ] Permission caching - TTL differences (admin vs user)
- [ ] Permission caching - invalidation
- [ ] `requirePermission` - admin user passes
- [ ] `requirePermission` - regular user blocked
- [ ] `requireAnyPermission` - at least one permission
- [ ] Integration: Permission check on protected endpoint

---

## Phase 4: MFA for Admin Accounts (P1)

**Goal**: Add multi-factor authentication for admin role
**Duration**: 2 weeks
**Agent**: `api-backend-implementer` + frontend dev

### Task 4.1: Database Migration for MFA Fields

**Priority**: P1
**Effort**: 30 minutes
**Agent Type**: `db-schema-architect`

**Objective**:
Add MFA-related fields to User table.

**Files to Create**:
1. `backend/prisma/migrations/<timestamp>_add_mfa_fields/migration.sql`

**Implementation Steps**:
1. Create Prisma migration file
2. Add `mfa_secret` (TEXT, nullable)
3. Add `mfa_enabled` (BOOLEAN, default false)
4. Add `mfa_backup_codes` (TEXT[], nullable)
5. Run migration on dev database
6. Update Prisma schema
7. Regenerate Prisma client

**Acceptance Criteria**:
- [ ] Migration runs successfully on dev database
- [ ] `User` model has 3 new fields
- [ ] Existing users have `mfa_enabled = false`
- [ ] Prisma client regenerated
- [ ] No data loss

**Migration SQL**:
```sql
-- Add MFA fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfa_secret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfa_backup_codes" TEXT[];

-- Create index for faster MFA lookups
CREATE INDEX IF NOT EXISTS "idx_user_mfa_enabled" ON "User"("mfa_enabled");
```

**Testing Requirements**:
- Test migration on clean database
- Test migration on database with existing users
- Verify no data corruption

---

### Task 4.2: Install MFA Dependencies

**Priority**: P1
**Effort**: 15 minutes
**Agent Type**: `general-purpose`

**Objective**:
Install required npm packages for MFA implementation.

**Implementation Steps**:
1. `cd identity-provider && npm install speakeasy qrcode`
2. `npm install --save-dev @types/speakeasy @types/qrcode`
3. Verify installation

**Acceptance Criteria**:
- [ ] `speakeasy` installed (TOTP library)
- [ ] `qrcode` installed (QR code generation)
- [ ] TypeScript types installed
- [ ] `package.json` and `package-lock.json` updated

---

### Task 4.3: Implement MFAService

**Priority**: P1
**Effort**: 6 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Create MFA service with TOTP generation, verification, and backup codes.

**Files to Create**:
1. `identity-provider/src/services/mfa.service.ts`

**Implementation Steps**:
1. Create `MFAService` class
2. Implement `generateMFASecret()` - creates TOTP secret and QR code
3. Implement `enableMFA()` - saves secret and backup codes to database
4. Implement `verifyTOTP()` - validates TOTP token
5. Implement `verifyMFAToken()` - validates TOTP or backup code
6. Implement `disableMFA()` - removes MFA from user account
7. Add error handling and logging

**Acceptance Criteria**:
- [ ] `generateMFASecret()` returns secret, QR code, backup codes
- [ ] QR code is valid data URI (can be rendered in browser)
- [ ] `verifyTOTP()` accepts valid 6-digit codes
- [ ] `verifyTOTP()` rejects invalid codes
- [ ] Backup codes are one-time use (removed after verification)
- [ ] Error handling for all edge cases

**Full code provided in Plan 126 (lines 600-750).**

**Testing Requirements**:
- Unit test: Generate valid TOTP secret
- Unit test: Verify valid TOTP token
- Unit test: Reject invalid TOTP token
- Unit test: Accept backup code and remove it
- Unit test: Reject used backup code
- Unit test: Disable MFA clears all fields

---

### Task 4.4: Create MFA Enrollment Endpoints

**Priority**: P1
**Effort**: 4 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Create API endpoints for MFA enrollment and management.

**Files to Create**:
1. `identity-provider/src/controllers/mfa.controller.ts`
2. `identity-provider/src/routes/mfa.routes.ts`

**Implementation Steps**:
1. `POST /api/mfa/enroll/start` - Generate MFA secret and QR code
2. `POST /api/mfa/enroll/verify` - Verify TOTP and enable MFA
3. `POST /api/mfa/disable` - Disable MFA for account
4. `POST /api/mfa/regenerate-backup-codes` - Generate new backup codes
5. Add authentication middleware (user must be logged in)
6. Add audit logging for MFA changes

**Acceptance Criteria**:
- [ ] `/mfa/enroll/start` returns QR code and backup codes
- [ ] `/mfa/enroll/verify` enables MFA after successful TOTP verification
- [ ] `/mfa/disable` requires password confirmation
- [ ] All endpoints protected by authentication
- [ ] Audit log entries created for MFA changes

**Code Template**:
```typescript
// mfa.controller.ts
@injectable()
export class MFAController {
  constructor(private mfaService: MFAService) {}

  async startEnrollment(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    const { secret, qrCode, backupCodes } = await this.mfaService.generateMFASecret(userId);

    // Store secret temporarily (not yet enabled)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret }
    });

    res.json({
      qrCode,
      backupCodes,
      message: 'Scan QR code with authenticator app and verify'
    });
  }

  async verifyEnrollment(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true }
    });

    if (!user?.mfaSecret) {
      throw badRequestError('MFA enrollment not started');
    }

    const valid = this.mfaService.verifyTOTP(user.mfaSecret, token);

    if (!valid) {
      throw badRequestError('Invalid MFA token');
    }

    // Enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    // Audit log
    await auditLog.create({
      userId,
      action: 'mfa_enabled',
      resourceType: 'user'
    });

    res.json({ message: 'MFA enabled successfully' });
  }

  async disableMFA(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { password } = req.body;

    // Verify password before disabling MFA
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    const passwordValid = await bcrypt.compare(password, user!.passwordHash);

    if (!passwordValid) {
      throw forbiddenError('Invalid password');
    }

    await this.mfaService.disableMFA(userId);

    // Audit log
    await auditLog.create({
      userId,
      action: 'mfa_disabled',
      resourceType: 'user'
    });

    res.json({ message: 'MFA disabled successfully' });
  }
}
```

**Testing Requirements**:
- Integration test: Full enrollment flow
- Integration test: Verify with valid TOTP
- Integration test: Disable MFA with password

---

### Task 4.5: Update Login Flow for MFA Verification

**Priority**: P1
**Effort**: 4 hours
**Agent Type**: `oidc-auth-implementer`

**Objective**:
Add MFA verification step to login flow.

**Files to Modify**:
1. `identity-provider/src/controllers/auth.controller.ts`
2. `identity-provider/src/views/mfa-verify.html` (new)

**Implementation Steps**:
1. After password verification, check if user has `mfaEnabled = true`
2. If MFA enabled, redirect to MFA verification page
3. Create `mfa-verify.html` page with TOTP input
4. `POST /interaction/:uid/mfa` - Verify MFA token
5. On success, continue OAuth flow
6. On failure, show error and retry

**Acceptance Criteria**:
- [ ] Users with MFA see verification page after password
- [ ] Users without MFA skip MFA verification
- [ ] Valid TOTP grants access
- [ ] Invalid TOTP shows error and retry
- [ ] Backup codes work during login
- [ ] Failed MFA attempts logged

**Code Template**:
```typescript
// In auth.controller.ts login handler
const user = await this.authService.authenticate(email, password);

// Check if MFA is enabled
if (user.mfaEnabled) {
  // Redirect to MFA verification page
  return res.redirect(`/interaction/${uid}/mfa`);
}

// Continue normal flow...
```

**Testing Requirements**:
- Integration test: Login with MFA-enabled user
- Integration test: MFA verification with TOTP
- Integration test: MFA verification with backup code
- Integration test: Failed MFA attempts

---

### Task 4.6: Create MFA Enrollment UI (Frontend)

**Priority**: P1
**Effort**: 8 hours
**Agent Type**: General frontend developer

**Objective**:
Build admin dashboard UI for MFA enrollment and management.

**Files to Create**:
1. `frontend/src/pages/admin/MFAEnrollment.tsx`
2. `frontend/src/components/admin/MFAQRCode.tsx`
3. `frontend/src/components/admin/BackupCodes.tsx`

**Implementation Steps**:
1. Create MFA enrollment page in admin settings
2. Display QR code for scanning
3. Show backup codes (copy to clipboard)
4. TOTP input field for verification
5. Disable MFA button (with password confirmation)
6. Show MFA status (enabled/disabled)

**Acceptance Criteria**:
- [ ] QR code renders correctly
- [ ] Backup codes displayed and copyable
- [ ] TOTP verification works
- [ ] MFA can be disabled with password
- [ ] UI follows Deep Navy theme
- [ ] Responsive design

**Testing Requirements**:
- Manual test: Enroll in MFA
- Manual test: Verify TOTP from authenticator app
- Manual test: Disable MFA
- Manual test: Login with MFA

---

### Task 4.7: Testing & Documentation

**Priority**: P1
**Effort**: 6 hours
**Agent Type**: `testing-qa-specialist`

**Deliverables**:
- Comprehensive test suite for MFA
- User guide for MFA enrollment
- Admin documentation

**Testing Checklist**:
- [ ] MFA enrollment flow (end-to-end)
- [ ] TOTP verification (valid/invalid)
- [ ] Backup code verification (valid/used/invalid)
- [ ] MFA login flow (end-to-end)
- [ ] MFA disable flow (with password)
- [ ] Edge cases: MFA half-enrolled, lost device
- [ ] Security: Backup codes are hashed, TOTP window

**Documentation Requirements**:
- User guide: How to enroll in MFA
- User guide: How to use backup codes
- Admin guide: MFA enforcement policy
- Recovery procedure: Lost MFA device

---

## Phase 5: Admin Session Management (P1)

**Goal**: Stricter session controls for admin users
**Duration**: 1 week
**Agent**: `api-backend-implementer`

### Task 5.1: Implement Shorter Session TTL for Admins

**Priority**: P1
**Effort**: 3 hours
**Agent Type**: `oidc-auth-implementer`

**Objective**:
Reduce session lifetime for admin users from 24 hours to 4 hours.

**Files to Modify**:
1. `identity-provider/src/config/oidc.ts`

**Implementation Steps**:
1. Modify session TTL logic to check user role
2. If admin: 4 hours (14400 seconds)
3. If regular user: 24 hours (86400 seconds)
4. Update cookie maxAge accordingly
5. Add logging for session creation

**Acceptance Criteria**:
- [ ] Admin sessions expire after 4 hours
- [ ] Regular user sessions expire after 24 hours
- [ ] Session cookies have correct maxAge
- [ ] Logging confirms session TTL

**Code Template**:
```typescript
// In oidc.ts configuration
const configuration = {
  // ...

  cookies: {
    long: {
      signed: true,
      maxAge: async (ctx) => {
        // Get user from session
        const session = await ctx.oidc.provider.Session.find(ctx);
        const userId = session?.accountId;

        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          });

          // Admin: 4 hours, Regular: 24 hours
          return user?.role === 'admin'
            ? 4 * 60 * 60 * 1000    // 4 hours
            : 24 * 60 * 60 * 1000;  // 24 hours
        }

        return 24 * 60 * 60 * 1000; // Default 24 hours
      }
    }
  },

  ttl: {
    Session: async (ctx) => {
      const session = await ctx.oidc.provider.Session.find(ctx);
      const userId = session?.accountId;

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        return user?.role === 'admin'
          ? 4 * 60 * 60    // 4 hours
          : 24 * 60 * 60;  // 24 hours
      }

      return 24 * 60 * 60; // Default 24 hours
    }
  }
};
```

**Testing Requirements**:
- Integration test: Admin session expires after 4 hours
- Integration test: Regular session expires after 24 hours

---

### Task 5.2: Implement Concurrent Session Limits

**Priority**: P1
**Effort**: 5 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Limit admin users to maximum 3 concurrent sessions.

**Files to Create**:
1. `identity-provider/src/services/session.service.ts`

**Implementation Steps**:
1. Create `SessionService` with session tracking
2. Track active sessions per user (Redis or database)
3. On new login, count active sessions
4. If ≥3 sessions, revoke oldest session
5. Add session listing endpoint
6. Add manual session revocation endpoint

**Acceptance Criteria**:
- [ ] Admin users limited to 3 concurrent sessions
- [ ] 4th login revokes oldest session
- [ ] Session list endpoint shows active sessions
- [ ] Manual revocation works
- [ ] Regular users have no session limits

**Code Template**:
```typescript
@injectable()
export class SessionService {
  private redis: Redis;
  private readonly MAX_ADMIN_SESSIONS = 3;

  async trackSession(userId: string, sessionId: string, role: string): Promise<void> {
    if (role !== 'admin') {
      return; // No limit for regular users
    }

    const key = `user:${userId}:sessions`;

    // Add new session
    await this.redis.zadd(key, Date.now(), sessionId);

    // Get session count
    const count = await this.redis.zcard(key);

    // If exceeds limit, remove oldest
    if (count > this.MAX_ADMIN_SESSIONS) {
      const oldest = await this.redis.zrange(key, 0, 0);
      if (oldest.length > 0) {
        await this.revokeSession(oldest[0]);
        await this.redis.zrem(key, oldest[0]);
        console.log(`[Session] Revoked oldest session for user ${userId}`);
      }
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    // Revoke in OIDC provider
    await oidcProvider.Session.revoke(sessionId);
  }

  async listUserSessions(userId: string): Promise<string[]> {
    const key = `user:${userId}:sessions`;
    return await this.redis.zrange(key, 0, -1);
  }
}
```

**Testing Requirements**:
- Unit test: Session limit enforcement
- Unit test: Oldest session revoked
- Integration test: 4th login revokes 1st session

---

### Task 5.3: Implement Idle Timeout

**Priority**: P1
**Effort**: 4 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Auto-logout admin users after 15 minutes of inactivity.

**Implementation Steps**:
1. Track last activity timestamp per session
2. Update timestamp on each API request (middleware)
3. Check idle time before granting access
4. If idle >15 minutes, revoke session
5. Frontend: Show warning at 13 minutes

**Acceptance Criteria**:
- [ ] Admin sessions auto-logout after 15 minutes idle
- [ ] Activity timestamp updates on API requests
- [ ] Frontend shows warning before logout
- [ ] Regular users have 60-minute idle timeout

**Code Template**:
```typescript
// Middleware to track activity
export async function trackActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return next();
  }

  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) {
    return next();
  }

  const key = `session:${sessionId}:last_activity`;
  await redis.set(key, Date.now(), 'EX', 60 * 60); // 1 hour expiry

  next();
}

// Middleware to check idle timeout
export async function checkIdleTimeout(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return next();
  }

  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) {
    return next();
  }

  const key = `session:${sessionId}:last_activity`;
  const lastActivity = await redis.get(key);

  if (!lastActivity) {
    return next(); // First request
  }

  const idleMs = Date.now() - parseInt(lastActivity);
  const idleMinutes = idleMs / 1000 / 60;

  // Get user role
  const role = await getUserRole(req.user.sub);

  const maxIdleMinutes = role === 'admin' ? 15 : 60;

  if (idleMinutes > maxIdleMinutes) {
    // Revoke session
    await revokeSession(sessionId);
    throw unauthorizedError('Session expired due to inactivity');
  }

  next();
}
```

**Testing Requirements**:
- Integration test: Idle timeout after 15 minutes
- Integration test: Activity resets idle timer

---

### Task 5.4: Force Logout on Role Change

**Priority**: P1
**Effort**: 2 hours
**Agent Type**: `api-backend-implementer`

**Objective**:
Automatically logout user when their role changes (e.g., admin → user).

**Implementation Steps**:
1. In role update logic, get all active sessions
2. Revoke all sessions for the user
3. Invalidate all caches (role, permissions)
4. Log the action

**Acceptance Criteria**:
- [ ] When role changes, all sessions revoked
- [ ] User must re-login after role change
- [ ] Caches invalidated
- [ ] Audit log entry created

**Code Template**:
```typescript
async function updateUserRole(userId: string, newRole: string): Promise<void> {
  // 1. Update database
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  // 2. Revoke all sessions
  const sessions = await sessionService.listUserSessions(userId);
  for (const sessionId of sessions) {
    await sessionService.revokeSession(sessionId);
  }

  // 3. Invalidate caches
  await roleCacheService.invalidateUserRole(userId);
  await permissionCacheService.invalidateUserPermissions(userId);

  // 4. Audit log
  await auditLog.create({
    adminUserId: req.user!.sub,
    action: 'role_changed',
    resourceType: 'user',
    resourceId: userId,
    metadata: {
      oldRole: user.role,
      newRole,
      sessionsRevoked: sessions.length
    }
  });

  console.log(`[Admin] Role changed for user ${userId}, revoked ${sessions.length} sessions`);
}
```

**Testing Requirements**:
- Integration test: Role change revokes sessions
- Integration test: User must re-login

---

### Task 5.5: Testing & Documentation

**Priority**: P1
**Effort**: 3 hours
**Agent Type**: `testing-qa-specialist`

**Deliverables**:
- Tests for session management
- Documentation

**Testing Checklist**:
- [ ] Admin sessions expire after 4 hours
- [ ] Concurrent session limits enforced
- [ ] Idle timeout works
- [ ] Role change revokes sessions
- [ ] Session listing endpoint
- [ ] Manual session revocation

**Documentation Requirements**:
- Admin guide: Session management
- User guide: Understanding session timeouts
- Security policy: Session controls

---

## Summary Checklist

### Phase 1: Performance Optimizations (P0)
- [ ] Task 1.1: Add `role` to JWT claims (2h)
- [ ] Task 1.2: Create RoleCacheService (4h)
- [ ] Task 1.3: Update requireAdmin middleware (3h)
- [ ] Task 1.4: Add cache invalidation (2h)
- [ ] Task 1.5: Testing & documentation (4h)
**Total**: 15 hours (~2 days)

### Phase 2: Admin Scope Implementation (P0)
- [ ] Task 2.1: Add `admin` scope to OIDC config (1h)
- [ ] Task 2.2: Update OAuth client configs (0.5h)
- [ ] Task 2.3: Update frontend to request `admin` scope (2h)
- [ ] Task 2.4: Testing & documentation (2h)
**Total**: 5.5 hours (~1 day)

### Phase 3: Permission Caching Layer (P1)
- [ ] Task 3.1: Create PermissionCacheService (6h)
- [ ] Task 3.2: Create requirePermission middleware (4h)
- [ ] Task 3.3: Testing & documentation (3h)
**Total**: 13 hours (~2 days)

### Phase 4: MFA for Admin Accounts (P1)
- [ ] Task 4.1: Database migration for MFA fields (0.5h)
- [ ] Task 4.2: Install MFA dependencies (0.25h)
- [ ] Task 4.3: Implement MFAService (6h)
- [ ] Task 4.4: Create MFA enrollment endpoints (4h)
- [ ] Task 4.5: Update login flow for MFA (4h)
- [ ] Task 4.6: Create MFA enrollment UI (8h)
- [ ] Task 4.7: Testing & documentation (6h)
**Total**: 28.75 hours (~4 days)

### Phase 5: Admin Session Management (P1)
- [ ] Task 5.1: Shorter session TTL for admins (3h)
- [ ] Task 5.2: Concurrent session limits (5h)
- [ ] Task 5.3: Idle timeout (4h)
- [ ] Task 5.4: Force logout on role change (2h)
- [ ] Task 5.5: Testing & documentation (3h)
**Total**: 17 hours (~2.5 days)

---

## Grand Total Effort Estimate

**Total Hours**: 79.25 hours
**Total Days**: ~12 working days (6.6 hours/day)
**Total Weeks**: ~2.5 weeks (1 senior backend dev full-time)

**Note**: Frontend work (Task 4.6) may require additional frontend developer time (8 hours).

---

## Orchestration Workflow

### Recommended Subagent Usage

**Phase 1 + 2** (P0 - Critical):
```bash
# Launch api-backend-implementer agent for Phase 1
Use Task tool with subagent_type="api-backend-implementer"
Prompt: "Implement Phase 1 tasks (1.1-1.5) from doc 127"

# Launch oidc-auth-implementer agent for Phase 2
Use Task tool with subagent_type="oidc-auth-implementer"
Prompt: "Implement Phase 2 tasks (2.1-2.4) from doc 127"

# Launch testing-qa-specialist agent for validation
Use Task tool with subagent_type="testing-qa-specialist"
Prompt: "Validate Phase 1+2 implementation from doc 127"
```

**Phase 3** (P1):
```bash
# Launch api-backend-implementer agent
Use Task tool with subagent_type="api-backend-implementer"
Prompt: "Implement Phase 3 tasks (3.1-3.3) from doc 127"
```

**Phase 4** (P1 - Multi-agent):
```bash
# Launch db-schema-architect for migration
Use Task tool with subagent_type="db-schema-architect"
Prompt: "Implement Task 4.1 (MFA database migration) from doc 127"

# Launch api-backend-implementer for backend
Use Task tool with subagent_type="api-backend-implementer"
Prompt: "Implement Tasks 4.2-4.5 (MFA backend) from doc 127"

# Launch general-purpose for frontend
Use Task tool with subagent_type="general-purpose"
Prompt: "Implement Task 4.6 (MFA frontend UI) from doc 127"

# Launch testing-qa-specialist for testing
Use Task tool with subagent_type="testing-qa-specialist"
Prompt: "Implement Task 4.7 (MFA testing) from doc 127"
```

**Phase 5** (P1):
```bash
# Launch oidc-auth-implementer agent
Use Task tool with subagent_type="oidc-auth-implementer"
Prompt: "Implement Phase 5 tasks (5.1-5.5) from doc 127"
```

---

**Last Updated**: 2025-11-09
**Status**: Ready for implementation
**Parent Plan**: 126 (Identity Provider Enhancement Plan)
