# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Rephlo** is a full-stack monorepo containing a modern React branding website frontend, a Node.js REST API backend, and a dedicated OAuth 2.0/OpenID Connect authentication microservice.

- **Frontend** (Port 7052): React 18 + TypeScript + Vite + TailwindCSS
- **Backend** (Port 7150): Node.js + Express + TypeScript + PostgreSQL + Prisma
- **Identity Provider** (Port 7151): OAuth 2.0/OIDC authentication server

---

## Quick Commands

### Running Services

```bash
# All services at once (recommended)
npm run dev:all

# Individual services
npm run dev:frontend          # Frontend on http://localhost:7052
npm run dev:backend           # Backend on http://localhost:7150
npm run dev:idp               # Identity Provider on http://localhost:7151
```

### Build & Production

```bash
# Build all
npm run build:all

# Individual builds
npm run build:frontend
npm run build:backend
npm run build:idp

# Production
cd frontend && npm run preview              # Frontend production preview
cd backend && npm start                     # Backend production
cd identity-provider && npm run dev         # IDP (only dev mode)
```

### Database Commands (Backend Only)

**⚠️ CRITICAL: Shared Database Architecture**

Both the backend and identity-provider services share the same PostgreSQL database (`rephlo-dev`) **BY DESIGN**. This is intentional for the following reasons:
- Simplified development setup (single database to manage)
- User table shared between authentication (identity-provider) and API (backend)
- OAuth clients and sessions accessible to both services

**Important Implications:**
1. **Database Reset Impact**: Running `npm run db:reset` in the backend will drop and recreate ALL tables including `oidc_models` used by the identity-provider
2. **Schema Coordination**: The `oidc_models` table is created via migration (20251110000000_add_oidc_models_table) even though it's used by identity-provider, not backend
3. **Migration Strategy**: Backend manages all migrations including the `oidc_models` table; identity-provider uses this table via its PostgreSQL adapter
4. **Seed Data**: Seed scripts should NEVER drop tables; they should use upsert operations to preserve existing data

**Database Reset (Fully Automated):**
```bash
# Reset backend database (applies all migrations + seed, including oidc_models table)
cd backend && npm run db:reset
```

The `oidc_models` table is now automatically created by migration `20251110000000_add_oidc_models_table`, so no manual SQL execution is needed.

```bash
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Run pending migrations
npm run prisma:studio         # Open Prisma Studio GUI (http://localhost:5555)
npm run seed                  # Seed test data
npm run db:reset              # Reset database and re-seed (⚠️ requires oidc_models recreation)
```

### Testing (Backend Only)

```bash
npm run test                  # All tests
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests only
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Coverage report
npm run test:watch            # Watch mode
```

### Linting (Frontend Only)

```bash
npm run lint                  # Check ESLint (0 warnings allowed)
```

---

## Project Structure

```
rephlo-sites/
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components with design tokens
│   │   ├── pages/            # Page components (Landing, Admin Dashboard)
│   │   ├── api/              # API client layer (axios)
│   │   ├── services/         # Service classes for API calls
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript type definitions
│   │   ├── store/            # Zustand state management
│   │   ├── assets/           # Images, logos, fonts
│   │   ├── App.tsx           # Root component with routing
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles + TailwindCSS
│   ├── vite.config.ts        # Vite build config (port 7052)
│   ├── tailwind.config.ts    # TailwindCSS design tokens
│   └── tsconfig.json         # TypeScript strict mode
│
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── api/              # 27 route modules (v1/api/admin/auth/oauth/webhooks)
│   │   ├── controllers/      # 27 controller classes (request handlers)
│   │   ├── services/         # 38 service classes (business logic)
│   │   ├── middleware/       # 8 middleware components (Helmet, CORS, Auth, RateLimit, etc)
│   │   ├── types/            # TypeScript interfaces and types
│   │   ├── utils/            # Helper functions (errors, logging, validators)
│   │   ├── db/               # Database utilities and health checks
│   │   ├── workers/          # Background workers (webhooks, jobs)
│   │   └── server.ts         # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (~20 models)
│   │   ├── migrations/       # Database migrations
│   │   └── seed.ts           # Seed test data
│   ├── tests/                # Jest test suite
│   │   ├── unit/             # Unit tests
│   │   ├── integration/      # Integration tests
│   │   ├── e2e/              # End-to-end tests
│   │   ├── fixtures/         # Test data
│   │   └── helpers/          # Test utilities
│   ├── tsconfig.json         # TypeScript strict mode
│   └── nodemon.json          # Development hot-reload config
│
├── identity-provider/        # OAuth 2.0/OIDC Server
│   ├── src/
│   │   ├── config/oidc.ts    # OIDC provider configuration (611 lines)
│   │   ├── controllers/      # Auth controller (login, consent, logout)
│   │   ├── services/         # AuthService, MFAService
│   │   ├── adapters/         # PostgreSQL adapter for OIDC models
│   │   ├── middleware/       # Error handling middleware
│   │   ├── utils/            # Logger utilities
│   │   ├── app.ts            # Express app with OIDC middleware
│   │   └── server.ts         # Entry point (port 7151)
│   ├── .env.example          # Required env vars
│   └── tsconfig.json         # TypeScript strict mode
│
├── docs/                     # Documentation
│   ├── README.md             # Documentation index
│   ├── guides/               # Developer guides
│   ├── plan/                 # Architecture & design docs
│   ├── progress/             # Phase completion reports
│   ├── analysis/             # QA & research reports
│   ├── reference/            # API specs
│   └── research/             # Technical research
│
└── README.md                 # Main project README
```

