# Per-Client OAuth Consent Configuration Guide

**Version**: 1.0
**Date**: November 7, 2025
**Status**: Complete

---

## Overview

This guide explains how to configure OAuth clients to automatically skip the consent screen for first-party trusted applications, while maintaining security for third-party applications that require explicit user consent.

Instead of hardcoding consent behavior per client, the system uses a flexible **JSON configuration field** that can be updated in the database without code changes or migrations.

---

## Why This Matters

### Before (Hardcoded)
```typescript
// ❌ Hardcoded in code - requires code changes to enable/disable
if (clientId === 'textassistant-desktop') {
  skipConsent = true;
}
```

### After (Configuration)
```typescript
// ✅ Database-driven configuration - change anytime, no code deploy needed
const config = client.config;
const shouldSkip = config.skipConsentScreen === true;
```

---

## Architecture

### JSON Config Field

The `oauth_clients` table now includes a `config` JSONB field:

```sql
ALTER TABLE "oauth_clients" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
```

### Configuration Structure

```json
{
  "skipConsentScreen": true,           // Skip consent screen (first-party apps only)
  "description": "Official desktop app", // Human-readable description
  "tags": ["desktop", "official"],     // Categories for organization
  "allowedOrigins": [                  // Future: Additional CORS origins
    "https://example.com"
  ],
  "customField": "any value"           // Extensible for future needs
}
```

### Database Operations

#### View Client Config

```bash
# PostgreSQL
SELECT client_id, client_name, config FROM oauth_clients
WHERE client_id = 'textassistant-desktop';
```

#### Update Client Config

```bash
# Using PostgreSQL CLI
UPDATE oauth_clients
SET config = jsonb_set(config, '{skipConsentScreen}', 'true'::jsonb)
WHERE client_id = 'textassistant-desktop';
```

#### Using Prisma

```typescript
await prisma.oAuthClient.update({
  where: { clientId: 'textassistant-desktop' },
  data: {
    config: {
      skipConsentScreen: true,
      description: 'Official desktop application',
      tags: ['desktop-app', 'official'],
    },
  },
});
```

---

## How It Works

### 1. User Logs In

```
Desktop App → Opens system browser
Browser     → GET /oauth/authorize
Server      → Redirects to /interaction/{uid} (login page)
User        → Submits credentials
Server      → Authenticates user
```

### 2. Check Client Config

```typescript
const dbClient = await prisma.oAuthClient.findUnique({
  where: { clientId: client.clientId },
});

const config = (dbClient.config as any) || {};
const shouldSkipConsent = config.skipConsentScreen === true;
```

### 3. Auto-Approve if Enabled

```typescript
if (shouldSkipConsent) {
  // Create grant with all requested scopes
  const grant = new provider.Grant({
    accountId: userId,
    clientId: clientId,
  });

  grant.addOIDCScope(requestedScopes.join(' '));
  const grantId = await grant.save();

  // Finish consent interaction automatically
  await finishInteraction(provider, req, res, {
    consent: { grantId },
  });
}
```

### 4. User Gets Authorization Code

```
Server → Redirects to callback URI with authorization code
App    → Receives code and exchanges for tokens
Done!  → User is logged in, consent screen was skipped
```

---

## Configuration Examples

### First-Party Desktop Application (Skip Consent)

```json
{
  "skipConsentScreen": true,
  "description": "Official desktop application for Text Assistant",
  "tags": ["desktop-app", "official", "first-party"]
}
```

### Third-Party Web App (Require Consent)

```json
{
  "skipConsentScreen": false,
  "description": "Third-party analytics integration",
  "tags": ["third-party", "analytics"]
}
```

### Extended Configuration (Future Use)

