# Database Backup & Restore Guide

**Version**: 1.0.0
**Last Updated**: November 20, 2025
**Status**: Active

---

## Overview

This guide covers the comprehensive database backup and restore system that protects against accidental data loss during destructive operations like `db:reset` and `migrate reset`.

**Key Features**:
- 🔒 Automatic backups before destructive operations
- ⚠️  Interactive confirmation prompts
- 🗜️  Optional gzip compression
- 📁 Timestamped backup files
- 🧹 Automatic cleanup of old backups (30-day retention)
- 📥 Interactive or automated restoration

---

## Quick Reference

### Common Commands

```bash
# Backup database (interactive)
npm run db:backup

# Backup database (automatic, compressed)
npm run db:backup:auto

# Reset database (with automatic backup + confirmation)
npm run db:reset

# Reset database (CI/CD mode - skip prompts)
npm run db:reset:force

# Restore database (interactive selection)
npm run db:restore

# Restore latest backup
npm run db:restore -- --latest

# Restore specific backup file
npm run db:restore -- --file rephlo-dev_2025-11-20T10-30-00.sql.gz
```

---

## System Architecture

### Components

1. **`scripts/db-backup.ts`**: Creates timestamped PostgreSQL backups using `pg_dump`
2. **`scripts/pre-reset-safety.ts`**: Runs before destructive operations, creates backup and asks for confirmation
3. **`scripts/db-restore.ts`**: Restores database from backup files
4. **`backups/`**: Directory storing all backup files (gitignored)

### Flow Diagram

```
User runs: npm run db:reset
    ↓
pre-reset-safety.ts
    ↓
[Display Warning]
    ↓
[Ask for Confirmation] ──→ NO ──→ Exit (data safe)
    ↓ YES
[Call db-backup.ts --auto --compress]
    ↓
[Backup Created Successfully]
    ↓
[Run: npx prisma migrate reset]
    ↓
[Run: npm run seed]
    ↓
Done
```

---

## Backup System

### Creating Backups

#### Interactive Backup
```bash
npm run db:backup
```

**What happens**:
1. Shows database information
2. Asks for confirmation
3. Creates backup with timestamp
4. Cleans up backups older than 30 days
5. Displays backup file path and size

**Output Example**:
```
═══════════════════════════════════════════════════════════════
                  DATABASE BACKUP UTILITY
═══════════════════════════════════════════════════════════════

📊 Database: rephlo-dev
🗂️  Backup directory: ./backups
🗜️  Compression: Disabled

⚠️  Proceed with backup? (y/n): y

🔄 Creating database backup...
   Database: rephlo-dev
   Host: localhost:5432
   Backup file: rephlo-dev_2025-11-20T10-30-00.sql

✅ Backup completed successfully!
   File: D:\sources\work\rephlo-sites\backend\backups\rephlo-dev_2025-11-20T10-30-00.sql
   Size: 12.45 MB
```

#### Automatic Backup (CI/CD)
```bash
npm run db:backup:auto
```

**Features**:
- No interactive prompts
- Automatic gzip compression
- Suitable for scripts and automation

### Backup File Naming

Format: `{database}_{timestamp}.{extension}`

Examples:
- `rephlo-dev_2025-11-20T10-30-00.sql` (uncompressed)
- `rephlo-dev_2025-11-20T10-30-00.sql.gz` (compressed)

### Backup Retention

- **Default**: 30 days
- **Configurable**: Set `BACKUP_RETENTION_DAYS` environment variable
- **Automatic Cleanup**: Old backups automatically deleted during interactive backups

---

## Database Reset (with Safety)

### Standard Reset (Interactive)

```bash
npm run db:reset
```

**Safety Features**:
1. Displays warning about data loss
2. Creates automatic compressed backup
3. Asks for explicit confirmation ("yes" required)
4. Only proceeds if backup succeeds

