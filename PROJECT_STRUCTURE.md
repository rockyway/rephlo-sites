# Rephlo Project Structure Documentation

**For Agentic Coding Tools**
**Generated**: 2025-11-18
**Version**: 1.0.0
**Target Launch**: March 2026

---

## Executive Summary

Rephlo is a full-stack monorepo for a modern SaaS platform offering LLM-based text transformation services. The project consists of three independent services sharing a single PostgreSQL database:

- **Frontend** (Port 7052): React 18 SPA with TypeScript, Vite, TailwindCSS
- **Backend** (Port 7150): Node.js REST API with Express, TypeScript, Prisma ORM
- **Identity Provider** (Port 7151): OAuth 2.0/OIDC authentication server

**Current Status**: Development phase, local testing
**Database Models**: 54 models (1,482 lines of Prisma schema)
**Documentation**: 335+ markdown documents

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Monorepo Structure](#monorepo-structure)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Identity Provider Architecture](#identity-provider-architecture)
6. [Database Schema](#database-schema)
7. [Shared Types](#shared-types)
8. [API Development Standards](#api-development-standards)
9. [Development Workflow](#development-workflow)
10. [Testing Strategy](#testing-strategy)
11. [Documentation Structure](#documentation-structure)
12. [Key Patterns & Best Practices](#key-patterns--best-practices)
13. [Quick Reference Commands](#quick-reference-commands)

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript 5.6.2
- **Build Tool**: Vite 5.4.2
- **Styling**: TailwindCSS 3.4.1 + shadcn/ui components
- **Routing**: React Router 6.26.2
- **State Management**: Zustand + React Query
- **HTTP Client**: Axios
- **Design System**: Custom design tokens with micro-interactions

### Backend
- **Runtime**: Node.js with Express 4.x
- **Language**: TypeScript 5.6.2 (strict mode)
- **ORM**: Prisma 6.2.1
- **Database**: PostgreSQL 14+
- **DI Container**: TSyringe
- **Authentication**: JWT with RS256 + OIDC integration
- **Rate Limiting**: Redis-based distributed rate limiting
- **Testing**: Jest 29.7.0
- **Validation**: Zod schemas
- **Logging**: Winston (structured JSON)

### Identity Provider
- **OIDC Library**: node-oidc-provider 9.5.2
- **Flows**: Authorization Code + PKCE
- **Token Signing**: RS256 (JWK)
- **Session Storage**: PostgreSQL via custom adapter
- **MFA**: TOTP (speakeasy) + backup codes

### Infrastructure
- **Database**: PostgreSQL 14+ (shared instance: `rephlo-dev`)
- **Cache/Rate Limiting**: Redis 6+
- **Email**: SendGrid
- **Payments**: Stripe
- **Version Control**: Git
- **CI/CD**: GitHub Actions

---

## Monorepo Structure

```
rephlo-sites/
├── frontend/                 # React SPA (Port 7052)
├── backend/                  # REST API (Port 7150)
├── identity-provider/        # OAuth 2.0/OIDC Server (Port 7151)
├── shared-types/             # TypeScript types shared across services
├── docs/                     # 335+ documentation files
├── scripts/                  # Build and deployment scripts
├── .github/workflows/        # CI/CD workflows
├── CLAUDE.md                 # Project instructions for Claude Code
├── working-protocol.md       # Agentic coding session protocol
└── package.json              # Root workspace configuration
```

### Directory Statistics
- **Total Services**: 3 (frontend, backend, identity-provider)
- **Total Documentation Files**: 335 markdown files
- **Backend Controllers**: 31 files
- **Backend Services**: 45+ files
- **Backend Routes**: 16 route modules
- **Frontend Components**: 11 component groups
- **Database Models**: 54 models

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── admin/            # Admin dashboard components
│   │   ├── analytics/        # Analytics visualizations
│   │   ├── auth/             # Authentication UI
│   │   ├── common/           # Shared components (Button, Card, etc)
│   │   ├── landing/          # Landing page sections
│   │   ├── layout/           # Layout components (Header, Footer)
│   │   ├── plan109/          # Feature-specific components
│   │   ├── plan110/          # Feature-specific components
│   │   └── plan111/          # Feature-specific components
│   │
│   ├── pages/                # Page components
│   │   ├── Admin.tsx         # Admin dashboard (11,214 lines)
│   │   ├── AdminTierManagement.tsx
│   │   ├── Landing.tsx       # Marketing landing page
│   │   ├── Login.tsx         # OAuth login flow
│   │   ├── Privacy.tsx       # Privacy policy
│   │   ├── Terms.tsx         # Terms of service
│   │   └── admin/            # Admin sub-pages
│   │
│   ├── services/             # API client layer
│   │   └── api.ts            # Axios instance + API methods (8,313 lines)
│   │
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state stores
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Helper functions
│   ├── providers/            # Context providers
│   ├── routes/               # Route configuration
│   ├── contexts/             # React contexts
│   ├── data/                 # Static data
│   ├── lib/                  # Third-party library configs
│   ├── api/                  # API layer
│   ├── App.tsx               # Root component with routing
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles + TailwindCSS
│
├── public/                   # Static assets
├── vite.config.ts            # Vite configuration (port 7052)
├── tailwind.config.ts        # TailwindCSS design tokens
├── tsconfig.json             # TypeScript strict mode
└── package.json              # Dependencies
```

### Key Frontend Features
- **Design System**: Custom design tokens (shadows, gradients, animations)
- **Component Library**: shadcn/ui + custom enhanced components
- **State Management**: Zustand for global state, React Query for server state
- **Authentication**: OAuth 2.0 flow with PKCE via Identity Provider
- **Brand Colors**: Blue (#2563EB), Navy (#1E293B), Cyan (#06B6D4)
- **Responsive**: Mobile-first design with TailwindCSS breakpoints

### Frontend Tech Patterns
- **Component Pattern**: Functional components with hooks
- **Data Fetching**: React Query for caching + invalidation
- **Error Handling**: Error boundaries + toast notifications
- **Routing**: React Router with protected routes
- **Forms**: Controlled components with validation

---

## Backend Architecture

### Directory Structure

```
backend/
├── src/
│   ├── routes/               # 16 route modules (API endpoints)
│   │   ├── admin.routes.ts           # Admin endpoints (33,053 lines)
│   │   ├── admin-models.routes.ts    # Model management
│   │   ├── api.routes.ts             # Public API routes
│   │   ├── auth.routes.ts            # Authentication
│   │   ├── branding.routes.ts        # Branding management
│   │   ├── mfa.routes.ts             # Multi-factor auth
│   │   ├── plan109.routes.ts         # Feature routes
│   │   ├── plan110.routes.ts         # Feature routes
│   │   ├── plan111.routes.ts         # Feature routes
│   │   ├── plan190.routes.ts         # Feature routes
│   │   ├── social-auth.routes.ts     # Social OAuth
│   │   ├── swagger.routes.ts         # API documentation
│   │   ├── v1.routes.ts              # V1 API endpoints
│   │   ├── vendor-analytics.routes.ts # Vendor metrics
│   │   └── index.ts                  # Route aggregation (9,668 lines)
│   │
│   ├── controllers/          # 31 controller classes
│   │   ├── admin/                    # Admin controllers subfolder
│   │   ├── admin.controller.ts       # Main admin controller (42,064 lines)
│   │   ├── admin-analytics.controller.ts
│   │   ├── admin-models.controller.ts
│   │   ├── admin-user-detail.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── audit-log.controller.ts
│   │   ├── auth-management.controller.ts
│   │   ├── billing.controller.ts
│   │   ├── branding.controller.ts
│   │   ├── campaign.controller.ts
│   │   ├── coupon-analytics.controller.ts
│   │   ├── coupon.controller.ts
│   │   ├── credit-management.controller.ts
│   │   ├── credits.controller.ts
│   │   ├── device-activation-management.controller.ts
│   │   ├── fraud-detection.controller.ts
│   │   ├── license-management.controller.ts
│   │   ├── migration.controller.ts
│   │   ├── models.controller.ts
│   │   ├── oauth.controller.ts
│   │   ├── proration.controller.ts
│   │   ├── revenue-analytics.controller.ts
│   │   ├── social-auth.controller.ts
│   │   ├── subscription-management.controller.ts
│   │   ├── subscriptions.controller.ts
│   │   ├── usage.controller.ts
│   │   ├── user-management.controller.ts
│   │   ├── users.controller.ts
│   │   ├── vendor-analytics.controller.ts
│   │   ├── version-upgrade.controller.ts
│   │   └── webhooks.controller.ts
│   │
│   ├── services/             # 45+ service classes (business logic)
│   │   ├── admin/                    # Admin services subfolder
│   │   ├── email/                    # Email templates
│   │   ├── llm/                      # LLM provider integrations
│   │   ├── __tests__/                # Service unit tests
│   │   ├── admin-analytics.service.ts
│   │   ├── admin-profitability.service.ts
│   │   ├── admin-user-detail.service.ts
│   │   ├── analytics.service.ts
│   │   ├── approval-workflow.service.ts
│   │   ├── audit-log.service.ts
│   │   ├── auth.service.ts
│   │   ├── billing-payments.service.ts
│   │   ├── campaign-management.service.ts
│   │   ├── checkout-integration.service.ts
│   │   ├── cost-calculation.service.ts
│   │   ├── coupon-analytics.service.ts
│   │   ├── coupon-redemption.service.ts
│   │   ├── coupon-validation.service.ts
│   │   ├── credit-deduction.service.ts
│   │   ├── credit-management.service.ts
│   │   ├── credit-upgrade.service.ts
│   │   ├── credit.service.ts (25,652 lines)
│   │   ├── device-activation-management.service.ts
│   │   ├── fraud-detection.service.ts
│   │   ├── ip-whitelist.service.ts
│   │   ├── license-management.service.ts
│   │   ├── llm.service.ts (29,453 lines)
│   │   ├── mfa.service.ts
│   │   ├── migration.service.ts
│   │   ├── model.service.ts (29,565 lines)
│   │   ├── permission-cache.service.ts
│   │   ├── platform-analytics.service.ts
│   │   ├── pricing-config.service.ts
│   │   ├── proration.service.ts (29,401 lines)
│   │   ├── refund.service.ts
│   │   ├── revenue-analytics.service.ts
│   │   ├── role-cache.service.ts
│   │   ├── session-management.service.ts
│   │   ├── settings.service.ts
│   │   ├── stripe.service.ts
│   │   ├── subscription-management.service.ts (46,213 lines)
│   │   ├── subscription.service.ts
│   │   ├── tier-config.service.ts
│   │   ├── token-introspection.service.ts
│   │   ├── token-tracking.service.ts
│   │   ├── usage.service.ts
│   │   ├── user-management.service.ts
│   │   ├── user-suspension.service.ts
│   │   ├── user.service.ts
│   │   ├── version-upgrade.service.ts
│   │   └── webhook.service.ts
│   │
│   ├── middleware/           # 10 middleware components
│   │   ├── audit.middleware.ts       # Admin action auditing
│   │   ├── auth.middleware.ts        # JWT authentication (14,310 lines)
│   │   ├── credit.middleware.ts      # Credit validation
│   │   ├── error.middleware.ts       # Centralized error handler
│   │   ├── idle-timeout.middleware.ts # Session timeout
│   │   ├── ip-whitelist.middleware.ts # IP restrictions
│   │   ├── permission.middleware.ts  # RBAC permissions
│   │   ├── ratelimit.middleware.ts   # Redis rate limiting
│   │   ├── require-mfa.middleware.ts # MFA enforcement
│   │   └── typeValidation.middleware.ts # Zod validation
│   │
│   ├── utils/                # Helper functions
│   │   ├── __mocks__/                # Jest mocks
│   │   ├── auth-validators.ts
│   │   ├── errors.ts                 # Custom error classes
│   │   ├── hash.ts                   # Password hashing
│   │   ├── logger.ts                 # Winston logger config
│   │   ├── password-strength.ts
│   │   ├── responses.ts              # Standard API responses
│   │   ├── signature.ts              # Webhook signature verification
│   │   ├── tier-access.ts            # Tier validation helpers
│   │   ├── token-generator.ts
│   │   ├── tokenCounter.ts           # LLM token counting
│   │   ├── typeMappers.ts            # DB → API transformations (17,633 lines)
│   │   └── validators.ts             # Input validation
│   │
│   ├── types/                # TypeScript interfaces
│   ├── db/                   # Database utilities
│   ├── config/               # Configuration files
│   ├── providers/            # LLM provider clients
│   ├── interfaces/           # Service interfaces
│   ├── workers/              # Background workers
│   ├── __tests__/            # Unit tests
│   └── server.ts             # Express app entry point
│
├── prisma/
│   ├── schema.prisma         # Database schema (1,482 lines, 54 models)
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Seed data
│
├── tests/                    # Test suite
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   ├── fixtures/             # Test data
│   ├── helpers/              # Test utilities
│   └── setup/                # Test setup scripts
│
├── docs/                     # Backend-specific docs
├── scripts/                  # Database scripts
├── specs/                    # API specifications
├── tsconfig.json             # TypeScript strict mode
├── nodemon.json              # Development config
└── package.json              # Dependencies
```

### Backend Key Features

**3-Layer Architecture**:
```
Routes → Controllers → Services → Prisma/Database
```

**Middleware Pipeline** (in order):
1. Helmet (security headers)
2. CORS (cross-origin)
3. Body parsers (JSON/urlencoded)
4. Morgan (HTTP logging)
5. Request ID (tracing)
6. Redis init
7. Rate limit headers
8. Rate limiter (tier-based: Free 10/min, Pro 60/min, Enterprise 300/min)
9. Routes
10. 404 handler
11. Centralized error handler

**Dependency Injection** (TSyringe):
- Container-based DI
- Singletons: Prisma, Redis, LLM clients
- Service registration with interface tokens
- Container verification at startup

**Authentication Strategy**:
1. Fetch JWKS from Identity Provider (cached 5 min)
2. Verify JWT signature (RS256)
3. Fallback to token introspection if JWT fails
4. Inject `req.user` with claims: sub, email, scope, role, permissions

**API Endpoint Categories**:
- `/v1/*` - Public API endpoints (models, chat completions)
- `/api/*` - Application API (profile, feedback, downloads)
- `/admin/*` - Admin dashboard (users, metrics, subscriptions)
- `/auth/*` - Authentication (register, login, password reset)
- `/oauth/*` - Social OAuth (Google integration)
- `/webhooks/*` - External webhooks (Stripe)

---

## Identity Provider Architecture

### Directory Structure

```
identity-provider/
├── src/
│   ├── config/
│   │   └── oidc.ts           # OIDC provider config (611 lines)
│   │
│   ├── controllers/
│   │   └── auth.controller.ts # Login/consent/logout (22,616 lines)
│   │
│   ├── services/
│   │   ├── auth.service.ts   # User authentication
│   │   └── mfa.service.ts    # TOTP + backup codes
│   │
│   ├── adapters/
│   │   └── oidc-adapter.ts   # PostgreSQL storage adapter (10,613 lines)
│   │
│   ├── middleware/
│   │   └── error.middleware.ts # Error handling
│   │
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   │
│   ├── views/                # EJS templates (login, consent)
│   ├── app.ts                # Express app
│   └── server.ts             # Entry point (port 7151)
│
├── prisma/                   # Shared Prisma client
├── scripts/                  # Setup scripts
├── .env.example              # Required env vars
├── tsconfig.json             # TypeScript strict mode
└── package.json              # Dependencies
```

### OIDC Features

**Supported Flows**:
- Authorization Code Flow with PKCE (required)
- Refresh Token Flow
- Token Introspection (RFC 7662)
- Token Revocation (RFC 7009)

**Token Configuration**:
- **Signing Algorithm**: RS256 (JWK)
- **Access Token TTL**: 3600s (1 hour)
- **Refresh Token TTL**: 2592000s (30 days)
- **Authorization Code TTL**: 600s (10 minutes)
- **ID Token TTL**: 3600s (1 hour)
- **Session TTL**: 86400s (24 hours)

**OIDC Endpoints**:
- `/.well-known/openid-configuration` - Discovery document
- `/oauth/authorize` - Authorization endpoint
- `/oauth/token` - Token endpoint
- `/oauth/userinfo` - User info endpoint
- `/oauth/jwks` - Public keys (JWK Set)
- `/oauth/introspect` - Token introspection
- `/oauth/revoke` - Token revocation
- `/interaction/:uid` - Custom login/consent pages
- `/logout` - Session logout

**Storage Adapter**:
- Single `oidc_models` table with discriminator column `kind`
- Stores: Session, AccessToken, AuthorizationCode, RefreshToken, Grant, Interaction
- Methods: upsert, find, findByUserCode, consume, destroy, revokeByGrantId

**MFA Support**:
- TOTP (Time-based One-Time Password) using speakeasy
- QR code generation for authenticator apps
- Backup codes (bcrypt hashed, single-use)
- Configurable enforcement via `MFA_ENFORCEMENT_ENABLED` env var

---

## Database Schema

**Database**: PostgreSQL 14+ (shared instance: `rephlo-dev`)
**Total Models**: 54
**Schema Lines**: 1,482
**Migration Strategy**: Prisma Migrate

### Model Categories

#### User Management (4 models)
```
- users                    # Core user table (email, password, roles, MFA)
- user_preferences         # User settings (theme, notifications)
- user_role_assignment     # User-to-role mapping
- user_suspensions         # Account suspensions
```

#### Authentication & Authorization (5 models)
```
- oidc_models              # OIDC session/token storage
- oauth_clients            # Third-party OAuth integrations
- role                     # Role definitions
- permission               # Permission definitions
- permission_override      # User-specific permission overrides
```

#### Subscription & Billing (8 models)
```
- subscription_monetization # Active subscriptions
- subscriptions            # Legacy subscription table
- subscription_tier_config # Tier configuration
- tier_config_history      # Tier config audit trail
- billing_invoice          # Stripe invoices
- payment_transaction      # Payment records
- subscription_refund      # Refund tracking
- dunning_attempt          # Failed payment retries
```

#### Credits & Usage (9 models)
```
- credits                  # User credit balance
- user_credit_balance      # Dual-ledger credit tracking
- credit_allocation        # Monthly credit grants
- credit_deduction_ledger  # Credit deduction history
- credit_usage_daily_summary # Aggregated daily usage
- token_usage_ledger       # Token-level tracking
- token_usage_daily_summary  # Aggregated token usage
- proration_event          # Pro-rata adjustments
- margin_audit_log         # Profitability tracking
```

#### Coupons & Promotions (9 models)
```
- coupon                   # Coupon definitions
- coupon_campaign          # Coupon campaigns
- coupon_redemption        # Redemption records
- coupon_usage_limit       # Usage restrictions
- coupon_validation_rule   # Validation logic
- coupon_analytics_snapshot # Performance metrics
- coupon_fraud_detection   # Fraud events
- campaign_coupon          # Campaign-coupon mapping
```

#### LLM & Models (3 models)
```
- models                   # Available LLM models
- providers                # LLM provider configs
- model_provider_pricing   # Provider-specific pricing
- model_tier_audit_logs    # Model tier change history
```

#### Licensing (2 models)
```
- perpetual_license        # Perpetual license keys
- license_activation       # Device activations
```

#### Admin & Audit (4 models)
```
- admin_audit_log          # Admin action tracking
- approval_requests        # Multi-admin approval workflow
- role_change_log          # Role modification history
```

#### Application Features (7 models)
```
- feedbacks                # User feedback
- downloads                # Download tracking
- version_upgrade          # Version upgrade tracking
- ip_whitelists            # IP whitelist rules
- app_settings             # Application config
- app_versions             # Desktop app versions
- diagnostics              # System diagnostics
```

#### Webhooks (2 models)
```
- webhook_configs          # Webhook configurations
- webhook_logs             # Webhook delivery logs
```

#### Pricing (2 models)
```
- pricing_configs          # Legacy pricing config
- pricing_configuration    # Current pricing config
```

### Schema Patterns

**Primary Keys**:
- UUIDs (`@id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`)

**Indexing Strategy**:
- Foreign keys always indexed: `@@index([user_id])`
- Common query fields: `@@index([created_at])`, `@@index([status])`
- Composite indexes for multi-column queries

**Cascade Deletes**:
- User deletion cascades to related records
- Subscription deletion cascades to invoices/transactions

**Field Naming**:
- Database: `snake_case` (PostgreSQL standard)
- Prisma generated types: `snake_case`
- API responses: `camelCase` (via typeMappers)

---

## Shared Types

**Location**: `shared-types/src/`
**Purpose**: TypeScript type definitions shared across frontend and backend

### Type Files

```
shared-types/src/
├── billing.types.ts       # Billing, invoices, payments (5,159 lines)
├── coupon.types.ts        # Coupons, campaigns, redemptions (11,279 lines)
├── credit.types.ts        # Credits, allocations, usage (4,399 lines)
├── response.types.ts      # API response wrappers (2,242 lines)
├── tier-config.types.ts   # Subscription tiers (6,599 lines)
├── user.types.ts          # User, authentication (5,897 lines)
└── index.ts               # Barrel export (3,708 lines)
```

### Naming Convention
All shared types use **camelCase** to match JavaScript/TypeScript conventions:

```typescript
// ✅ CORRECT - Shared types use camelCase
interface User {
  id: string;
  email: string;
  creditBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
}

// ❌ WRONG - Never use snake_case in shared types
interface User {
  id: string;
  email: string;
  credit_balance: number;  // ❌ Wrong!
  created_at: string;      // ❌ Wrong!
}
```

### Key Type Categories

**User Types**:
```typescript
- User              // Public user info
- UserDetails       // Extended user data
- UserStatus        // Enum: active, suspended, deleted
- SubscriptionTier  // Enum: free, pro, enterprise
```

**Subscription Types**:
```typescript
- Subscription           // Subscription details
- SubscriptionStatus     // Enum: trial, active, canceled, past_due
- BillingCycle           // Enum: monthly, annual
```

**Credit Types**:
```typescript
- CreditBalance          // Current balance
- CreditAllocation       // Monthly allocation
- CreditUsage            // Usage history entry
```

**Coupon Types**:
```typescript
- Coupon                 // Coupon definition
- CouponCampaign         // Marketing campaign
- CouponRedemption       // Redemption record
- CouponType             // Enum: percentage, fixed_amount, free_credits
```

**Response Types**:
```typescript
- ApiResponse<T>         // Standard API wrapper
- ErrorResponse          // Error structure
- PaginatedResponse<T>   // Paginated results
```

---

## API Development Standards

**Authoritative Document**: `docs/reference/156-api-standards.md`

### Naming Conventions

| Context              | Convention          | Example                          |
|---------------------|---------------------|----------------------------------|
| Database (Prisma)    | `snake_case`        | `monthly_credit_allocation`      |
| API Response (JSON)  | `camelCase`         | `monthlyCreditAllocation`        |
| TypeScript Interfaces| `camelCase`         | `monthlyCreditAllocation`        |
| URL Endpoints        | `kebab-case`        | `/user-management`               |
| Query Parameters     | `snake_case`        | `?start_date=&end_date=`         |
| Error Codes          | `SCREAMING_SNAKE_CASE` | `USER_NOT_FOUND`              |

### Transformation Layer

**Pattern**: Database (snake_case) → Type Mappers → API Response (camelCase)

**Type Mappers** (`backend/src/utils/typeMappers.ts`):
```typescript
// Database → API transformation
export function mapUserToApiType(dbUser: Prisma.usersGetPayload<...>): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    creditBalance: decimalToNumber(dbUser.credit_balance),
    createdAt: dateToIsoString(dbUser.created_at),
    lastLoginAt: dateToIsoString(dbUser.last_login_at),
  };
}
```

**Helper Functions**:
- `decimalToNumber()` - Prisma Decimal → JS number
- `dateToIsoString()` - Date | null → ISO 8601 string | null
- `mapXToApiType()` - snake_case → camelCase

### Standard API Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ...camelCase fields... },
  "timestamp": "2025-11-18T10:30:00Z"
}

// Error response
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID abc-123 not found",
    "details": { ... }
  },
  "timestamp": "2025-11-18T10:30:00Z"
}

// Paginated response
{
  "success": true,
  "data": [...items...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 157,
    "totalPages": 8
  },
  "timestamp": "2025-11-18T10:30:00Z"
}
```

### HTTP Status Codes

- **200 OK**: Successful GET/PUT/PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Missing/invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected error

### Code Review Checklist

Before merging any API endpoint:

1. ✅ All JSON response fields use camelCase
2. ✅ Database queries can use snake_case (Prisma)
3. ✅ Type mappers used for all transformations
4. ✅ Shared types use camelCase
5. ✅ URL endpoints use kebab-case
6. ✅ Error codes use SCREAMING_SNAKE_CASE
7. ✅ HTTP status codes are appropriate
8. ✅ Response format matches standard wrapper
9. ✅ Input validation with Zod schemas
10. ✅ Unit tests for service layer
11. ✅ Integration tests for endpoint
12. ✅ Error handling middleware catches all errors
13. ✅ Authentication/authorization middleware applied
14. ✅ Rate limiting configured
15. ✅ Logging includes requestId, userId, method, path

---

## Development Workflow

### Running Services

```bash
# All services at once (recommended)
npm run dev:all

# Individual services
npm run dev:frontend          # http://localhost:7052
npm run dev:backend           # http://localhost:7150
npm run dev:idp               # http://localhost:7151
```

### Database Workflow

**⚠️ CRITICAL**: Both backend and identity-provider share the same database (`rephlo-dev`) BY DESIGN.

**Database Reset** (fully automated):
```bash
cd backend
npm run db:reset              # Drops, migrates, seeds (includes oidc_models)
```

**Other Database Commands**:
```bash
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Run pending migrations
npm run prisma:studio         # Open GUI (http://localhost:5555)
npm run seed                  # Seed test data
```

### Testing Workflow

```bash
cd backend
npm run test                  # All tests
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests only
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Coverage report
npm run test:watch            # Watch mode
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
cd frontend && npm run preview              # Frontend preview
cd backend && npm start                     # Backend production
cd identity-provider && npm run dev         # IDP (only dev mode)
```

### Adding New Features

**Backend Route**:
1. Create controller in `backend/src/controllers/`
2. Create service in `backend/src/services/`
3. Create route in `backend/src/routes/`
4. Register route in `backend/src/routes/index.ts`
5. Add Zod validation schema
6. Add auth middleware decorators
7. Use type mappers for DB → API transformation
8. Write tests in `backend/tests/`

**Frontend Component**:
1. Create component in `frontend/src/components/`
2. Import design tokens from `tailwind.config.ts`
3. Use base components (Button, Card, etc)
4. Add TypeScript types
5. Export in `index.ts` barrel file

**Database Schema Update**:
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` (in backend)
3. Name migration descriptively
4. Update seed data if needed
5. Write tests for new models/fields

---

## Testing Strategy

### Test Structure

```
backend/tests/
├── unit/                 # Isolated unit tests
│   ├── services/         # Service layer tests
│   └── utils/            # Utility function tests
│
├── integration/          # Multi-component tests
│   ├── controllers/      # Controller + service tests
│   └── api/              # API endpoint tests
│
├── e2e/                  # End-to-end tests
│   ├── auth.e2e.test.ts  # Authentication flows
│   └── subscription.e2e.test.ts
│
├── fixtures/             # Test data
│   ├── users.fixtures.ts
│   └── subscriptions.fixtures.ts
│
├── helpers/              # Test utilities
│   ├── db.helper.ts      # Database test helpers
│   └── auth.helper.ts    # Auth test helpers
│
└── setup/                # Test configuration
    └── jest.setup.ts
```

### Testing Best Practices

**Unit Tests**:
- Test services in isolation
- Mock Prisma client
- Mock external APIs (Stripe, SendGrid)
- Focus on business logic

**Integration Tests**:
- Test controller → service → database flow
- Use test database (isolated transactions)
- Verify type transformations (DB → API)
- Test error handling

**E2E Tests**:
- Test complete user flows
- Include authentication
- Test rate limiting
- Verify CORS

**Coverage Goals**:
- Services: >80% coverage
- Controllers: >70% coverage
- Utilities: >90% coverage

---

## Documentation Structure

**Total Files**: 335+ markdown documents

```
docs/
├── README.md             # Documentation index
│
├── guides/               # Developer guides
│   ├── 017-eslint-snake-case-prevention.md
│   └── ... (setup guides, how-tos)
│
├── plan/                 # Architecture & design docs
│   ├── 001-initial-architecture.md
│   └── ... (200+ planning documents)
│
├── progress/             # Phase completion reports
│   ├── 161-camelcase-standardization-completion-report.md
│   └── ... (sprint summaries, milestones)
│
├── analysis/             # QA & research reports
│   └── ... (code reviews, audits)
│
├── reference/            # API specs & standards
│   ├── 156-api-standards.md
│   ├── 155-dto-pattern-guide.md
│   └── ... (API documentation)
│
├── research/             # Technical research
│   └── ... (technology evaluations)
│
├── qa/                   # Quality assurance
│   └── ... (test reports)
│
├── fixes/                # Bug fix documentation
│   └── ... (issue resolutions)
│
├── troubleshooting/      # Common issues
│   └── ... (debugging guides)
│
├── verification/         # Verification reports
│   └── ... (feature verification)
│
└── work-log.md           # Development log
```

---

## Key Patterns & Best Practices

### SOLID Principles

- **Single Responsibility**: Each class one reason to change
- **Open/Closed**: Extend via new classes, not modification
- **Liskov Substitution**: Subtypes substitutable for parent types
- **Interface Segregation**: Small focused interfaces
- **Dependency Inversion**: Depend on abstractions (TSyringe DI)

### Error Handling

**Centralized Error Middleware** (`backend/src/middleware/error.middleware.ts`):
```typescript
app.use((err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    userId: req.user?.sub,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    timestamp: new Date().toISOString(),
  });
});
```

**Custom Error Classes** (`backend/src/utils/errors.ts`):
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `RateLimitError` (429)

### Logging Standards

**Winston Configuration** (`backend/src/utils/logger.ts`):
```typescript
// Structured JSON logging
logger.info('User login', {
  userId: user.id,
  email: user.email,
  requestId: req.id,
  method: req.method,
  path: req.path,
  statusCode: 200,
});

// Never log sensitive data
// ❌ logger.info('User login', { password: '...' });
// ❌ logger.info('Token generated', { token: '...' });
```

**Log Levels**:
- `debug`: Verbose debugging info
- `info`: General application flow
- `warn`: Degraded performance or warnings
- `error`: Errors requiring attention

### Security Best Practices

**1. Transport Security**:
- HTTPS in production
- Secure cookies (`httpOnly`, `secure`, `sameSite`)

**2. Authentication**:
- JWT with RS256 signing
- JWKS caching (5 min)
- Token introspection fallback
- MFA support (TOTP + backup codes)

**3. Authorization**:
- RBAC with scopes
- Permission middleware: `requireScopes(['admin'])`
- Permission overrides per user

**4. Rate Limiting**:
- Tier-based limits (Free: 10/min, Pro: 60/min, Enterprise: 300/min)
- Distributed via Redis
- Custom rate limit headers

**5. Input Validation**:
- Zod schemas for request bodies
- Query parameter validation
- File upload restrictions

**6. Audit Logging**:
- Admin actions logged to `admin_audit_log`
- Include: userId, action, resourceType, resourceId, timestamp
- Never log passwords/tokens

---

## Quick Reference Commands

### Development

```bash
# Start all services
npm run dev:all

# Start individual services
npm run dev:frontend
npm run dev:backend
npm run dev:idp

# Database
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
npm run db:reset

# Testing
cd backend
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
npm run test:watch

# Linting
cd frontend
npm run lint
```

### Build & Production

```bash
# Build all
npm run build:all

# Build individual
npm run build:frontend
npm run build:backend
npm run build:idp

# Production
cd frontend && npm run preview
cd backend && npm start
cd identity-provider && npm run dev
```

### Git Workflow

**Branch Naming**: `claude/feature-name-[session-id]`

```bash
# Commit changes
git add .
git commit -m "feat: Add user management endpoints"

# Push to branch
git push -u origin claude/feature-name-[session-id]

# Create PR
gh pr create --title "Add user management" --body "Description..."
```

---

## Environment Variables

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:7150
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
VITE_NODE_ENV=development
```

### Backend (.env)

```bash
NODE_ENV=development
PORT=7150
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rephlo-dev
CORS_ORIGIN=http://localhost:7052

# Authentication & OIDC
OIDC_ISSUER=http://localhost:7151
OIDC_JWKS_URL=http://localhost:7151/oauth/jwks

# Redis
REDIS_URL=redis://localhost:6379

# File uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG...

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AI...

# Logging
LOG_LEVEL=debug
```

### Identity Provider (.env)

```bash
NODE_ENV=development
PORT=7151
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rephlo-dev
OIDC_ISSUER=http://localhost:7151
OIDC_COOKIE_KEYS=["key1","key2"]
OIDC_JWKS_PRIVATE_KEY='{"kty":"RSA",...}'
ALLOWED_ORIGINS=http://localhost:7052,http://localhost:7150
MFA_ENFORCEMENT_ENABLED=false
LOG_LEVEL=debug
LOG_DIR=logs
```

---

## Known Issues & Workarounds

### TTL Functions in Identity Provider

**Issue**: oidc-provider v9.5.2 only supports synchronous TTL functions, not async.

**Workaround**: Use integer TTL values for all token types.

**Reference**: `identity-provider/src/config/oidc.ts` lines 175-190

### Shared Database Architecture

**Issue**: Backend and Identity Provider share the same database instance.

**Impact**: Running `npm run db:reset` in backend drops ALL tables including `oidc_models`.

**Workaround**: The `oidc_models` table is automatically recreated by migration `20251110000000_add_oidc_models_table`.

**Best Practice**: Always run `npm run db:reset` (which runs migrations + seed) instead of manually dropping tables.

---

## File Size Guidelines

- Backend source files should stay **under 1,200 lines**
- Split large controllers/services into focused modules
- Group related utilities in separate files
- Use barrel exports (`index.ts`) for clean imports

**Current Large Files** (review for refactoring):
- `backend/src/services/subscription-management.service.ts` (46,213 lines) ⚠️
- `backend/src/controllers/admin.controller.ts` (42,064 lines) ⚠️
- `backend/src/routes/admin.routes.ts` (33,053 lines) ⚠️
- `backend/src/services/proration.service.ts` (29,401 lines) ⚠️
- `backend/src/services/model.service.ts` (29,565 lines) ⚠️
- `backend/src/services/llm.service.ts` (29,453 lines) ⚠️

---

## When to Use Specialized Agents

For complex tasks, delegate to specialized Claude Code agents:

- **Explore Agent**: Codebase exploration, architecture understanding
- **Plan Agent**: Feature planning, architecture design
- **Testing QA Agent**: Comprehensive test suite creation
- **API Backend Implementer**: REST endpoint implementation from specs
- **Database Schema Architect**: Database schema design and migrations
- **Rate Limit Security Agent**: Security infrastructure, rate limiting
- **OIDC Auth Implementer**: OAuth 2.0/OIDC implementation

---

## Additional Resources

### External Documentation

- **Frontend**: [React 18](https://react.dev), [Vite](https://vitejs.dev), [TailwindCSS](https://tailwindcss.com)
- **Backend**: [Express.js](https://expressjs.com), [Prisma](https://www.prisma.io/docs), [TSyringe](https://github.com/Microsoft/tsyringe)
- **Identity Provider**: [node-oidc-provider](https://github.com/panva/node-oidc-provider), [JWT.io](https://jwt.io)
- **Database**: [PostgreSQL](https://www.postgresql.org/docs), [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

### Internal Documentation

- **CLAUDE.md** - Project instructions for Claude Code
- **working-protocol.md** - Agentic coding session protocol
- **docs/reference/156-api-standards.md** - API development standards (authoritative)
- **docs/reference/155-dto-pattern-guide.md** - DTO pattern implementation
- **docs/guides/017-eslint-snake-case-prevention.md** - Naming convention enforcement
- **docs/progress/161-camelcase-standardization-completion-report.md** - Standardization report

---

## Conclusion

This document provides a comprehensive overview of the Rephlo project structure for agentic coding tools. It covers:

- ✅ Complete directory structure (frontend, backend, identity-provider)
- ✅ 54 database models with categorization
- ✅ API development standards and naming conventions
- ✅ Transformation layer (DB snake_case → API camelCase)
- ✅ Authentication & authorization flows
- ✅ Testing strategy and coverage goals
- ✅ Development workflow and commands
- ✅ Security best practices
- ✅ Documentation structure (335+ files)
- ✅ Key patterns (SOLID, DI, 3-layer architecture)

**For Questions**: Refer to CLAUDE.md or the docs/ directory for detailed documentation on specific topics.

**For API Testing**: Use the temporary access token in `temp_token.txt`.

**Launch Timeline**: March 2026

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintained By**: Development Team
**Status**: Active Reference Document