---

## Architecture Overview

### Monorepo Structure

Three independent services sharing a single PostgreSQL database:

1. **Frontend** (React SPA)
   - Communicates with Backend API
   - OAuth login redirects to Identity Provider
   - Modern UI with design tokens and micro-interactions

2. **Backend** (REST API)
   - Tier-based access control (Free/Pro/Enterprise)
   - Credit system with usage tracking
   - Admin dashboard with metrics
   - Stripe billing integration
   - Rate limiting (distributed via Redis)
   - Dependency injection with TSyringe

3. **Identity Provider** (OAuth 2.0/OIDC)
   - Authorization code flow with PKCE
   - RS256 JWT signing
   - MFA support (TOTP + backup codes)
   - Token introspection and revocation
   - PostgreSQL adapter for session storage

### Key Integration Points

**Token Validation (Hybrid Strategy):**
1. Backend fetches JWKS from Identity Provider (cached 5 min)
2. Verifies JWT signature (RS256)
3. Falls back to token introspection if JWT fails
4. Injects `req.user` with claims: sub, email, scope, role, permissions

**Shared Database:**
- Both services use same PostgreSQL instance
- Separate tables for different concerns
- Cascade deletes and foreign keys enforce integrity

### Common Patterns

**3-Layer Architecture (Backend):**
- Controllers → Services → Prisma/Database
- Single responsibility per layer
- Service abstraction for testability

**Middleware Pipeline (Backend):**
1. Helmet (security headers)
2. CORS (cross-origin)
3. Body parsers (json/urlencoded)
4. Morgan (HTTP logging)
5. Request ID (tracing)
6. Redis init
7. Rate limit headers
8. Rate limiter (tier-based)
9. Routes
10. 404 handler
11. Centralized error handler

**Error Handling:**
- Centralized Express middleware
- Standardized response: `{ error: { code, message, details } }`
- Environment-aware (dev shows stacks, prod hides internals)

**Logging (Winston):**
- Structured JSON logging
- Always include: userId, requestId, method, path, statusCode
- Never log: passwords, tokens, secrets
- Levels: debug, info, warn, error

**Database (Prisma):**
- ORM for all database access
- Connection pool (20 connections)
- Atomic transactions for data consistency
- Prisma error helpers (P2002, P2003, P2025)
- Strategic indexes on foreign keys and common queries

---

## Database Schema (Backend)

PostgreSQL database with ~20 core models:

**User Management:**
- `User` - Email, password (hashed), roles, MFA fields, social auth
- `UserPreference` - Theme, notification settings
- `AuditLog` - Admin action tracking

**Subscription & Credits:**
- `Subscription` - Tier (Free/Pro/Enterprise), Stripe integration, billing periods
- `Credit` - Monthly allocation and usage tracking
- `CreditPrice` - Pricing per credit by tier
- `UsageHistory` - API requests with token and credit details

**API & Models:**
- `Model` - LLM models with capabilities and pricing
- `OAuthClient` - Third-party integrations
- `OIDCModels` - OIDC session/token storage