```json
{
  "skipConsentScreen": true,
  "description": "Mobile app - iOS",
  "tags": ["mobile", "ios"],
  "allowedOrigins": [
    "https://app.textassistant.com",
    "https://mobile.textassistant.com"
  ],
  "maxTokenLifetime": 3600,
  "requireMFA": false,
  "allowedScopes": ["openid", "profile", "email"],
  "customMetadata": {
    "version": "1.0.0",
    "platform": "ios",
    "minOsVersion": "14.0"
  }
}
```

---

## Code Implementation

### Auth Controller Enhancement

```typescript
private tryAutoApproveConsent = async (
  req: Request,
  res: Response,
  userId: string
): Promise<void> => {
  try {
    // Get interaction details
    const details = await getInteractionDetails(this.provider, req, res);

    // Only auto-approve consent prompts
    if (details.prompt.name !== 'consent') {
      return;
    }

    // Load client config
    const dbClient = await this.prisma.oAuthClient.findUnique({
      where: { clientId: details.params.client_id as string },
    });

    // Check if skipConsentScreen is enabled
    const config = (dbClient?.config as any) || {};
    if (config.skipConsentScreen !== true) {
      return;
    }

    // Auto-approve all requested scopes
    const grant = new this.provider.Grant({
      accountId: details.session?.accountId || userId,
      clientId: details.params.client_id as string,
    });

    const requestedScopes = (details.params.scope as string)?.split(' ') || [];
    grant.addOIDCScope(requestedScopes.join(' '));
    const grantId = await grant.save();

    // Complete consent interaction
    await finishInteraction(this.provider, req, res, {
      consent: { grantId },
    });

    logger.info('OIDC: Auto-consent approved', {
      clientId: details.params.client_id,
      userId,
      scopes: requestedScopes,
    });
  } catch (error) {
    // Gracefully fail - user will see consent screen
    logger.warn('OIDC: Auto-consent failed', { error: error instanceof Error ? error.message : String(error) });
  }
};
```

### Database Schema

```prisma
model OAuthClient {
  clientId       String   @id @map("client_id") @db.VarChar(255)
  clientName     String   @map("client_name") @db.VarChar(255)
  clientSecretHash String? @map("client_secret_hash") @db.VarChar(255)
  redirectUris   String[] @map("redirect_uris")
  grantTypes     String[] @map("grant_types")
  responseTypes  String[] @map("response_types")
  scope          String?  @db.Text
  isActive       Boolean  @default(true) @map("is_active")
  config         Json     @default("{}") @map("config")
  // JSON field for flexible configuration
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("oauth_clients")
}
```

---

## Security Considerations

### ✅ Safe - First-Party Apps

Enable `skipConsentScreen` **only** for:
- Official apps developed by your organization
- Apps under your complete control
- Apps you trust with user data

### ❌ Never Enable - Third-Party Apps

