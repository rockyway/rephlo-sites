# Backend Deployment Guide - Rephlo API

**Document Version:** 1.0
**Last Updated:** November 2025
**Target Environment:** Production

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Deployment Options](#deployment-options)
6. [Health Checks](#health-checks)
7. [Monitoring Setup](#monitoring-setup)
8. [Rollback Procedure](#rollback-procedure)
9. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

Before deploying the backend, ensure you have:

- **Node.js 18+** installed locally
- **npm** or **yarn** package manager
- **Git** repository with backend code
- **PostgreSQL database** (managed service like Neon, Supabase, or AWS RDS)
- **Hosting account** (Render.com, Heroku, Railway, or Docker host)
- **Database connection string** ready
- **Frontend domain** for CORS configuration (e.g., `https://rephlo.ai`)

---

## Build Process

### Local Build Test

Before deploying, test the production build locally:

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm ci

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/
# Should contain compiled JavaScript files
```

**Build Output:**
- Creates production-ready JavaScript in `dist/` directory
- All TypeScript files compiled to JavaScript
- Source maps generated (optional)
- Dependencies installed

**Expected Build Time:** 10-20 seconds

**Build Success Indicators:**
- No TypeScript compilation errors
- `dist/` directory contains all compiled files
- Output shows successful compilation

---

## Environment Variables

### Required Environment Variables

Configure these environment variables in your hosting platform:

```bash
# Server Configuration
PORT=3000                              # Port to listen on (or assigned by host)
NODE_ENV=production                    # Environment mode

# Database
DATABASE_URL=postgresql://user:password@host:5432/rephlo_prod
# Format: postgresql://[user]:[password]@[host]:[port]/[database]

# CORS Configuration
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai
# Comma-separated list of allowed origins

# Logging
LOG_LEVEL=info                         # Logging verbosity (debug|info|warn|error)

# Security
IP_HASH_SALT=<random-32-character-string>
# Generate with: openssl rand -base64 32
# Used for anonymizing IP addresses in analytics

# Optional: File Upload (if implementing diagnostics)
MAX_FILE_SIZE=5242880                  # 5MB in bytes
UPLOAD_DIR=/tmp/uploads                # Temporary upload directory
```

### Generating Secrets

```bash
# Generate IP_HASH_SALT
openssl rand -base64 32

# Example output: xK8vP2nQ7mR3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3m=
```

### Setting Environment Variables

**Render.com:**
1. Go to Dashboard → Environment
2. Add each variable as key-value pair
3. Click "Save Changes"
4. Redeploy to apply

**Heroku:**
```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...
heroku config:set CORS_ORIGIN=https://rephlo.ai
heroku config:set IP_HASH_SALT=<your-secret>
```

**Docker:**
```bash
# Via docker run
docker run -e DATABASE_URL=postgresql://... \
           -e CORS_ORIGIN=https://rephlo.ai \
           -p 3000:3000 rephlo-api

# Via docker-compose (see docker-compose.yml section)
```

---

## Database Setup

### 1. Create Managed PostgreSQL Database

**Option A: Neon (Recommended - Free Tier Available)**
1. Go to [neon.tech](https://neon.tech)
2. Create account and new project
3. Name: `rephlo-production`
4. Copy connection string (format: `postgresql://...`)

**Option B: Supabase (Free Tier)**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Project Settings → Database
4. Copy "Connection string" (URI mode)

**Option C: Railway (Integrated Hosting + DB)**
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy connection string from variables

**Option D: AWS RDS (Production-grade)**
1. Create RDS PostgreSQL instance
2. Configure security group for access
3. Note connection details

**Option E: Render PostgreSQL (Integrated)**
1. Create PostgreSQL database in Render
2. Copy internal connection string
3. Link to backend service

### 2. Configure Database Connection

Set `DATABASE_URL` environment variable:

```bash
# Example connection strings:

# Neon
DATABASE_URL=postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/rephlo?sslmode=require

# Supabase
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Railway
DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:7654/railway

# Render
DATABASE_URL=postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/rephlo_db
```

**Important:** Always use SSL mode for production databases.

### 3. Run Database Migrations

After setting `DATABASE_URL`, apply Prisma migrations:

```bash
# From backend directory
cd backend

# Generate Prisma Client
npx prisma generate

# Apply all migrations to production database
npx prisma migrate deploy

# Verify tables created
npx prisma db pull  # Should show no changes

# Optional: Seed initial data
npx prisma db seed  # If seed script exists
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "rephlo", schema "public"

The following migrations have been applied:

migrations/
  └─ 20231103_initial_schema
  └─ 20231103_add_appversion

All migrations have been successfully applied.
```

### 4. Verify Database Setup

```bash
# Check database connectivity
npx prisma studio
# Should open browser showing database tables

# Or use psql
psql $DATABASE_URL -c "\dt"
# Should list: Download, Feedback, Diagnostic, AppVersion tables
```

---

## Deployment Options

### Option 1: Render.com (Recommended)

**Why Render:**
- Free tier available (75GB bandwidth/month)
- Integrated PostgreSQL database
- Automatic deployments from git
- Built-in SSL/HTTPS
- Simple environment variable management
- Fast cold starts

**Deployment Steps:**

1. **Create Web Service**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select repository: `rephlo-sites`

2. **Configure Service**
   ```
   Name: rephlo-api
   Region: Oregon (or closest to users)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```

3. **Set Environment Variables**
   - Click "Environment" tab
   - Add variables:
     ```
     NODE_ENV=production
     DATABASE_URL=<from Render PostgreSQL or external>
     CORS_ORIGIN=https://rephlo.ai
     LOG_LEVEL=info
     IP_HASH_SALT=<generate with: openssl rand -base64 32>
     ```

4. **Create PostgreSQL Database (Optional)**
   - In Render dashboard: "New +" → "PostgreSQL"
   - Name: `rephlo-db`
   - Copy internal connection string
   - Use as `DATABASE_URL` in web service

5. **Deploy**
   - Click "Create Web Service"
   - Render builds and deploys automatically
   - Wait 3-5 minutes for initial deployment
   - Render provides URL: `https://rephlo-api.onrender.com`

6. **Configure Custom Domain**
   - Go to Settings → Custom Domain
   - Add: `api.rephlo.ai`
   - Update DNS:
     ```
     Type: CNAME
     Name: api
     Value: rephlo-api.onrender.com
     ```
   - SSL auto-provisioned by Render

7. **Auto-Deployment**
   - Every push to `main` triggers automatic deployment
   - Render shows deployment logs in real-time
   - Failed builds don't deploy

**Render Pricing:**
- **Free tier:** 750 hours/month, sleeps after 15min inactivity
- **Starter ($7/month):** No sleep, 400GB bandwidth
- **Standard ($25/month):** Higher resources, 1TB bandwidth

---

### Option 2: Railway.app

**Deployment Steps:**

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose repository

2. **Configure Service**
   ```
   Root Directory: backend
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```

3. **Add PostgreSQL**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway provides `DATABASE_URL` automatically

4. **Set Environment Variables**
   - Click on backend service → Variables
   - Add variables (Railway auto-injects DATABASE_URL)

5. **Generate Domain**
   - Click "Settings" → "Generate Domain"
   - Railway provides: `rephlo-api.up.railway.app`
   - Or add custom domain: `api.rephlo.ai`

**Railway Pricing:**
- **Trial:** $5 free credit
- **Hobby ($5/month):** 500 hours, 100GB egress
- **Pro ($20/month):** Unlimited resources, 1TB egress

---

### Option 3: Heroku (Classic)

**Note:** Heroku eliminated free tier in 2022. Minimum cost: $7/month (Eco Dynos).

**Deployment Steps:**

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew install heroku/brew/heroku

   # Windows
   # Download installer from heroku.com

   # Linux
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd backend
   heroku create rephlo-api
   ```

4. **Add PostgreSQL Add-on**
   ```bash
   heroku addons:create heroku-postgresql:mini
   # Automatically sets DATABASE_URL
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://rephlo.ai
   heroku config:set LOG_LEVEL=info
   heroku config:set IP_HASH_SALT=$(openssl rand -base64 32)
   ```

6. **Create Procfile**

   Create `backend/Procfile`:
   ```
   web: npm run start
   release: npx prisma migrate deploy
   ```

7. **Deploy**
   ```bash
   # Add Heroku remote (if not auto-added)
   heroku git:remote -a rephlo-api

   # Deploy
   git subtree push --prefix backend heroku main

   # Or, if deploying from backend directory
   git push heroku main
   ```

8. **Run Migrations**
   ```bash
   heroku run npx prisma migrate deploy
   ```

9. **Custom Domain**
   ```bash
   heroku domains:add api.rephlo.ai
   # Follow DNS instructions
   ```

**Heroku Pricing:**
- **Eco ($5/month):** Sleeps after 30min inactivity
- **Basic ($7/month):** No sleep
- **Standard ($25/month):** Auto-scaling

---

### Option 4: Docker Containerization

**Use Case:** Deploy to any Docker host (AWS ECS, Google Cloud Run, DigitalOcean, etc.)

**1. Create Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
# Use Node.js 18 Alpine base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy compiled source code
COPY dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
```

**2. Create .dockerignore**

Create `backend/.dockerignore`:

```
node_modules
dist
npm-debug.log
.env
.env.local
.git
.gitignore
*.md
.vscode
.idea
coverage
.DS_Store
```

**3. Build Docker Image**

```bash
# Build locally first
cd backend
npm run build

# Build Docker image
docker build -t rephlo-api:latest .

# Test locally
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e CORS_ORIGIN=https://rephlo.ai \
  -e IP_HASH_SALT=<secret> \
  rephlo-api:latest

# Verify running
curl http://localhost:3000/health
```

**4. Push to Docker Registry**

```bash
# Tag for Docker Hub
docker tag rephlo-api:latest yourusername/rephlo-api:latest

# Login to Docker Hub
docker login

# Push
docker push yourusername/rephlo-api:latest
```

**5. Deploy to Cloud**

**AWS ECS (Elastic Container Service):**
```bash
# Create ECS task definition
# Deploy using AWS Console or CLI
aws ecs create-service --cluster rephlo --service-name api --task-definition rephlo-api
```

**Google Cloud Run:**
```bash
# Deploy directly from source
gcloud run deploy rephlo-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=postgresql://...,CORS_ORIGIN=https://rephlo.ai
```

**DigitalOcean App Platform:**
- Import from Docker Hub: `yourusername/rephlo-api:latest`
- Set environment variables in dashboard
- Deploy

---

### Option 5: DigitalOcean App Platform

**Deployment Steps:**

1. **Create App**
   - Go to DigitalOcean Apps
   - Click "Create App"
   - Connect GitHub repository

2. **Configure**
   ```
   Source Directory: backend
   Build Command: npm install && npm run build
   Run Command: npm run start
   HTTP Port: 3000
   ```

3. **Add PostgreSQL Database**
   - Add component → Database → PostgreSQL
   - Database auto-linked via `DATABASE_URL`

4. **Set Environment Variables**
   - Add in app settings

5. **Deploy**
   - DigitalOcean builds and deploys
   - Provides URL: `https://rephlo-api-xxxxx.ondigitalocean.app`

**DigitalOcean Pricing:**
- **Basic ($5/month):** 512MB RAM, 1 vCPU
- **Professional ($12/month):** 1GB RAM, 1 vCPU

---

## Health Checks

### Pre-Deployment Checks

Before deploying, verify:

```bash
# 1. Build succeeds
cd backend
npm run build

# 2. TypeScript compilation passes
npx tsc --noEmit

# 3. Database migrations apply cleanly
npx prisma migrate deploy --preview-feature

# 4. Server starts locally
npm run start
# Should show: "Server listening on port 3000"

# 5. Health endpoint responds
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# 6. API endpoints functional
curl http://localhost:3000/api/version
# Should return version info
```

### Post-Deployment Health Checks

After deployment, verify:

```bash
# 1. Server is running
curl -I https://api.rephlo.ai/health
# Should return: HTTP/2 200

# 2. Database connectivity
curl https://api.rephlo.ai/api/version
# Should return latest version info

# 3. CORS headers present
curl -I -H "Origin: https://rephlo.ai" https://api.rephlo.ai/api/version
# Should include: Access-Control-Allow-Origin: https://rephlo.ai

# 4. Endpoints respond in time
time curl https://api.rephlo.ai/api/version
# Should complete in < 300ms
```

### Automated Health Check Script

Create `backend/scripts/health-check.sh`:

```bash
#!/bin/bash

API_URL="${1:-https://api.rephlo.ai}"

echo "Running backend health checks against: $API_URL"

# Test 1: Health endpoint
if curl -f -s "$API_URL/health" | grep -q "ok"; then
  echo "✓ Health endpoint responding"
else
  echo "✗ Health endpoint failed"
  exit 1
fi

# Test 2: Version endpoint
if curl -f -s "$API_URL/api/version" > /dev/null; then
  echo "✓ Version endpoint responding"
else
  echo "✗ Version endpoint failed"
  exit 1
fi

# Test 3: CORS headers
CORS_HEADER=$(curl -s -I -H "Origin: https://rephlo.ai" "$API_URL/health" | grep -i "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
  echo "✓ CORS headers present"
else
  echo "✗ CORS headers missing"
  exit 1
fi

# Test 4: Response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_URL/api/version")
if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  echo "✓ Response time acceptable: ${RESPONSE_TIME}s"
else
  echo "⚠ Response time slow: ${RESPONSE_TIME}s"
fi

echo "All health checks passed!"
```

Usage:
```bash
chmod +x backend/scripts/health-check.sh
./backend/scripts/health-check.sh https://api.rephlo.ai
```

---

## Monitoring Setup

### 1. Application Logging

**Configure Log Levels:**

```bash
# Production: info level
LOG_LEVEL=info

# Development: debug level
LOG_LEVEL=debug

# Troubleshooting: verbose
LOG_LEVEL=debug
```

**View Logs:**

**Render:**
```bash
# Via dashboard: Logs tab shows real-time logs

# Via CLI
render logs -a rephlo-api
```

**Heroku:**
```bash
heroku logs --tail -a rephlo-api
```

**Docker:**
```bash
docker logs -f <container-id>
```

### 2. Error Tracking (Recommended)

**Sentry Integration:**

1. **Install Sentry**
   ```bash
   npm install @sentry/node
   ```

2. **Configure in server.ts**
   ```typescript
   import * as Sentry from "@sentry/node";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });

   // Add error handler middleware
   app.use(Sentry.Handlers.errorHandler());
   ```

3. **Set Environment Variable**
   ```bash
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

### 3. Performance Monitoring

**Render Built-in Metrics:**
- CPU usage
- Memory usage
- Request latency
- Error rates

**External APM (Optional):**
- **New Relic:** Application performance monitoring
- **DataDog:** Full observability platform
- **AppSignal:** Ruby/Node APM

### 4. Database Monitoring

**Neon/Supabase/Render:**
- Built-in metrics dashboard
- Query performance
- Connection pool usage

**Set up alerts:**
- High query latency (> 1 second)
- Connection pool exhausted
- Database storage > 80%

### 5. Uptime Monitoring

**External Services (Free Options):**

**UptimeRobot:**
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://api.rephlo.ai/health`
   - Interval: 5 minutes
3. Set alert contacts (email, Slack, etc.)

**StatusCake:**
1. Create account at [statuscake.com](https://statuscake.com)
2. Add uptime test
3. Configure alerts

**Pingdom:**
1. Set up at [pingdom.com](https://pingdom.com)
2. Monitor endpoint availability
3. Get downtime alerts

---

## Rollback Procedure

### Render Rollback

1. **Via Dashboard:**
   - Go to Deployments tab
   - Find last successful deployment
   - Click "Redeploy"
   - Rollback completes in ~2 minutes

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   # Render auto-deploys previous version
   ```

### Heroku Rollback

```bash
# Rollback to previous release
heroku rollback -a rephlo-api

# Or rollback to specific version
heroku releases -a rephlo-api
heroku rollback v123 -a rephlo-api
```

### Railway Rollback

1. Go to Deployments tab
2. Click on previous successful deployment
3. Click "Redeploy"

### Docker Rollback

```bash
# Deploy previous image version
docker pull yourusername/rephlo-api:v1.2.3
docker stop rephlo-api
docker rm rephlo-api
docker run -d --name rephlo-api \
  -e DATABASE_URL=... \
  -p 3000:3000 \
  yourusername/rephlo-api:v1.2.3
```

---

## Post-Deployment Verification

### Verification Checklist

- [ ] **API accessible** at production URL
- [ ] **Health endpoint returns 200** (`/health`)
- [ ] **Database connection working** (version endpoint returns data)
- [ ] **All endpoints functional** (test with curl/Postman)
- [ ] **CORS configured correctly** (frontend can call API)
- [ ] **Environment variables set** and loaded correctly
- [ ] **Logs showing** in monitoring dashboard
- [ ] **No errors** in application logs
- [ ] **Response times < 300ms** for simple endpoints
- [ ] **Database migrations applied** (all tables exist)
- [ ] **SSL certificate valid** (HTTPS working)
- [ ] **Custom domain configured** (if applicable)
- [ ] **Monitoring alerts** configured and active
- [ ] **Error tracking** active (Sentry, etc.)

### Post-Deployment Smoke Tests

```bash
#!/bin/bash
# smoke-test-backend.sh

API_URL="${1:-https://api.rephlo.ai}"

echo "Running backend smoke tests against: $API_URL"

# Test 1: Health check
curl -f "$API_URL/health" || exit 1

# Test 2: Version endpoint
curl -f "$API_URL/api/version" || exit 1

# Test 3: Track download (POST)
curl -f -X POST "$API_URL/api/track-download" \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}' || exit 1

# Test 4: Submit feedback (POST)
curl -f -X POST "$API_URL/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test feedback","email":"test@example.com"}' || exit 1

# Test 5: Admin metrics (GET)
curl -f "$API_URL/admin/metrics" || exit 1

echo "All smoke tests passed!"
```

---

## Troubleshooting

See `DEPLOYMENT_TROUBLESHOOTING.md` for detailed troubleshooting guide.

**Quick Fixes:**

**Issue: Database connection fails**
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# Check migrations applied
npx prisma migrate status
```

**Issue: Server won't start**
```bash
# Check logs
render logs -a rephlo-api  # Render
heroku logs --tail  # Heroku

# Common causes:
# - Missing environment variables
# - Port binding issue (use process.env.PORT)
# - Build failed
```

**Issue: CORS errors**
```bash
# Verify CORS_ORIGIN includes frontend URL
# Add to .env:
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai
```

---

## Additional Resources

- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Render Documentation](https://render.com/docs)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Next Steps:**
- After backend deployment, verify frontend can connect
- Set up monitoring and alerts
- Configure database backups
- Review security hardening (see `SECURITY_HARDENING.md`)

---

**Document Status:** Ready for Production
**Maintained By:** DevOps Team
**Review Frequency:** After major updates
