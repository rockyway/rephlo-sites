# Backend API Implementation Agents Specification

**Version**: 1.0.0
**Created**: 2025-11-05
**Reference**: docs/plan/073-dedicated-api-backend-specification.md

## Overview

This document defines specialized agents required to implement the Dedicated API Backend. Each agent is responsible for a specific domain and operates autonomously while adhering to the overall architecture and specification.

---

## Agent Specifications

### 1. OIDC Authentication Agent

**Responsibility**: Implement OAuth 2.0/OIDC authentication system using node-oidc-provider v9.5.2.

**Scope**: Configure OIDC provider with PostgreSQL adapter for persistent storage and Redis for session management. Implement authorization endpoint with PKCE support, token endpoint (authorization_code and refresh_token grants), token revocation, userinfo endpoint, and JWKS endpoint. Set up login/consent flows with secure cookie sessions. Pre-seed desktop client configuration. Ensure compliance with OpenID Connect Core 1.0 specification and OAuth 2.0 RFC standards.

**Deliverables**:
- `src/config/oidc.ts` - OIDC provider configuration
- `src/controllers/auth.controller.ts` - Auth endpoints
- `src/services/auth.service.ts` - Authentication logic
- `src/middleware/auth.middleware.ts` - JWT validation middleware
- Migration scripts for oauth_clients table
- Integration tests for OAuth flows

---

### 2. Database Schema Agent

**Responsibility**: Design and implement PostgreSQL database schema with ORM integration.

**Scope**: Create Prisma schema with all tables: users, oauth_clients, subscriptions, credits, usage_history, models, user_preferences. Implement proper relationships, constraints, indexes, and generated columns. Set up migration system for schema versioning. Pre-seed essential data (oauth_clients, models). Configure connection pooling and query optimization. Implement database utilities for transaction management and error handling. Ensure data integrity with foreign keys and cascading deletes.

**Deliverables**:
- `prisma/schema.prisma` - Complete Prisma schema
- `prisma/migrations/` - Migration files
- `prisma/seed.ts` - Data seeding script
- `src/config/database.ts` - Database configuration
- `src/models/*.model.ts` - Model definitions with TypeScript types
- Database documentation

---

### 3. Model Service Agent

**Responsibility**: Implement model management APIs and LLM inference proxy service.

**Scope**: Build REST endpoints for listing models, getting model details, setting default models. Implement LLM proxy service that routes requests to OpenAI, Anthropic, and Google APIs. Handle streaming and non-streaming completions. Implement credit calculation based on token usage. Support chat completions and text completions with temperature, max_tokens, and model selection. Manage model availability and deprecation. Cache model metadata in Redis for performance.

**Deliverables**:
- `src/controllers/models.controller.ts` - Model API endpoints
- `src/services/model.service.ts` - Model management logic
- `src/services/llm.service.ts` - LLM provider proxy
- `src/routes/v1.routes.ts` - API route definitions
- Streaming response handlers
- Model provider SDK integrations

---

### 4. Subscription Management Agent

**Responsibility**: Implement subscription lifecycle management with Stripe integration.

**Scope**: Build subscription CRUD APIs: create, read, update, cancel subscriptions. Integrate Stripe for payment processing and webhook handling. Implement subscription tier logic (free, pro, enterprise) with appropriate credit allocation. Handle billing intervals (monthly, yearly) and trial periods. Process subscription lifecycle events (created, updated, cancelled, expired). Implement prorated upgrades/downgrades. Manage subscription status transitions and period tracking.

**Deliverables**:
- `src/controllers/subscriptions.controller.ts` - Subscription endpoints
- `src/services/subscription.service.ts` - Subscription business logic
- `src/services/stripe.service.ts` - Stripe integration
- Webhook handlers for Stripe events
- Subscription status management
- Integration tests with Stripe test mode

---

### 5. Credit & Usage Tracking Agent

**Responsibility**: Implement credit management system and usage analytics APIs.

**Scope**: Build credit allocation system tied to subscriptions. Track credit usage per request with atomic operations to prevent race conditions. Implement usage history recording with detailed metadata (tokens, duration, model). Create usage statistics API with aggregation by day/hour/model. Implement rate limit checking based on tier. Handle billing period rollovers and credit expiration. Generate usage reports and analytics. Implement low-credit alerting via webhooks.

**Deliverables**:
- `src/controllers/credits.controller.ts` - Credit API endpoints
- `src/services/credit.service.ts` - Credit management logic
- `src/services/usage.service.ts` - Usage tracking and analytics
- Credit deduction middleware
- Usage aggregation queries
- Background jobs for credit rollover

---

### 6. User Management Agent

**Responsibility**: Implement user profile and preferences management APIs.

**Scope**: Build user profile CRUD operations (get, update). Implement user preferences management including default model selection, streaming preferences, temperature, and max_tokens settings. Handle user metadata storage in JSONB fields. Integrate with OIDC userinfo endpoint. Implement profile picture URL management. Track user activity (last_login_at). Support soft deletion with deleted_at timestamp. Ensure email verification workflow.

**Deliverables**:
- `src/controllers/users.controller.ts` - User API endpoints
- `src/services/user.service.ts` - User management logic
- User preference validation
- Profile update handlers
- Email verification flow
- User activity tracking

---

### 7. Webhook System Agent

**Responsibility**: Implement outgoing webhook system for event notifications.

