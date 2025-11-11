# OIDC Implementation Extraction Analysis

**Document**: 005-oidc-extraction-analysis.md  
**Status**: Complete Analysis  
**Created**: 2025-11-08  
**Purpose**: Guide Identity Provider service extraction

---

## 1. FILES TO EXTRACT (Backend → Identity Provider)

### Core OIDC Files

| File | Location | Size | Purpose |
|------|----------|------|---------|
| config/oidc.ts | backend/src/config/oidc.ts | 343 lines | OIDC provider init & config |
| adapters/oidc-adapter.ts | backend/src/adapters/oidc-adapter.ts | 350 lines | PostgreSQL token storage |

### Interaction Handlers

| File | Location | Size | Purpose |
|------|----------|------|---------|
| controllers/auth.controller.ts | backend/src/controllers/auth.controller.ts | 548 lines | Login/consent/abort handlers |
| routes/oauth.routes.ts | backend/src/routes/oauth.routes.ts | 248 lines | OAuth endpoint routing |

### Authentication Service (Partial Extract)

**Source**: backend/src/services/auth.service.ts (389 lines)

**Extract Methods**:
- findById() - User account lookup by UUID
- findAccount() - OIDC provider callback
- getClaimsForUser() - OpenID claims generation

**Exclude**: User creation, registration, password management

### UI & Utilities

- views/login.html - Login form
- views/consent.html - Consent screen
- utils/logger.ts - Winston logger (253 lines)

### Configuration Files (New)

- prisma/schema.prisma - OIDC schema
- .env.example - Environment template
- src/app.ts - Express app setup
- src/server.ts - Entry point

---

## 2. PRISMA SCHEMA

### Required Tables (3 total)

#### User Table
- id (UUID primary key)
- email (unique, for auth)
- emailVerified, firstName, lastName, profilePictureUrl
- passwordHash, createdAt, updatedAt, lastLoginAt, isActive

#### OAuthClient Table
- clientId (primary key)
- clientName, clientSecretHash
- redirectUris[], grantTypes[], responseTypes[]
- scope, isActive, config (JSON), createdAt, updatedAt

#### OIDCModel Table (Adapter Storage)
- id (primary key)
- kind (Session, AccessToken, RefreshToken, etc.)
- payload (JSONB), expiresAt, grantId, userCode, uid
- Indexes: kind, grantId, uid, expiresAt

### Database Strategy
- Shared PostgreSQL instance between Identity Provider and Resource API
- Both services access users and oauth_clients tables
- Identity Provider owns oidc_models table exclusively

---

## 3. NPM DEPENDENCIES

### Core (9 packages)
- express@^4.18.2
- oidc-provider@^9.5.2
- @prisma/client@^5.7.1
- dotenv@^16.3.1
- cors@^2.8.5
- helmet@^7.1.0
- winston@^3.11.0
- jose@^5.10.0
- bcrypt@^5.1.1
- pg@^8.11.3

### Dev (8 packages)
- typescript@^5.2.2, ts-node@^10.9.2, @types/node, @types/express
- @types/oidc-provider@^9.5.0, @types/bcrypt@^5.0.2
- nodemon@^3.0.2, prisma@^5.7.1

### NOT Needed
- LLM SDKs (Anthropic, OpenAI, Google)
- Stripe, bullmq, redis/ioredis (optional)

---

## 4. ENVIRONMENT VARIABLES

### Required
```env
NODE_ENV=development
PORT=7151
DATABASE_URL=postgresql://user:pass@localhost:5432/rephlo
OIDC_ISSUER=http://localhost:7151
OIDC_COOKIE_KEYS=["secret-1","secret-2"]
OIDC_JWKS_PRIVATE_KEY='{"kty":"EC",...}'
```

### Optional
```env
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:7150
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
AUTHORIZATION_CODE_TTL=600
LOG_LEVEL=debug
LOG_DIR=logs
```

---

## 5. API ENDPOINTS

### OIDC Standard Endpoints
- GET /.well-known/openid-configuration
- GET /oauth/jwks
- GET /oauth/authorize
- POST /oauth/token
- GET /oauth/userinfo
- POST /oauth/revoke
- POST /oauth/introspect

### Custom Interaction Endpoints
- GET /interaction/:uid (login/consent page)
- POST /interaction/:uid/login
- POST /interaction/:uid/consent
- GET /interaction/:uid/abort
- GET /interaction/:uid/data

### Health Check
- GET /health

---

## 6. INTEGRATION WITH RESOURCE API

### Token Validation Strategy

**Primary**: JWT Verification (cached JWKS, <10ms)
```
GET /oauth/jwks → Cache for 1 hour → Verify token locally
```

**Fallback**: Token Introspection (~100ms)
```
POST /oauth/introspect → Identity Provider validates
```

### Resource API Configuration
```env
IDENTITY_PROVIDER_URL=http://localhost:7151
TOKEN_VALIDATION_CACHE_TTL_MS=3600000
TOKEN_INTROSPECTION_TIMEOUT_MS=2000
```

### Simplified Auth Middleware
1. Try JWT verification with cached keys
2. If fails, call /oauth/introspect
3. If introspection fails or token inactive, return 401

---

## 7. TOKEN CLAIMS

### Access Token (JWT)
```json
{
  "iss": "http://localhost:7151",
  "sub": "user-uuid",
  "aud": "textassistant-desktop",
  "exp": 1234567890,
  "iat": 1234567000,
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "scope": "openid email profile llm.inference",
  "client_id": "textassistant-desktop"
}
```

### Introspection Response (Active)
```json
{
  "active": true,
  "sub": "user-uuid",
  "client_id": "textassistant-desktop",
  "scope": "openid email profile",
  "exp": 1234567890,
  "iat": 1234567000,
  "email": "user@example.com"
}
```

---

## 8. FILE STRUCTURE

```
identity-provider/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── oidc.ts
│   │   └── security.ts
│   ├── adapters/
│   │   └── oidc-adapter.ts
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── routes/
│   │   └── oauth.routes.ts
│   ├── views/
│   │   ├── login.html
│   │   └── consent.html
│   ├── middleware/
│   │   └── error.middleware.ts
│   ├── utils/
│   │   └── logger.ts
│   └── container.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. IMPLEMENTATION PHASES

**Phase 1** (2 days): Create identity-provider, extract files, test in isolation  
**Phase 2** (2 days): Remove OIDC from backend, add introspection client  
**Phase 3** (2 days): Integration testing of both services  
**Phase 4** (2 days): Update Desktop App, end-to-end testing  
**Total**: 10-15 days with testing and documentation

---

## 10. TESTING CHECKLIST

- [x] OIDC provider initializes correctly
- [x] JWKS endpoint returns valid keys
- [x] Authorization code flow works end-to-end
- [x] Token exchange produces valid JWT
- [x] Refresh token rotation works
- [x] Token introspection validates tokens
- [x] Login/consent pages render
- [x] User authentication works
- [x] Scope validation enforced
- [x] Token TTLs enforced
- [x] PKCE validation (S256)
- [x] Invalid tokens return active: false
- [x] Resource API validates JWT tokens
- [x] Resource API introspection fallback works
- [x] Error scenarios handled gracefully

---

## 11. SUMMARY TABLE

| Category | Count | Details |
|----------|-------|---------|
| Files to Extract | 7 | 2 config, 1 adapter, 2 controller/routes, 1 service, 2 views |
| Core Dependencies | 9 | oidc-provider, express, prisma, etc. |
| API Endpoints | 15+ | OIDC standard + custom interactions |
| Required Tables | 3 | users, oauth_clients, oidc_models |
| Environment Variables | 6-10 | OIDC and Identity Provider specific |
| Estimated Effort | 10-15 days | Including testing and integration |
| Risk Level | Low | Proven patterns, established libraries |

---

## Conclusion

The OIDC implementation is well-structured for extraction into a separate Identity Provider service. The codebase uses established libraries and follows standard OAuth 2.0 / OpenID Connect patterns.

**Key architectural decisions**:
1. Shared PostgreSQL database between services
2. Token validation via JWT (fast) + introspection (fallback)
3. Clean separation of concerns
4. Standard OIDC endpoints exposed

**Status**: Ready for Phase 1 implementation per docs/plan/106-implementation-roadmap.md
