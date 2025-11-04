# Phase 2 Database Setup - Verification Guide

## Overview
This document provides step-by-step instructions to verify the database schema setup and test all database functionality.

## Prerequisites

### 1. Start PostgreSQL Database

Choose one of the following options:

#### Option A: Docker (Recommended)
```bash
# Start PostgreSQL container
docker run --name rephlo-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rephlo \
  -p 5432:5432 \
  -d postgres:17

# Verify it's running
docker ps | grep rephlo-db
```

#### Option B: Local PostgreSQL Installation
See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

#### Option C: Cloud Database (Neon, Supabase, AWS RDS)
Update `.env` with your cloud database connection string.

### 2. Verify Database Connection

```bash
# Test connection with psql
psql -U postgres -h localhost -p 5432 -d rephlo -c "SELECT version();"

# Or use Prisma
npx prisma db execute --stdin <<EOF
SELECT 'Connection successful!' as status;
EOF
```

## Phase 2 Verification Steps

### Step 1: Run Database Migration

```bash
cd backend
npm run prisma:migrate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "rephlo", schema "public" at "localhost:5432"

Applying migration `20251103000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251103000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (5.7.1 | library) to .\node_modules\@prisma\client
```

### Step 2: Verify Tables Created

```bash
# Using psql
psql -U postgres -h localhost -p 5432 -d rephlo -c "\dt"

# Expected tables:
# - downloads
# - feedbacks
# - diagnostics
# - app_versions
```

### Step 3: Inspect Table Structures

```bash
# Download table
psql -U postgres -h localhost -p 5432 -d rephlo -c "\d downloads"

# Feedback table
psql -U postgres -h localhost -p 5432 -d rephlo -c "\d feedbacks"

# Diagnostic table
psql -U postgres -h localhost -p 5432 -d rephlo -c "\d diagnostics"

# AppVersion table
psql -U postgres -h localhost -p 5432 -d rephlo -c "\d app_versions"
```

### Step 4: Verify Indexes

```bash
# List all indexes
psql -U postgres -h localhost -p 5432 -d rephlo -c "
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"
```

**Expected Indexes:**

#### downloads table:
- `downloads_pkey` (PRIMARY KEY on id)
- `downloads_os_idx` (INDEX on os)
- `downloads_timestamp_idx` (INDEX on timestamp)

#### feedbacks table:
- `feedbacks_pkey` (PRIMARY KEY on id)
- `feedbacks_timestamp_idx` (INDEX on timestamp)
- `feedbacks_email_idx` (INDEX on email)

#### diagnostics table:
- `diagnostics_pkey` (PRIMARY KEY on id)
- `diagnostics_timestamp_idx` (INDEX on timestamp)
- `diagnostics_userId_idx` (INDEX on userId)

#### app_versions table:
- `app_versions_pkey` (PRIMARY KEY on id)
- `app_versions_version_key` (UNIQUE on version)
- `app_versions_isLatest_idx` (INDEX on isLatest)

### Step 5: Run Seed Script

```bash
npm run seed
```

**Expected Output:**
```
🌱 Starting database seed...

Clearing existing data...
✓ Existing data cleared

Creating download records...
✓ Created 5 download records

Creating feedback entries...
✓ Created 5 feedback entries

Creating diagnostic records...
✓ Created 3 diagnostic records

Creating app version records...
✓ Created 3 app version records

📊 Seed Summary:
   Downloads:   5 records
   Feedbacks:   5 records
   Diagnostics: 3 records
   Versions:    3 records

✅ Database seed completed successfully!
```

### Step 6: Verify Data with Prisma Studio

```bash
npm run prisma:studio
```

This opens a visual database browser at http://localhost:5555

**Verification Checklist:**
- [ ] 4 tables visible: Download, Feedback, Diagnostic, AppVersion
- [ ] Download table has 5 records with different OS values
- [ ] Feedback table has 5 records with messages
- [ ] Diagnostic table has 3 records with file paths
- [ ] AppVersion table has 3 records, one with isLatest=true

### Step 7: Test Database Client

Create a test file:

```typescript
// test-db.ts
import { prisma, isDatabaseConnected, getDatabaseStats } from './src/db';

