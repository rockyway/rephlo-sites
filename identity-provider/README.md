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
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:7150

# Logging
LOG_LEVEL=debug
LOG_DIR=logs
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
