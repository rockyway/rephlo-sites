# Three-Tier Architecture Redesign

**Document Number**: 105
**Created**: 2025-11-08
**Status**: Architecture Planning Phase
**Author**: Claude Code Architecture Specialist

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Three-Tier Architecture](#proposed-three-tier-architecture)
4. [Detailed Component Specifications](#detailed-component-specifications)
5. [Migration Strategy](#migration-strategy)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Benefits & Trade-offs](#benefits--trade-offs)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Problem Statement

The current monolithic backend combines:
- OIDC/OAuth 2.0 Provider (authentication)
- REST API (resource server)
- Token validation logic

This creates complexity and tight coupling:
- Token introspection requires complex adapter pattern
- Hard to scale identity provider separately from API
- Difficult for other services to reuse identity provider
- Mixed concerns in single codebase

### Proposed Solution

Separate into **three independent services**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop App (Client)                      │
│                   Public OIDC/OAuth 2.0 Client              │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
        OAuth 2.0                      Token Introspection
        Login Flow                      (validate tokens)
             │                                │
    ┌────────▼──────────────┐    ┌──────────▼──────────────┐
    │  Identity Provider     │    │  Resource API Server    │
    │  (New Site)            │    │  (Simplified)           │
    │                        │    │                         │
    │ - Handles login        │    │ - Validates tokens via  │
    │ - Issues tokens        │    │   introspection         │
    │ - Token refresh        │    │ - Returns data/LLM      │
    │ - JWKS endpoint        │    │ - No OIDC logic         │
    │ - Userinfo endpoint    │    │ - Stateless             │
    └────────────────────────┘    └────────────────────────┘
             ▲
             │
        PostgreSQL
        (shared)
```

### Key Differences

| Aspect | Current | Proposed |
|--------|---------|----------|
| Services | 1 monolith | 3 independent services |
| OIDC Provider | Built-in | Separate service |
| Token Validation | Complex (opaque tokens) | Simple (introspection call) |
| Scaling | Coupled | Independent per service |
| Deployment | Single instance | Multiple instances per service |
| Testability | Difficult (OIDC setup) | Simple (mock introspection) |

---

## Current State Analysis

### Current Architecture Issues

#### 1. Complexity
- **node-oidc-provider** integration takes 40% of backend code
- Token introspection requires database adapter pattern
- Multiple middleware layers for OIDC flow

#### 2. Tight Coupling
- API endpoints depend on OIDC provider initialization
- Hard to deploy separately
- Can't scale one without scaling the other

#### 3. Testing Difficulty
- OIDC setup required for every test
- Complex session management
- Hard to mock token validation

#### 4. Token Format Challenges
- Opaque tokens require introspection from same service (circular)
- Tried JWT format override → caused 500 errors
- Mixed token strategies (JWT + opaque)

### Current Components to Migrate

**OIDC Provider** (move to new service):
- Routes: `/oauth/*`, `/.well-known/*`, `/interaction/*`
- Controllers: `auth.controller.ts`
- Config: `config/oidc.ts`
- Adapter: `adapters/oidc-adapter.ts`
- Middleware: Auth interaction handlers

**Keep in API**:
- Routes: `/v1/*`, `/api/*`, `/admin/*`
- Controllers: All except auth interaction
- Services: All except OIDC-specific logic
- Middleware: JWT validation, rate limiting, error handling

---

## Proposed Three-Tier Architecture

### Tier 1: Identity Provider Service

**Purpose**: Pure OAuth 2.0 / OpenID Connect server

**Technology**:
- Node.js + Express
- node-oidc-provider v9.5.2
- PostgreSQL (shared with API)
- Redis for sessions

**Key Responsibilities**:
- User authentication (login/logout)
- Token issuance (access token + refresh token)
- Token refresh
- Token revocation
- User info endpoint
- JWKS endpoint (public keys)
- Consent/authorization flows

**Endpoints**:
```
GET  /oauth/authorize              - Authorization endpoint
POST /oauth/token                  - Token endpoint
POST /oauth/revoke                 - Token revocation
GET  /oauth/userinfo               - User info
GET  /.well-known/openid-config... - Discovery
GET  /oauth/jwks                   - Public keys
GET  /interaction/:uid             - Login page
POST /interaction/:uid/login       - Process login
POST /interaction/:uid/consent     - Process consent
```

**Database Tables** (subset):
- `users` (shared)
- `oidc_models` (OIDC state)

**Configuration**:
- Port: 7151
- OIDC_ISSUER: `http://localhost:7151` (or prod domain)
- RS256 private key (generated)
- PKCE enforcement

### Tier 2: Resource API Service

**Purpose**: REST API for LLM platform

**Technology**:
- Node.js + Express (current backend)
- PostgreSQL (shared with Identity Provider)
- Redis for caching/rate limiting

**Key Responsibilities**:
- Validate access tokens via introspection
- Return protected resources
- Process LLM requests
- Manage subscriptions
- Track usage/credits
- Send webhooks

**Endpoints**:
```
GET  /v1/models
POST /v1/chat/completions
POST /v1/completions
GET  /v1/users/me
POST /v1/subscriptions
GET  /v1/credits/me
...
```

**Database Tables**:
- All except `oidc_models`

**Configuration**:
- Port: 7150 (current)
- IDENTITY_PROVIDER_URL: `http://localhost:7151` (or prod domain)
- JWT public key from Identity Provider JWKS endpoint

### Tier 3: Desktop App (Client)

**Purpose**: Public OAuth 2.0 client

**Technology**:
- Current Electron/React desktop app
- OAuth 2.0 Authorization Code Flow with PKCE
- Browser-based login redirect

**Key Responsibilities**:
- Redirect user to Identity Provider for login
- Receive authorization code
- Exchange code for tokens (via Identity Provider)
- Store tokens securely
- Call API with access tokens
- Handle token refresh

**Flow**:
```
1. User clicks "Login" in Desktop App
2. Opens browser → Identity Provider login page
3. User enters credentials
4. Identity Provider redirects to app with auth code
5. App exchanges code for tokens (backend)
6. App stores tokens (secure storage)
7. API calls include: Authorization: Bearer <token>
8. API validates token via Identity Provider introspection
9. Returns protected resource
```

---

## Detailed Component Specifications

### Identity Provider Service

#### Directory Structure
```
identity-provider/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server startup
│   ├── config/
│   │   ├── oidc.ts           # OIDC provider config
│   │   └── security.ts       # CORS, headers
│   ├── controllers/
│   │   └── auth.controller.ts # Interaction handlers
│   ├── services/
│   │   └── auth.service.ts    # Account lookup
│   ├── middleware/
│   │   └── error.middleware.ts
│   ├── views/
│   │   ├── login.html         # Login page
│   │   └── consent.html       # Consent page
│   └── utils/
│       └── logger.ts
├── prisma/
│   └── schema.prisma          # Shared schema (subset)
├── package.json
├── tsconfig.json
└── .env
```

#### Key Files to Extract
From current backend:
- `src/config/oidc.ts` (rename to `config/oidc.ts`)
- `src/controllers/auth.controller.ts` (move as-is)
- `src/services/auth.service.ts` (keep account lookup logic)
- `src/adapters/oidc-adapter.ts` (move as-is)
- `src/views/login.html` (move as-is)
- `prisma/schema.prisma` (full copy, but only use users table)

#### Environment Variables
```env
# Server
NODE_ENV=development
PORT=7151

# Database (shared with API)
DATABASE_URL=postgresql://user:password@localhost:5432/textassistant

# Redis
REDIS_URL=redis://localhost:6379

# OIDC
OIDC_ISSUER=http://localhost:7151
OIDC_JWKS_PRIVATE_KEY=<RS256-private-key>
OIDC_COOKIE_KEYS=["key1","key2"]

# Logging
LOG_LEVEL=debug
```

### Resource API Service (Simplified)

#### Changes Required

**1. Remove OIDC Provider**
- Delete: `src/config/oidc.ts`
- Delete: `src/adapters/oidc-adapter.ts`
- Delete: OIDC middleware from app.ts
- Delete: OAuth routes (`/oauth/*`)

**2. Simplify Auth Middleware**
```typescript
// OLD: Complex JWT verification with opaque token introspection
// NEW: Simple JWT verification + optional introspection

async function authMiddleware(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  try {
    // Try JWT verification first
    const payload = verifyJWT(token);
    req.user = payload;
    next();
  } catch (err) {
    // Fall back to introspection
    const introspectionResult = await introspectToken(token);
    if (!introspectionResult.active) {
      return next(unauthorizedError('Invalid token'));
    }
    req.user = {
      sub: introspectionResult.sub,
      scope: introspectionResult.scope?.split(' ') || [],
      // ... other fields
    };
    next();
  }
}

async function introspectToken(token: string) {
  const response = await fetch(
    `${process.env.IDENTITY_PROVIDER_URL}/oauth/introspect`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${token}`,
    }
  );
  return response.json();
}
```

**3. Get Public Keys from Identity Provider**
```typescript
// On startup, fetch JWKS from Identity Provider
const jwks = await fetch(
  `${process.env.IDENTITY_PROVIDER_URL}/oauth/jwks`
).then(r => r.json());

// Cache public keys, refresh periodically
const publicKey = importJWK(jwks.keys[0]); // Use latest key
```

**4. Environment Variables**
```env
# Add
IDENTITY_PROVIDER_URL=http://localhost:7151

# Remove OIDC-specific vars
# - OIDC_ISSUER
# - OIDC_JWKS_PRIVATE_KEY
# - OIDC_COOKIE_KEYS
```

**5. Dependencies to Remove**
- `oidc-provider` (large, complex)
- `node-oidc-provider` specific adapters
- Interaction middleware

**6. Dependencies to Add**
- None (already have `jose` for JWT, `axios` for HTTP)

#### File Changes Summary
| File | Action | Reason |
|------|--------|--------|
| `src/app.ts` | Remove OIDC setup | No longer needed |
| `src/middleware/auth.middleware.ts` | Simplify | Remove opaque token logic |
| `src/routes/oauth.routes.ts` | Delete | All auth moved to Identity Provider |
| `src/controllers/auth.controller.ts` | Delete | Interaction logic moved |
| `.env` | Update | Remove OIDC vars, add IDENTITY_PROVIDER_URL |

### Desktop App Changes

#### Current Flow (with OIDC in API)
```
Desktop App → API /oauth/authorize → OIDC Provider → Login → Callback
```

#### New Flow (separate Identity Provider)
```
Desktop App → Identity Provider /oauth/authorize → Login → Callback
```

#### Required Changes

**1. OAuth Configuration Update**
```typescript
// OLD
const oauthConfig = {
  authorizationURL: 'http://localhost:7150/oauth/authorize',
  tokenURL: 'http://localhost:7150/oauth/token',
  // ...
};

// NEW
const oauthConfig = {
  authorizationURL: 'http://localhost:7151/oauth/authorize',
  tokenURL: 'http://localhost:7151/oauth/token',  // Request made to Identity Provider
  // ...
};
```

**2. Redirect URI**
- Keep: `http://localhost:8080/callback` (desktop callback)
- Should work the same way

**3. Testing**
- Test login flow with Identity Provider
- Verify token format (JWT from Identity Provider)
- Test API calls with JWT tokens

---

## Migration Strategy

### Phase 1: Planning & Setup (1 day)
- [x] Document architecture
- [ ] Create Identity Provider project structure
- [ ] Extract OIDC code from current backend

### Phase 2: Identity Provider Implementation (3-5 days)
- [ ] Set up Identity Provider project
- [ ] Copy OIDC configuration and adapters
- [ ] Test login/token flow independently
- [ ] Verify JWKS endpoint and public keys

### Phase 3: API Simplification (2-3 days)
- [ ] Remove OIDC provider from API
- [ ] Implement token introspection client
- [ ] Update auth middleware
- [ ] Update environment configuration
- [ ] Test with tokens from Identity Provider

### Phase 4: Integration Testing (2-3 days)
- [ ] Test end-to-end flow (Desktop → Identity → API)
- [ ] Test token refresh
- [ ] Test token revocation
- [ ] Test error scenarios

### Phase 5: Desktop App Updates (1-2 days)
- [ ] Update OAuth configuration
- [ ] Test login flow
- [ ] Test token storage/refresh
- [ ] Test API calls

### Phase 6: Cleanup & Documentation (1 day)
- [ ] Remove dead code
- [ ] Update documentation
- [ ] Archive old OIDC files
- [ ] Commit changes

**Total Estimated Time**: 10-15 days

### Parallel Development

Teams can work in parallel:
- **Team A**: Identity Provider (based on extracted code)
- **Team B**: API simplification (remove OIDC, add introspection)
- **Team C**: Desktop app updates (swap OAuth endpoints)

All converge for integration testing (Phase 4).

---

## Benefits & Trade-offs

### Benefits

#### ✅ Separation of Concerns
- Identity Provider: Pure OAuth/OIDC (focused)
- API: Pure resource server (focused)
- Clear responsibilities

#### ✅ Easier to Scale
- Identity Provider: Add instances for login volume
- API: Add instances for API requests
- Redis/Database shared but each service can scale independently

#### ✅ Better Testing
- Test Identity Provider in isolation (no API dependencies)
- Test API with mocked/real introspection calls
- Faster test execution

#### ✅ Reusability
- Other services can use Identity Provider
- Mobile apps, web apps, desktop apps all use same auth
- Single source of truth for users/auth

#### ✅ Simpler Token Validation
- No more opaque token -> introspection circular dependency
- Standard JWT validation OR simple introspection call
- Clear token flow

#### ✅ Independent Deployment
- Deploy Identity Provider separately from API
- Zero downtime updates possible
- Can rollback each service independently

#### ✅ Reduced Dependencies
- API no longer needs `oidc-provider` package
- Smaller, faster builds
- Fewer security updates from OIDC provider

### Trade-offs

#### ⚠️ More Services to Run
- 2 services instead of 1
- Need separate monitoring/logging for each
- More operational complexity

#### ⚠️ Network Overhead
- API calls to Identity Provider for introspection
- ~50ms latency per introspection call (cached helps)
- Network partitioning scenarios (both services must be up)

#### ⚠️ Initial Development Time
- Requires refactoring current code
- ~10-15 days of effort
- But pays back in maintenance, testing, scaling

#### ⚠️ Data Synchronization
- Both services share PostgreSQL
- Database must be accessible to both
- Handle migrations carefully

### Mitigation Strategies

**For Network Overhead**:
- Cache introspection results (5-10 minute TTL)
- Use JWT tokens from Identity Provider (no introspection needed)
- Implement circuit breaker pattern

**For Operational Complexity**:
- Use Docker Compose for local development (both services)
- Use Kubernetes for production (easy to scale)
- Unified logging to ELK stack

**For Data Sync**:
- Use single PostgreSQL instance (both services connect)
- Run migrations in order (schema applies to both)
- Design schema to support both services cleanly

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Token format inconsistency | Medium | High | Strict JWT validation, introspection fallback |
| Network latency on introspection | Medium | Medium | Cache results, implement circuit breaker |
| Database connection pooling | Low | Medium | Monitor connection usage, set pool size per service |
| Session handling across services | Low | Low | Use JWT (stateless), not sessions |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Both services down | Low | High | Monitor both, alert on failures, auto-restart |
| Identity Provider performance | Low | Medium | Load test, implement rate limiting |
| Deployment order issues | Medium | Medium | Document deployment sequence, use feature flags |

### Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Hidden OIDC complexity | Medium | High | Thorough code review before extraction |
| Integration issues | Medium | High | Plan integration testing thoroughly |
| Desktop app incompatibility | Low | Medium | Test on actual desktop app |

---

## Next Steps

1. ✅ **This document**: Architecture design complete
2. **Next**: Update PRD to reflect new architecture
3. **Then**: Create Identity Provider project
4. **Then**: Simplify API
5. **Then**: Integration testing
6. **Finally**: Update Desktop app

---

**Document Status**: Architecture & Planning Phase
**Review Date**: Before implementation
**Approval Required**: Product lead, engineering lead

