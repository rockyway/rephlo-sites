# Environment Variables Guide - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Backend Environment Variables](#backend-environment-variables)
4. [Database Configuration](#database-configuration)
5. [Security Considerations](#security-considerations)
6. [Environment-Specific Configurations](#environment-specific-configurations)
7. [Setting Variables in Different Platforms](#setting-variables-in-different-platforms)
8. [Secrets Management](#secrets-management)

---

## Overview

Environment variables allow you to configure your application without hardcoding sensitive information or environment-specific settings. This guide documents all required and optional environment variables for the Rephlo project.

**Important Principles:**

- **Never commit `.env` files to git** - Use `.env.example` instead
- **Use different values for different environments** (development, staging, production)
- **Rotate secrets periodically** (every 90 days recommended)
- **Use strong, randomly generated secrets** for production
- **Limit access to production environment variables** to authorized team members only

---

## Frontend Environment Variables

The frontend uses **Vite** for building, which requires all environment variables to be prefixed with `VITE_`.

### Required Variables

```bash
# Backend API Base URL
VITE_API_URL=https://api.rephlo.ai

# Application Branding
VITE_APP_NAME=Rephlo

# Application Tagline
VITE_APP_TAGLINE=Transform text. Keep your flow.
```

### Optional Variables

```bash
# Enable debug logging (development only)
VITE_DEBUG=false

# Analytics tracking ID (Google Analytics, Plausible, etc.)
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# Sentry DSN for frontend error tracking
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Feature flags
VITE_FEATURE_ADMIN_AUTH=false
VITE_FEATURE_DIAGNOSTICS=true
```

### Environment-Specific Values

**Development (.env.local):**
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Rephlo (Dev)
VITE_APP_TAGLINE=Transform text. Keep your flow.
VITE_DEBUG=true
```

**Production:**
```bash
VITE_API_URL=https://api.rephlo.ai
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
VITE_DEBUG=false
```

### File Structure

Create these files in `frontend/` directory:

**`.env.example`** (committed to git):
```bash
# Backend API URL
VITE_API_URL=http://localhost:3000

# Application branding
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
```

**`.env.local`** (not committed, for local development):
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Rephlo (Dev)
VITE_APP_TAGLINE=Transform text. Keep your flow.
```

**`.gitignore`** (ensure these are present):
```
.env
.env.local
.env.production
.env.development
```

---

## Backend Environment Variables

### Required Variables

```bash
# Server Configuration
PORT=3000                              # Port to listen on (or provided by hosting)
NODE_ENV=production                    # Environment: development | production | test

# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
# Format: postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require

# CORS Configuration
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai
# Comma-separated list of allowed origins (no spaces)

# Security
IP_HASH_SALT=<random-32-character-string>
# Generate with: openssl rand -base64 32
# Used for anonymizing IP addresses in download tracking

# Logging
LOG_LEVEL=info                         # debug | info | warn | error
```

### Optional Variables

```bash
# File Upload Configuration (for diagnostics)
MAX_FILE_SIZE=5242880                  # 5MB in bytes
UPLOAD_DIR=/tmp/uploads                # Temporary upload directory
ALLOWED_FILE_TYPES=.txt,.log,.json     # Comma-separated file extensions

# Rate Limiting (future implementation)
RATE_LIMIT_WINDOW_MS=900000            # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window

# Admin Authentication (future implementation)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>

# Error Tracking
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1          # Sample 10% of requests

# Email Notifications (future)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM=noreply@rephlo.ai

# Application Metadata
APP_VERSION=1.0.0
BUILD_ID=<git-commit-sha>
```

### Environment-Specific Values

**Development (.env):**
```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_dev
CORS_ORIGIN=http://localhost:5173,http://localhost:4173
IP_HASH_SALT=dev-salt-not-for-production-use
LOG_LEVEL=debug
```

**Production:**
```bash
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:secure-password@db-host:5432/rephlo_prod?sslmode=require
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai
IP_HASH_SALT=<securely-generated-random-string>
LOG_LEVEL=info
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Test (.env.test):**
```bash
PORT=3001
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_test
CORS_ORIGIN=*
IP_HASH_SALT=test-salt
LOG_LEVEL=warn
```

### File Structure

Create these files in `backend/` directory:

**`.env.example`** (committed to git):
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rephlo

# CORS
CORS_ORIGIN=http://localhost:5173

# Security
IP_HASH_SALT=generate-with-openssl-rand-base64-32

# Logging
LOG_LEVEL=info
```

**`.env`** (not committed, for local development):
```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_dev
CORS_ORIGIN=http://localhost:5173
IP_HASH_SALT=<your-local-salt>
LOG_LEVEL=debug
```

---

## Database Configuration

### Connection String Format

PostgreSQL connection strings follow this format:

```
postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]
```

**Components:**
- `user`: Database username
- `password`: Database password (URL-encoded if contains special characters)
- `host`: Database server hostname or IP
- `port`: Database port (default: 5432)
- `database`: Database name
- `parameters`: Optional query parameters (e.g., `sslmode=require`)

### Examples

**Local PostgreSQL:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_dev
```

**Neon (Serverless Postgres):**
```bash
DATABASE_URL=postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/rephlo?sslmode=require
```

**Supabase:**
```bash
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

**Render PostgreSQL:**
```bash
DATABASE_URL=postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/rephlo_db
```

**AWS RDS:**
```bash
DATABASE_URL=postgresql://admin:password@rephlo-db.xxxxx.us-east-1.rds.amazonaws.com:5432/rephlo
```

### SSL/TLS Configuration

**Always use SSL in production:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**SSL Modes:**
- `disable`: No SSL (local development only)
- `require`: Use SSL, don't verify certificate
- `verify-ca`: Use SSL, verify certificate authority
- `verify-full`: Use SSL, verify certificate and hostname

**Production recommendation:** `sslmode=require` (minimum)

### Connection Pooling

Most hosting platforms (Render, Heroku, Neon) handle connection pooling automatically.

**For self-hosted deployments:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?pool_timeout=10&pool_max_size=20
```

**Prisma connection pool configuration** (in `schema.prisma`):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Optional pool configuration
  relationMode = "prisma"
  poolTimeout  = 20
}
```

---

## Security Considerations

### 1. Generating Secure Secrets

**IP_HASH_SALT:**
```bash
openssl rand -base64 32
# Output: xK8vP2nQ7mR3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3m=
```

**Admin Password Hash (bcrypt):**
```bash
# Install bcrypt-cli
npm install -g bcrypt-cli

# Hash password
bcrypt-cli "your-secure-password"
# Output: $2b$10$xxxxx...
```

**Random API Keys:**
```bash
# Generate random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Password Requirements

For any passwords in environment variables:
- **Minimum 16 characters** for production
- **Mix of uppercase, lowercase, numbers, symbols**
- **Never reuse passwords** across environments
- **Store in secure vaults** (not in files)

### 3. Encoding Special Characters

If database passwords contain special characters, URL-encode them:

```bash
# Example: Password is "p@ssw0rd!"
# Encoded:  "p%40ssw0rd%21"

DATABASE_URL=postgresql://user:p%40ssw0rd%21@host:5432/database
```

**Common URL encodings:**
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `&` → `%26`
- `=` → `%3D`

### 4. Environment Variable Validation

Add validation in your backend code:

```typescript
// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().regex(/^\d+$/),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string(),
  IP_HASH_SALT: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
});

export const env = envSchema.parse(process.env);
```

---

## Environment-Specific Configurations

### Development Environment

**Purpose:** Local development on developer machines

```bash
# Frontend (.env.local)
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true

# Backend (.env)
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_dev
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

**Characteristics:**
- Debug logging enabled
- Local database
- Permissive CORS
- No SSL required
- Fast iteration

### Staging/Preview Environment

**Purpose:** Testing before production deployment

```bash
# Frontend
VITE_API_URL=https://api-staging.rephlo.ai
VITE_DEBUG=false

# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:password@staging-db:5432/rephlo_staging?sslmode=require
CORS_ORIGIN=https://staging.rephlo.ai
LOG_LEVEL=info
```

**Characteristics:**
- Production-like configuration
- Separate database
- SSL enabled
- Info-level logging
- Closer to production

### Production Environment

**Purpose:** Live user-facing application

```bash
# Frontend
VITE_API_URL=https://api.rephlo.ai
VITE_DEBUG=false
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:secure-password@prod-db:5432/rephlo_prod?sslmode=require
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai
IP_HASH_SALT=<secure-random-string>
LOG_LEVEL=info
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Characteristics:**
- Strict security
- Production database
- Error tracking enabled
- Info/warn logging only
- Performance optimized

---

## Setting Variables in Different Platforms

### Vercel (Frontend)

**Via Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environment scope: Production, Preview, Development
4. Click "Save"

**Via CLI:**
```bash
vercel env add VITE_API_URL production
# Enter value when prompted: https://api.rephlo.ai

vercel env add VITE_APP_NAME production
# Enter value: Rephlo
```

**Via `vercel.json`** (not recommended for secrets):
```json
{
  "env": {
    "VITE_APP_NAME": "Rephlo"
  }
}
```

### Render (Backend)

**Via Dashboard:**
1. Go to Service → Environment
2. Click "Add Environment Variable"
3. Enter key-value pairs
4. Click "Save Changes"
5. Service automatically redeploys

**Via `render.yaml`:**
```yaml
services:
  - type: web
    name: rephlo-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: LOG_LEVEL
        value: info
      - key: DATABASE_URL
        fromDatabase:
          name: rephlo-db
          property: connectionString
      - key: IP_HASH_SALT
        generateValue: true  # Auto-generate secret
```

### Heroku

**Via CLI:**
```bash
heroku config:set NODE_ENV=production -a rephlo-api
heroku config:set DATABASE_URL=postgresql://... -a rephlo-api
heroku config:set CORS_ORIGIN=https://rephlo.ai -a rephlo-api

# View all config vars
heroku config -a rephlo-api
```

**Via Dashboard:**
1. Go to App → Settings
2. Click "Reveal Config Vars"
3. Add key-value pairs
4. Changes apply immediately

### Railway

**Via Dashboard:**
1. Click on service → Variables
2. Add variables in left panel
3. Variables auto-injected on deploy

**Via CLI:**
```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://...
```

### Docker / Docker Compose

**Via `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  backend:
    image: rephlo-api:latest
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}  # From host .env
      CORS_ORIGIN: https://rephlo.ai
      IP_HASH_SALT: ${IP_HASH_SALT}  # From host .env
    env_file:
      - .env.production  # Load from file
    ports:
      - "3000:3000"

  frontend:
    image: rephlo-frontend:latest
    environment:
      VITE_API_URL: https://api.rephlo.ai
      VITE_APP_NAME: Rephlo
```

**Via `docker run`:**
```bash
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e CORS_ORIGIN=https://rephlo.ai \
  -p 3000:3000 \
  rephlo-api:latest
```

**Via `.env` file:**
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://rephlo.ai

# Load with docker-compose
docker-compose --env-file .env.production up
```

### GitHub Actions (CI/CD)

**Via Repository Secrets:**
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add secrets: `DATABASE_URL`, `IP_HASH_SALT`, etc.

**In workflow file:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      IP_HASH_SALT: ${{ secrets.IP_HASH_SALT }}
    steps:
      - name: Deploy
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel deploy --prod
```

---

## Secrets Management

### Best Practices

1. **Never commit secrets to git**
   - Use `.env.example` with placeholder values
   - Add `.env*` to `.gitignore`

2. **Use secure vaults for production secrets**
   - AWS Secrets Manager
   - HashiCorp Vault
   - 1Password Teams
   - Doppler
   - Azure Key Vault

3. **Rotate secrets regularly**
   - Database passwords: every 90 days
   - API keys: every 180 days
   - Hash salts: annually

4. **Limit access**
   - Only senior developers get production access
   - Use role-based access control
   - Audit secret access logs

5. **Different secrets per environment**
   - Never reuse production secrets in development
   - Use weak/test secrets in development
   - Strong secrets only in production

### Using Doppler (Recommended)

**Install Doppler:**
```bash
# Install CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Login
doppler login
```

**Set up project:**
```bash
# Initialize in backend directory
cd backend
doppler setup

# Add secrets
doppler secrets set DATABASE_URL postgresql://...
doppler secrets set IP_HASH_SALT $(openssl rand -base64 32)

# Run app with Doppler
doppler run -- npm run start
```

**Deploy with Doppler:**
```bash
# Render integration
doppler integrate render

# Vercel integration
doppler integrate vercel
```

### Using AWS Secrets Manager

**Store secret:**
```bash
aws secretsmanager create-secret \
  --name rephlo/production/database-url \
  --secret-string "postgresql://..."
```

**Retrieve in application:**
```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });
const response = await client.getSecretValue({ SecretId: 'rephlo/production/database-url' });
const DATABASE_URL = response.SecretString;
```

---

## Troubleshooting

### Issue: Environment variables not loading

**Symptoms:**
- App crashes with "DATABASE_URL is not defined"
- Variables showing as `undefined`

**Solutions:**
1. **Check file naming:**
   - Vite requires `VITE_` prefix for frontend
   - Create `.env.local` for local overrides

2. **Restart dev server:**
   ```bash
   # Frontend
   npm run dev  # Restart to pick up changes

   # Backend
   npm run dev  # Restart to reload .env
   ```

3. **Check `.env` file location:**
   - Frontend: `.env` should be in `frontend/` directory
   - Backend: `.env` should be in `backend/` directory

4. **Verify no syntax errors:**
   ```bash
   # No spaces around =
   CORRECT: DATABASE_URL=postgresql://...
   WRONG:   DATABASE_URL = postgresql://...

   # No quotes needed (unless value contains spaces)
   CORRECT: NODE_ENV=production
   WRONG:   NODE_ENV="production"
   ```

### Issue: CORS errors despite setting CORS_ORIGIN

**Check:**
1. No trailing slashes in URLs
2. Include `http://` or `https://`
3. Multiple origins separated by commas (no spaces)

```bash
# Correct
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai

# Wrong
CORS_ORIGIN=https://rephlo.ai, https://www.rephlo.ai
```

### Issue: Database connection fails

**Check:**
1. URL encoding for special characters in password
2. SSL mode required: `?sslmode=require`
3. Firewall allows connection from your IP/platform
4. Database is running and accessible

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## Quick Reference

### Generate Secrets

```bash
# 32-character salt
openssl rand -base64 32

# 64-character API key
openssl rand -hex 32

# UUID
uuidgen

# bcrypt password hash
npx bcrypt-cli "password" 10
```

### Validate Environment

```bash
# Frontend
cd frontend
npm run build  # Should succeed

# Backend
cd backend
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'OK' : 'MISSING')"
```

---

**Next Steps:**
- Configure environment variables in your hosting platforms
- Store production secrets in secure vault
- Test all environments (dev, staging, production)
- Document any custom variables added for your team

---

**Document Status:** Production Ready
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly
