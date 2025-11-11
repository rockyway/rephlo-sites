# Deployment Guide: Three-Tier Architecture

**Document Number**: 005
**Created**: 2025-11-08
**Status**: Implementation & Deployment Guide
**Audience**: DevOps, Backend Engineers
**Scope**: Local Development, Staging, and Production Deployment

---

## Executive Summary

This guide covers deploying the three-tier architecture consisting of:
1. **Identity Provider** (Port 7151)
2. **Resource API** (Port 7150)
3. **Shared Infrastructure** (PostgreSQL, Redis)

Each service can be deployed independently, scaled separately, and monitored individually.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│          Desktop App / Web Client        │
│  (OAuth Client - Port 8080 for callback) │
└──────────┬────────────────────┬──────────┘
           │                    │
        OAuth 2.0            API Calls
        (Login)              (with tokens)
           │                    │
    ┌──────▼──────────┐  ┌──────▼────────────┐
    │ Identity        │  │ Resource API      │
    │ Provider        │  │ (Port 7150)       │
    │ (Port 7151)     │  │                   │
    │                 │  │ • Business Logic  │
    │ • Auth          │  │ • LLM Inference   │
    │ • Tokens        │  │ • Credits/Usage   │
    │ • OIDC/OAuth    │  │ • Subscriptions   │
    └────────┬────────┘  └────────┬──────────┘
             │                    │
             └────────┬───────────┘
                      │
              Token Introspection
              (Validation)
                      │
         ┌────────────▼──────────┐
         │   Shared PostgreSQL   │
         │   (Shared Database)   │
         │                       │
         │ • Users               │
         │ • Tokens (OIDC models)│
         │ • API Data            │
         └───────────────────────┘
                      │
         ┌────────────▼──────────┐
         │    Shared Redis       │
         │    (Cache/Sessions)   │
         │                       │
         │ • Token Cache (JWKS)  │
         │ • Rate Limiting       │
         │ • Session Store       │
         └───────────────────────┘
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional, for containerization)

### Quick Start (5 minutes)

#### Step 1: Clone Both Services

```bash
# Clone or navigate to project root
cd rephlo-sites

# Both services should be in:
# - D:\sources\work\rephlo-sites\identity-provider
# - D:\sources\work\rephlo-sites\backend
```

#### Step 2: Install Dependencies

```bash
# Identity Provider
cd identity-provider
npm install

# Resource API
cd ../backend
npm install
```

#### Step 3: Setup Environment Files

**Identity Provider** (`.env`):
```env
NODE_ENV=development
PORT=7151
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/textassistant
REDIS_URL=redis://localhost:6379
OIDC_ISSUER=http://localhost:7151
OIDC_JWKS_PRIVATE_KEY=<generated-RSA-private-key>
OIDC_COOKIE_KEYS=["dev-key-1","dev-key-2"]
LOG_LEVEL=debug
```

**Resource API** (`.env`):
```env
NODE_ENV=development
PORT=7150
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/textassistant
REDIS_URL=redis://localhost:6379
IDENTITY_PROVIDER_URL=http://localhost:7151
LOG_LEVEL=debug
```

#### Step 4: Setup Database

```bash
# Run migrations for both services (shared database)
cd backend
npm run migrate:deploy

# Seed with test data (optional)
npm run seed
```

#### Step 5: Start Services

**Terminal 1 - Identity Provider**:
```bash
cd identity-provider
npm run dev
# Output: Server running on port 7151
```

**Terminal 2 - Resource API**:
```bash
cd backend
npm run dev
# Output: Server running on port 7150
```

#### Step 6: Verify Services

```bash
# Health check Identity Provider
curl http://localhost:7151/health

# Health check Resource API
curl http://localhost:7150/health

# OIDC Discovery
curl http://localhost:7151/.well-known/openid-configuration

# JWKS
curl http://localhost:7151/oauth/jwks
```

---

## Docker Compose Setup (Recommended for Local Dev)

### Option A: Using Provided docker-compose.yml

**Create**: `docker-compose.yml` in project root

