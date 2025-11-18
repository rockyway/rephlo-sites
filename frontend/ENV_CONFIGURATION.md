# Environment Configuration Guide

This document explains how to manage environment-specific configurations for the Rephlo frontend application across different deployment environments (development, staging, production).

---

## Overview

The frontend uses Vite's environment variable system to manage configuration across different environments. All environment variables are prefixed with `VITE_` to be exposed to the client-side code.

### Key Environment Variables

| Variable | Description | Example (Dev) | Example (Prod) |
|----------|-------------|---------------|----------------|
| `VITE_API_URL` | Backend REST API base URL | `http://localhost:7150` | `https://api.yourdomain.com` |
| `VITE_APP_URL` | Frontend application URL (for OAuth callbacks) | `http://localhost:7152` | `https://yourdomain.com` |
| `VITE_IDP_URL` | Identity Provider (OAuth/OIDC) base URL | `http://localhost:7151` | `https://idp.yourdomain.com` |
| `VITE_NODE_ENV` | Environment identifier | `development` | `production` |
| `VITE_APP_NAME` | Application name | `Rephlo` | `Rephlo` |
| `VITE_APP_TAGLINE` | Application tagline | `Transform text. Keep your flow.` | `Transform text. Keep your flow.` |
| `VITE_GOOGLE_REDIRECT_URI` | Google OAuth callback URL | `http://localhost:7150/oauth/google/callback` | `https://api.yourdomain.com/oauth/google/callback` |

---

## Environment Files

### Development (`.env` or `.env.development`)
Default environment for local development.

```bash
# Copy the example file
cp .env.example .env

# Edit with your local configuration
nano .env
```

**Default values:**
- Frontend: `http://localhost:7152`
- Backend API: `http://localhost:7150`
- Identity Provider: `http://localhost:7151`

### Staging (`.env.staging`)
Configuration for staging/pre-production environment.

```bash
# Copy the staging example
cp .env.staging.example .env.staging

# Update URLs to match your staging infrastructure
nano .env.staging
```

**Example values:**
- Frontend: `https://staging.yourdomain.com`
- Backend API: `https://api-staging.yourdomain.com`
- Identity Provider: `https://idp-staging.yourdomain.com`

### Production (`.env.production`)
Configuration for production environment.

```bash
# Copy the production example
cp .env.production.example .env.production

# Update URLs to match your production infrastructure
nano .env.production
```

**Example values:**
- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`
- Identity Provider: `https://idp.yourdomain.com`

---

## Building for Different Environments

Vite automatically loads the appropriate `.env` file based on the build mode:

### Development Build
```bash
npm run dev
# Loads: .env.development (or .env)
```

### Staging Build
```bash
npm run build -- --mode staging
# Loads: .env.staging
```

### Production Build
```bash
npm run build
# or
npm run build -- --mode production
# Loads: .env.production
```

---

## How It Works

### 1. Environment Variable Loading

Vite automatically loads environment variables in this order (later files override earlier ones):

1. `.env` - Loaded in all cases
2. `.env.local` - Loaded in all cases, ignored by git
3. `.env.[mode]` - Loaded in specific mode (e.g., `.env.production`)
4. `.env.[mode].local` - Loaded in specific mode, ignored by git

### 2. Type Safety

Environment variables are typed in `src/vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_TAGLINE: string
  readonly VITE_APP_URL: string
  readonly VITE_IDP_URL: string
  readonly VITE_NODE_ENV: string
}
```

This provides TypeScript autocomplete and type checking when accessing environment variables.

### 3. Usage in Code

Environment variables are accessed via `import.meta.env`:

```typescript
// Example: oauth.ts
const IDP_URL = import.meta.env.VITE_IDP_URL || 'http://localhost:7151';
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:7152';

export const OAUTH_CONFIG = {
  clientId: 'web-app-test',
  redirectUri: `${APP_URL}/oauth/callback`,
  authorizationEndpoint: `${IDP_URL}/oauth/authorize`,
  // ...
};
```

**Important:** Always provide fallback values for development to ensure the app works even without a `.env` file.

---

## Files Updated

The following files now use environment variables instead of hardcoded URLs:

1. **`src/utils/oauth.ts`**
   - OAuth configuration endpoints
   - Redirect URIs

2. **`src/components/admin/layout/AdminHeader.tsx`**
   - Logout redirect URLs

3. **`src/components/auth/AdminRoute.tsx`**
   - Access denied logout redirect URLs

---

## Best Practices

### ✅ DO:
- Use environment variables for all URLs and environment-specific configuration
- Provide sensible fallback values for local development
- Keep `.env.example` files up-to-date with all required variables
- Document the purpose of each environment variable
- Use `.env.local` for local overrides (not committed to git)

### ❌ DON'T:
- Hardcode URLs or environment-specific values in source code
- Commit `.env.local`, `.env.production`, or `.env.staging` to git (add to `.gitignore`)
- Store secrets in environment variables (frontend env vars are exposed to the client)
- Use environment variables for non-sensitive configuration that should be in code

---

## Troubleshooting

### Environment variables not updating
1. Restart the dev server after changing `.env` files
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Verify the variable is prefixed with `VITE_`

### Wrong environment being used
1. Check which `.env` file is being loaded (check console logs)
2. Verify the build mode: `npm run build -- --mode staging`
3. Ensure `.env.[mode]` file exists and is properly formatted

### TypeScript errors
1. Update `src/vite-env.d.ts` with new environment variable types
2. Restart TypeScript server in your IDE

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build frontend (staging)
  run: |
    cd frontend
    cp .env.staging.example .env.staging
    # Update with actual staging URLs
    sed -i 's/yourdomain.com/your-actual-domain.com/g' .env.staging
    npm run build -- --mode staging

- name: Build frontend (production)
  run: |
    cd frontend
    cp .env.production.example .env.production
    # Update with actual production URLs
    sed -i 's/yourdomain.com/your-actual-domain.com/g' .env.production
    npm run build -- --mode production
```

### Environment Variables in CI/CD

For sensitive values, use CI/CD environment variables:

```yaml
env:
  VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
  VITE_IDP_URL: ${{ secrets.PRODUCTION_IDP_URL }}
  VITE_APP_URL: ${{ secrets.PRODUCTION_APP_URL }}
```

---

## Security Considerations

⚠️ **Important:** All `VITE_*` environment variables are **embedded into the client bundle** and are **publicly visible** in the browser.

### Safe to Include:
- API URLs (public endpoints)
- Application names and branding
- Feature flags (non-sensitive)
- Public OAuth client IDs

### NEVER Include:
- API keys or secrets
- Private keys
- Database credentials
- Admin passwords
- OAuth client secrets

For sensitive configuration, use backend environment variables instead.

---

## Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Project README](../README.md)
- [CLAUDE.md - Project Guidelines](../CLAUDE.md)
