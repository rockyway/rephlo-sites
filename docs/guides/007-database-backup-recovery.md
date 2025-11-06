# Database Backup & Recovery Guide - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Automated Backups](#automated-backups)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Recovery Procedures](#recovery-procedures)
5. [Testing Backups](#testing-backups)
6. [Backup Retention Policy](#backup-retention-policy)
7. [Disaster Recovery Plan](#disaster-recovery-plan)

---

## Backup Strategy

### Backup Objectives

**Recovery Point Objective (RPO):** Maximum 24 hours of data loss acceptable
**Recovery Time Objective (RTO):** Database restored within 2 hours

### Backup Types

1. **Automated Daily Backups** (Primary)
   - Scheduled daily at 2:00 AM UTC
   - Full database dump
   - Retained for 30 days
   - Managed by database hosting provider

2. **Pre-Deployment Backups** (Secondary)
   - Manual backup before major deployments
   - Retained for 90 days
   - Allows rollback if deployment introduces data issues

3. **Weekly Archive Backups** (Tertiary)
   - Every Sunday at 3:00 AM UTC
   - Long-term archival (1 year retention)
   - Stored in separate cloud storage (S3/Azure/GCS)

### Backup Storage Locations

**Primary:** Database provider's backup storage (same region)
**Secondary:** Cross-region backup (different region for disaster recovery)
**Tertiary:** Cold storage archive (AWS Glacier, Azure Archive Storage)

---

## Automated Backups

### Neon (Serverless Postgres)

**Built-in Automatic Backups:**
- Daily automated backups
- Retention: 14 days (Free tier), 30 days (Pro tier)
- Point-in-time recovery available (Pro tier)

**Configuration:**
1. Go to Neon Dashboard → Project Settings
2. Backups enabled by default
3. No configuration needed

**Restore from Neon Backup:**
1. Neon Dashboard → Backups tab
2. Select backup to restore
3. Click "Restore" (creates new branch)
4. Update `DATABASE_URL` to restored database
5. Restart backend service

### Supabase

**Built-in Automatic Backups:**
- Daily automated backups
- Retention: 7 days (Free tier), 30 days (Pro tier)
- Point-in-time recovery (Pro tier)

**Configuration:**
1. Supabase Dashboard → Database → Backups
2. Automatic backups enabled by default
3. Configure retention period (Pro tier)

**Restore from Supabase Backup:**
1. Dashboard → Database → Backups
2. Select backup point
3. Click "Restore to new project" or "Restore in place"
4. Update connection string if needed

### Render PostgreSQL

**Built-in Automatic Backups:**
- Daily automated backups
- Retention: 7 days (Standard plan), 30 days (Pro plan)

**Configuration:**
- Automatic, no configuration needed
- View backups: Render Dashboard → Database → Backups

**Restore from Render Backup:**
1. Render Dashboard → Database → Backups
2. Click "Restore" on desired backup
3. Database restored in place (overwrites current data)
4. ⚠️ **Warning:** This overwrites all current data

### AWS RDS PostgreSQL

**Built-in Automatic Backups:**
- Automated daily snapshots
- Retention: 1-35 days (configurable)
- Point-in-time recovery available

**Configuration:**
```bash
# Enable automated backups (via AWS Console or CLI)
aws rds modify-db-instance \
  --db-instance-identifier rephlo-db \
  --backup-retention-period 30 \
  --preferred-backup-window "02:00-03:00"
```

**Restore from RDS Backup:**
1. AWS Console → RDS → Snapshots
2. Select snapshot
3. Click "Restore Snapshot"
4. Creates new database instance
5. Update `DATABASE_URL` environment variable
6. Update security group rules
7. Restart backend service

---

## Manual Backup Procedures

### Full Database Dump (pg_dump)

**Purpose:** Create backup before major changes, migrations, or deployments

**Procedure:**

```bash
# 1. Set database URL
export DATABASE_URL="postgresql://user:password@host:5432/rephlo_prod"

# 2. Create backup directory
mkdir -p backups
cd backups

# 3. Create full database dump
pg_dump $DATABASE_URL > rephlo_backup_$(date +%Y%m%d_%H%M%S).sql

# Example output: rephlo_backup_20251103_140530.sql

# 4. Compress backup (optional)
gzip rephlo_backup_$(date +%Y%m%d_%H%M%S).sql

# 5. Verify backup file created
ls -lh rephlo_backup_*.sql*

# 6. Upload to cloud storage (optional)
# AWS S3:
aws s3 cp rephlo_backup_20251103_140530.sql.gz s3://rephlo-backups/

# Azure Blob:
az storage blob upload \
  --account-name rephlostorageaccount \
  --container-name backups \
  --name rephlo_backup_20251103_140530.sql.gz \
  --file rephlo_backup_20251103_140530.sql.gz

# Google Cloud Storage:
gsutil cp rephlo_backup_20251103_140530.sql.gz gs://rephlo-backups/
```

### Table-Specific Backup

**Purpose:** Backup specific table(s) only

```bash
# Backup single table
pg_dump $DATABASE_URL --table=Download > download_backup.sql
pg_dump $DATABASE_URL --table=Feedback > feedback_backup.sql

# Backup multiple tables
pg_dump $DATABASE_URL --table=Download --table=Feedback > critical_data.sql
```

### Schema-Only Backup

**Purpose:** Backup database structure without data

```bash
pg_dump $DATABASE_URL --schema-only > schema_backup.sql
```

### Data-Only Backup

**Purpose:** Backup data without schema

```bash
pg_dump $DATABASE_URL --data-only > data_backup.sql
```

### Custom Format Backup (Recommended for large databases)

```bash
# Custom format allows parallel restore and selective restore
pg_dump $DATABASE_URL --format=custom --file=rephlo_backup.dump

# Compress further (optional)
pg_dump $DATABASE_URL --format=custom --compress=9 --file=rephlo_backup.dump
```

---

## Recovery Procedures

### Full Database Restore

**⚠️ WARNING:** This will overwrite ALL data in the target database

**Procedure:**

```bash
# 1. Download backup file (if stored remotely)
aws s3 cp s3://rephlo-backups/rephlo_backup_20251103.sql.gz ./

# 2. Decompress backup (if compressed)
gunzip rephlo_backup_20251103.sql.gz

# 3. Create new empty database (recommended)
createdb rephlo_restored

# 4. Restore backup to new database
psql rephlo_restored < rephlo_backup_20251103.sql

# 5. Verify data restored
psql rephlo_restored -c "SELECT COUNT(*) FROM \"Download\";"
psql rephlo_restored -c "SELECT COUNT(*) FROM \"Feedback\";"

# 6. Update DATABASE_URL to point to restored database
# In Render/Heroku/Vercel environment variables:
DATABASE_URL=postgresql://user:password@host:5432/rephlo_restored

# 7. Restart backend service
# Render: Dashboard → Manual Deploy
# Heroku: heroku restart -a rephlo-api

# 8. Verify application works
curl https://api.rephlo.ai/health
curl https://api.rephlo.ai/api/version
```

### Restore to Existing Database (Overwrite)

**⚠️ DANGER:** This will delete all current data

```bash
# 1. Disconnect all clients
# Stop backend service first to prevent connections

# 2. Drop existing database
dropdb rephlo_prod

# 3. Recreate database
createdb rephlo_prod

# 4. Restore backup
psql rephlo_prod < rephlo_backup_20251103.sql

# 5. Restart backend service
```

### Restore from Custom Format Backup

```bash
# Restore entire database
pg_restore --dbname=rephlo_restored --clean --if-exists rephlo_backup.dump

# Restore specific table only
pg_restore --dbname=rephlo_restored --table=Download rephlo_backup.dump

# Parallel restore (faster for large databases)
pg_restore --dbname=rephlo_restored --jobs=4 rephlo_backup.dump
```

### Partial Restore (Specific Tables)

**Purpose:** Restore only specific tables, keeping other data intact

```bash
# 1. Backup specific table from backup file
pg_restore --table=Feedback rephlo_backup.dump > feedback_restore.sql

# 2. Drop existing table
psql $DATABASE_URL -c "DROP TABLE \"Feedback\";"

# 3. Restore table
psql $DATABASE_URL < feedback_restore.sql

# 4. Verify data restored
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Feedback\";"
```

### Point-in-Time Recovery (Pro Plans Only)

**Neon Point-in-Time Recovery:**
```bash
# Available with Pro plan ($19/month)
# Restore to any point within retention period

# 1. Neon Dashboard → Branches
# 2. Click "Create branch"
# 3. Select "Restore to point in time"
# 4. Choose date/time to restore from
# 5. New branch created with database at that point
# 6. Update DATABASE_URL to new branch
```

**AWS RDS Point-in-Time Recovery:**
```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rephlo-db \
  --target-db-instance-identifier rephlo-db-restored \
  --restore-time "2025-11-03T14:30:00Z"
```

---

## Testing Backups

### Monthly Backup Test Procedure

**Schedule:** First Monday of every month

**Procedure:**

```bash
# 1. Download latest automated backup
# (Method varies by provider - see Automated Backups section)

# 2. Create test database
createdb rephlo_backup_test

# 3. Restore backup to test database
pg_restore --dbname=rephlo_backup_test backup_file.dump
# Or:
psql rephlo_backup_test < backup_file.sql

# 4. Verify data integrity
psql rephlo_backup_test << EOF
SELECT 'Download count:', COUNT(*) FROM "Download";
SELECT 'Feedback count:', COUNT(*) FROM "Feedback";
SELECT 'Diagnostic count:', COUNT(*) FROM "Diagnostic";
SELECT 'AppVersion count:', COUNT(*) FROM "AppVersion";

-- Verify latest records
SELECT 'Latest download:', MAX(timestamp) FROM "Download";
SELECT 'Latest feedback:', MAX(timestamp) FROM "Feedback";

-- Check data quality
SELECT 'Null OS downloads:', COUNT(*) FROM "Download" WHERE os IS NULL;
SELECT 'Empty feedback:', COUNT(*) FROM "Feedback" WHERE message = '';
EOF

# 5. Test application connectivity
export DATABASE_URL="postgresql://localhost:5432/rephlo_backup_test"
cd backend
npm run start
# Test endpoints manually or with curl

# 6. Document results
echo "Backup test $(date): SUCCESS" >> backup_test_log.txt

# 7. Clean up test database
dropdb rephlo_backup_test
```

### Backup Verification Checklist

- [ ] Backup file exists and is not corrupted
- [ ] Backup file size reasonable (not 0 bytes, not unexpectedly small)
- [ ] Restore completes without errors
- [ ] All tables present in restored database
- [ ] Record counts match expectations
- [ ] Latest data is present (within RPO of 24 hours)
- [ ] Application connects and queries work
- [ ] No data corruption detected

---

## Backup Retention Policy

### Retention Schedule

| Backup Type | Frequency | Retention Period | Storage Location |
|-------------|-----------|------------------|------------------|
| Automated Daily | Daily, 2:00 AM UTC | 30 days | Provider default storage |
| Pre-Deployment | Before major deployments | 90 days | Provider + S3/Azure/GCS |
| Weekly Archive | Every Sunday, 3:00 AM UTC | 1 year | Cold storage (Glacier/Archive) |
| Monthly Archive | First of month | 3 years | Cold storage |
| Annual Archive | January 1st | 7 years | Cold storage |

### Backup Deletion Policy

**Automated:**
- Provider automatically deletes backups older than retention period
- No manual intervention needed

**Manual Archives:**
```bash
# List old backups (older than 90 days)
aws s3 ls s3://rephlo-backups/ --recursive | awk '{if ($1 < "2024-08-01") print $4}'

# Delete old backups
aws s3 rm s3://rephlo-backups/rephlo_backup_20240701.sql.gz
```

**Lifecycle Policies (Recommended):**

AWS S3 Lifecycle Policy:
```json
{
  "Rules": [
    {
      "Id": "Archive old backups",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

## Disaster Recovery Plan

### Disaster Scenarios

**Scenario 1: Accidental Data Deletion**

**Example:** Developer accidentally runs `DELETE FROM "Feedback"` without WHERE clause

**Recovery:**
1. Immediately stop backend service to prevent further changes
2. Identify time of deletion (check logs)
3. Restore from most recent backup before deletion
4. If backup is too old, use point-in-time recovery (if available)
5. Verify data restored correctly
6. Restart backend service
7. Document incident and improve access controls

**Scenario 2: Database Corruption**

**Example:** Database becomes corrupted due to hardware failure

**Recovery:**
1. Verify database is actually corrupted (not connection issue)
2. Contact database provider support immediately
3. Restore from most recent backup
4. If provider has internal recovery, let them attempt first
5. Update `DATABASE_URL` if restored to new instance
6. Test application thoroughly before resuming service
7. Monitor for recurring issues

**Scenario 3: Complete Database Loss**

**Example:** Entire database server fails and cannot be recovered

**Recovery:**
1. Create new database instance with same provider or alternative
2. Restore from most recent backup
3. Update `DATABASE_URL` in all environments
4. Apply any missing migrations if needed
5. Restart all services
6. Verify all functionality works
7. Monitor data integrity
8. Consider multi-region replication for future

**Scenario 4: Malicious Data Modification**

**Example:** Security breach leads to data tampering

**Recovery:**
1. **Immediately isolate:** Disconnect database from internet
2. **Stop services:** Prevent further damage
3. **Assess damage:** Identify which tables/records affected
4. **Restore clean data:** From backup before breach
5. **Security audit:** Identify and fix vulnerability
6. **Inform users:** Notify if personal data affected (GDPR/legal requirement)
7. **Prevent recurrence:** Implement additional security measures

### Recovery Time Estimates

| Disaster Type | Estimated Recovery Time | Data Loss (RPO) |
|---------------|------------------------|-----------------|
| Accidental deletion | 30 minutes - 2 hours | < 24 hours |
| Database corruption | 1-4 hours | < 24 hours |
| Complete database loss | 2-6 hours | < 24 hours |
| Malicious modification | 4-12 hours | < 24 hours |

### Communication Plan

**During Disaster Recovery:**

1. **Notify team immediately**
   - Email: team@rephlo.ai
   - Slack: #incidents channel
   - Phone: On-call engineer

2. **Update status page** (if available)
   - "Database maintenance in progress"
   - Estimated time to resolution

3. **Notify users** (if prolonged)
   - Twitter/social media update
   - Email to registered users (if applicable)

4. **Post-mortem** (after recovery)
   - Document what happened
   - Root cause analysis
   - Prevention measures
   - Share learnings with team

---

## Backup Scripts

### Automated Backup Script

Create `backend/scripts/backup-database.sh`:

```bash
#!/bin/bash

# Rephlo Database Backup Script
# Usage: ./backup-database.sh

set -e

# Configuration
BACKUP_DIR="$HOME/backups/rephlo"
RETENTION_DAYS=30
S3_BUCKET="s3://rephlo-backups"

# Load database URL from environment
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="rephlo_backup_$(date +%Y%m%d_%H%M%S).sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

echo "Starting backup: $BACKUP_FILE"

# Create backup
pg_dump "$DATABASE_URL" > "$BACKUP_PATH"

# Compress backup
gzip "$BACKUP_PATH"
BACKUP_PATH_GZ="$BACKUP_PATH.gz"

echo "Backup created: $BACKUP_PATH_GZ"

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_PATH_GZ" "$S3_BUCKET/"
  echo "Upload complete"
fi

# Delete old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "rephlo_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $BACKUP_FILE.gz"
```

**Schedule with cron:**
```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /path/to/backend/scripts/backup-database.sh >> /var/log/rephlo_backup.log 2>&1
```

### Backup Verification Script

Create `backend/scripts/verify-backup.sh`:

```bash
#!/bin/bash

# Verify backup integrity
# Usage: ./verify-backup.sh backup_file.sql.gz

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./verify-backup.sh backup_file.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Decompress and check SQL validity
gunzip -c "$BACKUP_FILE" | head -n 100 | grep -q "PostgreSQL database dump"

if [ $? -eq 0 ]; then
  echo "✓ Backup file is valid PostgreSQL dump"
else
  echo "✗ Backup file is not a valid PostgreSQL dump"
  exit 1
fi

# Check file size
SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
if [ "$SIZE" -lt 1000 ]; then
  echo "⚠ Warning: Backup file is suspiciously small ($SIZE bytes)"
else
  echo "✓ Backup file size OK: $SIZE bytes"
fi

echo "Verification complete"
```

---

## Quick Reference

### Backup Commands

```bash
# Full backup
pg_dump $DATABASE_URL > backup.sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup.sql.gz

# Custom format backup
pg_dump $DATABASE_URL --format=custom --file=backup.dump

# Table-specific backup
pg_dump $DATABASE_URL --table=Download > download_backup.sql
```

### Restore Commands

```bash
# Restore from SQL dump
psql $DATABASE_URL < backup.sql

# Restore from compressed SQL dump
gunzip -c backup.sql.gz | psql $DATABASE_URL

# Restore from custom format
pg_restore --dbname=$DATABASE_URL backup.dump

# Restore specific table
pg_restore --table=Download --dbname=$DATABASE_URL backup.dump
```

---

## Contact Information

**Database Issues:**
- Primary: DevOps Lead
- Secondary: Backend Developer
- Emergency: On-call Engineer (see PRODUCTION_READINESS_CHECKLIST.md)

**Provider Support:**
- Neon: support@neon.tech
- Supabase: support@supabase.com
- Render: support@render.com
- AWS RDS: AWS Support Portal

---

**Document Status:** Production Ready
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly
**Last Backup Test:** ___/___/___
