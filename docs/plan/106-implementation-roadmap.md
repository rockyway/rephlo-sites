# Three-Tier Architecture: Implementation Roadmap

**Document Number**: 106
**Created**: 2025-11-08
**Status**: Implementation Planning
**Estimated Duration**: 10-15 days

---

## High-Level Timeline

```
Week 1
├── Day 1-2: Identity Provider Setup
│   └── Create new Express project with extracted OIDC code
├── Day 3-4: API Simplification
│   └── Remove OIDC, implement introspection client
└── Day 5: Integration Testing Phase 1
    └── End-to-end flow validation

Week 2
├── Day 1-2: Desktop App Updates
│   └── Swap OAuth endpoints
├── Day 3: Full Integration Testing
│   └── Complete flow validation
└── Day 4-5: Documentation & Cleanup
    └── Archive code, update docs
```

---

## Task Breakdown

### Phase 1: Identity Provider Setup (Days 1-2)

**Task 1.1: Create Project Structure**
```bash
mkdir identity-provider
cd identity-provider
npm init -y
npm install express typescript @types/express oidc-provider \
  @prisma/client dotenv cors helmet winston
npm install --save-dev typescript ts-node @types/node
```

**Task 1.2: Extract OIDC Code**
- Copy from `backend/src/config/oidc.ts` → `identity-provider/src/config/oidc.ts`
- Copy from `backend/src/controllers/auth.controller.ts` → `identity-provider/src/controllers/auth.controller.ts`
- Copy from `backend/src/services/auth.service.ts` → `identity-provider/src/services/auth.service.ts` (keep only account lookup)
- Copy from `backend/src/adapters/oidc-adapter.ts` → `identity-provider/src/adapters/oidc-adapter.ts`
- Copy from `backend/src/views/login.html` → `identity-provider/src/views/login.html`
- Copy from `backend/src/views/consent.html` → `identity-provider/src/views/consent.html`
- Copy `backend/src/utils/logger.ts` → `identity-provider/src/utils/logger.ts`

**Task 1.3: Create App Structure**
```typescript
// src/app.ts
import express from 'express';
import { createOIDCProvider } from './config/oidc';

export async function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // OIDC Provider
  const oidcProvider = await createOIDCProvider(prisma);
  app.use('/', oidcProvider.callback());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
```

**Task 1.4: Environment Setup**
- Create `.env` with OIDC variables
- Create `prisma/schema.prisma` (copy from backend)
- Run migrations: `prisma migrate deploy`

**Task 1.5: Test Identity Provider**
```bash
npm run dev
# Test: GET http://localhost:7151/health
# Test: GET http://localhost:7151/.well-known/openid-configuration
```

---

### Phase 2: API Simplification (Days 3-4)

**Task 2.1: Remove OIDC Provider**

Files to delete:
- `src/config/oidc.ts`
- `src/adapters/oidc-adapter.ts`
- `src/routes/oauth.routes.ts`
- `src/controllers/auth.controller.ts` (interaction handlers)
- `src/views/login.html`, `consent.html`

Update `src/app.ts`:
```typescript
// REMOVE these lines:
// import { createOIDCProvider } from './config/oidc';
// const oidcProvider = await createOIDCProvider(prisma);
// app.use('/', oauthRouter);
```

**Task 2.2: Implement Token Introspection Client**

Create `src/services/token-introspection.service.ts`:
```typescript
export class TokenIntrospectionService {
  constructor(private identityProviderUrl: string) {}

  async introspectToken(token: string) {
    const response = await fetch(
      `${this.identityProviderUrl}/oauth/introspect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(token)}`,
      }
    );

    if (!response.ok) {
      throw new Error('Introspection failed');
    }

    return response.json();
  }

  async getPublicKeys() {
    // Cache this, refresh hourly
    const response = await fetch(
      `${this.identityProviderUrl}/oauth/jwks`
    );
    return response.json();
  }
}
```

**Task 2.3: Update Auth Middleware**

Simplify `src/middleware/auth.middleware.ts`:
```typescript
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(unauthorizedError('Missing authorization header'));
  }

  const token = authHeader.split(' ')[1];

  // Try JWT verification first
  try {
    const payload = verifyJWT(token);
    req.user = convertPayloadToUser(payload);
    return next();
  } catch (err) {
    logger.debug('JWT verification failed, trying introspection');
  }

  // Fall back to introspection
  introspectionService.introspectToken(token)
    .then((result) => {
      if (!result.active) {
        throw new Error('Token is inactive');
      }
      req.user = {
        sub: result.sub,
        email: result.email,
        scope: result.scope?.split(' ') || [],
        clientId: result.client_id,
        exp: result.exp,
        iat: result.iat,
      };
      next();
    })
    .catch(() => {
      next(unauthorizedError('Invalid token'));
    });
}
```

**Task 2.4: Update Environment**
- Add: `IDENTITY_PROVIDER_URL=http://localhost:7151`
- Remove: `OIDC_JWKS_PRIVATE_KEY`, `OIDC_COOKIE_KEYS`, `OIDC_ISSUER`

**Task 2.5: Update package.json**
```json
{
  "dependencies": {
    // Remove "oidc-provider"
    // Keep everything else
  }
}
```

**Task 2.6: Test API Simplification**
```bash
cd backend
npm install  # This will remove oidc-provider
npm run build
npm run dev

# Test: GET http://localhost:7150/health
# (Don't need to test auth yet - needs Identity Provider running)
```

---

### Phase 3: Integration Testing (Days 5-6)

**Task 3.1: Run Both Services**

Terminal 1 - Identity Provider:
```bash
cd identity-provider
npm run dev
# Output: Server running on port 7151
```