**Billing:**
- `StripeWebhook` - Webhook events from Stripe
- `Proration` - Pro-rata credit adjustments

**Other:**
- `Feedback` - User feedback submissions
- `Download` - Download tracking by OS

---

## Frontend Architecture

**Key Technologies:**
- React 18 with hooks
- TypeScript (strict mode)
- Vite (fast build)
- React Router (SPA routing)
- TailwindCSS (utility-first)
- Zustand (state management)
- React Query (server state)
- Axios (HTTP client)

**Design System:**
- Design tokens: shadows, gradients, spacing, animations
- shadcn/ui components
- Enhanced components with micro-interactions
- Brand colors: Blue (#2563EB), Navy (#1E293B), Cyan (#06B6D4)

**Pages:**
- Landing page (marketing)
- Admin dashboard (metrics, users, subscriptions)
- Pricing page
- Download tracking
- Feedback collection

**State Management:**
- Zustand for global state
- React Query for server state and caching
- Local component state for UI

---

## Backend Architecture Details

**Dependency Injection (TSyringe):**
- Container-based DI with singletons
- Singletons: Prisma, Redis, LLM clients
- Service registration with interface tokens
- Container verification at startup

**Security Layers:**
1. **Transport:** HTTPS in production
2. **Authentication:** JWT with JWKS caching (5 min), introspection fallback
3. **Authorization:** RBAC with scopes (admin, user.info, credits.read, etc)
4. **Rate Limiting:** Tier-based (Free 10/min, Pro 60/min, Enterprise 300/min) via Redis
5. **Input Validation:** Zod schemas on request bodies
6. **Audit Logging:** Admin actions tracked to audit log

**API Endpoints (27 route modules):**
- `/v1/models` - List/get models with tier metadata
- `/v1/chat/completions` - Chat endpoint (tier-validated)
- `/v1/completions` - Text completion (tier-validated)
- `/api/track-download` - Download tracking
- `/api/feedback` - Feedback submission
- `/api/profile` - User profile management
- `/admin/metrics` - Admin dashboard metrics
- `/admin/users` - User management
- `/admin/subscriptions` - Subscription management
- `/auth/register`, `/auth/login` - Authentication
- `/oauth/google/*` - Google OAuth
- `/webhooks/stripe` - Stripe webhook handling

**Testing:**
- Jest test runner
- Structure: unit/, integration/, e2e/, fixtures/, helpers/
- Test database isolation
- Mocking with jest-mock-extended
- Fixtures for test data

---

## Identity Provider Architecture

**OIDC Implementation (oidc-provider v9.5.2):**
- Authorization code flow (required)
- PKCE (Proof Key for Code Exchange) - required for all clients
- RS256 JWT signing with JWK
- Token introspection (RFC 7662)
- Token revocation (RFC 7009)
- Resource indicators for JWT access tokens

**OIDC Adapter:**
- PostgreSQL storage using Prisma
- Single `oidc_models` table with 'kind' discriminator
- Stores: Session, AccessToken, AuthorizationCode, RefreshToken, Grant, Interaction
- Methods: upsert, find, findByUserCode, consume, destroy, revokeByGrantId

**OIDC Endpoints:**
- `/.well-known/openid-configuration` - OIDC discovery
- `/oauth/authorize` - Authorization endpoint
- `/oauth/token` - Token endpoint
- `/oauth/userinfo` - User info endpoint
- `/oauth/jwks` - Public keys
- `/oauth/introspect` - Token introspection
- `/oauth/revoke` - Token revocation
- `/interaction/:uid` - Custom login/consent pages
- `/logout` - Logout and clear session

**MFA (Multi-Factor Authentication):**
- TOTP (Time-based One-Time Password) using speakeasy
- QR code generation for authenticator apps
- Backup codes (hashed, single-use)
- 30-second time window

**Token TTLs (Synchronous Integers Only):**
```
AccessToken: 3600s (1 hour)
AuthorizationCode: 600s (10 minutes)
IdToken: 3600s (1 hour)
RefreshToken: 2592000s (30 days)
Grant: 2592000s (30 days)
Interaction: 3600s (1 hour)
Session: 86400s (24 hours)
```

**Note:** oidc-provider v9.5.2 does NOT support async TTL functions. Use synchronous functions or integers only.

---

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:7150
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
VITE_NODE_ENV=development
```

### Backend (.env)

```
NODE_ENV=development
PORT=7150
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rephlo-dev
CORS_ORIGIN=http://localhost:7052

# Authentication & OIDC
OIDC_ISSUER=http://localhost:7151
OIDC_JWKS_URL=http://localhost:7151/oauth/jwks

# Redis (rate limiting, caching)
REDIS_URL=redis://localhost:6379

# File uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Stripe
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email (SendGrid)
SENDGRID_API_KEY=...

# LLM Providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...

# Logging
LOG_LEVEL=debug
```

### Identity Provider (.env)

```
NODE_ENV=development
PORT=7151
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rephlo-dev
OIDC_ISSUER=http://localhost:7151
OIDC_COOKIE_KEYS=["key1","key2"]
OIDC_JWKS_PRIVATE_KEY='{"kty":"RSA",...}'  # RSA private key in JWK format
ALLOWED_ORIGINS=http://localhost:7052,http://localhost:7150,http://localhost:7152
MFA_ENFORCEMENT_ENABLED=false  # Set to 'false' to disable MFA during OAuth login (for dev/testing)
LOG_LEVEL=debug
LOG_DIR=logs
```

**MFA Configuration:**
- `MFA_ENFORCEMENT_ENABLED=false` - Disables MFA enforcement during OAuth login (useful for development/testing)
- `MFA_ENFORCEMENT_ENABLED=true` (default) - Requires MFA verification for users with MFA enabled
- See `identity-provider/README.md` for detailed MFA configuration documentation

---

## Common Development Tasks

### Adding a New Backend Route

1. Create controller in `backend/src/controllers/`
2. Create service in `backend/src/services/` (business logic)
3. Create route in `backend/src/api/` (import both)
4. Register route in `backend/src/server.ts` app setup
5. Add types in `backend/src/types/` if needed
6. Write tests in `backend/tests/`

**Example Pattern:**
```typescript
// Controller calls service, handles HTTP
class UserController {
  constructor(private userService: UserService) {}
  async getUser(req: Request, res: Response) {
    const user = await this.userService.findById(req.params.id);
    res.json(user);
  }
}

// Service contains business logic
class UserService {
  constructor(private prisma: PrismaClient) {}
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

### Adding a Frontend Component

1. Create component in `frontend/src/components/`
2. Import design tokens from `tailwind.config.ts`
3. Use existing base components (Button, Card, etc)
4. Add TypeScript types
5. Export in `index.ts` barrel file

**Design Token Classes (TailwindCSS):**
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
- Gradients: `bg-gradient-to-r from-rephlo to-rephlo-cyan`
- Animations: `animate-pulse`, `animate-spin`
- Spacing: `gap-xs`, `gap-sm`, `gap-md`, etc (4px grid)

### Updating the Database Schema

1. Edit `backend/prisma/schema.prisma`
2. Create migration: `npm run prisma:migrate` (in backend dir)
3. Follow migration prompt and name it descriptively
4. Prisma generates types automatically
5. Write tests for new models/fields

**Schema Best Practices:**
- Use `@db.Uuid` for IDs with `@default(dbgenerated("gen_random_uuid()"))`
- Add indexes on foreign keys: `@@index([userId])`
- Use cascade deletes for related data: `@relation(..., onDelete: Cascade)`
- Document complex fields with `///` comments

### Adding a New API Endpoint

1. Create controller method
2. Create service method
3. Create route in api module
4. Add Zod validation schema
5. Add auth middleware (`@Requires(['scope', 'role'])`)
6. Register route in server.ts
7. Write integration test

**Authentication Decorator Pattern:**
```typescript
app.post('/admin/users', authenticate(), requireScopes(['admin']), userController.createUser);
```

---

## Database Setup

### Prerequisites

- PostgreSQL v14+ installed and running
- Port 5432 available (default)

### Quick Start

```bash
cd backend

# Create .env with DATABASE_URL
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed test data
npm run seed

# Verify with Prisma Studio
npm run prisma:studio
```

### Troubleshooting

**Database connection errors:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in .env
3. Ensure database exists: `createdb rephlo-dev`

**Migration errors:**
1. Check for schema conflicts: `npm run prisma:studio`
2. Revert last migration: `prisma migrate resolve --rolled-back <migration_name>`
3. Reset (careful!): `npm run db:reset`

---

## Debugging Tips

### Frontend

**React DevTools:**
- Use React DevTools browser extension
- Check component tree, props, hooks state
- Performance tab for renders

**Network Inspection:**
- Browser DevTools Network tab
- Check API response status, timing, body

**Console Errors:**
- Check browser console for React warnings
- TypeScript compilation errors in terminal

### Backend

**Logging:**
- Structured Winston logs in `stdout` (dev) and `logs/` (production)
- Search logs by requestId for request tracing
- Increase LOG_LEVEL to 'debug' for verbose output

**Database Queries:**
- Use Prisma Studio: `npm run prisma:studio`
- Enable Prisma debug: `DEBUG=prisma:* npm run dev`
- Check slow queries in database logs

**Rate Limiting:**
- Check Redis connection: `redis-cli ping`
- View rate limit headers in API responses
- Verify tier configuration in database

### Identity Provider

**OIDC Flow Debugging:**
- Enable debug logging: `LOG_LEVEL=debug`
- Check `/interaction/:uid` custom pages load correctly
- Verify OIDC_JWKS_PRIVATE_KEY is valid RSA key

**Token Issues:**
- Validate JWT: jwt.io decoder
- Check token expiry with `exp` claim
- Test introspection: `curl -X POST http://localhost:7151/oauth/introspect`

---

## Performance Considerations

### Frontend

- Use React Query for server state (automatic caching)
- Code splitting with React Router lazy imports
- Image optimization (use responsive sizes)
- TailwindCSS purges unused styles in production build

### Backend

- Connection pooling (20 default) prevents exhaustion
- JWKS caching (5 minutes) reduces Identity Provider calls
- Redis rate limiting distributes load
- Database indexes on foreign keys and common queries
- Async/await for concurrent I/O

### Identity Provider

- Session storage in PostgreSQL (no in-memory)
- Token caching in client applications
- JWKS endpoint cached by clients
- Graceful shutdown waits for active requests

---

## Important Notes

### File Size Limits

- Backend source files should stay under 1,200 lines
- Split large controllers/services into focused modules
- Group related utilities

### SOLID Principles

- **Single Responsibility:** Each class one reason to change
- **Open/Closed:** Extend via new classes, not modification
- **Liskov Substitution:** Subtypes substitutable for parent types
- **Interface Segregation:** Small focused interfaces
- **Dependency Inversion:** Depend on abstractions

### Code Organization

- Use barrel exports (`index.ts`) for clean imports
- Group related files in directories
- Keep utilities focused and single-purpose
- Name files after main export (e.g., `UserService.ts` exports `UserService`)

### Testing Strategy

- Unit tests for services and utilities
- Integration tests for controllers and database access
- E2E tests for critical user flows
- Aim for >80% coverage on business logic

---

## Useful References

- **Frontend:** [React 18 Docs](https://react.dev), [Vite Guide](https://vitejs.dev), [TailwindCSS](https://tailwindcss.com)
- **Backend:** [Express.js Guide](https://expressjs.com), [Prisma Docs](https://www.prisma.io/docs), [TSyringe DI](https://github.com/Microsoft/tsyringe)
- **Identity Provider:** [node-oidc-provider](https://github.com/panva/node-oidc-provider), [JWT.io](https://jwt.io)
- **Database:** [PostgreSQL Docs](https://www.postgresql.org/docs), [Prisma Schema](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

---

## Known Issues & Workarounds

### TTL Functions in Identity Provider

**Issue:** oidc-provider v9.5.2 only supports synchronous TTL functions, not async.
**Workaround:** Use integer TTL values for all token types.
**Reference:** `identity-provider/src/config/oidc.ts` lines 175-190

### PostgreSQL on Windows

**Issue:** Some Windows PostgreSQL installations may have permission issues.
**Workaround:** Use postgres user account or create dedicated database user with full privileges.

---

## When to Use Specialized Agents

If delegating tasks to Claude Code agents:

- **Explore Agent:** For codebase exploration, architecture understanding
- **Task Tool:** For complex multi-step implementations
- **Testing QA Agent:** After completing features for comprehensive validation
- **API Backend Implementer:** When implementing REST endpoints from specifications
- **Database Schema Architect:** When designing database schema changes

---

**Last Updated:** November 9, 2025
**Version:** 1.0.0 (Production Ready)
**Node.js:** >=18.0.0
**PostgreSQL:** >=14.0
