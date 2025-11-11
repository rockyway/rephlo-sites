# Database Schema Migration Summary
## Plan 129 Gap Closure - RBAC Tables and User Enhancements

**Migration Name:** `20251110120000_add_rbac_tables_and_user_enhancements`
**Created:** November 10, 2025
**Status:** Ready for execution (pending Prisma client generation and database migration)

---

## Overview

This migration implements critical database schema changes to close gaps between Plan 129 specification and the current Rephlo platform codebase. It adds three new RBAC tables for approval workflows, IP whitelisting, and user suspension tracking, plus user model enhancements for status management and lifetime value tracking.

---

## Changes Implemented

### 1. New Enum: UserStatus (Gap G-002)

**Location:** `backend/prisma/schema.prisma` (lines 230-238)

```prisma
enum UserStatus {
  active
  suspended
  banned
  deleted

  @@map("user_status")
}
```

**Purpose:** Standardizes user account status tracking across the platform.

**Values:**
- `active` - User account is active and in good standing
- `suspended` - User account is temporarily suspended (with optional expiration)
- `banned` - User account is permanently banned
- `deleted` - User account has been soft-deleted

---

### 2. User Model Enhancements (Gap G-002)

**Location:** `backend/prisma/schema.prisma` (lines 268-275)

**New Fields Added:**

```prisma
// Plan 129 Gap Closure - Status & LTV Fields
status                    UserStatus @default(active)
suspendedUntil            DateTime?  @map("suspended_until")
bannedAt                  DateTime?  @map("banned_at")
lifetimeValue             Int        @default(0) @map("lifetime_value") // In cents

// Plan 110 - Perpetual License Flag
hasActivePerpetualLicense Boolean    @default(false) @map("has_active_perpetual_license")
```

**Field Details:**

1. **status** (UserStatus, required)
   - Default: `active`
   - Database column: `status`
   - Purpose: Current account status (replaces multiple boolean flags)

2. **suspendedUntil** (DateTime?, optional)
   - Database column: `suspended_until`
   - Purpose: Expiration timestamp for temporary suspensions
   - NULL = permanent suspension/ban

3. **bannedAt** (DateTime?, optional)
   - Database column: `banned_at`
   - Purpose: Timestamp when user was permanently banned
   - Used for audit trail and compliance

4. **lifetimeValue** (Int, required)
   - Default: 0
   - Database column: `lifetime_value`
   - Purpose: User's total revenue in cents (calculated by background job)
   - Used for customer segmentation and retention analysis

5. **hasActivePerpetualLicense** (Boolean, required)
   - Default: false
   - Database column: `has_active_perpetual_license`
   - Purpose: Quick flag for perpetual license holders (denormalized for performance)

**Backward Compatibility:**
- Existing fields preserved: `isActive`, `deletedAt`, `deactivatedAt`
- Migration includes data backfill to set initial `status` values based on existing flags
- No breaking changes to existing queries

---

### 3. New User Relations (Gap G-001)

**Location:** `backend/prisma/schema.prisma` (lines 345-351)

```prisma
// Plan 129 Gap Closure - RBAC Enhancement Relations
approvalRequests     ApprovalRequest[] @relation("ApprovalRequester")
approvalReviews      ApprovalRequest[] @relation("ApprovalReviewer")
ipWhitelists         IPWhitelist[]     @relation("UserIPWhitelist")
suspensions          UserSuspension[]  @relation("UserSuspensions")
suspendedUsers       UserSuspension[]  @relation("SuspenderActions")
liftedSuspensions    UserSuspension[]  @relation("LifterActions")
```

**Relation Details:**

1. **approvalRequests** - ApprovalRequest[] (one-to-many)
   - User is the requester of approval requests
   - Relation name: `ApprovalRequester`

2. **approvalReviews** - ApprovalRequest[] (one-to-many)
   - User is the reviewer of approval requests
   - Relation name: `ApprovalReviewer`

3. **ipWhitelists** - IPWhitelist[] (one-to-many)
   - User has whitelisted IP addresses
   - Relation name: `UserIPWhitelist`

4. **suspensions** - UserSuspension[] (one-to-many)
   - User has been suspended (as the target)
   - Relation name: `UserSuspensions`

