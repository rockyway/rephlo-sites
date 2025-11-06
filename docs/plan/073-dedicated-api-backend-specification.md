# Dedicated API Backend Specification

**Version**: 1.0.0
**Technology Stack**: Node.js + TypeScript + PostgreSQL
**Authentication**: node-oidc-provider v9.5.2
**Created**: 2025-11-05

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication APIs](#authentication-apis)
5. [Model APIs](#model-apis)
6. [Subscription APIs](#subscription-apis)
7. [Credit & Usage APIs](#credit--usage-apis)
8. [User APIs](#user-apis)
9. [Webhooks](#webhooks)
10. [Error Handling](#error-handling)
11. [Security & Rate Limiting](#security--rate-limiting)

---

## Overview

The Dedicated API Backend provides a complete LLM service platform with OAuth 2.0/OIDC authentication, subscription management, credit tracking, and model inference capabilities.

### Base URL
```
Production:  https://api.rephlo.ai
Staging:     https://api-staging.rephlo.ai
Development: http://localhost:3000
```

### API Versioning
All API endpoints are versioned: `/v1/...`

---

## Architecture

### Technology Stack
- **Runtime**: Node.js 20 LTS + TypeScript 5.x
- **Framework**: Express.js 4.x
- **Authentication**: node-oidc-provider v9.5.2 (panva)
- **Database**: PostgreSQL 16.x
- **ORM**: Prisma 5.x or TypeORM 0.3.x
- **Caching**: Redis 7.x
- **Queue**: BullMQ for async jobs
- **Logging**: Winston + Morgan

### Service Architecture
```
┌─────────────────────────────────────────────────┐
│                 API Gateway                      │
│              (Rate Limiting, CORS)               │
└─────────────────┬───────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
┌─────▼──────┐      ┌────────▼──────┐
│  OIDC      │      │  REST API     │
│  Provider  │      │  Endpoints    │
└─────┬──────┘      └────────┬──────┘
      │                      │
      └──────────┬───────────┘
                 │
        ┌────────▼─────────┐
        │   Services       │
        │ - AuthService    │
        │ - ModelService   │
        │ - SubscService   │
        │ - CreditService  │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │   PostgreSQL     │
        │   + Redis Cache  │
        └──────────────────┘
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    username VARCHAR(100),
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### OAuth Clients Table
```sql
CREATE TABLE oauth_clients (
    client_id VARCHAR(255) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_secret_hash VARCHAR(255),
    redirect_uris TEXT[] NOT NULL,
    grant_types TEXT[] NOT NULL,
    response_types TEXT[] NOT NULL,
    scope TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-seed desktop client
INSERT INTO oauth_clients VALUES (
    'textassistant-desktop',
    'Text Assistant Desktop',
    NULL,  -- Public client, no secret
    ARRAY['http://localhost:8080/callback'],
    ARRAY['authorization_code', 'refresh_token'],
    ARRAY['code'],
    'openid email profile llm.inference models.read user.info credits.read',
    TRUE,
    NOW()
);
```

### Subscriptions Table
```sql
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'suspended');

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    credits_per_month INTEGER NOT NULL,
    credits_rollover BOOLEAN DEFAULT FALSE,
    price_cents INTEGER NOT NULL,
    billing_interval VARCHAR(20) NOT NULL,  -- 'monthly', 'yearly'
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    UNIQUE(user_id, status)  -- One active subscription per user
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
```

### Credits Table
```sql
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    total_credits INTEGER NOT NULL,
    used_credits INTEGER NOT NULL DEFAULT 0,
    remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED,
    billing_period_start TIMESTAMP NOT NULL,
    billing_period_end TIMESTAMP NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_user_is_current ON credits(user_id, is_current);
CREATE INDEX idx_credits_billing_period ON credits(billing_period_start, billing_period_end);
```

### Usage History Table
```sql
CREATE TYPE usage_operation AS ENUM ('completion', 'chat', 'embedding', 'function_call');

CREATE TABLE usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_id UUID REFERENCES credits(id) ON DELETE SET NULL,
    model_id VARCHAR(100) NOT NULL,
    operation usage_operation NOT NULL,
    credits_used INTEGER NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    request_duration_ms INTEGER,
    request_metadata JSONB,  -- Store prompt, response snippets, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_user_id ON usage_history(user_id);
CREATE INDEX idx_usage_created_at ON usage_history(created_at);
CREATE INDEX idx_usage_model_id ON usage_history(model_id);
CREATE INDEX idx_usage_user_created ON usage_history(user_id, created_at DESC);
```

### Models Table
```sql
CREATE TYPE model_capability AS ENUM ('text', 'vision', 'function_calling', 'code', 'long_context');

CREATE TABLE models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,  -- 'openai', 'anthropic', 'google', etc.
    description TEXT,
    capabilities model_capability[] NOT NULL,
    context_length INTEGER NOT NULL,
    max_output_tokens INTEGER,
    input_cost_per_million_tokens INTEGER NOT NULL,
    output_cost_per_million_tokens INTEGER NOT NULL,
    credits_per_1k_tokens INTEGER NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pre-seed models
INSERT INTO models VALUES
    ('gpt-5', 'gpt-5', 'GPT-5', 'openai', 'Latest GPT model with enhanced reasoning',
     ARRAY['text', 'vision', 'function_calling']::model_capability[], 128000, 4096, 500, 1500, 2, TRUE, FALSE, '1.0', NOW(), NOW()),
    ('gemini-2.0-pro', 'gemini-2.0-pro', 'Gemini 2.0 Pro', 'google', 'Google''s most capable model',
     ARRAY['text', 'vision', 'long_context']::model_capability[], 2000000, 8192, 350, 1050, 1, TRUE, FALSE, '2.0', NOW(), NOW()),
    ('claude-3.5-sonnet', 'claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 'Anthropic''s balanced model',
     ARRAY['text', 'vision', 'code']::model_capability[], 200000, 4096, 300, 1500, 2, TRUE, FALSE, '3.5', NOW(), NOW());

CREATE INDEX idx_models_is_available ON models(is_available);
CREATE INDEX idx_models_provider ON models(provider);
```

### User Preferences Table
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_model_id VARCHAR(100) REFERENCES models(id),
    enable_streaming BOOLEAN DEFAULT TRUE,
    max_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    preferences_metadata JSONB,  -- Additional settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### OAuth Sessions (in-memory/Redis for node-oidc-provider)
```typescript
// Stored in Redis with TTL
interface OAuthSession {
  jti: string;
  kind: 'Session' | 'AccessToken' | 'RefreshToken' | 'AuthorizationCode';
  accountId: string;  // user_id
  clientId: string;
  scope: string;
  expiresAt: number;
  grantId?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}
```

---

## Authentication APIs

### 1. Authorization Endpoint

**OIDC Discovery**
```
GET /.well-known/openid-configuration

Response:
{
  "issuer": "https://api.textassistant.com",
  "authorization_endpoint": "https://api.textassistant.com/oauth/authorize",
  "token_endpoint": "https://api.textassistant.com/oauth/token",
  "userinfo_endpoint": "https://api.textassistant.com/oauth/userinfo",
  "jwks_uri": "https://api.textassistant.com/oauth/jwks",
  "revocation_endpoint": "https://api.textassistant.com/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "email", "profile", "llm.inference", "models.read", "user.info", "credits.read"],
  "token_endpoint_auth_methods_supported": ["none"],
  "code_challenge_methods_supported": ["S256"]
}
```

**Authorization Request**
```
GET /oauth/authorize

Query Parameters:
- client_id: textassistant-desktop
- redirect_uri: http://localhost:8080/callback
- response_type: code
- scope: openid email profile llm.inference models.read user.info credits.read
- state: <random-state>
- code_challenge: <SHA256-base64url-challenge>
- code_challenge_method: S256

Response:
HTTP 302 Redirect to login page
→ User authenticates
→ User approves consent
→ HTTP 302 Redirect: http://localhost:8080/callback?code=<auth_code>&state=<state>
```

### 2. Token Endpoint

**Exchange Authorization Code**
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

Body:
grant_type=authorization_code
&code=<authorization_code>
&redirect_uri=http://localhost:8080/callback
&client_id=textassistant-desktop
&code_verifier=<original-verifier>

Response 200:
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "scope": "openid email profile llm.inference models.read user.info credits.read",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Refresh Access Token**
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

Body:
grant_type=refresh_token
&refresh_token=<refresh_token>
&client_id=textassistant-desktop

Response 200:
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",  // New refresh token
  "scope": "openid email profile llm.inference models.read user.info credits.read"
}
```

### 3. Token Revocation

```http
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <access_token>

Body:
token=<access_token or refresh_token>
&token_type_hint=access_token

Response 200:
{
  "success": true
}
```

### 4. User Info Endpoint

```http
GET /oauth/userinfo
Authorization: Bearer <access_token>

Response 200:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://cdn.textassistant.com/avatars/user123.jpg",
  "updated_at": 1699564800
}
```

---

## Model APIs

### 1. List Available Models

```http
GET /v1/models
Authorization: Bearer <access_token>

Query Parameters (optional):
- available: true          # Filter by availability
- capability: text,vision  # Filter by capabilities
- provider: openai         # Filter by provider

Response 200:
{
  "models": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "provider": "openai",
      "description": "Latest GPT model with enhanced reasoning",
      "capabilities": ["text", "vision", "function_calling"],
      "context_length": 128000,
      "max_output_tokens": 4096,
      "credits_per_1k_tokens": 2,
      "is_available": true,
      "version": "1.0"
    },
    {
      "id": "gemini-2.0-pro",
      "name": "Gemini 2.0 Pro",
      "provider": "google",
      "description": "Google's most capable model",
      "capabilities": ["text", "vision", "long_context"],
      "context_length": 2000000,
      "max_output_tokens": 8192,
      "credits_per_1k_tokens": 1,
      "is_available": true,
      "version": "2.0"
    }
  ],
  "total": 2
}
```

### 2. Get Model Details

```http
GET /v1/models/:modelId
Authorization: Bearer <access_token>

Response 200:
{
  "id": "gpt-5",
  "name": "GPT-5",
  "display_name": "GPT-5",
  "provider": "openai",
  "description": "Latest GPT model with enhanced reasoning",
  "capabilities": ["text", "vision", "function_calling"],
  "context_length": 128000,
  "max_output_tokens": 4096,
  "input_cost_per_million_tokens": 500,
  "output_cost_per_million_tokens": 1500,
  "credits_per_1k_tokens": 2,
  "is_available": true,
  "is_deprecated": false,
  "version": "1.0",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### 3. Set Default Model

```http
POST /v1/users/me/preferences/model
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "model_id": "gpt-5"
}

Response 200:
{
  "default_model_id": "gpt-5",
  "updated_at": "2025-11-05T10:30:00Z"
}

Error 404:
{
  "error": "model_not_found",
  "message": "Model 'invalid-model' does not exist"
}
```

### 4. Get Default Model

```http
GET /v1/users/me/preferences/model
Authorization: Bearer <access_token>

Response 200:
{
  "default_model_id": "gpt-5",
  "model": {
    "id": "gpt-5",
    "name": "GPT-5",
    "capabilities": ["text", "vision", "function_calling"]
  }
}
```

### 5. Text Completion (Inference)

```http
POST /v1/completions
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "model": "gpt-5",
  "prompt": "Explain quantum computing in simple terms",
  "max_tokens": 500,
  "temperature": 0.7,
  "stream": false
}

Response 200:
{
  "id": "cmpl-123abc",
  "object": "text_completion",
  "created": 1699564800,
  "model": "gpt-5",
  "choices": [
    {
      "text": "Quantum computing is...",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 150,
    "total_tokens": 158,
    "credits_used": 1
  }
}
```

### 6. Chat Completion

```http
POST /v1/chat/completions
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "model": "gpt-5",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the capital of France?"}
  ],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}

Response 200:
{
  "id": "chatcmpl-456def",
  "object": "chat.completion",
  "created": 1699564800,
  "model": "gpt-5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 7,
    "total_tokens": 32,
    "credits_used": 1
  }
}
```

### 7. Streaming Completion

```http
POST /v1/chat/completions
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "model": "gpt-5",
  "messages": [{"role": "user", "content": "Write a haiku"}],
  "stream": true
}

Response 200 (Server-Sent Events):
data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1699564800,"model":"gpt-5","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1699564800,"model":"gpt-5","choices":[{"index":0,"delta":{"content":"Cherry"},"finish_reason":null}]}

data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1699564800,"model":"gpt-5","choices":[{"index":0,"delta":{"content":" blossoms"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1699564800,"model":"gpt-5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"total_tokens":45,"credits_used":1}}

data: [DONE]
```

---

## Subscription APIs

### 1. Get Current Subscription

```http
GET /v1/subscriptions/me
Authorization: Bearer <access_token>

Response 200:
{
  "id": "sub_123abc",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tier": "pro",
  "status": "active",
  "credits_per_month": 100000,
  "credits_rollover": false,
  "billing_interval": "monthly",
  "price_cents": 2999,
  "current_period_start": "2025-11-01T00:00:00Z",
  "current_period_end": "2025-12-01T00:00:00Z",
  "trial_end": null,
  "created_at": "2025-10-15T10:00:00Z"
}

Response 404 (No active subscription):
{
  "error": "no_active_subscription",
  "message": "User does not have an active subscription"
}
```

### 2. List Subscription Plans

```http
GET /v1/subscription-plans

Response 200:
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "description": "Try out with limited credits",
      "credits_per_month": 5000,
      "price_cents": 0,
      "billing_intervals": ["monthly"],
      "features": [
        "5,000 credits per month",
        "Access to standard models",
        "Basic support"
      ]
    },
    {
      "id": "pro",
      "name": "Pro",
      "description": "For power users",
      "credits_per_month": 100000,
      "price_cents": 2999,
      "billing_intervals": ["monthly", "yearly"],
      "yearly_discount_percent": 20,
      "features": [
        "100,000 credits per month",
        "Access to all models",
        "Priority support",
        "Advanced analytics"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "For teams and businesses",
      "credits_per_month": 1000000,
      "price_cents": 19900,
      "billing_intervals": ["monthly", "yearly"],
      "yearly_discount_percent": 25,
      "features": [
        "1,000,000 credits per month",
        "Access to all models",
        "Dedicated support",
        "Custom integrations",
        "SSO",
        "SLA"
      ]
    }
  ]
}
```

### 3. Create Subscription

```http
POST /v1/subscriptions
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "plan_id": "pro",
  "billing_interval": "monthly",
  "payment_method_id": "pm_1234abcd"  // Stripe payment method
}

Response 201:
{
  "id": "sub_456def",
  "tier": "pro",
  "status": "active",
  "credits_per_month": 100000,
  "stripe_subscription_id": "sub_stripe_123",
  "created_at": "2025-11-05T10:30:00Z"
}
```

### 4. Cancel Subscription

```http
POST /v1/subscriptions/me/cancel
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "reason": "Too expensive",
  "cancel_at_period_end": true
}

Response 200:
{
  "id": "sub_123abc",
  "status": "active",
  "cancelled_at": "2025-11-05T10:30:00Z",
  "cancel_at_period_end": true,
  "current_period_end": "2025-12-01T00:00:00Z"
}
```

### 5. Update Subscription

```http
PATCH /v1/subscriptions/me
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "plan_id": "enterprise",
  "billing_interval": "yearly"
}

Response 200:
{
  "id": "sub_123abc",
  "tier": "enterprise",
  "status": "active",
  "credits_per_month": 1000000,
  "price_cents": 15920,  // With yearly discount
  "billing_interval": "yearly",
  "updated_at": "2025-11-05T10:30:00Z"
}
```

---

## Credit & Usage APIs

### 1. Get Current Credits

```http
GET /v1/credits/me
Authorization: Bearer <access_token>

Response 200:
{
  "id": "crd_789ghi",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_credits": 100000,
  "used_credits": 25430,
  "remaining_credits": 74570,
  "billing_period_start": "2025-11-01T00:00:00Z",
  "billing_period_end": "2025-12-01T00:00:00Z",
  "usage_percentage": 25.43
}
```

### 2. Get Usage History

```http
GET /v1/usage
Authorization: Bearer <access_token>

Query Parameters:
- start_date: 2025-11-01  # ISO date
- end_date: 2025-11-05    # ISO date
- model_id: gpt-5         # Filter by model
- operation: completion   # Filter by operation type
- limit: 50               # Pagination limit (default: 20, max: 100)
- offset: 0               # Pagination offset

Response 200:
{
  "usage": [
    {
      "id": "use_123",
      "model_id": "gpt-5",
      "operation": "chat",
      "credits_used": 2,
      "input_tokens": 120,
      "output_tokens": 450,
      "total_tokens": 570,
      "request_duration_ms": 1250,
      "created_at": "2025-11-05T10:30:00Z"
    },
    {
      "id": "use_124",
      "model_id": "gemini-2.0-pro",
      "operation": "completion",
      "credits_used": 1,
      "input_tokens": 50,
      "output_tokens": 200,
      "total_tokens": 250,
      "request_duration_ms": 890,
      "created_at": "2025-11-05T10:28:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 156,
    "has_more": true
  },
  "summary": {
    "total_credits_used": 312,
    "total_requests": 156,
    "total_tokens": 45780
  }
}
```

### 3. Get Usage Statistics

```http
GET /v1/usage/stats
Authorization: Bearer <access_token>

Query Parameters:
- start_date: 2025-11-01
- end_date: 2025-11-05
- group_by: day  # day, hour, model

Response 200:
{
  "stats": [
    {
      "date": "2025-11-01",
      "credits_used": 5430,
      "requests_count": 234,
      "tokens_total": 125600,
      "average_duration_ms": 980
    },
    {
      "date": "2025-11-02",
      "credits_used": 6120,
      "requests_count": 267,
      "tokens_total": 142300,
      "average_duration_ms": 1050
    }
  ],
  "total": {
    "credits_used": 25430,
    "requests_count": 1156,
    "tokens_total": 634500,
    "average_duration_ms": 1020
  }
}
```

### 4. Check Rate Limit Status

```http
GET /v1/rate-limit
Authorization: Bearer <access_token>

Response 200:
{
  "requests_per_minute": {
    "limit": 60,
    "remaining": 45,
    "reset_at": "2025-11-05T10:31:00Z"
  },
  "tokens_per_minute": {
    "limit": 100000,
    "remaining": 87500,
    "reset_at": "2025-11-05T10:31:00Z"
  },
  "credits_per_day": {
    "limit": 10000,
    "remaining": 7500,
    "reset_at": "2025-11-06T00:00:00Z"
  }
}
```

---

## User APIs

### 1. Get Current User Profile

```http
GET /v1/users/me
Authorization: Bearer <access_token>

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "email_verified": true,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "profile_picture_url": "https://cdn.textassistant.com/avatars/user123.jpg",
  "created_at": "2025-10-01T10:00:00Z",
  "last_login_at": "2025-11-05T09:00:00Z"
}
```

### 2. Update User Profile

```http
PATCH /v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "first_name": "Jane",
  "last_name": "Smith",
  "username": "janesmith"
}

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "janesmith",
  "first_name": "Jane",
  "last_name": "Smith",
  "updated_at": "2025-11-05T10:30:00Z"
}
```

### 3. Get User Preferences

```http
GET /v1/users/me/preferences
Authorization: Bearer <access_token>