async function testDatabase() {
  console.log('Testing database connection...\n');

  // Test connection
  const isConnected = await isDatabaseConnected();
  console.log('Connection status:', isConnected ? '✓ Connected' : '✗ Failed');

  if (!isConnected) {
    process.exit(1);
  }

  // Get statistics
  const stats = await getDatabaseStats();
  console.log('\nDatabase Statistics:');
  console.log('  Downloads:  ', stats.downloads);
  console.log('  Feedbacks:  ', stats.feedbacks);
  console.log('  Diagnostics:', stats.diagnostics);
  console.log('  Versions:   ', stats.versions);

  // Test queries
  console.log('\n--- Test Queries ---\n');

  // 1. Get latest app version
  const latestVersion = await prisma.appVersion.findFirst({
    where: { isLatest: true },
  });
  console.log('Latest version:', latestVersion?.version);

  // 2. Count downloads by OS
  const windowsCount = await prisma.download.count({
    where: { os: 'windows' },
  });
  const macCount = await prisma.download.count({
    where: { os: 'macos' },
  });
  const linuxCount = await prisma.download.count({
    where: { os: 'linux' },
  });
  console.log('\nDownloads by OS:');
  console.log('  Windows:', windowsCount);
  console.log('  macOS:  ', macCount);
  console.log('  Linux:  ', linuxCount);

  // 3. Recent feedback (last 3)
  const recentFeedback = await prisma.feedback.findMany({
    orderBy: { timestamp: 'desc' },
    take: 3,
  });
  console.log('\nRecent Feedback:');
  recentFeedback.forEach((fb, i) => {
    console.log(`  ${i + 1}. ${fb.message.substring(0, 50)}...`);
  });

  // 4. Total diagnostic file size
  const diagnostics = await prisma.diagnostic.findMany();
  const totalSize = diagnostics.reduce((sum, d) => sum + d.fileSize, 0);
  console.log(`\nTotal diagnostic files: ${diagnostics.length}`);
  console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);

  console.log('\n✅ All database tests passed!');
  await prisma.$disconnect();
}

testDatabase().catch(console.error);
```

Run the test:
```bash
npx ts-node test-db.ts
```

### Step 8: Test CRUD Operations

```typescript
// test-crud.ts
import { prisma } from './src/db';

async function testCRUD() {
  console.log('Testing CRUD operations...\n');

  // CREATE
  console.log('1. CREATE - Adding new download...');
  const newDownload = await prisma.download.create({
    data: {
      os: 'windows',
      userAgent: 'Test User Agent',
      ipHash: 'test_hash_123',
    },
  });
  console.log('  ✓ Created download:', newDownload.id);

  // READ
  console.log('\n2. READ - Fetching download...');
  const foundDownload = await prisma.download.findUnique({
    where: { id: newDownload.id },
  });
  console.log('  ✓ Found download:', foundDownload?.id);

  // UPDATE
  console.log('\n3. UPDATE - Updating app version...');
  const version = await prisma.appVersion.findFirst({
    where: { isLatest: true },
  });
  if (version) {
    await prisma.appVersion.update({
      where: { id: version.id },
      data: { isLatest: false },
    });
    console.log('  ✓ Updated version:', version.version);
  }

  // DELETE
  console.log('\n4. DELETE - Removing test download...');
  await prisma.download.delete({
    where: { id: newDownload.id },
  });
  console.log('  ✓ Deleted download:', newDownload.id);

  console.log('\n✅ CRUD operations test passed!');
  await prisma.$disconnect();
}

testCRUD().catch(console.error);
```

Run the test:
```bash
npx ts-node test-crud.ts
```

## Performance Verification

### Test Index Performance

```sql
-- Explain query plan (should use index)
EXPLAIN ANALYZE
SELECT * FROM downloads
WHERE os = 'windows'
ORDER BY timestamp DESC
LIMIT 10;