5. **suspendedUsers** - UserSuspension[] (one-to-many)
   - User has suspended other users (as the suspender)
   - Relation name: `SuspenderActions`

6. **liftedSuspensions** - UserSuspension[] (one-to-many)
   - User has lifted suspensions (as the lifter)
   - Relation name: `LifterActions`

---

### 4. New Table: ApprovalRequest (Gap G-001)

**Location:** `backend/prisma/schema.prisma` (lines 2014-2034)

**Purpose:** Tracks admin approval requests for sensitive operations requiring multi-tier authorization.

**Schema:**

```prisma
model ApprovalRequest {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestedBy    String    @map("requested_by") @db.Uuid
  action         String    @db.VarChar(100) // "subscriptions.refund", "users.ban"
  targetUserId   String?   @map("target_user_id") @db.Uuid
  reason         String    @db.Text
  status         String    @default("pending") @db.VarChar(20) // "pending", "approved", "denied"
  reviewedBy     String?   @map("reviewed_by") @db.Uuid
  reviewedAt     DateTime? @map("reviewed_at")
  reviewNotes    String?   @map("review_notes") @db.Text
  expiresAt      DateTime  @map("expires_at") // Auto-deny after 24h
  createdAt      DateTime  @default(now()) @map("created_at")

  requester User  @relation("ApprovalRequester", fields: [requestedBy], references: [id])
  reviewer  User? @relation("ApprovalReviewer", fields: [reviewedBy], references: [id])

  @@index([status])
  @@index([requestedBy])
  @@index([expiresAt])
  @@map("approval_requests")
}
```

**Key Features:**
- Auto-deny after 24 hours via `expiresAt` field
- Supports any action type via flexible `action` string
- Optional target user (for user-specific actions)
- Full audit trail with reviewer, timestamps, and notes
- Indexed on status, requester, and expiration for efficient queries

**Use Cases:**
- Subscription refunds (requires Super Admin approval)
- User bans (requires Admin+ approval)
- Bulk operations (requires Ops+ approval)
- Credit adjustments over threshold (requires Admin approval)

---

### 5. New Table: IPWhitelist (Gap G-001)

**Location:** `backend/prisma/schema.prisma` (lines 2039-2053)

**Purpose:** Tracks whitelisted IP addresses for Super Admin access control.

**Schema:**

```prisma
model IPWhitelist {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid // Super Admin user ID
  ipAddress   String   @map("ip_address") @db.VarChar(50) // CIDR notation
  description String?  @db.VarChar(255)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation("UserIPWhitelist", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive])
  @@index([ipAddress])
  @@map("ip_whitelists")
}
```

**Key Features:**
- CIDR notation support (e.g., "192.168.1.0/24", "10.0.0.1/32")
- Active/inactive flag for temporary disabling
- Optional description for documentation
- Cascade delete when user is deleted
- Indexed on user+active status and IP address

**Use Cases:**
- Super Admin access restricted to corporate VPN
- Emergency access from specific locations
- Temporary whitelist for remote work
- Audit trail of IP-based access control

**Security Notes:**
- Should be enforced at middleware level in backend
- Failed IP whitelist checks should be logged to AdminAuditLog
- Consider implementing rate limiting per IP address

---

### 6. New Table: UserSuspension (Gap G-001)

**Location:** `backend/prisma/schema.prisma` (lines 2058-2076)

**Purpose:** Tracks user suspension and ban events with reason, duration, and audit trail.

**Schema:**

```prisma
model UserSuspension {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  suspendedBy String    @map("suspended_by") @db.Uuid
  reason      String    @db.Text
  suspendedAt DateTime  @default(now()) @map("suspended_at")
  expiresAt   DateTime? @map("expires_at") // null = indefinite (ban)
  liftedAt    DateTime? @map("lifted_at")
  liftedBy    String?   @map("lifted_by") @db.Uuid

  user      User  @relation("UserSuspensions", fields: [userId], references: [id], onDelete: Cascade)
  suspender User  @relation("SuspenderActions", fields: [suspendedBy], references: [id])
  lifter    User? @relation("LifterActions", fields: [liftedBy], references: [id])

  @@index([userId])
  @@index([suspendedBy])
  @@index([expiresAt])
  @@map("user_suspensions")
}
```

