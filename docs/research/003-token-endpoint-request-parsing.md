# Token Endpoint Request Body Parsing & Resource Parameter Extraction

**Date**: 2025-11-08
**Status**: Analysis Complete
**Relevance**: Understanding why resource parameter handling is critical for JWT tokens

---

## Executive Summary

This document explains **how node-oidc-provider parses the token endpoint request body** and **where the resource parameter must be extracted** for JWT token generation.

**Key Finding**: The resource parameter sent in the token exchange request body (form-urlencoded) was not being extracted by OIDC provider's built-in param parsing. Manual extraction from `ctx.request.body` in the AccessToken.save middleware was required.


---

## How Request Body Flows Through the Stack

### 1. POC Client Sends (poc-client/src/server.ts:127-133)

Creates URLSearchParams with all required fields including resource parameter per RFC 8707.

### 2. Express Parsing (identity-provider/src/app.ts:38-39)

```typescript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

Form data is parsed into `req.body` object. The resource parameter is available here.

### 3. Koa Middleware Bridge (oidcProvider.callback())

node-oidc-provider wraps Express req/res with Koa:
- `ctx.request.body` = Parsed form data (includes resource parameter)
- `ctx.request.rawBody` = Original form string

### 4. OIDC Provider Token Handler

- Extracts known OAuth 2.0 parameters into `oidc.params`
- Standard params: grant_type, code, client_id, redirect_uri, code_verifier
- Does NOT auto-extract non-standard parameters like 'resource'
- `oidc.params.resource` = undefined

### 5. AccessToken.save Middleware (oidc.ts:315-385)

This middleware performs manual extraction:
1. Check `oidc.params.resource` (primary source)
2. Fallback to `oidc.ctx.request.body.resource` (manual extraction)
3. If resource found, call getResourceServerInfo() to get JWT configuration
4. Attach configuration to `this.resourceServer`
5. Call original save() - token is issued with JWT format


---

## Key Implementation Files

### identity-provider/src/config/oidc.ts (Lines 298-385)

**Line 298**: Configuration allows extra parameters
```
extraParams: ['code_challenge', 'code_challenge_method', 'resource']
```

**Lines 315-385**: AccessToken.save middleware with dual-source extraction:
- Line 320: `let resource = oidc?.params?.resource;`
- Line 323: `if (!resource && oidc?.ctx?.request?.body?.resource)`
- Line 324: `resource = oidc.ctx.request.body.resource;` (FALLBACK)

This ensures the resource parameter is found whether it comes via OIDC params or raw form body.

### identity-provider/src/app.ts (Lines 38-39, 64)

Body parsing middleware MUST come before OIDC provider middleware:
- Line 38-39: `app.use(express.json());` and `app.use(express.urlencoded())`
- Line 64: `app.use('/', oidcProvider.callback());`

### poc-client/src/server.ts (Lines 127-141)

Proper form encoding:
- Creates URLSearchParams object
- Uses `Content-Type: application/x-www-form-urlencoded` header
- Includes resource parameter in the form body


---

## Why Manual Extraction Was Necessary

The `extraParams` configuration only applies to the authorization endpoint, not the token endpoint. At the token endpoint:

1. OIDC provider extracts only standard OAuth 2.0 parameters
2. Non-standard parameters are ignored
3. But Express has already parsed the request body
4. We must manually check `ctx.request.body` for the resource parameter

This approach works because:
- Express parses the body BEFORE OIDC provider middleware runs
- The parsed body remains available in the Koa context
- We can safely check it in the AccessToken.save hook
- No need to modify OIDC provider internals

---

## Complete Request Flow

```
POC Client sends form-urlencoded request with resource parameter
  |
  v
Express parses form -> req.body.resource exists
  |
  v
Koa wraps request -> ctx.request.body.resource exists
  |
  v
OIDC Provider extracts standard params -> oidc.params.resource undefined
  |
  v
AccessToken.save middleware checks both sources
  - Primary: oidc.params.resource (not found)
  - Fallback: oidc.ctx.request.body.resource (FOUND)
  |
  v
getResourceServerInfo() called -> returns JWT configuration
  |
  v
Configuration attached to this.resourceServer
  |
  v
Original save() issues token in JWT format
  |
  v
Response contains JWT access token (eyJ...)
```

---

## Related Documentation

- `docs/troubleshooting/001-jwt-token-format-issue.md` - Full fix history and test procedures
- `identity-provider/src/config/oidc.ts` - Complete OIDC provider configuration
- `poc-client/src/server.ts` - POC client implementation
- RFC 8707 - Resource Indicators for OAuth 2.0

