# Authentication Implementation & MFA Migration Project Plan

**Document ID**: 030
**Category**: Implementation Plan
**Created**: 2025-11-09
**Priority**: HIGH (Authentication) + MEDIUM (MFA Migration)
**Estimated Total Effort**: 17-22 hours
**Project Leader**: AI Development Team
**Target Completion**: 2-3 working days

---

## Executive Summary

This plan addresses two critical initiatives:

### **PHASE 1: Frontend OAuth/OIDC Authentication (BLOCKER)**
The admin dashboard is currently unable to access protected API endpoints due to missing authentication. This must be implemented first before any dashboard functionality can be tested.

**Status**: 🔴 **CRITICAL BLOCKER**
**Effort**: 8-10 hours
**Priority**: P0

### **PHASE 2: MFA Migration to Identity Provider (ARCHITECTURAL DEBT)**
MFA functionality is currently duplicated between backend and identity-provider services, creating maintenance burden and architectural misalignment.

**Status**: 🟡 **TECHNICAL DEBT**
**Effort**: 7-10 hours
**Priority**: P1

**Dependencies**: Phase 2 can run in parallel after Phase 1 authentication foundation is complete.

---

## PHASE 1: Frontend OAuth/OIDC Authentication Implementation

### Objective
Implement OAuth 2.0 Authorization Code Flow with PKCE for the admin dashboard frontend.

### Current State
- ✅ Backend API protected with JWT authentication
- ✅ Identity Provider (OIDC) operational on port 7151
- ✅ OAuth client `web-app-test` configured in database
- ❌ **Frontend has no authentication mechanism**
- ❌ API client sends requests without Authorization headers
- ❌ Dashboard shows 401 Unauthorized errors

### Required Components

#### 1. OAuth Context & State Management (2-3 hours)

**Files to Create:**
- `frontend/src/contexts/AuthContext.tsx` - Authentication state provider
- `frontend/src/hooks/useAuth.ts` - Authentication hook
- `frontend/src/utils/oauth.ts` - PKCE and OAuth utilities
- `frontend/src/types/auth.ts` - Authentication type definitions

**Implementation Details:**
```typescript
// AuthContext should manage:
- isAuthenticated: boolean
- user: User | null
- accessToken: string | null
- refreshToken: string | null
- login() - Initiates OAuth flow
- logout() - Clears session
- refreshAccessToken() - Token refresh logic
```

**OAuth Configuration:**
```typescript
const OAUTH_CONFIG = {
  clientId: 'web-app-test',
  redirectUri: 'http://localhost:7152/oauth/callback',
  authorizationEndpoint: 'http://localhost:7151/oauth/authorize',
  tokenEndpoint: 'http://localhost:7151/oauth/token',
  scope: 'openid email profile offline_access admin',
  responseType: 'code',
  codeChallengeMethod: 'S256'
}
```

#### 2. PKCE Implementation (1 hour)

**Utilities to implement:**
- Generate code verifier (random string)
- Generate code challenge (SHA-256 hash)
- Store code verifier in sessionStorage
- Validate state parameter

**Files:**
- `frontend/src/utils/pkce.ts`

```typescript
export async function generatePKCE() {
  const verifier = generateRandomString(128);
  const challenge = await sha256(verifier);
  return { verifier, challenge };
}
```

#### 3. OAuth Callback Handler (1-2 hours)

**Update existing file:**
- `frontend/src/pages/auth/OAuthCallback.tsx`

**New logic:**
1. Extract authorization code from URL
2. Retrieve code verifier from sessionStorage
3. Exchange code for tokens (POST to token endpoint)
4. Store tokens securely
5. Fetch user info
6. Redirect to dashboard

#### 4. API Client Authentication Interceptor (1 hour)

**Update file:**
- `frontend/src/services/api.ts`

**Add interceptors:**
```typescript
// Request interceptor - Add Authorization header
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request
        return apiClient.request(error.config);
      } else {
        // Redirect to login
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);
```

#### 5. Protected Route Wrapper (1 hour)

