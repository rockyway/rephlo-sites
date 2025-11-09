# Model Tier Access Control - API Reference

**Document ID**: 017
**Created**: 2025-11-08
**Type**: API Reference
**Related Documents**:
- [108-model-tier-access-control-architecture.md](../plan/108-model-tier-access-control-architecture.md)
- [016-model-tier-access-control-schema.md](016-model-tier-access-control-schema.md)

## Overview

This document provides comprehensive API documentation for the tier-based access control system. All tier-related endpoints require authentication via JWT bearer token.

## Table of Contents

1. [User-Facing Endpoints](#user-facing-endpoints)
2. [Inference Endpoints with Tier Validation](#inference-endpoints-with-tier-validation)
3. [Error Responses](#error-responses)
4. [Authentication](#authentication)

---

## User-Facing Endpoints

### 1. List Models (Enhanced)

**Endpoint**: `GET /v1/models`

**Description**: Retrieves all available models with tier metadata and access status based on the authenticated user's subscription tier.

**Authentication**: Required (JWT bearer token)

**Required Scope**: `models.read`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `available` | boolean | No | Filter by availability (true/false) |
| `capability` | string | No | Comma-separated list of capabilities (text, vision, function_calling, code, long_context) |
| `provider` | string | No | Filter by provider (openai, anthropic, google) |

#### Request Example

```bash
GET /v1/models?available=true&capability=text,vision
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response Format

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "models": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "provider": "openai",
      "description": "Most capable GPT model with advanced reasoning",
      "capabilities": ["text", "vision", "function_calling", "code"],
      "context_length": 128000,
      "max_output_tokens": 16384,
      "credits_per_1k_tokens": 500,
      "is_available": true,
      "version": "2024-11-06",
      "required_tier": "enterprise",
      "tier_restriction_mode": "minimum",
      "allowed_tiers": ["enterprise"],
      "access_status": "upgrade_required"
    },
    {
      "id": "claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "description": "Balanced model optimized for coding tasks",
      "capabilities": ["text", "vision", "code"],
      "context_length": 200000,
      "max_output_tokens": 8192,
      "credits_per_1k_tokens": 300,
      "is_available": true,
      "version": "20241022",
      "required_tier": "pro",
      "tier_restriction_mode": "minimum",
      "allowed_tiers": ["pro", "enterprise"],
      "access_status": "allowed"
    }
  ],
  "total": 2,
  "user_tier": "pro"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `models` | array | Array of model objects |
| `models[].id` | string | Unique model identifier |
| `models[].name` | string | Human-readable model name |
| `models[].provider` | string | Model provider (openai, anthropic, google) |
| `models[].description` | string | Model description |
| `models[].capabilities` | array | Model capabilities |
| `models[].context_length` | integer | Maximum context window size |
| `models[].max_output_tokens` | integer | Maximum output tokens |
| `models[].credits_per_1k_tokens` | integer | Credits cost per 1000 tokens |
| `models[].is_available` | boolean | Whether model is currently available |
| `models[].version` | string | Model version identifier |
| `models[].required_tier` | string | Minimum tier required (free, pro, enterprise) |
| `models[].tier_restriction_mode` | string | Restriction mode (minimum, exact, whitelist) |
| `models[].allowed_tiers` | array | List of allowed tiers |
| `models[].access_status` | string | User's access status (allowed, upgrade_required) |
| `total` | integer | Total number of models returned |
| `user_tier` | string | Current user's subscription tier |

#### Access Status Values

- `allowed` - User can access this model
- `upgrade_required` - User needs to upgrade subscription tier

---

### 2. Get Model Details (Enhanced)

**Endpoint**: `GET /v1/models/:modelId`

**Description**: Retrieves detailed information about a specific model, including tier requirements and access status.

**Authentication**: Required (JWT bearer token)

**Required Scope**: `models.read`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelId` | string | Yes | Unique model identifier (e.g., "gpt-5") |

#### Request Example

```bash
GET /v1/models/gpt-5
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response Format

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "id": "gpt-5",
  "name": "gpt-5",
  "display_name": "GPT-5",
  "provider": "openai",
  "description": "Most capable GPT model with advanced reasoning capabilities and multimodal understanding",
  "capabilities": ["text", "vision", "function_calling", "code"],
  "context_length": 128000,
  "max_output_tokens": 16384,
  "input_cost_per_million_tokens": 500,
  "output_cost_per_million_tokens": 1500,
  "credits_per_1k_tokens": 500,
  "is_available": true,
  "is_deprecated": false,
  "version": "2024-11-06",
  "created_at": "2025-11-01T10:00:00.000Z",
  "updated_at": "2025-11-08T12:00:00.000Z",
  "required_tier": "enterprise",
  "tier_restriction_mode": "minimum",
  "allowed_tiers": ["enterprise"],
  "access_status": "upgrade_required",
  "upgrade_info": {
    "required_tier": "enterprise",
    "upgrade_url": "/subscriptions/upgrade"
  }
}
```

#### Response Fields (Additional to List Models)

| Field | Type | Description |
|-------|------|-------------|
| `input_cost_per_million_tokens` | integer | Input token cost (credits per million) |
| `output_cost_per_million_tokens` | integer | Output token cost (credits per million) |
| `is_deprecated` | boolean | Whether model is deprecated |
| `created_at` | string | ISO 8601 timestamp of model creation |
| `updated_at` | string | ISO 8601 timestamp of last update |
| `upgrade_info` | object | Upgrade information (only if access denied) |
| `upgrade_info.required_tier` | string | Required tier for access |
| `upgrade_info.upgrade_url` | string | URL to upgrade subscription |

#### Error Responses

**Model Not Found**

**Status Code**: `404 Not Found`

```json
{
  "status": "error",
  "code": "resource_not_found",
  "message": "Model 'invalid-model-id' not found",
  "timestamp": "2025-11-08T12:00:00Z"
}
```

---

## Inference Endpoints with Tier Validation

### 3. Chat Completion (Tier-Validated)

**Endpoint**: `POST /v1/chat/completions`

**Description**: Execute chat completion with automatic tier validation. Returns 403 error if user's tier is insufficient.

**Authentication**: Required (JWT bearer token)

**Required Scope**: `llm.inference`

#### Request Body

```json
{
  "model": "claude-3.5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Explain quantum computing in simple terms."
    }
  ],
  "max_tokens": 4096,
  "temperature": 0.7,
  "stream": false
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model ID to use |
| `messages` | array | Yes | Array of message objects |
| `messages[].role` | string | Yes | Message role (system, user, assistant) |
| `messages[].content` | string | Yes | Message content |
| `max_tokens` | integer | No | Maximum tokens to generate (default: 4096) |
| `temperature` | number | No | Sampling temperature 0-2 (default: 0.7) |
| `stream` | boolean | No | Enable streaming (default: false) |
| `top_p` | number | No | Nucleus sampling parameter |
| `presence_penalty` | number | No | Presence penalty -2 to 2 |
| `frequency_penalty` | number | No | Frequency penalty -2 to 2 |

#### Success Response

**Status Code**: `200 OK`

```json
{
  "id": "chatcmpl-9a8f7e6d5c4b3a2",
  "object": "chat.completion",
  "created": 1730908800,
  "model": "claude-3.5-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing is a revolutionary approach to computation..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

#### Tier Restriction Error

**Status Code**: `403 Forbidden`

```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires Pro tier or higher",
  "details": {
    "model_id": "claude-3.5-sonnet",
    "user_tier": "free",
    "required_tier": "pro",
    "upgrade_url": "/subscriptions/upgrade"
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

---

### 4. Text Completion (Tier-Validated)

**Endpoint**: `POST /v1/completions`

**Description**: Execute text completion with automatic tier validation. Returns 403 error if user's tier is insufficient.

**Authentication**: Required (JWT bearer token)

**Required Scope**: `llm.inference`

#### Request Body

```json
{
  "model": "gpt-5",
  "prompt": "Once upon a time in a distant galaxy",
  "max_tokens": 2048,
  "temperature": 0.8,
  "stream": false
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model ID to use |
| `prompt` | string | Yes | Text prompt for completion |
| `max_tokens` | integer | No | Maximum tokens to generate (default: 4096) |
| `temperature` | number | No | Sampling temperature 0-2 (default: 0.7) |
| `stream` | boolean | No | Enable streaming (default: false) |
| `top_p` | number | No | Nucleus sampling parameter |
| `stop` | array | No | Stop sequences |

#### Success Response

**Status Code**: `200 OK`

```json
{
  "id": "cmpl-9a8f7e6d5c4b3a2",
  "object": "text_completion",
  "created": 1730908800,
  "model": "gpt-5",
  "choices": [
    {
      "text": ", a brave explorer discovered a hidden civilization...",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 120,
    "total_tokens": 128
  }
}
```

#### Tier Restriction Error

**Status Code**: `403 Forbidden`

```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires Enterprise tier or higher",
  "details": {
    "model_id": "gpt-5",
    "user_tier": "pro",
    "required_tier": "enterprise",
    "upgrade_url": "/subscriptions/upgrade"
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "status": "error",
  "code": "error_code",
  "message": "Human-readable error message",
  "details": {},
  "timestamp": "2025-11-08T12:00:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `model_access_restricted` | 403 | User's tier insufficient for model |
| `resource_not_found` | 404 | Model not found |
| `validation_error` | 400 | Request validation failed |
| `unauthorized` | 401 | Missing or invalid authentication |
| `insufficient_credits` | 402 | User has insufficient credits |
| `service_unavailable` | 503 | Model provider not configured |

### Tier Restriction Modes

#### Minimum Mode (Hierarchical)

User tier must be greater than or equal to required tier.

**Tier Hierarchy**: `free < pro < enterprise`

**Example**:
- Model requires: `pro`
- Free user: **DENIED** (Requires Pro tier or higher)
- Pro user: **ALLOWED**
- Enterprise user: **ALLOWED**

#### Exact Mode

User tier must exactly match required tier.

**Example**:
- Model requires: `pro` (exact)
- Free user: **DENIED** (Only available for Pro tier)
- Pro user: **ALLOWED**
- Enterprise user: **DENIED** (Only available for Pro tier)

#### Whitelist Mode

User tier must be in the allowed tiers list.

**Example**:
- Model allows: `["free", "enterprise"]`
- Free user: **ALLOWED**
- Pro user: **DENIED** (Available for: Free, Enterprise)
- Enterprise user: **ALLOWED**

---

## Authentication

All endpoints require JWT bearer token authentication.

### Request Header

```
Authorization: Bearer <jwt_token>
```

### Token Claims

The JWT token must include:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "scope": "models.read llm.inference",
  "aud": "https://api.rephlo.com",
  "iss": "https://auth.rephlo.com",
  "iat": 1730908800,
  "exp": 1730995200
}
```

### Required Scopes

| Endpoint | Required Scope |
|----------|----------------|
| `GET /v1/models` | `models.read` |
| `GET /v1/models/:modelId` | `models.read` |
| `POST /v1/chat/completions` | `llm.inference` |
| `POST /v1/completions` | `llm.inference` |

---

## Rate Limiting

All endpoints are subject to rate limiting based on subscription tier:

| Tier | Rate Limit |
|------|------------|
| Free | 10 requests/minute |
| Pro | 100 requests/minute |
| Enterprise | 1000 requests/minute |

**Rate Limit Headers**:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1730909400
```

---

## Examples

### Example 1: Check Model Access (Free User)

**Request**:

```bash
curl -X GET "https://api.rephlo.com/v1/models/gpt-5" \
  -H "Authorization: Bearer <free_user_token>"
```

**Response**:

```json
{
  "id": "gpt-5",
  "name": "gpt-5",
  "display_name": "GPT-5",
  "provider": "openai",
  "required_tier": "enterprise",
  "tier_restriction_mode": "minimum",
  "allowed_tiers": ["enterprise"],
  "access_status": "upgrade_required",
  "upgrade_info": {
    "required_tier": "enterprise",
    "upgrade_url": "/subscriptions/upgrade"
  }
}
```

### Example 2: Attempt Inference with Insufficient Tier

**Request**:

```bash
curl -X POST "https://api.rephlo.com/v1/chat/completions" \
  -H "Authorization: Bearer <free_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Response**:

```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires Enterprise tier or higher",
  "details": {
    "model_id": "gpt-5",
    "user_tier": "free",
    "required_tier": "enterprise",
    "upgrade_url": "/subscriptions/upgrade"
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

### Example 3: Successful Inference (Pro User)

**Request**:

```bash
curl -X POST "https://api.rephlo.com/v1/chat/completions" \
  -H "Authorization: Bearer <pro_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [
      {"role": "user", "content": "Write a Python function to calculate fibonacci"}
    ],
    "max_tokens": 2048
  }'
```

**Response**:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1730908800,
  "model": "claude-3.5-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's a Python function to calculate Fibonacci numbers:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 45,
    "total_tokens": 57
  }
}
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-08 | 1.0 | Initial API documentation for tier access control |

---

**Last Updated**: 2025-11-08
**Status**: Production Ready
**Maintainer**: Backend API Team