**Key Features:**
- Temporary suspension: Set `expiresAt` to future timestamp
- Permanent ban: Set `expiresAt` to NULL
- Lift suspension: Set `liftedAt` and `liftedBy` fields
- Full audit trail: Who suspended, when, why, and who lifted
- Indexed on user, suspender, and expiration

**Use Cases:**
- Temporary suspension (7 days, 30 days, etc.)
- Permanent ban for ToS violations
- Suspension lifting workflow
- Audit trail for compliance

**Workflow:**
1. Admin creates UserSuspension record
2. User.status is updated to 'suspended' or 'banned'
3. User.suspendedUntil is set to expiresAt (if applicable)
4. Cron job checks for expired suspensions and auto-lifts
5. Admin can manually lift suspension by setting liftedAt/liftedBy

---

## Migration SQL Details

**File:** `/home/user/rephlo-sites/backend/prisma/migrations/20251110120000_add_rbac_tables_and_user_enhancements/migration.sql`

**Migration Steps:**

1. **Create UserStatus Enum**
   ```sql
   CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'banned', 'deleted');
   ```

2. **Alter Users Table**
   ```sql
   ALTER TABLE "users"
     ADD COLUMN "status" "user_status" NOT NULL DEFAULT 'active',
     ADD COLUMN "suspended_until" TIMESTAMP(3),
     ADD COLUMN "banned_at" TIMESTAMP(3),
     ADD COLUMN "lifetime_value" INTEGER NOT NULL DEFAULT 0,
     ADD COLUMN "has_active_perpetual_license" BOOLEAN NOT NULL DEFAULT false;
   ```

3. **Create approval_requests Table**
   - 11 columns (id, requested_by, action, target_user_id, reason, status, reviewed_by, reviewed_at, review_notes, expires_at, created_at)
   - 3 indexes (status, requested_by, expires_at)
   - 2 foreign keys (requested_by -> users.id, reviewed_by -> users.id)

4. **Create ip_whitelists Table**
   - 7 columns (id, user_id, ip_address, description, is_active, created_at, updated_at)
   - 2 indexes (user_id+is_active, ip_address)
   - 1 foreign key (user_id -> users.id with CASCADE delete)

5. **Create user_suspensions Table**
   - 8 columns (id, user_id, suspended_by, reason, suspended_at, expires_at, lifted_at, lifted_by)
   - 3 indexes (user_id, suspended_by, expires_at)
   - 3 foreign keys (user_id -> users.id, suspended_by -> users.id, lifted_by -> users.id)

6. **Data Backfill**
   ```sql
   -- Set initial status based on existing flags
   UPDATE "users"
   SET "status" = CASE
     WHEN "deleted_at" IS NOT NULL THEN 'deleted'::"user_status"
     WHEN "is_active" = false THEN 'suspended'::"user_status"
     ELSE 'active'::"user_status"
   END;

   -- Set suspended_until from deactivated_at
   UPDATE "users"
   SET "suspended_until" = "deactivated_at"
   WHERE "deactivated_at" IS NOT NULL AND "status" = 'suspended'::"user_status";
   ```

---

## Database Impact Analysis

### Table Count: +3 new tables
- `approval_requests`
- `ip_whitelists`
- `user_suspensions`

### Column Count: +5 new columns in users table
- `status` (enum, NOT NULL, default: 'active')
- `suspended_until` (timestamp, nullable)
- `banned_at` (timestamp, nullable)
- `lifetime_value` (integer, NOT NULL, default: 0)
- `has_active_perpetual_license` (boolean, NOT NULL, default: false)

### Index Count: +8 new indexes
- 3 on `approval_requests` (status, requested_by, expires_at)
- 2 on `ip_whitelists` (user_id+is_active, ip_address)
- 3 on `user_suspensions` (user_id, suspended_by, expires_at)

### Foreign Key Count: +6 new foreign keys
- 2 on `approval_requests` (requested_by, reviewed_by)
- 1 on `ip_whitelists` (user_id)
- 3 on `user_suspensions` (user_id, suspended_by, lifted_by)

