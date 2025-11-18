# Identity Provider Service

OAuth 2.0 / OpenID Connect Identity Provider extracted from the main Rephlo API.

## Overview

This is a standalone identity provider service that handles:
- User authentication (login)
- OAuth 2.0 authorization code flow with PKCE
- OpenID Connect (OIDC) token issuance
- User consent management
- Token introspection and revocation

## Architecture

The Identity Provider is part of a three-tier architecture:
- **Identity Provider** (Port 7151) - This service
- **Resource API** (Port 7150) - Main backend API
- **Desktop App** (Port 8080) - Client application

## Features

- OpenID Connect Core 1.0 compliance
- OAuth 2.0 authorization_code grant with PKCE (S256)
- RS256 JWT token signing
- PostgreSQL-backed token storage
- Custom login and consent pages
- Token introspection endpoint (RFC 7662)
- Token revocation endpoint (RFC 7009)

## Environment Variables

See `.env.example` for all available configuration options.

```env
NODE_ENV=development
PORT=7151

# Shared PostgreSQL database with main API
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rephlo-dev

# OIDC Configuration
OIDC_ISSUER=http://localhost:7151
OIDC_COOKIE_KEYS=["secret-1","secret-2"]
OIDC_JWKS_PRIVATE_KEY='{"kty":"RSA",...}'

# CORS
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:7150,http://localhost:7152

# MFA Enforcement (Optional)
# Set to 'false' to disable MFA enforcement during OAuth login
# Useful for development/testing when MFA verification UI is not yet implemented
# Default: true
MFA_ENFORCEMENT_ENABLED=false

# Token TTLs (Time To Live) - in seconds
# All token lifetimes are configurable
OIDC_TTL_ACCESS_TOKEN=3600          # 1 hour
OIDC_TTL_AUTHORIZATION_CODE=600     # 10 minutes
OIDC_TTL_ID_TOKEN=3600              # 1 hour
OIDC_TTL_REFRESH_TOKEN=5184000      # 60 days
OIDC_TTL_GRANT=5184000              # 60 days (must match or exceed refresh token)
OIDC_TTL_INTERACTION=3600           # 1 hour
OIDC_TTL_SESSION=86400              # 24 hours

# Logging
LOG_LEVEL=debug
LOG_DIR=logs
```

### MFA Configuration

The `MFA_ENFORCEMENT_ENABLED` environment variable controls whether MFA verification is required during OAuth login for users who have MFA enabled in the database.

- **`MFA_ENFORCEMENT_ENABLED=true`** (default): Users with `mfaEnabled=true` in the database will be blocked from logging in via OAuth until MFA verification is implemented.

- **`MFA_ENFORCEMENT_ENABLED=false`**: Users with MFA enabled can still login via OAuth without MFA verification. Useful for:
  - Development environments
  - Testing OAuth flows
  - Environments where MFA verification UI is not yet implemented
  - Admin access during testing

**Security Note:** In production environments, set `MFA_ENFORCEMENT_ENABLED=true` once MFA verification is properly implemented in the OAuth flow.

### TTL Configuration

All OAuth/OIDC token lifetimes are configurable via environment variables. Configure them in seconds:

| Environment Variable | Default | Duration | Purpose |
|---------------------|---------|----------|---------|
| `OIDC_TTL_ACCESS_TOKEN` | 3600 | 1 hour | Short-lived access tokens for API calls |
| `OIDC_TTL_AUTHORIZATION_CODE` | 600 | 10 minutes | Authorization code exchange window |
| `OIDC_TTL_ID_TOKEN` | 3600 | 1 hour | ID token lifetime (user identity claims) |
| `OIDC_TTL_REFRESH_TOKEN` | 5184000 | 60 days | Long-lived refresh tokens for desktop apps |
| `OIDC_TTL_GRANT` | 5184000 | 60 days | Authorization grant lifetime (must ≥ refresh token) |
| `OIDC_TTL_INTERACTION` | 3600 | 1 hour | Login/consent interaction window |
| `OIDC_TTL_SESSION` | 86400 | 24 hours | Browser session lifetime |

**Important Notes:**

1. **Grant TTL:** Must match or exceed `OIDC_TTL_REFRESH_TOKEN`. Refresh tokens reference grants, so the grant must exist for the entire refresh token lifetime.