```yaml
version: '3.8'

services:
  # PostgreSQL Database (Shared)
  postgres:
    image: postgres:15-alpine
    container_name: textassistant-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: textassistant
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache (Shared)
  redis:
    image: redis:7-alpine
    container_name: textassistant-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Identity Provider Service
  identity-provider:
    build:
      context: ./identity-provider
      dockerfile: Dockerfile
    container_name: textassistant-identity-provider
    environment:
      NODE_ENV: development
      PORT: 7151
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/textassistant
      REDIS_URL: redis://redis:6379
      OIDC_ISSUER: http://localhost:7151
      OIDC_JWKS_PRIVATE_KEY: ${OIDC_JWKS_PRIVATE_KEY}
      OIDC_COOKIE_KEYS: '["dev-key-1","dev-key-2"]'
      LOG_LEVEL: debug
    ports:
      - "7151:7151"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7151/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Resource API Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: textassistant-backend
    environment:
      NODE_ENV: development
      PORT: 7150
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/textassistant
      REDIS_URL: redis://redis:6379
      IDENTITY_PROVIDER_URL: http://identity-provider:7151
      LOG_LEVEL: debug
    ports:
      - "7150:7150"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      identity-provider:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7150/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  default:
    name: textassistant-network
```

#### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (WARNING: Deletes data)
docker-compose down -v
```

---

## Staging Deployment

### Environment Variables

**Identity Provider** (`.env.staging`):
```env
NODE_ENV=staging
PORT=7151
DATABASE_URL=postgresql://user:password@staging-db.internal:5432/textassistant
REDIS_URL=redis://staging-redis.internal:6379
OIDC_ISSUER=https://identity.staging.yourdomain.com
OIDC_JWKS_PRIVATE_KEY=<staging-rsa-key>
OIDC_COOKIE_KEYS=["staging-key-1","staging-key-2"]
LOG_LEVEL=info
```

**Resource API** (`.env.staging`):
```env
NODE_ENV=staging
PORT=7150
DATABASE_URL=postgresql://user:password@staging-db.internal:5432/textassistant
REDIS_URL=redis://staging-redis.internal:6379
IDENTITY_PROVIDER_URL=https://identity.staging.yourdomain.com
LOG_LEVEL=info
```

### Deployment Steps

1. **Build**: `npm run build` (both services)
2. **Test**: `npm run test` (both services)
3. **Deploy Identity Provider**:
   ```bash
   docker build -t textassistant-identity-provider:latest .
   docker run -d -p 7151:7151 \
     --env-file .env.staging \
     --name identity-provider \
     textassistant-identity-provider:latest
   ```
4. **Deploy Resource API**:
   ```bash
   docker build -t textassistant-backend:latest .
   docker run -d -p 7150:7150 \
     --env-file .env.staging \
     --name backend \
     textassistant-backend:latest
   ```
5. **Verify**: Health checks and smoke tests

---

## Production Deployment

### High Availability Setup

```
Load Balancer (nginx/HAProxy)
    │
    ├─ Identity Provider Instance 1 (7151)
    ├─ Identity Provider Instance 2 (7151)
    ├─ Identity Provider Instance 3 (7151)
    │
    ├─ Resource API Instance 1 (7150)
    ├─ Resource API Instance 2 (7150)
    ├─ Resource API Instance 3 (7150)
    │
    └─ Shared Infrastructure
       ├─ PostgreSQL (Primary + Replication)
       ├─ Redis (Cluster or Sentinel)
       └─ Monitoring (Prometheus + Grafana)