**Example Output**:
```
═══════════════════════════════════════════════════════════════
                      ⚠️  DANGER ZONE  ⚠️
═══════════════════════════════════════════════════════════════

  You are about to run: npm run db:reset

  This will:
    1. ❌ DROP ALL TABLES (delete everything)
    2. 🔄 Recreate schema from migrations
    3. 🌱 Run seed script (creates 3 test users only)

  ⚠️  ALL USER DATA WILL BE PERMANENTLY DELETED!

  Backup will be created automatically in: ./backups/

═══════════════════════════════════════════════════════════════

⚠️  Do you want to proceed with database reset? (y/n): y

📦 Creating automatic backup before reset...

🔄 Creating database backup...
   Database: rephlo-dev
   Host: localhost:5432
   Backup file: rephlo-dev_2025-11-20T10-35-00.sql.gz

✅ Backup created successfully!
✅ Pre-reset safety checks complete.
🔄 Proceeding with database reset...

[Prisma migrate reset output...]
```

### Force Reset (CI/CD Mode)

```bash
npm run db:reset:force
```

**Use Cases**:
- CI/CD pipelines
- Automated testing environments
- Docker container initialization

**Behavior**:
- Skips confirmation prompts
- Still creates automatic backup
- Set `SKIP_BACKUP_PROMPT=true` to bypass

---

## Restore System

### Interactive Restore

```bash
npm run db:restore
```

**What happens**:
1. Lists all available backups (newest first)
2. Shows file size and creation date
3. Asks you to select a backup number
4. Confirms restore operation
5. Drops existing database
6. Creates fresh database
7. Restores data from backup

**Example Output**:
```
═══════════════════════════════════════════════════════════════
                 DATABASE RESTORE UTILITY
═══════════════════════════════════════════════════════════════

📦 Available Backups:

  1. rephlo-dev_2025-11-20T10-35-00.sql.gz
     Size: 3.21 MB | Date: 11/20/2025, 10:35:00 AM

  2. rephlo-dev_2025-11-20T10-30-00.sql
     Size: 12.45 MB | Date: 11/20/2025, 10:30:00 AM

  3. rephlo-dev_2025-11-19T14-20-00.sql.gz
     Size: 3.18 MB | Date: 11/19/2025, 2:20:00 PM

Enter backup number to restore (or "q" to quit): 1

⚠️  WARNING: This will DROP ALL TABLES and restore from backup!
   Backup file: rephlo-dev_2025-11-20T10-35-00.sql.gz

Are you sure you want to proceed? (yes/no): yes

🔄 Restoring database from backup...
   Database: rephlo-dev
   Backup: rephlo-dev_2025-11-20T10-35-00.sql.gz

🔌 Terminating active connections...
🗑️  Dropping database...
📦 Creating fresh database...
📥 Restoring data from backup...

✅ Database restored successfully!

ℹ️  Next steps:
   1. Regenerate Prisma Client: npm run prisma:generate
   2. Verify data: npm run prisma:studio
```

### Restore Latest Backup

```bash
npm run db:restore -- --latest
```

Automatically selects and restores the most recent backup.

### Restore Specific Backup

```bash
npm run db:restore -- --file rephlo-dev_2025-11-20T10-30-00.sql.gz
```

Restores a specific backup file by name.

---

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://username:password@host:port/database