2. **Refresh Token Independence:** When combined with the `offline_access` scope, refresh tokens work independently of browser sessions. This is critical for desktop applications that need long-term access without requiring frequent re-authentication.

3. **Access Token Lifetime:** Keep access tokens short-lived (1 hour recommended) for security. Desktop apps use refresh tokens to obtain new access tokens seamlessly in the background.

4. **Session vs Refresh Token:** Browser sessions (`OIDC_TTL_SESSION`) expire after 24 hours, but refresh tokens can be valid for 60 days. This allows desktop apps to maintain API access even after the browser session expires.

**Example Configuration for Different Environments:**

```bash
# Development - Longer tokens for convenience
OIDC_TTL_ACCESS_TOKEN=7200          # 2 hours
OIDC_TTL_REFRESH_TOKEN=7776000      # 90 days
OIDC_TTL_GRANT=7776000              # 90 days

# Production - Balanced security and UX
OIDC_TTL_ACCESS_TOKEN=3600          # 1 hour
OIDC_TTL_REFRESH_TOKEN=5184000      # 60 days
OIDC_TTL_GRANT=5184000              # 60 days

# High Security - Shorter tokens
OIDC_TTL_ACCESS_TOKEN=1800          # 30 minutes
OIDC_TTL_REFRESH_TOKEN=2592000      # 30 days
OIDC_TTL_GRANT=2592000              # 30 days
```

## Installation

```bash
npm install
npm run prisma:generate
npm run build
```

## Development

```bash
# Start in development mode
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start
```

## API Endpoints

### OIDC Standard Endpoints

- `GET /.well-known/openid-configuration` - OIDC discovery
- `GET /oauth/jwks` - Public keys (JWKS)
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint
- `GET /oauth/userinfo` - User info endpoint
- `POST /oauth/introspect` - Token introspection
- `POST /oauth/revoke` - Token revocation

### Custom Interaction Endpoints

- `GET /interaction/:uid` - Login/consent page
- `POST /interaction/:uid/login` - Login form submission
- `POST /interaction/:uid/consent` - Consent form submission
- `GET /interaction/:uid/abort` - Abort interaction
- `GET /interaction/:uid/data` - Get interaction data (for client-side rendering)

### Health Check

- `GET /health` - Service health check

## Testing

### Test Health Check
```bash
curl http://localhost:7151/health
```

### Test OIDC Discovery
```bash
curl http://localhost:7151/.well-known/openid-configuration
```

### Test JWKS Endpoint
```bash
curl http://localhost:7151/oauth/jwks
```

### Test OAuth Flow

1. Start the identity provider:
   ```bash
   npm run dev
   ```

2. Navigate to authorization URL:
   ```
   http://localhost:7151/oauth/authorize?
     client_id=textassistant-desktop&
     redirect_uri=http://localhost:8080/callback&
     response_type=code&
     scope=openid+email+profile&
     code_challenge=E9Melhoa2owUednMg&
     code_challenge_method=S256&
     state=abc123
   ```

3. Login with test credentials (from seed data)

4. Exchange authorization code for tokens:
   ```bash
   curl -X POST http://localhost:7151/oauth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=<code>&redirect_uri=http://localhost:8080/callback&client_id=textassistant-desktop&code_verifier=<verifier>"
   ```

## Database Schema

The Identity Provider uses the same PostgreSQL database as the main API:

- `users` - User accounts
- `oauth_clients` - OAuth client configurations
- `oidc_models` - OIDC tokens, sessions, and grants

## Supported Scopes

- `openid` - Basic user identifier (required)
- `email` - Email address and verification status
- `profile` - Name, username, profile picture
- `llm.inference` - LLM inference permissions
- `models.read` - Model information access
- `user.info` - Account details
- `credits.read` - Credit balance and usage

## Token Claims

Access tokens include:
- `sub` - User ID (UUID)
- `email` - User email
- `name` - Full name
- `scope` - Granted scopes
- `client_id` - OAuth client ID
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp

## Security Features

- PKCE (S256) required for all clients
- Secure cookie sessions
- Helmet.js security headers
- CORS protection
- Rate limiting (via API)
- Token expiration and revocation

## Next Steps

See `docs/plan/106-implementation-roadmap.md` for:
- Phase 2: API Simplification (remove OIDC from main API)
- Phase 3: Integration Testing
- Phase 4: Desktop App Updates