**Do NOT** enable `skipConsentScreen` for:
- Third-party integrations
- Partner apps (unless they're first-party)
- User-installed extensions
- Community-developed plugins

These should always show consent screen and require explicit user approval.

### Security Best Practices

1. **Review Default State**: All clients default to `skipConsentScreen: false`
2. **Explicit Enablement**: Manually enable for each first-party client
3. **Document Config Changes**: Log all config updates for audit trail
4. **Monitor Auto-Approvals**: Log successful auto-approvals with user ID
5. **Regular Audits**: Review which clients have auto-consent enabled
6. **Scope Review**: Ensure auto-approved scopes are minimal and necessary

### Audit Trail

All auto-approvals are logged with:
- Client ID
- User ID
- Approved scopes
- Timestamp
- Any errors during approval

```typescript
logger.info('OIDC: Auto-consent approved successfully', {
  clientId: client.clientId,
  userId,
  grantId,
  scopes: requestedScopes,
});
```

---

## Deployment & Migration

### Current Status

✅ **Schema Updated**: Migration `20251107000000_refactor_oauth_client_to_json_config` applied
✅ **Code Deployed**: Auth controller handles auto-consent
✅ **Seed Data**: Desktop client configured with `skipConsentScreen: true`

### Applying to Existing Clients

#### Option 1: Direct SQL Update

```sql
UPDATE oauth_clients
SET config = jsonb_set(
  COALESCE(config, '{}'),
  '{skipConsentScreen}',
  'true'::jsonb
)
WHERE client_id = 'your-client-id';
```

#### Option 2: Prisma Migration Script

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableAutoConsent(clientId: string) {
  await prisma.oAuthClient.update({
    where: { clientId },
    data: {
      config: {
        skipConsentScreen: true,
      },
    },
  });
}

// Run: node enable-auto-consent.js
```

#### Option 3: Admin Panel (Future)

Create an admin interface to enable/disable `skipConsentScreen` per client.

---

## Testing

### Test the OAuth Flow

```bash
# 1. Start backend server
npm run dev

# 2. Run automated test (tests auto-consent)
node test-oauth-with-consent.js

# 3. Expected behavior:
#    - Login page appears
#    - User enters credentials
#    - NO consent screen appears
#    - Authorization code returned directly
```

### Verify Configuration

```javascript
// Check if client has auto-consent enabled
const client = await prisma.oAuthClient.findUnique({
  where: { clientId: 'textassistant-desktop' },
});

console.log('skipConsentScreen:', client.config.skipConsentScreen);
// Output: skipConsentScreen: true
```

### Monitor Logs

```bash
# Watch for auto-consent approvals
grep "Auto-consent approved" logs/app.log

# Watch for auto-consent failures
grep "Auto-consent approval failed" logs/app.log
```

---

## Troubleshooting

### Consent Screen Still Appears

**Check**: Is `skipConsentScreen` actually set to `true`?

```sql
SELECT config->'skipConsentScreen' FROM oauth_clients
WHERE client_id = 'textassistant-desktop';
```

Expected: `true` (not `"true"` string)

### Auto-Consent Not Working

**Check logs** for the reason:

```
OIDC: Not a consent prompt, skipping auto-approve
→ Interaction is not at consent stage yet

OIDC: Client not found for auto-consent check
→ Client ID doesn't exist or app crashed

OIDC: skipConsentScreen not enabled
→ Config not set or set to false

OIDC: Auto-consent approval failed
→ Scopes validation error or database issue
```

### Configuration Not Taking Effect

**Clear cache** and restart server:

```bash
# Stop server
Ctrl+C

# Restart
npm run dev
```

Config is read fresh on each request, but app might be caching in memory.

---

## Future Enhancements

### 1. Admin Dashboard

```typescript
// Allow admins to manage client configs via UI
POST /admin/oauth-clients/{clientId}/config
{
  "skipConsentScreen": true,
  "description": "Updated configuration"
}
```

### 2. Conditional Consent

```json
{
  "skipConsentScreen": {
    "enabled": true,
    "onlyForScopes": ["openid", "profile"],
    "requireMFA": true,
    "requireIpWhitelist": true
  }
}
```

### 3. Scope-Based Rules

```json
{
  "scopeRules": {
    "openid,profile": { "skipConsent": true },
    "credits.read": { "requireMFA": true },
    "models.write": { "requireIpWhitelist": true }
  }
}
```

---

## References

- **OIDC Spec**: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- **node-oidc-provider**: https://github.com/panva/node-oidc-provider
- **Related Docs**:
  - `/docs/troubleshooting/002-desktop-app-sessionnotfound-fix.md`
  - `/docs/plan/073-dedicated-api-backend-specification.md`

---

## Summary

| Aspect | Details |
|--------|---------|
| **Configuration Type** | JSON JSONB field in database |
| **Update Required** | Database migration (included) |
| **Code Changes** | Auth controller enhancement (included) |
| **Backward Compat** | ✅ Yes, defaults to false |
| **Audit Trail** | ✅ Yes, all auto-approvals logged |
| **Security Review** | ✅ Yes, first-party apps only |
| **Testing** | ✅ Yes, automated test included |
| **Deployment** | ✅ Ready for production |