### Enum Count: +1 new enum
- `user_status` (4 values: active, suspended, banned, deleted)

### Data Migration: 2 UPDATE statements
- Backfill `users.status` based on existing flags
- Backfill `users.suspended_until` from deactivated_at

---

## Execution Instructions

### Step 1: Verify Schema (Manual Check)

Since Prisma CLI is not available in the current environment due to network restrictions, verify the schema manually:

```bash
cd /home/user/rephlo-sites/backend
cat prisma/schema.prisma | grep -A 20 "model ApprovalRequest"
cat prisma/schema.prisma | grep -A 15 "model IPWhitelist"
cat prisma/schema.prisma | grep -A 20 "model UserSuspension"
cat prisma/schema.prisma | grep -A 10 "enum UserStatus"
```

### Step 2: Run Migration (When Network Available)

When network access is restored, run the migration:

```bash
cd /home/user/rephlo-sites/backend

# Generate Prisma client (will download engines if needed)
npm run prisma:generate

# Apply migration
npm run prisma:migrate deploy

# OR for development with interactive prompt
npm run prisma:migrate dev
```

### Step 3: Verify Migration Success

```bash
# Check database for new tables
psql $DATABASE_URL -c "\d approval_requests"
psql $DATABASE_URL -c "\d ip_whitelists"
psql $DATABASE_URL -c "\d user_suspensions"

# Check users table for new columns
psql $DATABASE_URL -c "\d users" | grep -E "(status|suspended_until|banned_at|lifetime_value|has_active_perpetual_license)"

# Check data backfill worked
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM users GROUP BY status;"
```

### Step 4: Test Prisma Client Generation

```bash
# This should complete without errors
npm run prisma:generate

# Verify types are generated
cat node_modules/.prisma/client/index.d.ts | grep -A 5 "ApprovalRequest"
cat node_modules/.prisma/client/index.d.ts | grep -A 5 "UserStatus"
```

---

## Rollback Plan

If issues arise, rollback with:

```sql
-- Drop new tables
DROP TABLE IF EXISTS "user_suspensions" CASCADE;
DROP TABLE IF EXISTS "ip_whitelists" CASCADE;
DROP TABLE IF EXISTS "approval_requests" CASCADE;

-- Remove new columns from users table
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "suspended_until",
  DROP COLUMN IF EXISTS "banned_at",
  DROP COLUMN IF EXISTS "lifetime_value",
  DROP COLUMN IF EXISTS "has_active_perpetual_license";

-- Drop enum
DROP TYPE IF EXISTS "user_status";
```

**Note:** This will lose any data in the new tables and columns. Ensure you have a database backup before running the migration in production.

---

## Testing Recommendations

### Unit Tests Needed:

1. **ApprovalRequest Service:**
   - Create approval request
   - Approve/deny approval request
   - Check expiration (24h auto-deny)
   - List pending requests by role

2. **IPWhitelist Service:**
   - Add IP to whitelist (CIDR validation)
   - Check IP against whitelist
   - Deactivate/reactivate IP
   - List active IPs for user

3. **UserSuspension Service:**
   - Suspend user (temporary)
   - Ban user (permanent)
   - Lift suspension
   - Check suspension status
   - Auto-lift expired suspensions (cron job)

4. **User Status Management:**
   - Update user status
   - Check status transitions (active -> suspended -> banned)
   - Prevent invalid status changes

### Integration Tests Needed:

1. **Approval Workflow:**
   - Admin requests refund -> Super Admin approves -> Refund executes
   - Admin requests ban -> Auto-deny after 24h

2. **IP Whitelist Enforcement:**
   - Super Admin login from whitelisted IP -> Success
   - Super Admin login from non-whitelisted IP -> Denied

3. **Suspension Workflow:**
   - Admin suspends user -> User cannot login
   - Suspension expires -> User can login
   - Admin lifts suspension -> User can login immediately

---

## Performance Considerations

### Indexes Added:
All frequently queried columns have indexes:
- approval_requests: status, requested_by, expires_at
- ip_whitelists: user_id+is_active, ip_address
- user_suspensions: user_id, suspended_by, expires_at

