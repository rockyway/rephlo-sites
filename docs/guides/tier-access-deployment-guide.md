# Model Tier Access Control - Deployment Guide

**Document Type**: Deployment Guide
**Target Audience**: DevOps Engineers, System Administrators
**Created**: 2025-11-08
**Last Updated**: 2025-11-08
**Feature Version**: v1.1.0

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Plan](#rollback-plan)
6. [Monitoring and Alerting](#monitoring-and-alerting)

---

## Overview

### What This Deployment Adds

This deployment introduces tier-based access control for LLM models, allowing you to restrict model access based on user subscription tiers (Free, Pro, Enterprise).

### Changes Included

**Database**:
- 3 new columns added to `models` table
- 2 new indexes for query optimization
- Default values ensure backward compatibility

**Backend**:
- Enhanced `/v1/models` endpoint with tier metadata
- Tier validation in `/v1/chat/completions` and `/v1/completions`
- New tier access utility functions
- Standardized 403 error responses

**Breaking Changes**: **NONE** - Fully backward compatible

### Estimated Downtime

- **Zero downtime** if following blue-green or rolling deployment
- **< 30 seconds** for single-server deployment (migration execution time)

---

## Pre-Deployment Checklist

### 1. Review Current System

#### Check Database Status

```bash
# Connect to database
psql -h your-db-host -U your-db-user -d rephlo-dev

# Verify current schema
\d models

# Check existing models
SELECT id, display_name, is_available FROM models;

# Exit psql
\q
```

**Expected Output**: `models` table exists with columns: id, name, displayName, provider, etc. (without tier fields)

---

#### Check Current Model Availability

```bash
# Test current /v1/models endpoint
curl -X GET "https://api.rephlo.com/v1/models" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN"
```

**Expected**: Returns model list without tier fields.

---

### 2. Review Tier Assignments

**File**: `backend/prisma/seed.ts`

Verify the tier assignments that will be applied:

```typescript
// Expected model tier assignments
{
  "gpt-5": {
    requiredTier: "enterprise",
    tierRestrictionMode: "minimum",
    allowedTiers: ["enterprise"]
  },
  "claude-3.5-sonnet": {
    requiredTier: "pro",
    tierRestrictionMode: "minimum",
    allowedTiers: ["pro", "enterprise"]
  },
  "gemini-2.0-pro": {
    requiredTier: "pro",
    tierRestrictionMode: "minimum",
    allowedTiers: ["pro", "enterprise"]
  }
}
```

**Action**: If you want different assignments, modify `backend/prisma/seed.ts` before deployment.

---

### 3. Prepare Test Users

Create test users with different subscription tiers:

```sql
-- Check if test users exist
SELECT
  u.email,
  s.tier,
  s.status
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email IN (
  'free@example.com',
  'pro@example.com',
  'enterprise@example.com'
);
```

**If test users don't exist**, create them:

```sql
-- Create free tier test user
INSERT INTO users (id, email, email_verified, password_hash, created_at, updated_at)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'free@example.com',
  true,
  '$2b$10$...', -- bcrypt hash of 'Password123!'
  NOW(),
  NOW()
);

INSERT INTO subscriptions (user_id, tier, status, credits_per_month, price_cents, billing_interval, current_period_start, current_period_end)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'free',
  'active',
  2000,
  0,
  'monthly',
  NOW(),
  NOW() + INTERVAL '30 days'
);

-- Repeat for pro@example.com and enterprise@example.com
```

---

### 4. Backup Database

**Critical**: Always backup before running migrations.

```bash
# PostgreSQL backup
pg_dump -h your-db-host -U your-db-user -d rephlo-dev \
  -F c -f backup_before_tier_migration_$(date +%Y%m%d_%H%M%S).dump

# Verify backup file exists
ls -lh backup_before_tier_migration_*.dump
```

**Expected**: Backup file created with size > 0 bytes.

**Store backup securely** (S3, backup server, etc.)

---

### 5. Document Current State

```bash
# Export current model configuration
psql -h your-db-host -U your-db-user -d rephlo-dev -c \
  "COPY (SELECT id, display_name, is_available, credits_per_1k_tokens FROM models) TO STDOUT WITH CSV HEADER" \
  > models_before_migration_$(date +%Y%m%d).csv
```

**Store this file** - needed for rollback verification.

---

## Deployment Steps

### Step 1: Stop Backend Services (Optional)

**For zero-downtime deployment**: Skip this step if using blue-green or rolling deployment.

**For single-server deployment**:

```bash
# Using systemd
sudo systemctl stop rephlo-backend

# Verify stopped
sudo systemctl status rephlo-backend

# Using PM2
pm2 stop rephlo-backend

# Verify stopped
pm2 status
```

---

### Step 2: Pull Latest Code

```bash
cd /path/to/rephlo-sites

# Fetch latest changes
git fetch origin

# Switch to deployment branch
git checkout feature/dedicated-api

# Pull latest commits
git pull origin feature/dedicated-api

# Verify correct commit
git log -1 --oneline
# Expected: "feat(database): Add tier-based access control to Model schema"
```

---

### Step 3: Install Dependencies

```bash
cd backend

# Install dependencies
npm install

# Verify Prisma CLI is available
npx prisma --version
```

---

### Step 4: Run Database Migration

**This is the critical step**. The migration adds tier fields to the `models` table.

```bash
cd backend

# Run migration
npx prisma migrate deploy

# Expected output:
# "1 migration found in prisma/migrations
# The following migration was applied:
# migrations/
#   └─ 20251108000000_add_model_tier_access_control/
#       └─ migration.sql
# Database is now in sync with schema."
```

**If migration fails**, see [Rollback Plan](#rollback-plan).

---

### Step 5: Verify Migration Success

```bash
# Connect to database
psql -h your-db-host -U your-db-user -d rephlo-dev

# Check new columns exist
\d models

# Should show:
# required_tier              | subscription_tier | not null | default 'free'
# tier_restriction_mode      | varchar(20)       | not null | default 'minimum'
# allowed_tiers              | subscription_tier[] | not null | default ARRAY['free','pro','enterprise']

# Check indexes
\di models_*

# Should include:
# models_required_tier_idx
# models_is_available_required_tier_idx

# Exit
\q
```

---

### Step 6: Update Seed Data (Optional)

**Only run if**:
- You're deploying to a fresh database, OR
- You want to reset model tier assignments

```bash
cd backend

# Run seed script
npx prisma db seed

# Expected output:
# "Seeding database...
# Created/updated 3 models
# Seeding completed successfully"
```

**Warning**: This will **overwrite** existing model records. Skip if you have production data.

---

### Step 7: Build Backend

```bash
cd backend

# TypeScript compilation
npm run build

# Expected output:
# "Successfully compiled X files"

# Verify build output
ls -la dist/
```

---

### Step 8: Restart Backend Services

```bash
# Using systemd
sudo systemctl start rephlo-backend
sudo systemctl status rephlo-backend

# Using PM2
pm2 restart rephlo-backend
pm2 status

# Using npm (development)
npm run dev
```

**Verify startup logs**:

```bash
# systemd logs
sudo journalctl -u rephlo-backend -f

# PM2 logs
pm2 logs rephlo-backend

# Look for:
# "Server started on port 3000"
# "Database connected successfully"
# "ModelService: Initialized"
```

---

### Step 9: Verify Health Checks

```bash
# Health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-11-08T12:00:00Z"
# }
```

---

## Post-Deployment Verification

### Test 1: Verify Database Changes

```sql
-- Check all models have tier assignments
SELECT
  id,
  display_name,
  required_tier,
  tier_restriction_mode,
  allowed_tiers
FROM models;

-- Expected: All models should have non-null tier fields
```

**Expected Output**:
```
gpt-5                | enterprise | minimum  | {enterprise}
claude-3.5-sonnet    | pro        | minimum  | {pro,enterprise}
gemini-2.0-pro       | pro        | minimum  | {pro,enterprise}
```

---

### Test 2: Free User - List Models

```bash
# Get JWT token for free user
FREE_TOKEN=$(curl -X POST "http://localhost:3000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "free@example.com", "password": "Password123!"}' \
  | jq -r '.access_token')

# List models
curl -X GET "http://localhost:3000/v1/models" \
  -H "Authorization: Bearer $FREE_TOKEN" \
  | jq
```

**Expected Response**:
```json
{
  "models": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "required_tier": "enterprise",
      "access_status": "upgrade_required"  // ← Free user denied
    },
    {
      "id": "claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "required_tier": "pro",
      "access_status": "upgrade_required"  // ← Free user denied
    }
  ],
  "total": 2,
  "user_tier": "free"  // ← User's tier shown
}
```

---

### Test 3: Free User - Attempt Pro Model Access

```bash
# Attempt chat completion with Pro model
curl -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Authorization: Bearer $FREE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  | jq
```

**Expected Response**:
```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires Pro tier or higher",
  "details": {
    "model_id": "claude-3.5-sonnet",
    "user_tier": "free",
    "required_tier": "pro",
    "upgrade_url": "/subscriptions/upgrade"
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

**Status Code**: `403 Forbidden`

---

### Test 4: Pro User - List Models

```bash
# Get JWT token for pro user
PRO_TOKEN=$(curl -X POST "http://localhost:3000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "pro@example.com", "password": "Password123!"}' \
  | jq -r '.access_token')

# List models
curl -X GET "http://localhost:3000/v1/models" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  | jq
```

**Expected Response**:
```json
{
  "models": [
    {
      "id": "gpt-5",
      "required_tier": "enterprise",
      "access_status": "upgrade_required"  // ← Pro user denied Enterprise model
    },
    {
      "id": "claude-3.5-sonnet",
      "required_tier": "pro",
      "access_status": "allowed"  // ← Pro user allowed
    }
  ],
  "user_tier": "pro"
}
```

---

### Test 5: Pro User - Access Pro Model

```bash
# Chat completion with Pro model
curl -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }' \
  | jq
```

**Expected Response**:
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "claude-3.5-sonnet",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      }
    }
  ],
  "usage": {
    "total_tokens": 25
  }
}
```

**Status Code**: `200 OK`

---

### Test 6: Enterprise User - Access All Models

```bash
# Get JWT token for enterprise user
ENTERPRISE_TOKEN=$(curl -X POST "http://localhost:3000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "enterprise@example.com", "password": "Password123!"}' \
  | jq -r '.access_token')

# List models
curl -X GET "http://localhost:3000/v1/models" \
  -H "Authorization: Bearer $ENTERPRISE_TOKEN" \
  | jq '.models[] | {id: .id, access_status: .access_status}'
```

**Expected Response**:
```json
{"id": "gpt-5", "access_status": "allowed"}
{"id": "claude-3.5-sonnet", "access_status": "allowed"}
{"id": "gemini-2.0-pro", "access_status": "allowed"}
```

All models should show `"access_status": "allowed"` for Enterprise users.

---

### Test 7: Verify Error Response Format

```bash
# Trigger tier restriction error
curl -i -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Authorization: Bearer $FREE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

**Verify Headers**:
```
HTTP/1.1 403 Forbidden
Content-Type: application/json
```

**Verify Body Structure**:
```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "...",
  "details": {
    "model_id": "...",
    "user_tier": "...",
    "required_tier": "...",
    "upgrade_url": "..."
  },
  "timestamp": "..."
}
```

---

### Test 8: Verify Backward Compatibility

**If you have existing clients**, ensure they still work:

```bash
# Existing /v1/models call (without tier context)
curl -X GET "http://localhost:3000/v1/models"

# Should still return model list (with new fields added)
# Old fields preserved: id, name, provider, capabilities, etc.
```

---

## Rollback Plan

### When to Rollback

Rollback if:
- Migration fails with errors
- Post-deployment tests fail
- Critical bugs discovered in tier validation
- Unexpected service degradation

---

### Rollback Procedure

#### Step 1: Stop Backend Services

```bash
sudo systemctl stop rephlo-backend
# or
pm2 stop rephlo-backend
```

#### Step 2: Rollback Database Migration

```bash
cd backend

# Identify migration to rollback
npx prisma migrate status

# Rollback migration (manual SQL)
psql -h your-db-host -U your-db-user -d rephlo-dev
```

**Execute rollback SQL**:

```sql
-- Drop indexes
DROP INDEX IF EXISTS models_is_available_required_tier_idx;
DROP INDEX IF EXISTS models_required_tier_idx;

-- Drop columns
ALTER TABLE models DROP COLUMN IF EXISTS allowed_tiers;
ALTER TABLE models DROP COLUMN IF EXISTS tier_restriction_mode;
ALTER TABLE models DROP COLUMN IF EXISTS required_tier;

-- Verify rollback
\d models
```

#### Step 3: Restore from Backup (If Needed)

```bash
# Restore full database backup
pg_restore -h your-db-host -U your-db-user -d rephlo-dev \
  -c -F c backup_before_tier_migration_YYYYMMDD_HHMMSS.dump
```

#### Step 4: Rollback Code

```bash
cd /path/to/rephlo-sites

# Checkout previous commit
git log --oneline -10
git checkout <previous_commit_hash>

# Rebuild
cd backend
npm install
npm run build
```

#### Step 5: Restart Services

```bash
sudo systemctl start rephlo-backend
# or
pm2 restart rephlo-backend
```

#### Step 6: Verify Rollback

```bash
# Check database schema
psql -h your-db-host -U your-db-user -d rephlo-dev -c "\d models"

# Should NOT show tier fields

# Test API endpoint
curl http://localhost:3000/v1/models

# Should return models without tier fields
```

---

## Monitoring and Alerting

### Metrics to Monitor

#### 1. Tier Access Denials

**Metric**: Count of 403 responses with `model_access_restricted` code

**Alert Threshold**: > 100 denials/hour (indicates possible misconfiguration)

**Query**:
```sql
SELECT
  COUNT(*) as denial_count,
  DATE_TRUNC('hour', created_at) as hour
FROM api_logs
WHERE status_code = 403
  AND error_code = 'model_access_restricted'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### 2. Tier Validation Performance

**Metric**: Average latency of tier check operations

**Alert Threshold**: > 10ms (performance degradation)

**Check Logs**:
```bash
grep "Tier access check" /var/log/rephlo-backend.log | tail -100
```

#### 3. Cache Hit Rate

**Metric**: Model cache hit rate

**Expected**: > 80% cache hit rate

**Check Logs**:
```bash
grep "Returning cached model" /var/log/rephlo-backend.log | wc -l
```

### Log Monitoring

**Key log messages to monitor**:

```bash
# Successful tier checks
grep "Tier access check completed" /var/log/rephlo-backend.log

# Tier denials
grep "Model access denied" /var/log/rephlo-backend.log

# Migration events
grep "prisma migrate" /var/log/rephlo-backend.log
```

---

## Troubleshooting

### Issue: Migration Fails with "Column already exists"

**Cause**: Migration was partially applied before.

**Fix**:
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'models'
  AND column_name IN ('required_tier', 'tier_restriction_mode', 'allowed_tiers');

-- If they exist, manually mark migration as applied
-- (Only in development - restore from backup in production)
```

### Issue: 403 Errors for All Users

**Cause**: User tier retrieval failing.

**Diagnosis**:
```bash
# Check logs for getUserTier errors
grep "getUserTier" /var/log/rephlo-backend.log
```

**Fix**: Ensure all users have active subscriptions with valid tiers.

### Issue: Tier Not Updating After Subscription Change

**Cause**: Cache not invalidated.

**Fix**:
```bash
# Restart backend to clear cache
sudo systemctl restart rephlo-backend
```

---

## Feature Flags (Optional)

If you want to gradually enable tier enforcement, add a feature flag:

```typescript
// backend/src/config/features.ts
export const TIER_ENFORCEMENT_ENABLED = process.env.ENABLE_TIER_ENFORCEMENT === 'true';

// backend/src/controllers/models.controller.ts
if (TIER_ENFORCEMENT_ENABLED) {
  // Check tier access
} else {
  // Skip tier check (allow all)
}
```

**Enable in production**:
```bash
export ENABLE_TIER_ENFORCEMENT=true
sudo systemctl restart rephlo-backend
```

---

## Deployment Checklist

Use this checklist during deployment:

- [ ] Database backup created and verified
- [ ] Current model state exported to CSV
- [ ] Test users created (free, pro, enterprise)
- [ ] Backend services stopped (if needed)
- [ ] Code pulled and dependencies installed
- [ ] Migration executed successfully
- [ ] Migration verified (columns and indexes exist)
- [ ] Backend built successfully
- [ ] Backend services restarted
- [ ] Health check passes
- [ ] Test 1: Database changes verified
- [ ] Test 2: Free user lists models
- [ ] Test 3: Free user denied Pro model
- [ ] Test 4: Pro user lists models
- [ ] Test 5: Pro user accesses Pro model
- [ ] Test 6: Enterprise user accesses all models
- [ ] Test 7: Error response format verified
- [ ] Test 8: Backward compatibility confirmed
- [ ] Monitoring dashboards updated
- [ ] Documentation updated
- [ ] Team notified of deployment completion

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Deployment Status**: Ready for Production
**Support**: devops@rephlo.com