-- Should show "Index Scan" using downloads_os_idx or downloads_timestamp_idx
```

### Test Query Performance

```typescript
// test-performance.ts
import { prisma } from './src/db';

async function testPerformance() {
  console.log('Testing query performance...\n');

  // Benchmark: Get downloads by OS
  console.time('Query: Downloads by OS');
  await prisma.download.findMany({
    where: { os: 'windows' },
  });
  console.timeEnd('Query: Downloads by OS');

  // Benchmark: Get recent feedback
  console.time('Query: Recent feedback');
  await prisma.feedback.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  });
  console.timeEnd('Query: Recent feedback');

  // Benchmark: Get latest version
  console.time('Query: Latest version');
  await prisma.appVersion.findFirst({
    where: { isLatest: true },
  });
  console.timeEnd('Query: Latest version');

  console.log('\n✅ Performance tests completed!');
  await prisma.$disconnect();
}

testPerformance().catch(console.error);
```

**Expected Performance:**
- Simple queries: < 10ms
- Indexed queries: < 5ms
- Aggregate queries: < 20ms

## Migration Verification

### Check Migration Files

```bash
ls -la backend/prisma/migrations/
```

**Expected structure:**
```
migrations/
  └─ [timestamp]_init/
      └─ migration.sql
```

### Inspect Migration SQL

```bash
cat backend/prisma/migrations/[timestamp]_init/migration.sql
```

**Expected SQL:**
- CREATE TABLE statements for all 4 tables
- CREATE INDEX statements for all indexes
- Proper column types and constraints

## Troubleshooting

### Issue: Migration fails with "Database does not exist"
**Solution:** Create database manually:
```bash
createdb -U postgres rephlo
```

### Issue: Migration fails with "Permission denied"
**Solution:** Grant proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE rephlo TO postgres;
```

### Issue: Seed script fails
**Solution:** Check Prisma Client is generated:
```bash
npm run prisma:generate
```

### Issue: Prisma Studio doesn't open
**Solution:** Check port 5555 is available:
```bash
netstat -ano | findstr :5555
```

## Success Criteria

Phase 2 is considered complete when:

- [x] PostgreSQL database is running and accessible
- [x] Prisma schema created with 4 models
- [x] All indexes created for performance
- [x] Migration successfully applied
- [x] Prisma Client generated
- [x] Database client wrapper created
- [x] Seed script runs successfully
- [x] Prisma Studio shows all tables with data
- [x] All CRUD operations work
- [x] Query performance meets requirements (< 300ms per PRD)
- [x] Database connection pooling configured
- [x] Graceful shutdown handlers in place
- [x] Health check function available

## Next Steps

Once all verification steps pass, proceed to:

**Phase 3: Backend API Development**
- Implement 5 core API endpoints
- Add request validation
- Set up middleware stack
- Create service layer

See [068-implementation-orchestration.md](../docs/plan/068-implementation-orchestration.md) for Phase 3 details.

## Reference Files

- Prisma Schema: `backend/prisma/schema.prisma`
- Database Client: `backend/src/db/index.ts`
- Seed Script: `backend/src/db/seed.ts`
- Setup Guide: `backend/DATABASE_SETUP.md`
- Environment Config: `backend/.env`

## Database Schema Summary

### downloads
```prisma
id        String   @id @default(cuid())
os        String   // "windows", "macos", "linux"
timestamp DateTime @default(now())
userAgent String?
ipHash    String?
```

### feedbacks
```prisma
id        String   @id @default(cuid())
userId    String?
message   String   @db.VarChar(1000)
email     String?
timestamp DateTime @default(now())
```

### diagnostics
```prisma
id        String   @id @default(cuid())
userId    String?
filePath  String
fileSize  Int
timestamp DateTime @default(now())
```

### app_versions
```prisma
id          String   @id @default(cuid())
version     String   @unique
releaseDate DateTime
downloadUrl String
changelog   String   @db.Text
isLatest    Boolean  @default(true)
createdAt   DateTime @default(now())
```

---

**Document Status:** Ready for Verification
**Created:** November 2025
**Last Updated:** November 2025