### Query Patterns Optimized:
1. "Find pending approval requests" - Indexed on status
2. "Find approval requests by requester" - Indexed on requested_by
3. "Find expired approval requests" - Indexed on expires_at
4. "Check if IP is whitelisted for user" - Indexed on user_id+is_active
5. "Find user suspensions" - Indexed on user_id
6. "Find suspensions by admin" - Indexed on suspended_by
7. "Find expired suspensions for cron job" - Indexed on expires_at

### Estimated Impact:
- New tables start empty, so minimal impact
- Users table adds 5 columns (minimal storage overhead)
- Data backfill updates all users (one-time operation, ~few seconds for 10k users)

---

## Security Considerations

### IP Whitelist Security:
- CIDR validation required in application layer
- Log all failed IP whitelist checks
- Consider rate limiting per IP
- Super Admin should have at least 2 whitelisted IPs

### Approval Request Security:
- Auto-deny after 24h prevents stale approvals
- Approval logs should be immutable (consider audit log)
- Sensitive actions should require approval (refunds, bans, bulk ops)

### User Suspension Security:
- Only Admin+ roles can suspend users
- Only Super Admin can ban users (permanent)
- Suspension reasons should be logged to AdminAuditLog
- Consider notification to user when suspended/banned

---

## Compliance & Audit

### GDPR Article 30:
- User status changes are tracked in UserSuspension table
- Reason for suspension/ban is mandatory
- Audit trail includes who, when, why

### SOC 2 Type II:
- Approval workflow for sensitive operations
- IP-based access control for Super Admin
- Immutable audit trail in UserSuspension

---

## Future Enhancements

### Recommended Follow-ups:

1. **Background Jobs:**
   - Cron job to auto-lift expired suspensions
   - Cron job to auto-deny expired approval requests
   - Background job to calculate lifetime_value

2. **Notifications:**
   - Email user when suspended/banned
   - Email admin when approval request created
   - Slack notification for sensitive approval requests

3. **Admin UI:**
   - Approval request dashboard
   - IP whitelist management
   - User suspension management
   - User status timeline view

4. **API Endpoints:**
   - POST /admin/approvals - Create approval request
   - GET /admin/approvals - List pending approvals
   - PATCH /admin/approvals/:id - Approve/deny request
   - POST /admin/ip-whitelist - Add IP to whitelist
   - GET /admin/ip-whitelist - List whitelisted IPs
   - POST /admin/users/:id/suspend - Suspend user
   - POST /admin/users/:id/ban - Ban user permanently
   - POST /admin/users/:id/lift-suspension - Lift suspension

---

## Files Modified

1. **Schema File:**
   - `/home/user/rephlo-sites/backend/prisma/schema.prisma`
   - Lines 230-238: Added UserStatus enum
   - Lines 268-275: Added 5 new fields to User model
   - Lines 345-351: Added 6 new relations to User model
   - Lines 2014-2076: Added 3 new models (ApprovalRequest, IPWhitelist, UserSuspension)

2. **Migration File:**
   - `/home/user/rephlo-sites/backend/prisma/migrations/20251110120000_add_rbac_tables_and_user_enhancements/migration.sql`
   - 147 lines of SQL (DDL + data backfill)

---

## Verification Checklist

- [x] UserStatus enum created with 4 values
- [x] 5 new fields added to User model
- [x] 6 new relations added to User model
- [x] ApprovalRequest model created with 11 fields
- [x] IPWhitelist model created with 7 fields
- [x] UserSuspension model created with 8 fields
- [x] All foreign key relations defined correctly
- [x] All indexes defined on frequently queried columns
- [x] Cascade deletes configured appropriately
- [x] Data backfill SQL written for status field
- [x] Migration SQL file created
- [ ] Prisma client generated (pending network access)
- [ ] Migration applied to database (pending network access)
- [ ] Integration tests written (future work)
- [ ] Admin UI endpoints implemented (future work)

---

## Contact & Support

For questions or issues with this migration, contact:
- **Database Architect:** Claude Code (Database Schema Architect)
- **Plan Reference:** Plan 129 - Gap Closure Implementation Plan
- **Documentation:** `/home/user/rephlo-sites/docs/plan/130-gap-closure-implementation-plan.md`

---

**End of Migration Summary**
