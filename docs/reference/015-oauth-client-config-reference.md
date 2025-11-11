# OAuth Client Config - Quick Reference

## Configuration Field

**Table**: `oauth_clients`
**Column**: `config` (JSONB, default: `{}`)

## Enable Auto-Consent for a Client

### Using Prisma

```typescript
await prisma.oAuthClient.update({
  where: { clientId: 'textassistant-desktop' },
  data: {
    config: {
      skipConsentScreen: true,
    },
  },
});
```

### Using SQL

```sql
UPDATE oauth_clients
SET config = jsonb_set(
  COALESCE(config, '{}'),
  '{skipConsentScreen}',
  'true'::jsonb
)
WHERE client_id = 'textassistant-desktop';
```

## Check Current Config

```typescript
const client = await prisma.oAuthClient.findUnique({
  where: { clientId: 'textassistant-desktop' },
});

console.log(client.config);
// Output: { "skipConsentScreen": true }
```

## Full Config Example

```json
{
  "skipConsentScreen": true,
  "description": "Official desktop application",
  "tags": ["desktop-app", "official", "first-party"],
  "allowedOrigins": [
    "http://localhost:8080",
    "https://app.textassistant.com"
  ],
  "metadata": {
    "version": "1.0.0",
    "platform": "desktop",
    "supportedOs": ["windows", "macos", "linux"]
  }
}
```

## Config Fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `skipConsentScreen` | boolean | false | Skip consent screen, auto-approve scopes |
| `description` | string | - | Human-readable client description |
| `tags` | string[] | [] | Categorization tags |
| `allowedOrigins` | string[] | [] | Future: Additional CORS origins |
| Any other field | any | - | Extensible for future use |

## How It Works

1. **User logs in** → Credentials authenticated ✓
2. **Check interaction prompt** → Is it "consent"?
3. **Load client config** → From `oauth_clients.config`
4. **Check `skipConsentScreen`** → Is it `true`?
5. **If true**: Auto-approve all scopes, skip consent screen
6. **If false**: Show consent screen normally

## When to Use

### ✅ Enable (skipConsentScreen = true)

- Official first-party apps
- Apps you control completely
- Apps users expect to skip consent

### ❌ Never Enable

- Third-party integrations
- Partner apps (unless first-party)
- Any external app you don't fully control

## Audit Trail

All auto-approvals are logged:

```
OIDC: Auto-consent approved successfully
  clientId: "textassistant-desktop"
  userId: "550e8400-e29b-41d4-a716-446655440000"
  grantId: "550e8400-e29b-41d4-a716-446655440001"
  scopes: ["openid", "profile", "email"]
```

## Troubleshooting

### Config Not Applying

1. Restart backend server
2. Verify config in database:
   ```sql
   SELECT config FROM oauth_clients WHERE client_id = 'textassistant-desktop';
   ```
3. Check auth controller logs for "skipConsentScreen"

### Consent Screen Still Shows

1. Verify `skipConsentScreen` is `true` (not `"true"` string)
2. Check if interaction is at "consent" prompt
3. Look for "Auto-consent approval failed" in logs

## Related Files

- Implementation: `/backend/src/controllers/auth.controller.ts` (lines 408-516)
- Schema: `/backend/prisma/schema.prisma` (line 180)
- Migration: `/backend/prisma/migrations/20251107000000_refactor_oauth_client_to_json_config/`
- Seed: `/backend/prisma/seed.ts` (lines 25-41)

## Full Documentation

See: `/docs/guides/015-per-client-oauth-consent-configuration.md`