# Optional
BACKUP_DIR=./backups                    # Custom backup directory
BACKUP_RETENTION_DAYS=30                # Days to keep backups
SKIP_BACKUP_PROMPT=true                 # Skip prompts (CI/CD only)
```

### Directory Structure

```
backend/
├── backups/                            # Backup storage (gitignored)
│   ├── rephlo-dev_2025-11-20T10-35-00.sql.gz
│   ├── rephlo-dev_2025-11-20T10-30-00.sql
│   └── rephlo-dev_2025-11-19T14-20-00.sql.gz
├── scripts/
│   ├── db-backup.ts                    # Backup script
│   ├── pre-reset-safety.ts             # Safety wrapper
│   └── db-restore.ts                   # Restore script
└── .gitignore                          # Ignores backups/
```

---

## Best Practices

### Development

1. **Before Destructive Operations**:
   - Always run `npm run db:backup` before manual schema changes
   - Let `db:reset` handle automatic backups

2. **Regular Backups**:
   - Create manual backups before major feature development
   - Keep backups before deploying schema changes

3. **Testing Restores**:
   - Periodically test restore process
   - Verify data integrity after restoration

### Production

1. **Never Use `db:reset`**:
   - Use `prisma migrate deploy` for production
   - Never reset production databases

2. **External Backup Strategy**:
   - Use PostgreSQL's `pg_basebackup` for production
   - Store backups in S3 or cloud storage
   - Implement automated daily backups

3. **Point-in-Time Recovery**:
   - Enable PostgreSQL WAL archiving
   - Configure continuous archiving

---

## Troubleshooting

### Backup Fails

**Error**: `pg_dump: command not found`

**Solution**: Install PostgreSQL client tools
```bash
# Windows (using Chocolatey)
choco install postgresql --version=14.5

# macOS
brew install postgresql@14

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-client-14
```

---

**Error**: `Permission denied`

**Solution**: Check DATABASE_URL credentials
```bash
# Test connection
psql -h localhost -p 5432 -U postgres -d rephlo-dev
```

---

### Restore Fails

**Error**: `database "rephlo-dev" is being accessed by other users`

**Solution**: Close all connections
```bash
# Stop backend server
# Close Prisma Studio
# Kill active connections via pgAdmin or:
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname='rephlo-dev' AND pid <> pg_backend_pid();
```

---

**Error**: `No such file or directory: backups/`

**Solution**: Backup directory doesn't exist
```bash
mkdir -p backend/backups
```

---

### Compression Issues

**Error**: `gzip: command not found`

**Solution**: Install gzip
```bash
# Windows (using Chocolatey)
choco install gzip

# macOS (pre-installed)
# Linux (usually pre-installed)
```

---

## Advanced Usage

### Custom Backup Directory

```bash
# Set in .env
BACKUP_DIR=/path/to/custom/backups

# Or use command line
BACKUP_DIR=/tmp/backups npm run db:backup
```

### Change Retention Period

```bash
# Keep backups for 90 days
BACKUP_RETENTION_DAYS=90 npm run db:backup
```

### Automated Backups (Cron)

**Linux/macOS** (`crontab -e`):
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/backend && npm run db:backup:auto
```

**Windows** (Task Scheduler):
```powershell
# Create scheduled task
schtasks /create /tn "Database Backup" /tr "npm run db:backup:auto" /sc daily /st 02:00
```

---

## Safety Checklist

Before running `db:reset`:

- [ ] Backup exists (automatic, but verify)
- [ ] No production data in development database
- [ ] Confirmed you want to delete ALL data
- [ ] Seed script will recreate necessary test data
- [ ] Other team members notified (shared databases)

After running `db:reset`:

- [ ] Verify backup file exists in `./backups/`
- [ ] Check backup file size (should be > 0 bytes)
- [ ] Test database connectivity
- [ ] Verify seed data created correctly
- [ ] Regenerate Prisma client if needed

---

## Migration from Old System

If you previously used `db:reset` without backups:

1. **Immediate Backup**:
   ```bash
   npm run db:backup
   ```

2. **Update Scripts**:
   - Old `db:reset` now includes automatic backups
   - No changes needed to workflow

3. **Verify Integration**:
   ```bash
   # Test backup system
   npm run db:backup

   # Verify safety prompts work
   npm run db:reset
   # (cancel when prompted)
   ```

---

## Related Documentation

- **Prisma Documentation**: [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- **PostgreSQL Backup**: [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- **Project Setup**: `CLAUDE.md` (Database Setup section)

---

## Support

**Issues**: Report backup/restore issues to the development team

**Logs**: Check `logs/` directory for detailed error messages

**Emergency Recovery**: Contact DBA team for production database issues
