# Users Table Empty - Investigation Report

**Date:** 2025-11-14
**Status:** ⚠️ Data Loss - Investigation Complete
**Impact:** Critical - All users deleted from database

---

## Problem Summary

The `users` table is completely empty (0 records), while other tables still contain data.

---

## Investigation Findings

### Current Database State

```
Table Counts:
- users: 0          ❌ EMPTY
- oAuthClients: 4   ✅ Has data
- oidcModels: 57    ✅ Has data
- models: 19        ✅ Has data
```

###  Critical Conclusion: Cleanup Script Did NOT Cause This

**Evidence:**
1. ✅ `oidcModels` table still has 57 records
2. ✅ Cleanup script only deleted 2 invalid sessions
3. ✅ `oidc_models` has **NO foreign key** to `users` table
4. ✅ `accountId` is stored in JSON `payload` field (not an FK)
5. ✅ No CASCADE DELETE relationship exists from `oidc_models` → `users`

**Proof from cleanup script output:**
```
📊 Found 2 active sessions
❌ Invalid session: M4eqyWOjTeK_... - user not found
❌ Invalid session: NgwG1Cvj9D3t... - user not found

🗑️  Deleting 2 invalid sessions...
✅ Deleted 2 invalid sessions
```

**Still in database:** 57 `oidc_models` records remain (cleanup did NOT delete everything)

---

## Database Schema Analysis

### oidc_models Table Definition

```prisma
model oidc_models {
  id         String    @id @unique @db.VarChar(255)
  kind       String    @db.VarChar(100)
  payload    Json      // accountId stored HERE as JSON
  expires_at DateTime?
  grant_id   String?   @db.VarChar(255)
  user_code  String?   @db.VarChar(100)
  uid        String?   @db.VarChar(255)
  created_at DateTime  @default(now())

  // NO FOREIGN KEY TO USERS TABLE
  @@index([expires_at])
  @@index([grant_id])
  @@index([kind])
}
```

**Key Point:** There is **NO** `@relation` field referencing `users`. The `accountId` is stored inside the JSON `payload` field, so **no CASCADE DELETE** can occur.

### Cascade Deletes in Schema

The schema has many `onDelete: Cascade` relationships, but **none** of them go in reverse from `oidc_models` to `users`.

**Example of CASCADE DELETE (other tables → users):**
```prisma
model credit_allocation {
  user_id String @db.Uuid
  users   users  @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

This means: **When a user is deleted → cascades to credit_allocation**
It does NOT mean: When credit_allocation is deleted → cascades to users

---

## Possible Causes (Ranked by Likelihood)

### 1. Database Reset (Most Likely) ⭐

**Evidence:**
- Other tables (oAuthClients, models, oidcModels) still have data
- This pattern matches `npm run db:reset` followed by **incomplete seeding**

**Theory:**
```bash
cd backend
npm run db:reset  # Drops database, recreates schema, but seed fails/incomplete
```

If the seed script:
- Failed midway through
- Was interrupted (Ctrl+C)
- Encountered an error before creating users

**How to verify:**
- Check recent bash history for `db:reset` commands
- Look for seed script errors in terminal output

### 2. Manual User Deletion (Unlikely)

Someone ran a query like:
```sql
DELETE FROM users;
```

**Why unlikely:**
- Would require conscious effort
- Other data (OAuth clients, models) still exists

### 3. Application Bug with Cascade (Very Unlikely)

A bug in application code triggered a cascade delete.

**Why very unlikely:**
- No foreign keys exist from `oidc_models` → `users`
- Would need to be triggered from a different table
- Would have deleted related data too (subscriptions, credits, etc.)

---

##Timeline Reconstruction

Based on file timestamps and logs:

**Before cleanup (Unknown time):**
- Users table had users (referenced by the 2 invalid sessions)
- Users were deleted (mechanism unknown)

**During cleanup script (2025-11-14 00:23 UTC):**
- Script found 2 sessions referencing deleted users
- Deleted those 2 sessions from `oidc_models`
- Did NOT touch users table

**Current state:**
- Users table empty
- 57 `oidc_models` records still exist
- OAuth clients and models intact

---

## Technical Analysis

### Why Cleanup Script is Innocent

**Code from cleanup script:**
```typescript
await prisma.oIDCModel.deleteMany({
  where: {
    id: { in: invalidSessionIds },
    kind: 'Session'
  }
});
```

**This code:**
- ✅ Only deletes from `oidc_models` table
- ✅ Only deletes specific session IDs
- ✅ Has NO way to trigger CASCADE DELETE to users
- ✅ Uses `deleteMany` with explicit WHERE clause

**PostgreSQL Cascade Rules:**
- Cascade deletes flow FROM parent TO child
- `oidc_models` is NOT a parent of `users`
- No FK relationship exists

---

## Conclusion

**Root Cause:** Unknown (likely database reset), but **definitely NOT the session cleanup script**.

**Evidence Summary:**
1. ✅ No FK relationship from `oidc_models` to `users`
2. ✅ Cleanup script only deleted 2 sessions (57 remain)
3. ✅ No cascade delete path exists
4. ✅ Other tables still have data (suggesting selective deletion or incomplete seed)

**Recommendation:**
1. Re-run seed script to restore test users
2. Review bash/command history for database reset commands
3. Add database backup/snapshot before running maintenance scripts

---

## Recovery Actions

### Restore Test Users

```bash
cd backend
npm run seed
```

This will restore:
- free.user@example.com
- pro.user@example.com
- admin.test@rephlo.ai
- google.user@example.com
- ops.user@rephlo.ai
- support.user@rephlo.ai
- analyst.user@rephlo.ai
- auditor.user@rephlo.ai

### Prevention Measures

1. **Database Backups:** Take snapshots before maintenance
2. **Seed Script Robustness:** Ensure seed can handle partial failures
3. **Monitoring:** Alert on empty critical tables
4. **Audit Log:** Track all database schema changes

---

## Lessons Learned

### What We Learned

1. **JSON Fields Prevent Cascades** - Storing references in JSON (like `accountId` in `payload`) prevents database-level referential integrity
2. **Cleanup Scripts Need Defense** - Even innocent scripts can be blamed for pre-existing issues
3. **Forensic Analysis** - Table counts and FK relationships reveal the truth

### Best Practices

1. Always check table counts BEFORE running maintenance scripts
2. Document pre/post states for accountability
3. Use database transactions for multi-table operations
4. Consider adding foreign keys for critical relationships (instead of JSON storage)

---

## Related Documentation

- [Session Cleanup Script](../../identity-provider/scripts/cleanup-invalid-sessions.ts)
- [OIDC Models Schema](../reference/database-schema.md#oidc_models)
- [Database Reset Procedure](../guides/database-management.md)

---

## Appendix: Session Cleanup Script Code

```typescript
// This is what the cleanup script does:
const invalidSessionIds: string[] = []; // IDs of sessions to delete

// 1. Find sessions
const activeSessions = await prisma.oIDCModel.findMany({
  where: { kind: 'Session', expiresAt: { gt: new Date() }}
});

// 2. Validate each session
for (const session of activeSessions) {
  const accountId = session.payload?.accountId;
  const user = await prisma.user.findUnique({ where: { id: accountId }});

  if (!user || !user.isActive) {
    invalidSessionIds.push(session.id); // Mark for deletion
  }
}

// 3. Delete invalid sessions
await prisma.oIDCModel.deleteMany({
  where: { id: { in: invalidSessionIds }, kind: 'Session' }
});
```

**This code ONLY touches `oidc_models` table - never `users` table.**