**Scope**: Build webhook delivery system for subscription events (created, cancelled, updated) and credit events (depleted, low balance). Implement HMAC-SHA256 signature generation for webhook security. Create retry logic with exponential backoff for failed deliveries. Store webhook configuration per user/organization. Implement webhook testing endpoint. Log all webhook attempts and responses. Support webhook payload validation. Queue webhook deliveries using BullMQ for reliability.

**Deliverables**:
- `src/services/webhook.service.ts` - Webhook delivery logic
- `src/utils/signature.ts` - HMAC signature utilities
- Webhook queue processors
- Webhook retry mechanism
- Webhook configuration API
- Webhook delivery logs

---

### 8. Rate Limiting & Security Agent

**Responsibility**: Implement rate limiting, CORS, and security measures.

**Scope**: Configure express-rate-limit with Redis store for distributed rate limiting. Implement tier-based limits (requests/min, tokens/min, credits/day). Set up Helmet.js for security headers. Configure CORS with allowlist for desktop app and dev environments. Implement request validation using Zod schemas. Add rate limit headers to responses (X-RateLimit-*). Create rate limit status API endpoint. Implement IP-based and user-based rate limiting. Handle rate limit exceeded errors with proper retry-after headers.

**Deliverables**:
- `src/middleware/ratelimit.middleware.ts` - Rate limiting logic
- `src/config/security.ts` - Security configuration
- `src/config/cors.ts` - CORS setup
- `src/utils/validators.ts` - Request validation schemas
- Rate limit status endpoint
- Security headers configuration

---

### 9. API Infrastructure Agent

**Responsibility**: Set up Express.js application infrastructure and middleware pipeline.

**Scope**: Initialize Express app with proper middleware order: helmet, cors, body-parser, morgan logging, authentication, rate limiting, route handlers, error handling. Configure Winston logger with appropriate transports and log levels. Implement centralized error handling middleware with standardized error responses. Set up environment configuration with dotenv. Create health check endpoints. Implement graceful shutdown handling. Configure Redis connection management. Set up Sentry for error monitoring.

**Deliverables**:
- `src/app.ts` - Express app initialization
- `src/server.ts` - Server startup and shutdown
- `src/middleware/error.middleware.ts` - Error handling
- `src/utils/logger.ts` - Winston logging configuration
- `src/routes/index.ts` - Route aggregation
- Health check endpoints
- Environment configuration

---

### 10. Testing & QA Agent

**Responsibility**: Implement comprehensive testing suite and API documentation.

**Scope**: Write unit tests for services, controllers, and utilities using Jest. Create integration tests for API endpoints using Supertest. Implement test fixtures and factories for database entities. Set up test database isolation. Create end-to-end tests for OAuth flows and inference pipelines. Generate OpenAPI/Swagger documentation. Write API usage examples and guides. Implement code coverage reporting. Create performance tests for rate limiting and concurrent requests.

**Deliverables**:
- `tests/unit/**/*.test.ts` - Unit tests
- `tests/integration/**/*.test.ts` - Integration tests
- `tests/fixtures/` - Test data fixtures
- `tests/helpers/` - Test utilities
- OpenAPI specification document
- API documentation with examples
- Code coverage configuration
- Performance test scripts

---

## Agent Coordination Guidelines

### Execution Order

1. **Phase 1: Foundation** (Parallel)
   - Database Schema Agent
   - API Infrastructure Agent

2. **Phase 2: Core Services** (Sequential)
   - OIDC Authentication Agent (depends on Database Schema)
   - User Management Agent (depends on OIDC)

3. **Phase 3: Business Logic** (Parallel)
   - Model Service Agent
   - Subscription Management Agent
   - Credit & Usage Tracking Agent

4. **Phase 4: Supporting Systems** (Parallel)
   - Webhook System Agent
   - Rate Limiting & Security Agent

5. **Phase 5: Quality Assurance**
   - Testing & QA Agent

### Inter-Agent Dependencies

```
Database Schema Agent
    ↓
OIDC Authentication Agent
    ↓
User Management Agent
    ↓
    ├─→ Model Service Agent
    ├─→ Subscription Management Agent → Credit & Usage Tracking Agent
    └─→ Webhook System Agent

API Infrastructure Agent (parallel to all)
Rate Limiting & Security Agent (integrates with all)
Testing & QA Agent (validates all)
```

### Communication Protocols

- **Shared Artifacts**: All agents read from `docs/plan/073-dedicated-api-backend-specification.md`
- **Conflict Resolution**: Later agents must not modify earlier agents' deliverables without coordination
- **Integration Points**: Agents must document exported interfaces and expected dependencies
- **Testing Requirements**: Each agent must provide unit tests for their deliverables

---

## Success Criteria

- All 10 agents complete their deliverables
- Integration tests pass across all modules
- API endpoints match specification exactly
- Authentication flows work end-to-end
- Rate limiting enforces tier-based limits
- Database schema supports all features
- Code coverage exceeds 80%
- API documentation is complete and accurate
- No security vulnerabilities in dependencies
- Performance meets requirements (60 RPM for Pro tier)

---

## Notes

- Agents should follow SOLID principles and maintain ~1,200 lines per file
- TypeScript strict mode must be enabled
- All async operations must have proper error handling
- Logging should be comprehensive for production debugging
- Environment variables must be documented in .env.example
- Database queries should use indexes for performance
- API responses must follow standardized error format
- OIDC provider must support PKCE for public clients