**Create file:**
- `frontend/src/components/auth/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) {
    // Redirect to login or show login modal
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

#### 6. Login Page/Modal (2 hours)

**Create file:**
- `frontend/src/pages/Login.tsx`

**Features:**
- OAuth login button
- Display loading state during OAuth flow
- Error handling
- Redirect back to requested page after login

#### 7. Token Storage & Security (30 min)

**Decisions:**
- **Access Token**: Store in memory (React state) - most secure
- **Refresh Token**: Store in httpOnly cookie (backend-managed) or localStorage with encryption
- **State Parameter**: sessionStorage (CSRF protection)
- **Code Verifier**: sessionStorage (PKCE)

**Implementation:**
```typescript
// Secure token storage
const tokenStorage = {
  setTokens: (access: string, refresh: string) => {
    // Access token in memory only (AuthContext state)
    // Refresh token in localStorage with encryption
    localStorage.setItem('refresh_token', encrypt(refresh));
  },
  getRefreshToken: () => {
    const encrypted = localStorage.getItem('refresh_token');
    return encrypted ? decrypt(encrypted) : null;
  },
  clearTokens: () => {
    localStorage.removeItem('refresh_token');
  }
};
```

#### 8. Testing & Validation (1-2 hours)

**Test scenarios:**
1. Fresh login flow (authorization code)
2. Token refresh on 401
3. Logout and session cleanup
4. PKCE validation
5. State parameter CSRF protection
6. Dashboard access after authentication
7. All admin pages load without 401 errors

### Deliverables

- [ ] OAuth context and authentication hook
- [ ] PKCE implementation
- [ ] OAuth callback handler
- [ ] API client interceptors
- [ ] Protected route wrapper
- [ ] Login page
- [ ] Token storage utilities
- [ ] Integration tests
- [ ] Documentation update

### Testing Checklist

- [ ] Login with `admin.test@rephlo.ai` / `AdminPassword123!`
- [ ] Dashboard loads without 401 errors
- [ ] Navigate to Users page - loads successfully
- [ ] Navigate to Subscriptions page - loads successfully
- [ ] Navigate to Licenses page - loads successfully
- [ ] Navigate to Coupons page - loads successfully
- [ ] Navigate to Analytics page - loads successfully
- [ ] Token refresh works automatically on expiry
- [ ] Logout clears tokens and redirects to login

---

## PHASE 2: MFA Migration to Identity Provider

### Objective
Move MFA functionality from backend to identity-provider service to achieve proper architectural separation.

### Current State (Technical Debt)
- ❌ MFA routes exist in backend (`backend/src/routes/mfa.routes.ts`)
- ❌ MFA fields duplicated in both schemas
- ❌ Type inconsistency: `mfaBackupCodes` is `String?` (JSON) in backend, `String[]` in identity-provider
- ❌ Backend seed.ts uses `mfaVerifiedAt` and `mfaMethod` fields not in identity-provider

### Migration Strategy

#### Approach: **Big Bang Migration** (Recommended)
- Complete migration in one deployment
- Lower complexity than dual-write
- Shorter execution time
- Clear cutover point

**Alternative**: Phased migration with dual-write (see docs/analysis/002 for details)

### Implementation Tasks

#### Task 1: Prepare Identity Provider Schema (1-2 hours)

**File**: `identity-provider/prisma/schema.prisma`

**Changes needed:**
```prisma
// Update User model
model User {
  // ... existing fields ...

  // Multi-Factor Authentication (MFA) Fields
  mfaSecret      String?   @map("mfa_secret") @db.VarChar(255)
  mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
  mfaBackupCodes String?   @map("mfa_backup_codes") @db.Text  // Changed from String[] to String? (JSON)
  mfaVerifiedAt  DateTime? @map("mfa_verified_at")             // NEW
  mfaMethod      String?   @map("mfa_method") @db.VarChar(20)  // NEW

  @@index([mfaEnabled])
}
```

**Actions:**
1. Update schema with new fields
2. Create migration: `npx prisma migrate dev --name add-mfa-verified-at-and-method`
3. Regenerate Prisma client
4. Verify migration on dev database

#### Task 2: Move MFA Routes to Identity Provider (3-4 hours)

**Source File**: `backend/src/routes/mfa.routes.ts` (680 lines)
**Target Location**: `identity-provider/src/routes/mfa.routes.ts`

**Steps:**
1. Copy file to identity-provider
2. Update imports:
   - Change Prisma client import to identity-provider's client
   - Update service dependencies
3. Update endpoint paths:
   - `/mfa/*` → `/auth/mfa/*`
4. Update CORS configuration to allow frontend origin
5. Register routes in `identity-provider/src/app.ts`
6. Update middleware dependencies

**Affected endpoints:**
```
POST /auth/mfa/setup            - Generate MFA secret
POST /auth/mfa/verify           - Verify and enable MFA
POST /auth/mfa/disable          - Disable MFA
POST /auth/mfa/verify-token     - Verify MFA token
POST /auth/mfa/backup-codes     - Regenerate backup codes
```

#### Task 3: Move MFA Middleware (1 hour)

**Source**: `backend/src/middleware/require-mfa.middleware.ts`
**Target**: `identity-provider/src/middleware/require-mfa.middleware.ts`

**Updates:**
- Adjust imports
- Update error handling
- Integrate with OIDC flow

#### Task 4: Update Backend - Remove MFA (2 hours)

**Remove from backend:**
1. Delete `backend/src/routes/mfa.routes.ts`
2. Delete `backend/src/middleware/require-mfa.middleware.ts`
3. Remove MFA fields from `backend/prisma/schema.prisma`:
   ```prisma
   // DELETE these fields:
   mfaSecret
   mfaEnabled
   mfaBackupCodes
   mfaVerifiedAt
   mfaMethod
   ```
4. Remove MFA route registration from `backend/src/server.ts`
5. Update `backend/src/db/seed.ts` - remove MFA field references
6. Update test mocks - remove MFA fields
7. Create migration: `npx prisma migrate dev --name remove-mfa-fields`
8. Regenerate Prisma client

#### Task 5: Update Frontend API Calls (1 hour)

**Update files:**
- `frontend/src/services/api.ts` - Update MFA endpoint URLs
- Any components calling MFA endpoints

**Changes:**
```typescript
// OLD: http://localhost:7150/mfa/setup
// NEW: http://localhost:7151/auth/mfa/setup
```

#### Task 6: Testing & Validation (2-3 hours)

**Test MFA Flow:**
1. **Setup Flow**
   - Admin user enables MFA
   - QR code generation works
   - Backup codes generated

2. **Verification Flow**
   - TOTP verification works
   - Backup code verification works
   - Failed attempts handled correctly

3. **Disable Flow**
   - MFA can be disabled
   - Credentials reset properly

4. **Integration with OAuth**
   - MFA challenge during OAuth login
   - Skip MFA for non-MFA users

**Rollback Testing:**
- Document rollback procedure
- Test rollback in staging environment

### Database Migration Strategy

#### Option A: No Migration Needed (Recommended)
Since both services share the same PostgreSQL database, the MFA fields already exist from identity-provider migrations. Backend just needs to stop using them.

#### Option B: Consolidation Migration (If needed)
```sql
-- Verify data consistency
SELECT COUNT(*) FROM users WHERE mfa_enabled = true;

-- No data transformation needed - fields already exist
```

### Deployment Plan

#### Pre-Deployment
1. ✅ All tests pass in dev environment
2. ✅ Migration tested in staging
3. ✅ Rollback procedure documented
4. ✅ Team notified of deployment

#### Deployment Steps (30 min)
1. Deploy identity-provider with new MFA routes
2. Deploy backend without MFA routes
3. Deploy frontend with updated endpoints
4. Verify MFA endpoints respond correctly
5. Test full MFA flow with admin user

#### Post-Deployment Validation (30 min)
1. Monitor error logs for 1 hour
2. Test MFA setup for 3 test users
3. Verify OAuth login with MFA challenge
4. Check database for data consistency

#### Rollback Procedure (If needed)
1. Revert frontend to previous version
2. Revert backend to previous version
3. Revert identity-provider to previous version
4. Verify services operational

### Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OAuth login breaks | HIGH | LOW | Test thoroughly before deployment; maintain rollback plan |
| Data inconsistency | MEDIUM | LOW | Both services share same DB; no data migration needed |
| Missed MFA references in code | MEDIUM | MEDIUM | Comprehensive grep for "mfa" in codebase |
| Backup codes stop working | HIGH | LOW | Verify backup code validation in identity-provider |

### Success Criteria

- [ ] All MFA endpoints moved to identity-provider
- [ ] No MFA code remains in backend
- [ ] Frontend successfully calls identity-provider MFA endpoints
- [ ] MFA setup flow works end-to-end
- [ ] MFA verification works during OAuth login
- [ ] All tests pass
- [ ] Zero production incidents for 48 hours post-deployment

---

## PROJECT TIMELINE

### Week 1: Sprint 1 - Authentication (Days 1-2)
- **Day 1 Morning**: OAuth context, PKCE, utilities (4 hours)
- **Day 1 Afternoon**: OAuth callback, API interceptors (4 hours)
- **Day 2 Morning**: Protected routes, login page (3 hours)
- **Day 2 Afternoon**: Testing & validation (3 hours)
- **Milestone**: ✅ Admin dashboard fully accessible with authentication

### Week 1: Sprint 2 - MFA Migration (Days 3-4)
- **Day 3 Morning**: Identity provider schema update (2 hours)
- **Day 3 Afternoon**: Move MFA routes & middleware (4 hours)
- **Day 4 Morning**: Remove backend MFA, update frontend (3 hours)
- **Day 4 Afternoon**: Testing, validation, deployment (3 hours)
- **Milestone**: ✅ MFA architecture aligned with best practices

---

## RESOURCE ALLOCATION

### Development Team
- **Frontend Developer**: Phase 1 (OAuth implementation)
- **Backend Developer**: Phase 2 (MFA migration)
- **QA Engineer**: Testing both phases
- **DevOps**: Deployment support

### External Dependencies
- None (all services internal)

---

## MONITORING & METRICS

### Key Performance Indicators

**Phase 1 - Authentication:**
- OAuth login success rate: Target >99%
- Average login time: Target <3 seconds
- Token refresh success rate: Target >99%
- 401 errors after login: Target = 0

**Phase 2 - MFA Migration:**
- MFA setup success rate: Target >99%
- MFA verification success rate: Target >98%
- Identity provider response time: Target <200ms
- Zero data loss during migration

### Logging Requirements

**Authentication Events:**
```
[AUTH] OAuth login initiated: user={email}
[AUTH] OAuth callback received: code={code}
[AUTH] Token exchange successful: user={userId}
[AUTH] Token refresh triggered: user={userId}
[AUTH] Logout: user={userId}
```

**MFA Events:**
```
[MFA] Setup initiated: user={userId}
[MFA] QR code generated: user={userId}
[MFA] MFA enabled: user={userId}
[MFA] Verification attempt: user={userId}, success={bool}
[MFA] Backup code used: user={userId}
```

---

## DOCUMENTATION UPDATES

### Files to Update

1. **README.md**
   - Add authentication setup instructions
   - Update MFA endpoint documentation
   - Note architectural change

2. **docs/guides/**
   - Create: `frontend-authentication-guide.md`
   - Update: `api-endpoints.md` (MFA endpoints moved)

3. **CHANGELOG.md**
   - Add entry for OAuth implementation
   - Add entry for MFA migration

---

## NEXT ACTIONS (Immediate)

### Priority Order

1. **START PHASE 1** - Frontend Authentication
   - [ ] Create authentication TODO list
   - [ ] Assign frontend developer
   - [ ] Set up development branch: `feature/oauth-authentication`
   - [ ] Begin OAuth context implementation

2. **PREPARE PHASE 2** - MFA Migration
   - [ ] Review technical debt document
   - [ ] Create MFA migration TODO list
   - [ ] Set up development branch: `feature/mfa-migration`
   - [ ] Coordinate with backend developer

3. **TESTING PREPARATION**
   - [ ] Set up test accounts in database
   - [ ] Prepare test scenarios document
   - [ ] Configure monitoring tools

---

## DECISION LOG

| Date | Decision | Made By | Rationale |
|------|----------|---------|-----------|
| 2025-11-09 | Prioritize authentication over MFA migration | Project Leader | Authentication is blocking all dashboard functionality |
| 2025-11-09 | Use Big Bang migration for MFA | Project Leader | Lower complexity, same database, no data migration needed |
| 2025-11-09 | Store access token in memory only | Security Review | Most secure option, prevents XSS theft |

---

**Document Status**: 📋 READY FOR EXECUTION
**Next Review Date**: After Phase 1 completion
**Approval Required From**: Tech Lead, Product Owner