```

### Environment Variables

**Identity Provider** (`.env.production`):
```env
NODE_ENV=production
PORT=7151
DATABASE_URL=postgresql://user:password@prod-db.internal:5432/textassistant
REDIS_URL=redis://prod-redis.internal:6379
OIDC_ISSUER=https://identity.yourdomain.com
OIDC_JWKS_PRIVATE_KEY=<production-rsa-key>
OIDC_COOKIE_KEYS=["prod-key-1","prod-key-2"]
LOG_LEVEL=warn
SENTRY_DSN=https://key@sentry.io/project
NEWRELIC_LICENSE_KEY=<license-key>
```

**Resource API** (`.env.production`):
```env
NODE_ENV=production
PORT=7150
DATABASE_URL=postgresql://user:password@prod-db.internal:5432/textassistant
REDIS_URL=redis://prod-redis.internal:6379
IDENTITY_PROVIDER_URL=https://identity.yourdomain.com
LOG_LEVEL=warn
SENTRY_DSN=https://key@sentry.io/project
NEWRELIC_LICENSE_KEY=<license-key>
```

### Kubernetes Deployment (Recommended for Production)

**Identity Provider Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-provider
spec:
  replicas: 3
  selector:
    matchLabels:
      app: identity-provider
  template:
    metadata:
      labels:
        app: identity-provider
    spec:
      containers:
      - name: identity-provider
        image: textassistant/identity-provider:latest
        ports:
        - containerPort: 7151
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 7151
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 7151
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Resource API Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: textassistant/backend:latest
        ports:
        - containerPort: 7150
        env:
        - name: IDENTITY_PROVIDER_URL
          value: http://identity-provider:7151
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 7150
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## Monitoring & Logging

### Health Check Endpoints

| Service | Endpoint | Response |
|---------|----------|----------|
| Identity Provider | `GET /health` | `{"status":"ok","service":"identity-provider"}` |
| Resource API | `GET /health` | `{"status":"ok","database":"connected"}` |

### Metrics to Monitor

**Identity Provider**:
- Authorization request rate
- Token exchange latency
- Token refresh rate
- JWKS cache hit rate
- Login success/failure ratio

**Resource API**:
- API request rate
- Token validation latency
- Introspection call rate
- Rate limit violations
- Database query performance

### Log Levels

- **development**: `debug` (verbose logging)
- **staging**: `info` (normal logging)
- **production**: `warn` (only warnings/errors)

---

## Database Migrations

### Running Migrations

```bash
# Both services share the same database
cd backend
npm run migrate:deploy

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create -- --name add_new_table
```

### Database Schema

The shared PostgreSQL database contains:

```
Tables:
├── users (user accounts and profiles)
├── oidc_models (Identity Provider - token state)
├── sessions (session management)
├── subscriptions (subscription data)
├── credits (user credits/usage)
├── webhooks (webhook configurations)
└── audit_log (audit trail)
```

---

## Backup & Recovery

### PostgreSQL Backup

```bash
# Full backup
pg_dump -h localhost -U postgres textassistant > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres textassistant < backup_20251108.sql
```

### Redis Backup

```bash
# Redis is primarily cache - not critical for recovery
# Configure persistence in Redis config if needed
```

---

## Troubleshooting

### Services Won't Start

1. **Check ports are available**:
   ```bash
   lsof -i :7150  # Resource API
   lsof -i :7151  # Identity Provider
   ```

2. **Check environment variables**:
   ```bash
   env | grep DATABASE_URL
   env | grep REDIS_URL
   ```

3. **Test database connection**:
   ```bash
   psql -h localhost -U postgres -d textassistant
   ```

### Token Validation Failures

1. **Verify Identity Provider running**:
   ```bash
   curl http://localhost:7151/health
   ```

2. **Check JWKS endpoint**:
   ```bash
   curl http://localhost:7151/oauth/jwks | jq .
   ```

3. **Verify IDENTITY_PROVIDER_URL in Resource API**:
   ```bash
   echo $IDENTITY_PROVIDER_URL
   ```

### Database Connection Issues

1. **Check PostgreSQL is running**:
   ```bash
   pg_isready -h localhost
   ```

2. **Verify credentials**:
   ```bash
   psql -h localhost -U postgres
   ```

3. **Check database exists**:
   ```bash
   psql -h localhost -U postgres -l | grep textassistant
   ```

---

## Performance Tuning

### Database

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tokens_user_id ON oidc_models(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);
```

### Redis

```bash
# Configure appropriate memory policy
CONFIG SET maxmemory-policy allkeys-lru
```

### Application

- Enable gzip compression
- Configure keep-alive connections
- Set appropriate connection pooling
- Enable CORS caching headers

---

## Rollback Plan

### Quick Rollback (Minutes)

```bash
# Stop current version
docker-compose down

# Start previous version
docker-compose up -d --build

# Or with Kubernetes
kubectl rollout undo deployment/identity-provider
kubectl rollout undo deployment/backend
```

### Full Rollback (Hours)

1. Restore database backup
2. Deploy previous service versions
3. Clear caches (Redis)
4. Re-run migrations if needed

---

## Compliance & Security

### Requirements

- TLS/HTTPS in production
- Database encryption at rest
- API key rotation
- OAuth client secret rotation
- Log retention policies
- GDPR compliance for user data

### Secrets Management

Use environment variable injection from secure vaults:
- **AWS**: AWS Secrets Manager
- **Azure**: Azure Key Vault
- **GCP**: Google Secret Manager
- **Self-hosted**: HashiCorp Vault

---

## References

- Architecture Design: `docs/plan/105-three-tier-architecture-redesign.md`
- Implementation Roadmap: `docs/plan/106-implementation-roadmap.md`
- API Specification: See each service's README.md

---

**Last Updated**: 2025-11-08
**Reviewed By**: Architecture Team
**Next Review**: 2025-12-08