Terminal 2 - API:
```bash
cd backend
npm run dev
# Output: Server running on port 7150
```

**Task 3.2: Test OAuth Flow**
```bash
# 1. Get authorization code
curl -X GET "http://localhost:7151/oauth/authorize?client_id=textassistant-desktop&redirect_uri=http://localhost:8080/callback&response_type=code&scope=openid+email+profile&code_challenge=E9Mrozoa2owUednMg&code_challenge_method=S256&state=abc123"

# 2. Login via web UI (should redirect to login page)

# 3. Exchange code for token
curl -X POST http://localhost:7151/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=<code>&redirect_uri=http://localhost:8080/callback&client_id=textassistant-desktop&code_verifier=<verifier>"

# 4. Use token with API
curl -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer <access_token>"

# Expected: User profile data
```

**Task 3.3: Test Token Introspection**
```bash
# 1. Get token from Identity Provider
TOKEN=$(curl -s -X POST http://localhost:7151/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=<code>&..." \
  | jq -r .access_token)

# 2. API should validate via introspection
curl -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: Success (token validated via introspection)
```

**Task 3.4: Test Error Scenarios**
- [ ] Invalid token → 401 Unauthorized
- [ ] Expired token → 401 Unauthorized
- [ ] Missing Authorization header → 401 Unauthorized
- [ ] Malformed token → 401 Unauthorized
- [ ] Identity Provider down → API returns error

---

### Phase 4: Desktop App Updates (Days 7-8)

**Task 4.1: Update OAuth Configuration**

Find in Desktop App source:
```typescript
// OLD
const oauthConfig = {
  authorizationURL: 'http://localhost:7150/oauth/authorize',
  tokenURL: 'http://localhost:7150/oauth/token',
};

// NEW
const oauthConfig = {
  authorizationURL: 'http://localhost:7151/oauth/authorize',
  tokenURL: 'http://localhost:7151/oauth/token',
};
```

**Task 4.2: Test Desktop App Flow**
- [ ] Click Login
- [ ] Browser opens Identity Provider login
- [ ] User logs in
- [ ] Browser redirects to app with code
- [ ] App exchanges code for token
- [ ] App makes API request with token
- [ ] API returns data

**Task 4.3: Update Token Refresh**
- Ensure refresh tokens are obtained from Identity Provider
- Token refresh calls Identity Provider /oauth/token endpoint
- API doesn't need refresh logic (calls to introspection)

---

### Phase 5: Final Integration & Testing (Days 9-10)

**Task 5.1: End-to-End Testing Checklist**
- [ ] Desktop App login flow works
- [ ] API validates tokens
- [ ] Token refresh works
- [ ] Rate limiting works
- [ ] Credit checking works
- [ ] LLM requests work
- [ ] Subscription management works
- [ ] Webhooks work

**Task 5.2: Performance Testing**
- [ ] Introspection call latency: < 100ms
- [ ] JWT validation latency: < 10ms
- [ ] Cache token results: 5-10 minute TTL
- [ ] Load test with 10 concurrent users

**Task 5.3: Error Scenario Testing**
- [ ] Identity Provider down → API returns error
- [ ] Database down → Both services fail gracefully
- [ ] Network timeout → Retry logic works

---

### Phase 6: Documentation & Cleanup (Days 11-15)

**Task 6.1: Code Cleanup**
- [ ] Remove old OIDC code from backend
- [ ] Remove unused imports
- [ ] Archive extracted files for reference

**Task 6.2: Documentation Updates**
- [ ] Update README with new architecture diagram
- [ ] Document how to run both services locally
- [ ] Document deployment strategy
- [ ] Update API documentation

**Task 6.3: Deployment Guide**
- [ ] Docker setup for both services
- [ ] Environment variables for prod
- [ ] Database setup (shared)
- [ ] Network configuration (internal communication)

**Task 6.4: Git Commits**
```bash
# Commit 1: Extract Identity Provider code
git commit -m "feat: Extract OIDC provider into separate service"

# Commit 2: Simplify API
git commit -m "feat: Remove OIDC provider, add token introspection"

# Commit 3: Desktop app updates
git commit -m "feat: Update Desktop app to use separate Identity Provider"

# Commit 4: Documentation
git commit -m "docs: Update architecture and deployment docs"
```

---

## Parallel Workstreams

### Workstream A: Identity Provider (Senior Backend Dev)
- Days 1-2: Project setup, code extraction
- Days 3-4: Testing, debugging
- Days 5-6: Integration testing
- Days 7-8: Performance tuning

### Workstream B: API Simplification (Backend Dev)
- Days 1-2: Remove OIDC code
- Days 3-4: Implement introspection
- Days 5-6: Integration testing
- Days 7-8: Performance verification

### Workstream C: Desktop App (Frontend Dev)
- Days 1-4: Review current code, understand OAuth flow
- Days 5-6: Update configuration
- Days 7-8: Test with both services
- Days 9-10: UAT with both services

All workstreams converge on **Day 9** for final integration testing.

---

## Validation Checklist

Before marking complete:

- [ ] Identity Provider runs independently
- [ ] API runs without OIDC provider
- [ ] Both services use shared PostgreSQL
- [ ] Desktop App logs in successfully
- [ ] API validates tokens via introspection
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Performance acceptable (< 100ms introspection)
- [ ] Documentation updated
- [ ] Code cleanup done

---

## Rollback Plan

If issues arise:
1. Keep both old and new code in git branches
2. Tag current state: `git tag pre-architecture-redesign`
3. If critical issues: `git reset --hard <old-commit>`
4. Fix and retry

---

**Status**: Ready for Implementation
**Next Step**: Begin Phase 1 (Identity Provider setup)

