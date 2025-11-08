# OIDC Provider v9.5.2 JWT Token Configuration Analysis

**Status**: Complete Research | **Date**: 2025-11-08

## Executive Summary

The codebase **correctly implements JWT token generation** using Resource Indicators in oidc-provider v9.5.2.

**Key Finding**: oidc-provider v9.5.2 defaults to opaque tokens unless configured otherwise:
- Default: Opaque reference tokens (40-char stored in DB)
- To use JWT: Enable resourceIndicators and set accessTokenFormat: 'jwt'

## How Token Format is Determined

The internal has_format.js checks:
\
If no resourceServer → defaults to 'opaque'
If resourceServer.accessTokenFormat = 'jwt' → generates JWT

## Current Implementation (Correct)

Location: identity-provider/src/config/oidc.ts (Lines 98-117)

resourceIndicators: {
  enabled: true,
  async getResourceServerInfo() {
    return {
      accessTokenFormat: 'jwt',        // Forces JWT
      audience: 'https://api.textassistant.local',
      jwt: { sign: { alg: 'RS256' } }
    };
  }
}

Status: ✓ Correctly configured

## Opaque vs JWT Tokens

### Opaque Format
- Format: 40-char random string (e.g., D49okA6F7RsfNvvm6-80ouePdWhWTHpdMNI9kTty8uu)
- Storage: Database table (oidc_models)
- Validation: Requires introspection endpoint call
- Revocation: Immediate (delete from DB)

### JWT Format
- Format: 3 parts separated by dots (header.payload.signature)
- Storage: Stateless (no DB needed)
- Validation: JWKS public key + RS256 signature verification
- Revocation: Wait for expiration (no immediate revocation)

## Backend Validation

Location: backend/src/middleware/auth.middleware.ts

Strategy:
1. Try JWT verification first (verifyJWT function)
   - Check for 3 parts separated by dots
   - Fetch public key from JWKS
   - Verify RS256 signature
   - Check issuer/expiration

2. Fall back to introspection if JWT fails
   - POST to /oauth/introspect endpoint
   - Use introspection response
   
3. Reject if both fail (401 Unauthorized)

## Configuration Options

### Option 1: Resource Indicators (Current - Recommended)
resourceIndicators: {
  enabled: true,
  getResourceServerInfo() {
    return {
      accessTokenFormat: 'jwt',  // or 'opaque'
      audience: 'https://api.example.com'
    };
  }
}

### Option 2: Global Formats
formats: {
  AccessToken: 'jwt'  // All tokens as JWT
}

## Why Opaque Tokens Would Occur

Without resourceIndicators enabled:
1. OIDC provider generates token
2. Checks: token.resourceServer?.accessTokenFormat ?? 'opaque'
3. No resourceServer defined → defaults to 'opaque'
4. Generates 40-char reference token
5. Stores in oidc_models table
6. Application receives opaque token

## Comparison Table

| Aspect | Opaque | JWT |
|--------|--------|-----|
| Format | 40-char string | header.payload.signature |
| Storage | Database | Stateless |
| Validation | Introspection call | JWKS verification |
| Revocation | Immediate | Delayed (expiration) |
| Leakage | None (opaque) | Payload readable |
| Latency | High | Low |
| Scalability | Limited | Excellent |
| Default | YES | NO (opt-in) |

## Verification Status

Configuration: ✓ Correct
- resourceIndicators enabled
- accessTokenFormat: 'jwt' specified
- RS256 signing configured
- JWKS private key loaded

Backend Validation: ✓ Correct
- JWT format check (3 parts)
- Signature verification
- Introspection fallback

## Key Takeaways

1. oidc-provider defaults to opaque tokens
2. Current codebase correctly configured for JWT
3. Backend handles both JWT and opaque tokens
4. JWT is stateless and scalable
5. No changes required

## Related Files

- identity-provider/src/config/oidc.ts (Lines 98-117)
- backend/src/middleware/auth.middleware.ts (Token validation)
- identity-provider/src/adapters/oidc-adapter.ts (Token storage)
- work-log.md (Historical context)

## Conclusion

The codebase correctly implements JWT tokens via Resource Indicators. Configuration is complete and functional. No changes required.