Response 200:
{
  "default_model_id": "gpt-5",
  "enable_streaming": true,
  "max_tokens": 4096,
  "temperature": 0.7,
  "preferences_metadata": {
    "theme": "dark",
    "language": "en"
  }
}
```

### 4. Update User Preferences

```http
PATCH /v1/users/me/preferences
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "enable_streaming": false,
  "max_tokens": 2048,
  "temperature": 0.5
}

Response 200:
{
  "default_model_id": "gpt-5",
  "enable_streaming": false,
  "max_tokens": 2048,
  "temperature": 0.5,
  "updated_at": "2025-11-05T10:30:00Z"
}
```

---

## Webhooks

### Subscription Events

```http
POST <webhook_url>
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>

Body (subscription.created):
{
  "event": "subscription.created",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "subscription_id": "sub_123abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "tier": "pro",
    "status": "active"
  }
}

Body (subscription.cancelled):
{
  "event": "subscription.cancelled",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "subscription_id": "sub_123abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "cancelled_at": "2025-11-05T10:30:00Z",
    "cancel_at_period_end": true
  }
}

Body (credits.depleted):
{
  "event": "credits.depleted",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "remaining_credits": 500,
    "threshold_percentage": 5
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "You do not have enough credits to complete this request",
    "details": {
      "required_credits": 5,
      "available_credits": 2
    }
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `invalid_request` | Request format or parameters are invalid |
| 401 | `unauthorized` | Missing or invalid access token |
| 403 | `forbidden` | Token valid but lacks required scope |
| 403 | `insufficient_credits` | Not enough credits for operation |
| 404 | `not_found` | Resource does not exist |
| 409 | `conflict` | Resource state conflict (e.g., duplicate) |
| 422 | `validation_error` | Request validation failed |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_server_error` | Unexpected server error |
| 503 | `service_unavailable` | Service temporarily unavailable |

### Rate Limit Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564860
Retry-After: 60

Body:
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again in 60 seconds."
  }
}
```

---

## Security & Rate Limiting

### Rate Limits (Per User)

| Tier | Requests/Min | Tokens/Min | Credits/Day |
|------|--------------|------------|-------------|
| Free | 10 | 10,000 | 200 |
| Pro | 60 | 100,000 | 5,000 |
| Enterprise | 300 | 500,000 | 50,000 |

### Authentication

All protected endpoints require:
```http
Authorization: Bearer <access_token>
```

Access tokens expire after 1 hour. Use refresh tokens to obtain new access tokens.

### CORS Configuration

```typescript
// Allowed origins
const allowedOrigins = [
  'http://localhost:8080',  // Development
  'textassistant://*',      // Desktop app deep links
];

// CORS headers
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

### Request Signing (Webhooks)

Webhooks include HMAC-SHA256 signature:
```http
X-Webhook-Signature: sha256=<hmac-signature>
```

Verify using shared webhook secret.

---

## Implementation Notes

### Node.js + TypeScript Project Structure

```
dedicated-api-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── oidc.ts
│   │   └── redis.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── models.controller.ts
│   │   ├── subscriptions.controller.ts
│   │   ├── credits.controller.ts
│   │   └── users.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── model.service.ts
│   │   ├── subscription.service.ts
│   │   ├── credit.service.ts
│   │   └── llm.service.ts  # Proxy to OpenAI/Anthropic/Google
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── ratelimit.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── subscription.model.ts
│   │   ├── credit.model.ts
│   │   └── usage.model.ts
│   ├── routes/
│   │   ├── oauth.routes.ts
│   │   ├── v1.routes.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── index.d.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── integration/
│   └── unit/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/textassistant
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# OIDC Provider
OIDC_ISSUER=https://api.textassistant.com
OIDC_COOKIE_KEYS=["secret1", "secret2"]  # For session cookies
OIDC_JWKS_PRIVATE_KEY=<RS256-private-key>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# LLM Providers (Backend proxies)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Rate Limiting
RATE_LIMIT_FREE_RPM=10
RATE_LIMIT_PRO_RPM=60
RATE_LIMIT_ENTERPRISE_RPM=300

# Security
JWT_SECRET=<strong-secret>
WEBHOOK_SECRET=<webhook-signing-secret>
ENCRYPTION_KEY=<aes-256-key>

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
```

### Dependencies (package.json)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "oidc-provider": "^9.5.2",
    "pg": "^8.11.3",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "redis": "^4.6.11",
    "bullmq": "^5.1.0",
    "stripe": "^14.9.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.1.2",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.9.1",
    "@google-cloud/aiplatform": "^3.8.0",
    "jose": "^5.1.3",
    "zod": "^3.22.4",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/bcrypt": "^5.0.2",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.10",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

---

## Conclusion

This backend API specification provides a complete, production-ready foundation for the Dedicated LLM service with:

- **OAuth 2.0 + OIDC** authentication using node-oidc-provider
- **Comprehensive model APIs** for inference and management
- **Subscription management** with Stripe integration
- **Credit tracking** with detailed usage analytics
- **PostgreSQL** for reliable data persistence
- **Redis** for caching and rate limiting
- **Webhooks** for event-driven architecture

The API follows REST best practices, includes proper error handling, rate limiting, and security measures suitable for production deployment.
