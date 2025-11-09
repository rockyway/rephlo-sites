# User-Role-Permission RBAC System Design

**Document ID**: 119-user-role-permission-rbac-design.md
**Created**: 2025-11-09
**Status**: Design Phase - Awaiting Approval
**Priority**: P0 (High)
**Target Version**: v2.1.0
**Related Plans**: 109 (Section 8: Admin Moderation), 115 (Master Orchestration)

---

## Executive Summary

This document provides a comprehensive Role-Based Access Control (RBAC) system design for operational team moderation within the Rephlo platform. The system implements 6 built-in hierarchical roles with granular permission management, temporary permission overrides, and complete audit logging.

**Key Features**:
- 6 hierarchical roles: Super Admin, Admin, Ops, Support, Analyst, Auditor
- 40+ granular permissions across 7 categories
- Permission override system with expiration
- Complete audit logging with IP tracking
- MFA enforcement for critical operations
- Admin UI for role and permission management

**Implementation Strategy**: Design-first approach with approval required before any code implementation.

---

## Table of Contents

1. [Core Entity Design](#core-entity-design)
2. [Role Hierarchy](#role-hierarchy)
3. [Permission Granularity](#permission-granularity)
4. [Permission Override System](#permission-override-system)
5. [Audit Logging Requirements](#audit-logging-requirements)
6. [Admin Moderation UI Design](#admin-moderation-ui-design)
7. [Security Measures](#security-measures)
8. [Database Schema Design](#database-schema-design)
9. [Migration Strategy](#migration-strategy)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)

---

## Core Entity Design

### 1. Role Entity

**Purpose**: Define reusable role templates with default permissions

**Fields**:
```typescript
interface Role {
  id: string;                      // UUID primary key
  name: string;                    // Unique role identifier (e.g., "super_admin", "ops")
  displayName: string;             // Human-readable name (e.g., "Super Administrator")
  description: string;             // Role purpose and scope
  isSystemRole: boolean;           // Prevents deletion/modification of built-in roles
  defaultPermissions: string[];    // Array of permission keys (e.g., ["users.view", "users.edit"])
  hierarchy: number;               // Hierarchy level (1=highest, 6=lowest)
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**System Roles** (isSystemRole = true):
- `super_admin` (hierarchy: 1)
- `admin` (hierarchy: 2)
- `ops` (hierarchy: 3)
- `support` (hierarchy: 4)
- `analyst` (hierarchy: 5)
- `auditor` (hierarchy: 6)

**Custom Roles** (isSystemRole = false):
- Admins can create custom roles by cloning/modifying system roles
- Custom roles cannot exceed the creator's permission scope
- Example: "Senior Support" (Support + limited credit adjustment)

**Business Rules**:
- System roles cannot be deleted or renamed
- System role default permissions can only be modified by Super Admin
- Role hierarchy is immutable (prevents permission escalation)
- Role names must be unique (case-insensitive)

---

### 2. Permission Entity

**Purpose**: Define atomic operations across the platform

**Storage Approach**: **Enum-based with database documentation**
- Permissions are defined as TypeScript enums (not database records)
- Faster permission checks (no JOIN queries)
- Database includes `permission_catalog` table for documentation/UI purposes

**Permission Structure**:
```typescript
enum PermissionKey {
  // Subscriptions (6 permissions)
  SUBSCRIPTIONS_VIEW = "subscriptions.view",
  SUBSCRIPTIONS_CREATE = "subscriptions.create",
  SUBSCRIPTIONS_EDIT = "subscriptions.edit",
  SUBSCRIPTIONS_CANCEL = "subscriptions.cancel",
  SUBSCRIPTIONS_REACTIVATE = "subscriptions.reactivate",
  SUBSCRIPTIONS_REFUND = "subscriptions.refund",  // requires_approval: true

  // Licenses (6 permissions)
  LICENSES_VIEW = "licenses.view",
  LICENSES_CREATE = "licenses.create",
  LICENSES_ACTIVATE = "licenses.activate",
  LICENSES_DEACTIVATE = "licenses.deactivate",
  LICENSES_SUSPEND = "licenses.suspend",
  LICENSES_REVOKE = "licenses.revoke",            // requires_approval: true

  // Coupons (7 permissions)
  COUPONS_VIEW = "coupons.view",
  COUPONS_CREATE = "coupons.create",
  COUPONS_EDIT = "coupons.edit",
  COUPONS_DELETE = "coupons.delete",
  COUPONS_APPROVE_REDEMPTION = "coupons.approve_redemption",
  CAMPAIGNS_CREATE = "campaigns.create",
  CAMPAIGNS_SET_BUDGET = "campaigns.set_budget",

  // Credits (5 permissions)
  CREDITS_VIEW_BALANCE = "credits.view_balance",
  CREDITS_VIEW_HISTORY = "credits.view_history",
  CREDITS_GRANT = "credits.grant",                // amount limits per role
  CREDITS_DEDUCT = "credits.deduct",              // requires_approval: true
  CREDITS_ADJUST_EXPIRATION = "credits.adjust_expiration",

  // Users (7 permissions)
  USERS_VIEW = "users.view",
  USERS_EDIT_PROFILE = "users.edit_profile",
  USERS_SUSPEND = "users.suspend",
  USERS_UNSUSPEND = "users.unsuspend",
  USERS_BAN = "users.ban",                        // requires_approval: true
  USERS_DELETE = "users.delete",                  // requires_approval: true
  USERS_IMPERSONATE = "users.impersonate",        // requires_approval: true

  // Roles (5 permissions)
  ROLES_VIEW = "roles.view",
  ROLES_CREATE = "roles.create",
  ROLES_EDIT = "roles.edit",
  ROLES_DELETE = "roles.delete",
  ROLES_ASSIGN = "roles.assign",
  ROLES_VIEW_AUDIT_LOG = "roles.view_audit_log",

  // Analytics (4 permissions)
  ANALYTICS_VIEW_DASHBOARD = "analytics.view_dashboard",
  ANALYTICS_VIEW_REVENUE = "analytics.view_revenue",
  ANALYTICS_VIEW_USAGE = "analytics.view_usage",
  ANALYTICS_EXPORT_DATA = "analytics.export_data",
}

interface PermissionMetadata {
  key: PermissionKey;
  category: PermissionCategory;
  name: string;                    // Human-readable name
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;       // If true, requires Super Admin approval workflow
  requiresMFA: boolean;            // If true, requires multi-factor authentication
}
```

**Permission Categories**:
```typescript
enum PermissionCategory {
  SUBSCRIPTIONS = "subscriptions",
  LICENSES = "licenses",
  COUPONS = "coupons",
  CREDITS = "credits",
  USERS = "users",
  ROLES = "roles",
  ANALYTICS = "analytics",
}
```

**Risk Level Classification**:
- **Low**: Read-only operations (view dashboard, view users)
- **Medium**: Routine admin operations (edit subscriptions, grant credits)
- **High**: Financial operations (issue refunds, deduct credits)
- **Critical**: Irreversible operations (delete users, ban accounts, revoke licenses)

**Approval-Required Permissions**:
- `subscriptions.refund` → Super Admin approval
- `licenses.revoke` → Super Admin approval
- `credits.deduct` → Super Admin approval
- `users.ban` → Super Admin approval
- `users.delete` → Super Admin approval (GDPR compliance check)
- `users.impersonate` → Super Admin approval + audit log

---

### 3. UserRoleAssignment Entity

**Purpose**: Links users to roles with optional permission overrides

**Fields**:
```typescript
interface UserRoleAssignment {
  id: string;                      // UUID primary key
  userId: string;                  // FK to User
  roleId: string;                  // FK to Role
  assignedBy: string;              // FK to User (admin who assigned)
  assignedAt: DateTime;
  expiresAt: DateTime | null;      // NULL = permanent, otherwise temporary role
  isActive: boolean;               // Auto-calculated based on expiresAt

  // Permission Overrides
  permissionOverrides: PermissionOverride[];  // JSON array

  // Metadata
  assignmentReason: string | null; // Optional reason for assignment
  notifyUser: boolean;             // Send email notification to user?

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface PermissionOverride {
  permission: PermissionKey;
  action: 'grant' | 'revoke';      // Grant temporary permission OR revoke default
  expiresAt: DateTime | null;      // NULL = permanent override
  reason: string;                  // Required for audit trail
  grantedBy: string;               // Admin user ID
  grantedAt: DateTime;
}
```

**Permission Override Examples**:

**Example 1: Grant Temporary Permission**
```json
{
  "permission": "licenses.revoke",
  "action": "grant",
  "expiresAt": "2025-11-10T23:59:59Z",
  "reason": "Emergency license fraud investigation",
  "grantedBy": "admin-uuid-123",
  "grantedAt": "2025-11-09T10:00:00Z"
}
```

**Example 2: Revoke Default Permission**
```json
{
  "permission": "credits.deduct",
  "action": "revoke",
  "expiresAt": null,
  "reason": "Training period restriction",
  "grantedBy": "admin-uuid-456",
  "grantedAt": "2025-11-01T09:00:00Z"
}
```

**Business Rules**:
- User can have multiple active role assignments (e.g., Ops + temporary Analyst)
- Effective permissions = Union of all active roles + permission overrides
- Overrides take precedence over role default permissions
- Expired overrides are automatically ignored (cleanup via cron job)
- Cannot override permissions user doesn't have via any role (security measure)

---

### 4. RoleChangeLog Entity

**Purpose**: Immutable audit trail of all role/permission changes

**Fields**:
```typescript
interface RoleChangeLog {
  id: string;                      // UUID primary key
  targetUserId: string;            // User whose role/permissions changed
  changedBy: string;               // Admin who made the change

  // Change Details
  action: RoleChangeAction;
  oldRoleId: string | null;
  newRoleId: string | null;
  oldPermissions: string[];        // Snapshot of effective permissions before change
  newPermissions: string[];        // Snapshot of effective permissions after change

  // Override Tracking
  permissionOverrideAdded: PermissionOverride | null;
  permissionOverrideRemoved: PermissionOverride | null;

  // Metadata
  reason: string | null;           // Admin-provided reason
  ipAddress: string;               // Admin's IP address
  userAgent: string;               // Admin's browser/client

  // Timestamps
  timestamp: DateTime;
}

enum RoleChangeAction {
  ROLE_ASSIGNED = "role_assigned",
  ROLE_REVOKED = "role_revoked",
  ROLE_CHANGED = "role_changed",
  PERMISSION_OVERRIDE_GRANTED = "permission_override_granted",
  PERMISSION_OVERRIDE_REVOKED = "permission_override_revoked",
  PERMISSION_OVERRIDE_EXPIRED = "permission_override_expired",
}
```

**Retention Policy**: 7 years (compliance requirement)

---

## Role Hierarchy

### Hierarchical Permission Model

**Hierarchy Levels**:
```
Level 1: Super Admin (Highest authority)
Level 2: Admin
Level 3: Operations (Ops)
Level 4: Support
Level 5: Analyst
Level 6: Auditor (Lowest authority)
```

**Inheritance Rules**:
- **NO hierarchical inheritance** (explicit permission grants only)
- Each role has independent permission sets
- Higher hierarchy level ≠ automatic access to lower role permissions
- Prevents accidental privilege escalation

**Role Assignment Rules**:
```typescript
function canAssignRole(adminUser: User, targetRole: Role): boolean {
  const adminHighestRole = getHighestRole(adminUser);

  // Rule 1: Super Admin can assign any role
  if (adminHighestRole.name === 'super_admin') {
    return true;
  }

  // Rule 2: Admin can assign roles LOWER than Super Admin
  if (adminHighestRole.name === 'admin' && targetRole.hierarchy > 1) {
    return true;
  }

  // Rule 3: Cannot assign roles equal to or higher than own role
  if (targetRole.hierarchy <= adminHighestRole.hierarchy) {
    return false;
  }

  return false;
}
```

---

### Role 1: Super Admin

**Purpose**: Platform owner/CTO with unrestricted access

**Default Permissions**: ALL permissions (40+)

**Special Privileges**:
- Create/edit/delete roles (including custom roles)
- Assign any role to any user
- Override any permission
- View all audit logs
- Access production database (read-only via admin tools)
- Configure system settings (payment gateways, API keys)
- Approve critical operations (refunds, bans, deletions)

**Restrictions**:
- Cannot be assigned to regular users (manual database insertion only)
- Requires hardware MFA token (YubiKey, Google Titan)
- IP whitelisting (only accessible from approved IPs)
- Session timeout: 15 minutes (re-authenticate frequently)

**Risk Level**: CRITICAL

**Use Cases**:
- Emergency system recovery
- Security incident response
- Compliance audits
- Critical financial operations

---

### Role 2: Admin

**Purpose**: Trusted operations lead with broad permissions (excluding system-critical)

**Default Permissions**: (35 permissions)

**Subscriptions**:
- ✅ subscriptions.view
- ✅ subscriptions.create
- ✅ subscriptions.edit
- ✅ subscriptions.cancel
- ✅ subscriptions.reactivate
- ✅ subscriptions.refund (with approval workflow)

**Licenses**:
- ✅ licenses.view
- ✅ licenses.create
- ✅ licenses.activate
- ✅ licenses.deactivate
- ✅ licenses.suspend
- ✅ licenses.revoke (with approval workflow)

**Coupons**:
- ✅ coupons.view
- ✅ coupons.create
- ✅ coupons.edit
- ✅ coupons.delete
- ✅ coupons.approve_redemption
- ✅ campaigns.create
- ✅ campaigns.set_budget

**Credits**:
- ✅ credits.view_balance
- ✅ credits.view_history
- ✅ credits.grant (up to $500 without approval)
- ✅ credits.deduct (with approval workflow)
- ✅ credits.adjust_expiration

**Users**:
- ✅ users.view
- ✅ users.edit_profile
- ✅ users.suspend
- ✅ users.unsuspend
- ✅ users.ban (with approval workflow)
- ✅ users.delete (with approval workflow)
- ❌ users.impersonate (Super Admin only)

**Roles**:
- ✅ roles.view
- ❌ roles.create (Super Admin only)
- ❌ roles.edit (Super Admin only)
- ❌ roles.delete (Super Admin only)
- ✅ roles.assign (except Super Admin role)
- ✅ roles.view_audit_log (own actions only)

**Analytics**:
- ✅ analytics.view_dashboard
- ✅ analytics.view_revenue
- ✅ analytics.view_usage
- ✅ analytics.export_data

**Restrictions**:
- Cannot assign Super Admin role
- Audit log limited to own actions (cannot view other admins' actions)
- Critical operations require approval from Super Admin
- Session timeout: 30 minutes

**Risk Level**: HIGH

---

### Role 3: Operations (Ops)

**Purpose**: Day-to-day subscription and license management

**Default Permissions**: (25 permissions)

**Subscriptions**:
- ✅ subscriptions.view
- ✅ subscriptions.create
- ✅ subscriptions.edit (upgrade, downgrade, change billing cycle)
- ✅ subscriptions.cancel
- ✅ subscriptions.reactivate
- ❌ subscriptions.refund (Admin+ only)

**Licenses**:
- ✅ licenses.view
- ✅ licenses.create
- ✅ licenses.activate
- ✅ licenses.deactivate
- ❌ licenses.suspend (Admin+ only)
- ❌ licenses.revoke (Admin+ only)

**Coupons**:
- ✅ coupons.view
- ✅ coupons.create (within campaign budgets)
- ✅ coupons.edit
- ❌ coupons.delete (Admin+ only)
- ✅ coupons.approve_redemption
- ✅ campaigns.create
- ❌ campaigns.set_budget (Admin+ only)

**Credits**:
- ✅ credits.view_balance
- ✅ credits.view_history
- ✅ credits.grant (up to $100 per transaction)
- ❌ credits.deduct (Admin+ only)
- ❌ credits.adjust_expiration (Admin+ only)

**Users**:
- ✅ users.view
- ✅ users.edit_profile
- ✅ users.suspend (up to 30 days)
- ✅ users.unsuspend
- ❌ users.ban (Admin+ only)
- ❌ users.delete (Admin+ only)

**Roles**:
- ✅ roles.view
- ❌ roles.assign (Admin+ only)

**Analytics**:
- ✅ analytics.view_dashboard
- ✅ analytics.view_revenue (aggregated only, no PII)
- ✅ analytics.view_usage
- ❌ analytics.export_data (Admin+ only)

**Credit Grant Limits**:
- Single transaction: $100 max
- Daily total: $500 max
- Monthly total: $2,000 max
- Exceeding limits triggers approval workflow

**Restrictions**:
- Cannot issue refunds (must escalate to Admin)
- Cannot permanently ban users (only temporary suspend)
- Cannot export raw analytics data (privacy protection)
- Session timeout: 60 minutes

**Risk Level**: MEDIUM

---

### Role 4: Support

**Purpose**: Customer support with read-mostly access + limited credit grants

**Default Permissions**: (12 permissions)

**Subscriptions**:
- ✅ subscriptions.view
- ❌ subscriptions.create (Ops+ only)
- ❌ subscriptions.edit (Ops+ only)
- ❌ subscriptions.cancel (Ops+ only)
- ❌ subscriptions.reactivate (Ops+ only)

**Licenses**:
- ✅ licenses.view
- ❌ licenses.create (Ops+ only)

**Coupons**:
- ✅ coupons.view
- ❌ coupons.create (Ops+ only)

**Credits**:
- ✅ credits.view_balance
- ✅ credits.view_history
- ✅ credits.grant (up to $50 per transaction, grant only)
- ❌ credits.deduct (Ops+ only)

**Users**:
- ✅ users.view
- ❌ users.edit_profile (Ops+ only)
- ❌ users.suspend (Ops+ only)
- ✅ users.unsuspend (can lift suspensions created by Ops)
- ❌ users.ban (Ops+ only)

**Roles**:
- ✅ roles.view

**Analytics**:
- ✅ analytics.view_dashboard (limited metrics)
- ❌ analytics.view_revenue (Admin+ only)
- ✅ analytics.view_usage
- ❌ analytics.export_data (Admin+ only)

**Credit Grant Limits**:
- Single transaction: $50 max
- Daily total: $200 max
- Monthly total: $1,000 max
- Can ONLY grant credits (cannot deduct)

**Restrictions**:
- Cannot modify subscriptions (escalate to Ops)
- Cannot suspend users (can only unsuspend)
- Cannot view revenue metrics (privacy protection)
- Session timeout: 120 minutes

**Risk Level**: LOW

---

### Role 5: Analyst

**Purpose**: Business intelligence and reporting (read-only analytics)

**Default Permissions**: (8 permissions)

**Subscriptions**:
- ✅ subscriptions.view

**Licenses**:
- ✅ licenses.view

**Coupons**:
- ✅ coupons.view

**Credits**:
- ✅ credits.view_balance
- ✅ credits.view_history

**Users**:
- ✅ users.view (PII masked: email, name, payment methods)

**Roles**:
- ✅ roles.view

**Analytics**:
- ✅ analytics.view_dashboard
- ✅ analytics.view_revenue
- ✅ analytics.view_usage
- ✅ analytics.export_data (anonymized data only)

**Data Masking**:
- Email: `user123***@***.com` → `u*****3@example.com`
- Name: `John Doe` → `J*** D**`
- Payment methods: `****1234` (last 4 digits only)
- IP addresses: `192.168.***.**`
- SSN/Tax ID: Completely hidden

**Restrictions**:
- Cannot modify any data (100% read-only)
- Cannot view raw PII (masked data only)
- Cannot access individual user transactions (aggregated only)
- Session timeout: 240 minutes

**Risk Level**: LOW

---

### Role 6: Auditor

**Purpose**: Compliance and audit trail review (read-only audit logs)

**Default Permissions**: (5 permissions)

**Subscriptions**:
- ✅ subscriptions.view (audit trail only)

**Licenses**:
- ✅ licenses.view (audit trail only)

**Users**:
- ✅ users.view (audit trail only)

**Roles**:
- ✅ roles.view
- ✅ roles.view_audit_log (ALL actions, all admins)

**Analytics**:
- ✅ analytics.view_dashboard (compliance metrics)

**Special Access**:
- Full access to `RoleChangeLog` (all admin actions)
- Full access to `AdminAuditLog` (all system changes)
- Financial transaction history (for compliance audits)
- User deletion logs (GDPR compliance tracking)

**Restrictions**:
- Cannot modify any data (100% read-only)
- Cannot export audit logs (print/view only for security)
- Cannot access real-time system (historical data only, 24-hour delay)
- Session timeout: 480 minutes (8 hours)

**Risk Level**: LOW

---

## Permission Granularity

### CRUD-Level Permissions

Each feature area has granular CRUD (Create, Read, Update, Delete) permissions:

**Subscriptions** (6 permissions):
```typescript
const subscriptionPermissions = {
  view: {
    key: "subscriptions.view",
    description: "View subscription details, status, and history",
    riskLevel: "low",
    scope: ["read"],
  },
  create: {
    key: "subscriptions.create",
    description: "Create new subscriptions for users",
    riskLevel: "medium",
    scope: ["write"],
  },
  edit: {
    key: "subscriptions.edit",
    description: "Modify existing subscriptions (tier, billing cycle)",
    riskLevel: "medium",
    scope: ["write"],
  },
  cancel: {
    key: "subscriptions.cancel",
    description: "Cancel active subscriptions",
    riskLevel: "medium",
    scope: ["write"],
  },
  reactivate: {
    key: "subscriptions.reactivate",
    description: "Reactivate cancelled subscriptions",
    riskLevel: "medium",
    scope: ["write"],
  },
  refund: {
    key: "subscriptions.refund",
    description: "Issue partial or full refunds",
    riskLevel: "high",
    scope: ["write", "financial"],
    requiresApproval: true,
  },
};
```

**Licenses** (6 permissions):
```typescript
const licensePermissions = {
  view: {
    key: "licenses.view",
    description: "View perpetual license details and activations",
    riskLevel: "low",
  },
  create: {
    key: "licenses.create",
    description: "Generate new perpetual licenses",
    riskLevel: "medium",
  },
  activate: {
    key: "licenses.activate",
    description: "Activate license on new device",
    riskLevel: "low",
  },
  deactivate: {
    key: "licenses.deactivate",
    description: "Deactivate license from device",
    riskLevel: "medium",
  },
  suspend: {
    key: "licenses.suspend",
    description: "Temporarily suspend license (payment issues)",
    riskLevel: "high",
  },
  revoke: {
    key: "licenses.revoke",
    description: "Permanently revoke license (fraud/abuse)",
    riskLevel: "critical",
    requiresApproval: true,
  },
};
```

**Coupons** (7 permissions):
```typescript
const couponPermissions = {
  view: {
    key: "coupons.view",
    description: "View coupon codes and campaigns",
    riskLevel: "low",
  },
  create: {
    key: "coupons.create",
    description: "Create new coupon codes",
    riskLevel: "medium",
  },
  edit: {
    key: "coupons.edit",
    description: "Modify existing coupon parameters",
    riskLevel: "medium",
  },
  delete: {
    key: "coupons.delete",
    description: "Delete coupon codes",
    riskLevel: "high",
  },
  approve_redemption: {
    key: "coupons.approve_redemption",
    description: "Manually approve flagged coupon redemptions",
    riskLevel: "medium",
  },
  campaigns_create: {
    key: "campaigns.create",
    description: "Create promotional campaigns",
    riskLevel: "medium",
  },
  campaigns_set_budget: {
    key: "campaigns.set_budget",
    description: "Set campaign budget limits",
    riskLevel: "high",
  },
};
```

**Credits** (5 permissions):
```typescript
const creditPermissions = {
  view_balance: {
    key: "credits.view_balance",
    description: "View user credit balances",
    riskLevel: "low",
  },
  view_history: {
    key: "credits.view_history",
    description: "View credit transaction history",
    riskLevel: "low",
  },
  grant: {
    key: "credits.grant",
    description: "Grant credits to users (amount limits apply)",
    riskLevel: "medium",
    amountLimits: {
      super_admin: Infinity,
      admin: 50000,        // $500 max
      ops: 10000,          // $100 max
      support: 5000,       // $50 max
      analyst: 0,
      auditor: 0,
    },
  },
  deduct: {
    key: "credits.deduct",
    description: "Deduct credits from users",
    riskLevel: "high",
    requiresApproval: true,
  },
  adjust_expiration: {
    key: "credits.adjust_expiration",
    description: "Modify credit expiration dates",
    riskLevel: "medium",
  },
};
```

**Users** (7 permissions):
```typescript
const userPermissions = {
  view: {
    key: "users.view",
    description: "View user profiles and account details",
    riskLevel: "low",
  },
  edit_profile: {
    key: "users.edit_profile",
    description: "Modify user profile information",
    riskLevel: "medium",
  },
  suspend: {
    key: "users.suspend",
    description: "Temporarily suspend user accounts",
    riskLevel: "high",
  },
  unsuspend: {
    key: "users.unsuspend",
    description: "Lift user account suspensions",
    riskLevel: "medium",
  },
  ban: {
    key: "users.ban",
    description: "Permanently ban user accounts",
    riskLevel: "critical",
    requiresApproval: true,
  },
  delete: {
    key: "users.delete",
    description: "Delete user accounts (GDPR compliance)",
    riskLevel: "critical",
    requiresApproval: true,
    requiresGDPRCheck: true,
  },
  impersonate: {
    key: "users.impersonate",
    description: "Impersonate users for debugging (Super Admin only)",
    riskLevel: "critical",
    requiresApproval: true,
    requiresMFA: true,
  },
};
```

**Roles** (5 permissions):
```typescript
const rolePermissions = {
  view: {
    key: "roles.view",
    description: "View roles and permissions",
    riskLevel: "low",
  },
  create: {
    key: "roles.create",
    description: "Create custom roles",
    riskLevel: "high",
  },
  edit: {
    key: "roles.edit",
    description: "Modify role permissions",
    riskLevel: "high",
  },
  delete: {
    key: "roles.delete",
    description: "Delete custom roles",
    riskLevel: "high",
  },
  assign: {
    key: "roles.assign",
    description: "Assign roles to users",
    riskLevel: "high",
  },
  view_audit_log: {
    key: "roles.view_audit_log",
    description: "View role change audit logs",
    riskLevel: "medium",
  },
};
```

**Analytics** (4 permissions):
```typescript
const analyticsPermissions = {
  view_dashboard: {
    key: "analytics.view_dashboard",
    description: "View analytics dashboard",
    riskLevel: "low",
  },
  view_revenue: {
    key: "analytics.view_revenue",
    description: "View revenue metrics and financial reports",
    riskLevel: "medium",
  },
  view_usage: {
    key: "analytics.view_usage",
    description: "View usage metrics and API call statistics",
    riskLevel: "low",
  },
  export_data: {
    key: "analytics.export_data",
    description: "Export analytics data to CSV/Excel",
    riskLevel: "medium",
  },
};
```

---

## Permission Override System

### Use Cases

**Temporary Permission Grants**:
1. Emergency fraud investigation → Grant `licenses.revoke` to Ops for 24 hours
2. One-time credit adjustment → Grant `credits.deduct` to Admin for 1 hour
3. Training period → Grant read-only permissions to new hire for 7 days

**Permanent Permission Revocations**:
1. Junior Ops → Revoke `credits.grant` permanently (awaiting training)
2. Support agent mistake → Revoke `users.unsuspend` for 30 days
3. Compliance restriction → Revoke `analytics.export_data` permanently

### Override Workflow

**Step 1: Admin Initiates Override**
```typescript
interface PermissionOverrideRequest {
  targetUserId: string;
  permission: PermissionKey;
  action: 'grant' | 'revoke';
  duration: number | null;         // Duration in hours, NULL = permanent
  reason: string;                  // Required justification
  notifyUser: boolean;             // Send email to target user?
}
```

**Step 2: Validation**
```typescript
function validateOverrideRequest(
  adminUser: User,
  request: PermissionOverrideRequest
): ValidationResult {
  // Check 1: Admin has permission to grant/revoke
  if (!hasPermission(adminUser, 'roles.assign')) {
    return { valid: false, error: 'Insufficient permissions' };
  }

  // Check 2: Admin cannot grant permissions they don't have
  if (request.action === 'grant' && !hasPermission(adminUser, request.permission)) {
    return { valid: false, error: 'Cannot grant permission you do not have' };
  }

  // Check 3: Reason is required
  if (!request.reason || request.reason.length < 10) {
    return { valid: false, error: 'Reason must be at least 10 characters' };
  }

  // Check 4: Duration limits
  if (request.duration && request.duration > 720) { // 30 days max
    return { valid: false, error: 'Maximum override duration is 30 days (720 hours)' };
  }

  return { valid: true };
}
```

**Step 3: Apply Override**
```typescript
async function applyPermissionOverride(
  adminUser: User,
  request: PermissionOverrideRequest
): Promise<PermissionOverride> {
  const override: PermissionOverride = {
    permission: request.permission,
    action: request.action,
    expiresAt: request.duration
      ? addHours(new Date(), request.duration)
      : null,
    reason: request.reason,
    grantedBy: adminUser.id,
    grantedAt: new Date(),
  };

  // Update UserRoleAssignment.permissionOverrides
  await updateUserRoleAssignment(request.targetUserId, override);

  // Log to RoleChangeLog
  await logRoleChange({
    targetUserId: request.targetUserId,
    changedBy: adminUser.id,
    action: request.action === 'grant'
      ? 'permission_override_granted'
      : 'permission_override_revoked',
    permissionOverrideAdded: override,
    reason: request.reason,
  });

  // Send notification email
  if (request.notifyUser) {
    await sendPermissionOverrideNotification(request.targetUserId, override);
  }

  return override;
}
```

**Step 4: Permission Check Logic**
```typescript
function hasPermission(user: User, permission: PermissionKey): boolean {
  // Get all active role assignments
  const assignments = getUserRoleAssignments(user.id)
    .filter(a => a.isActive && (!a.expiresAt || a.expiresAt > new Date()));

  // Collect default permissions from all roles
  const defaultPermissions = new Set<PermissionKey>();
  for (const assignment of assignments) {
    const role = getRole(assignment.roleId);
    role.defaultPermissions.forEach(p => defaultPermissions.add(p));
  }

  // Apply permission overrides
  let hasPermission = defaultPermissions.has(permission);

  for (const assignment of assignments) {
    for (const override of assignment.permissionOverrides) {
      // Skip expired overrides
      if (override.expiresAt && override.expiresAt < new Date()) {
        continue;
      }

      if (override.permission === permission) {
        if (override.action === 'grant') {
          hasPermission = true;
        } else if (override.action === 'revoke') {
          hasPermission = false;
        }
      }
    }
  }

  return hasPermission;
}
```

### Override Expiration

**Automatic Cleanup** (Cron job runs hourly):
```typescript
async function cleanupExpiredOverrides() {
  const now = new Date();

  // Find all expired overrides
  const assignments = await db.userRoleAssignment.findMany({
    where: {
      permissionOverrides: {
        path: '$.expiresAt',
        lt: now,
      },
    },
  });

  for (const assignment of assignments) {
    const activeOverrides = assignment.permissionOverrides.filter(
      o => !o.expiresAt || o.expiresAt > now
    );

    const expiredOverrides = assignment.permissionOverrides.filter(
      o => o.expiresAt && o.expiresAt <= now
    );

    // Update assignment (remove expired overrides)
    await db.userRoleAssignment.update({
      where: { id: assignment.id },
      data: { permissionOverrides: activeOverrides },
    });

    // Log expiration
    for (const override of expiredOverrides) {
      await logRoleChange({
        targetUserId: assignment.userId,
        changedBy: 'system',
        action: 'permission_override_expired',
        permissionOverrideRemoved: override,
        reason: 'Automatic expiration',
      });
    }
  }
}
```

### Override UI Examples

**Admin Dashboard - Permission Override Modal**:
```
┌─────────────────────────────────────────────────────────────┐
│ Grant Temporary Permission                                  │
├─────────────────────────────────────────────────────────────┤
│ User: john.doe@example.com (Ops)                            │
│                                                              │
│ Permission:                                                 │
│ [licenses.revoke ▼] 🔴 CRITICAL                            │
│                                                              │
│ Duration:                                                   │
│ ⚪ 1 hour   ⚪ 4 hours   ⚪ 24 hours   ● Custom             │
│ [24] hours  [Calculate expiration: Nov 10, 2025 10:00 AM]  │
│                                                              │
│ Reason (required):                                          │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Emergency fraud investigation - suspected license     │  │
│ │ abuse by user ID abc-123. Need to revoke licenses    │  │
│ │ for 3 suspicious accounts.                            │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                              │
│ ☑ Notify user via email                                    │
│ ☑ Require MFA confirmation before granting                 │
│                                                              │
│ [ Cancel ]                           [ Grant Permission ]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Audit Logging Requirements

### Logged Events

**All Permission-Sensitive Actions**:
```typescript
interface AuditLogEntry {
  id: string;
  actorUserId: string;            // Admin who performed action
  targetUserId: string | null;    // User affected (if applicable)

  // Action Details
  action: AuditAction;
  resourceType: string;            // "subscription", "license", "coupon", etc.
  resourceId: string | null;

  // Change Tracking
  oldValue: JSON | null;           // Snapshot before change
  newValue: JSON | null;           // Snapshot after change

  // Context
  reason: string | null;           // Admin-provided reason
  ipAddress: string;
  userAgent: string;

  // Timestamps
  timestamp: DateTime;
}

enum AuditAction {
  // Subscription actions
  SUBSCRIPTION_CREATED = "subscription.created",
  SUBSCRIPTION_UPGRADED = "subscription.upgraded",
  SUBSCRIPTION_DOWNGRADED = "subscription.downgraded",
  SUBSCRIPTION_CANCELLED = "subscription.cancelled",
  SUBSCRIPTION_REFUNDED = "subscription.refunded",

  // License actions
  LICENSE_CREATED = "license.created",
  LICENSE_ACTIVATED = "license.activated",
  LICENSE_DEACTIVATED = "license.deactivated",
  LICENSE_SUSPENDED = "license.suspended",
  LICENSE_REVOKED = "license.revoked",

  // Credit actions
  CREDITS_GRANTED = "credits.granted",
  CREDITS_DEDUCTED = "credits.deducted",
  CREDITS_EXPIRATION_ADJUSTED = "credits.expiration_adjusted",

  // User actions
  USER_SUSPENDED = "user.suspended",
  USER_UNSUSPENDED = "user.unsuspended",
  USER_BANNED = "user.banned",
  USER_DELETED = "user.deleted",
  USER_IMPERSONATED = "user.impersonated",

  // Role actions
  ROLE_ASSIGNED = "role.assigned",
  ROLE_REVOKED = "role.revoked",
  PERMISSION_OVERRIDE_GRANTED = "permission.override_granted",
  PERMISSION_OVERRIDE_REVOKED = "permission.override_revoked",

  // Coupon actions
  COUPON_CREATED = "coupon.created",
  COUPON_DELETED = "coupon.deleted",
  CAMPAIGN_CREATED = "campaign.created",
  CAMPAIGN_BUDGET_SET = "campaign.budget_set",
}
```

### Example Audit Logs

**Example 1: License Revocation**
```json
{
  "id": "log-uuid-123",
  "actorUserId": "admin-uuid-456",
  "targetUserId": "user-uuid-789",
  "action": "license.revoked",
  "resourceType": "perpetual_license",
  "resourceId": "license-uuid-abc",
  "oldValue": {
    "licenseKey": "REPHLO-1234-5678-9ABC-DEF0",
    "status": "active",
    "currentActivations": 3
  },
  "newValue": {
    "licenseKey": "REPHLO-1234-5678-9ABC-DEF0",
    "status": "revoked",
    "currentActivations": 0
  },
  "reason": "Fraud detection: license shared publicly on torrent site",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": "2025-11-09T14:30:00Z"
}
```

**Example 2: Credit Grant**
```json
{
  "id": "log-uuid-456",
  "actorUserId": "ops-uuid-789",
  "targetUserId": "user-uuid-abc",
  "action": "credits.granted",
  "resourceType": "credit_allocation",
  "resourceId": "credit-uuid-def",
  "oldValue": {
    "balance": 5000,
    "totalCredits": 20000
  },
  "newValue": {
    "balance": 15000,
    "totalCredits": 30000
  },
  "reason": "Compensation for API downtime on Nov 8 (3 hours)",
  "ipAddress": "10.0.2.50",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "timestamp": "2025-11-09T09:15:00Z"
}
```

**Example 3: Permission Override Grant**
```json
{
  "id": "log-uuid-789",
  "actorUserId": "admin-uuid-123",
  "targetUserId": "ops-uuid-456",
  "action": "permission.override_granted",
  "resourceType": "user_role_assignment",
  "resourceId": "assignment-uuid-ghi",
  "oldValue": {
    "roleId": "ops-role-uuid",
    "permissionOverrides": []
  },
  "newValue": {
    "roleId": "ops-role-uuid",
    "permissionOverrides": [
      {
        "permission": "licenses.revoke",
        "action": "grant",
        "expiresAt": "2025-11-10T14:30:00Z",
        "reason": "Emergency fraud investigation",
        "grantedBy": "admin-uuid-123",
        "grantedAt": "2025-11-09T14:30:00Z"
      }
    ]
  },
  "reason": "Emergency fraud investigation - suspected license abuse",
  "ipAddress": "192.168.1.200",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0",
  "timestamp": "2025-11-09T14:30:00Z"
}
```

### Audit Log Retention

**Retention Policy**:
- **Active Logs**: 2 years (hot storage, PostgreSQL)
- **Archived Logs**: 5 years (cold storage, S3 Glacier)
- **Permanent Retention**: Critical actions (bans, deletions, refunds) retained indefinitely

**Compliance Requirements**:
- SOC 2 Type II: 1 year minimum
- GDPR Article 30: 3 years minimum
- Financial regulations (Stripe): 7 years minimum
- Our policy: **7 years** (maximum compliance coverage)

---

## Admin Moderation UI Design

### Page 1: Roles List Page

**URL**: `/admin/roles`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Roles & Permissions                                    [+ Create Role]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Filters:  ☑ System Roles   ☐ Custom Roles   [ Search... ]              │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Role Name       │ Type   │ Users │ Permissions │ Actions          │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Super Admin 🔴  │ System │   2   │    40/40    │ [View] [Edit]   │ │
│ │ Admin 🟠        │ System │   5   │    35/40    │ [View] [Edit]   │ │
│ │ Ops 🟡          │ System │  12   │    25/40    │ [View] [Edit]   │ │
│ │ Support 🟢      │ System │  30   │    12/40    │ [View] [Edit]   │ │
│ │ Analyst 🔵      │ System │   8   │     8/40    │ [View] [Edit]   │ │
│ │ Auditor 🟣      │ System │   3   │     5/40    │ [View] [Edit]   │ │
│ │ Senior Support  │ Custom │   5   │    15/40    │ [Edit] [Delete] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Showing 7 roles                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Filter by system/custom roles
- Search by role name
- User count per role (click to view user list)
- Permission count (e.g., "35/40" = 35 out of 40 total permissions)
- Color-coded risk levels (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
- Actions: View details, Edit permissions, Delete (disabled for system roles)

---

### Page 2: Role Detail/Edit Page

**URL**: `/admin/roles/:roleId`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Roles                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Role: Operations (Ops) 🟡                          [Save Changes]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Role Name:        [Operations                            ]              │
│ Display Name:     [Operations (Ops)                      ]              │
│ Description:      ┌────────────────────────────────────┐                │
│                   │ Day-to-day subscription and license │                │
│                   │ management                          │                │
│                   └────────────────────────────────────┘                │
│ Hierarchy Level:  [3 (Medium authority)                  ]              │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Permissions (25 selected)                                        │   │
│ ├──────────────────────────────────────────────────────────────────┤   │
│ │                                                                   │   │
│ │ ▼ Subscriptions (5/6)                                            │   │
│ │   ☑ subscriptions.view       🟢 Low                              │   │
│ │   ☑ subscriptions.create     🟡 Medium                           │   │
│ │   ☑ subscriptions.edit       🟡 Medium                           │   │
│ │   ☑ subscriptions.cancel     🟡 Medium                           │   │
│ │   ☑ subscriptions.reactivate 🟡 Medium                           │   │
│ │   ☐ subscriptions.refund     🟠 High (Approval required)         │   │
│ │                                                                   │   │
│ │ ▼ Licenses (4/6)                                                 │   │
│ │   ☑ licenses.view            🟢 Low                              │   │
│ │   ☑ licenses.create          🟡 Medium                           │   │
│ │   ☑ licenses.activate        🟢 Low                              │   │
│ │   ☑ licenses.deactivate      🟡 Medium                           │   │
│ │   ☐ licenses.suspend         🟠 High                             │   │
│ │   ☐ licenses.revoke          🔴 Critical (Approval required)     │   │
│ │                                                                   │   │
│ │ ▼ Credits (4/5)                                                  │   │
│ │   ☑ credits.view_balance     🟢 Low                              │   │
│ │   ☑ credits.view_history     🟢 Low                              │   │
│ │   ☑ credits.grant            🟡 Medium (Max $100/transaction)    │   │
│ │   ☐ credits.deduct           🟠 High (Approval required)         │   │
│ │   ☐ credits.adjust_expiration 🟡 Medium                          │   │
│ │                                                                   │   │
│ │ [ Collapse All ]                                                 │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Users with this Role (12)                                        │   │
│ ├──────────────────────────────────────────────────────────────────┤   │
│ │ john.doe@example.com      Assigned: Nov 1, 2025  [View] [Remove]│   │
│ │ jane.smith@example.com    Assigned: Oct 15, 2025 [View] [Remove]│   │
│ │ ...                                                              │   │
│ │ [ View All Users ]                                               │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Role Change History (Last 30 days)                               │   │
│ ├──────────────────────────────────────────────────────────────────┤   │
│ │ Nov 8, 2025 - Admin (admin@example.com)                          │   │
│ │   Added permission: subscriptions.reactivate                     │   │
│ │   Reason: "Expanded Ops authority for reactivations"             │   │
│ │                                                                   │   │
│ │ Oct 20, 2025 - Super Admin (cto@example.com)                     │   │
│ │   Revoked permission: licenses.suspend                           │   │
│ │   Reason: "Escalate suspensions to Admin level"                  │   │
│ │                                                                   │   │
│ │ [ View Full History ]                                            │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Permission matrix organized by category (collapsible)
- Visual risk level indicators (🔴🟠🟡🟢)
- "Approval required" badges for high-risk permissions
- Amount limits displayed for `credits.grant`
- User assignment list with quick view/remove actions
- Role change history timeline with reason display
- Save button (disabled for system roles unless Super Admin)

---

### Page 3: User Assignment Page

**URL**: `/admin/roles/assignments`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Role Assignments                                   [+ Assign Roles]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Filters:  Role: [All ▼]   Status: [Active ▼]   [ Search user... ]      │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ User               │ Roles          │ Overrides │ Expires │ Actions│ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ john.doe@example.c │ Ops            │     0     │    -    │[Edit]  │ │
│ │ jane.smith@example │ Admin          │     1     │    -    │[Edit]  │ │
│ │ bob.jones@example. │ Support, Ops   │     2     │ Nov 15  │[Edit]  │ │
│ │ alice.wong@example │ Analyst        │     0     │    -    │[Edit]  │ │
│ │ ...                                                                │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Showing 45 users with role assignments                                 │
└─────────────────────────────────────────────────────────────────────────┘

Click [Edit] on jane.smith@example.com:

┌─────────────────────────────────────────────────────────────────────────┐
│ Edit Role Assignment: jane.smith@example.com                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Current Roles:                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ● Admin (assigned Nov 1, 2025 by cto@example.com)                  │ │
│ │   [View Role] [Remove]                                             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Add Role:                                                               │
│ [Select role ▼]  Expiration: ⚪ Permanent  ⚪ Temporary [7] days       │
│ Reason: ┌─────────────────────────────────────────────────────────┐   │
│         │                                                          │   │
│         └─────────────────────────────────────────────────────────┘   │
│ [ + Add Role ]                                                         │
│                                                                          │
│ Permission Overrides (1):                                              │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ credits.deduct (granted)                                         │ │
│ │    Granted by: cto@example.com on Nov 8, 2025                      │ │
│ │    Expires: Permanent                                              │ │
│ │    Reason: "Senior admin with financial operations experience"     │ │
│ │    [Revoke Override]                                               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ [ + Add Override ]                                                     │
│                                                                          │
│ Role History:                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Nov 8, 2025 - Permission override granted: credits.deduct          │ │
│ │   By: cto@example.com                                              │ │
│ │   Reason: "Senior admin with financial operations experience"      │ │
│ │                                                                     │ │
│ │ Nov 1, 2025 - Role assigned: Admin                                 │ │
│ │   By: cto@example.com                                              │ │
│ │   Reason: "Promoted from Ops to Admin"                             │ │
│ │                                                                     │ │
│ │ [ View Full History ]                                              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ [ Cancel ]                                          [ Save Changes ]   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- User list with role badges and override counts
- Quick search and filter by role/status
- Inline role assignment with expiration options
- Permission override management (add/revoke)
- Timeline view of role change history
- Reason field required for all changes

---

### Page 4: Permission Override Modal

**URL**: Modal triggered from User Assignment Page

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Add Permission Override                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ User: jane.smith@example.com                                            │
│ Current Role: Admin                                                     │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Current Permissions (35)                     [View Permission List]│ │
│ │ ✅ All subscription operations (6/6)                                │ │
│ │ ✅ All license operations (6/6)                                     │ │
│ │ ✅ All coupon operations (7/7)                                      │ │
│ │ ✅ Credit view, grant, adjust expiration (4/5)                      │ │
│ │ ❌ credits.deduct (requires Super Admin)                            │ │
│ │ ✅ All user operations except impersonate (6/7)                     │ │
│ │ ...                                                                 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Override Action:                                                        │
│ ⚪ Grant temporary permission    ● Revoke default permission           │
│                                                                          │
│ Permission to Override:                                                │
│ [credits.deduct ▼]                                                     │
│                                                                          │
│ ⚠️  CRITICAL PERMISSION                                                │
│ Risk Level: High                                                       │
│ Requires: Super Admin approval + MFA confirmation                      │
│ Description: Deduct credits from user accounts (refunds, adjustments)  │
│                                                                          │
│ Duration:                                                              │
│ ⚪ 1 hour   ⚪ 4 hours   ⚪ 24 hours   ⚪ 7 days   ● Permanent          │
│                                                                          │
│ Reason (required, min 10 characters):                                  │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Senior admin with 5 years financial operations experience. Needs   │ │
│ │ permanent access to credits.deduct for handling complex refund     │ │
│ │ scenarios and credit adjustments.                                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Character count: 158/1000                                              │
│                                                                          │
│ ☑ Notify user via email                                               │
│ ☑ Require MFA confirmation (Super Admin only)                         │
│                                                                          │
│ [ Cancel ]                          [ Request Approval ] (Super Admin) │
│                                      [ Grant Override ]  (You)         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Current role permissions summary (expandable)
- Permission picker with risk level warnings
- Duration selector (presets + custom)
- Required reason field with character counter
- MFA confirmation checkbox for critical permissions
- Approval workflow trigger (for Super Admin-only permissions)
- Email notification option

---

### Page 5: Audit Log Viewer

**URL**: `/admin/roles/audit-log`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Role & Permission Audit Log                        [Export to CSV]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Filters:                                                                │
│ User:      [All users ▼]                                               │
│ Admin:     [All admins ▼]                                              │
│ Action:    [All actions ▼]                                             │
│ Date:      [Last 30 days ▼]   Custom: [Start date] to [End date]      │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Timestamp        │ Admin        │ Action           │ User     │ ... │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Nov 9, 10:30 AM  │ cto@ex.com   │ Override Granted │ jane.s@  │ [▼] │ │
│ │ Nov 8, 2:15 PM   │ admin@ex.com │ Role Assigned    │ john.d@  │ [▼] │ │
│ │ Nov 7, 9:00 AM   │ admin@ex.com │ Role Revoked     │ bob.j@   │ [▼] │ │
│ │ ...                                                                │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Click [▼] to expand Nov 9, 10:30 AM entry:                             │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Audit Log Details                                                  │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Timestamp:      Nov 9, 2025 10:30:15 AM PST                        │ │
│ │ Admin:          cto@example.com (Super Admin)                      │ │
│ │ Action:         Permission Override Granted                        │ │
│ │ Target User:    jane.smith@example.com                             │ │
│ │                                                                     │ │
│ │ Change Details:                                                    │ │
│ │ Permission:     credits.deduct                                     │ │
│ │ Action:         Grant (permanent)                                  │ │
│ │ Expires:        Never (permanent override)                         │ │
│ │                                                                     │ │
│ │ Reason:                                                            │ │
│ │ "Senior admin with 5 years financial operations experience. Needs │ │
│ │  permanent access to credits.deduct for handling complex refund   │ │
│ │  scenarios and credit adjustments."                                │ │
│ │                                                                     │ │
│ │ Context:                                                           │ │
│ │ IP Address:     192.168.1.100                                      │ │
│ │ User Agent:     Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome   │ │
│ │                                                                     │ │
│ │ Before:                                                            │ │
│ │ {                                                                  │ │
│ │   "roleId": "admin-role-uuid",                                     │ │
│ │   "permissionOverrides": []                                        │ │
│ │ }                                                                  │ │
│ │                                                                     │ │
│ │ After:                                                             │ │
│ │ {                                                                  │ │
│ │   "roleId": "admin-role-uuid",                                     │ │
│ │   "permissionOverrides": [                                         │ │
│ │     {                                                              │ │
│ │       "permission": "credits.deduct",                              │ │
│ │       "action": "grant",                                           │ │
│ │       "expiresAt": null,                                           │ │
│ │       "reason": "Senior admin with 5 years...",                    │ │
│ │       "grantedBy": "cto-uuid-123",                                 │ │
│ │       "grantedAt": "2025-11-09T10:30:15Z"                          │ │
│ │     }                                                              │ │
│ │   ]                                                                │ │
│ │ }                                                                  │ │
│ │                                                                     │ │
│ │ [ Close ]                                                          │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Showing 50 of 1,245 entries                   [< Prev]  [Next >]       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Multi-filter support (user, admin, action type, date range)
- Expandable detail view with full JSON snapshots
- Before/after comparison for change tracking
- IP address and User-Agent logging
- Export to CSV for external analysis
- Pagination with configurable page size

---

## Security Measures

### 1. Session Invalidation

**Trigger**: When user's role or permissions change

**Implementation**:
```typescript
async function invalidateUserSessions(userId: string, reason: string) {
  // Revoke all active JWT tokens
  await revokeAllTokens(userId);

  // Clear all active sessions in Redis
  await redis.del(`user:sessions:${userId}:*`);

  // Log invalidation
  await logAuditEvent({
    action: 'sessions.invalidated',
    targetUserId: userId,
    reason: reason,
  });

  // Send notification email
  await sendEmail({
    to: user.email,
    subject: 'Your account permissions have been updated',
    body: `Your role or permissions were modified. You have been logged out for security. Please log in again to continue.`,
  });
}
```

**Use Cases**:
- Role assigned/revoked
- Permission override granted/revoked
- User suspended/banned
- Security incident response

---

### 2. Multi-Factor Authentication (MFA)

**MFA Requirements**:

| Permission | MFA Required | Token Type |
|------------|--------------|------------|
| subscriptions.refund | ✅ | Software (TOTP) |
| licenses.revoke | ✅ | Software (TOTP) |
| credits.deduct | ✅ | Software (TOTP) |
| users.ban | ✅ | Software (TOTP) |
| users.delete | ✅ | Hardware (YubiKey) |
| users.impersonate | ✅ | Hardware (YubiKey) |
| roles.create | ✅ | Software (TOTP) |
| roles.edit | ✅ | Software (TOTP) |

**MFA Enforcement**:
```typescript
async function performCriticalAction(
  adminUser: User,
  action: PermissionKey,
  mfaToken: string
) {
  // Check if MFA required
  const permission = getPermissionMetadata(action);
  if (!permission.requiresMFA) {
    // Proceed without MFA
    return await executeAction(action);
  }

  // Verify MFA token
  const mfaValid = await verifyMFAToken(adminUser.id, mfaToken);
  if (!mfaValid) {
    throw new ForbiddenError('Invalid MFA token');
  }

  // Log MFA verification
  await logAuditEvent({
    action: 'mfa.verified',
    actorUserId: adminUser.id,
    resourceType: 'permission',
    resourceId: action,
  });

  // Proceed with action
  return await executeAction(action);
}
```

**Hardware MFA (YubiKey)**:
- Required for Super Admin role
- Required for `users.delete` and `users.impersonate`
- WebAuthn/FIDO2 protocol
- Backup key required (stored securely)

---

### 3. Approval Workflow

**Approval-Required Permissions**:
- `subscriptions.refund`
- `licenses.revoke`
- `credits.deduct`
- `users.ban`
- `users.delete`

**Workflow**:
```typescript
interface ApprovalRequest {
  id: string;
  requestedBy: string;              // Admin user ID
  action: PermissionKey;
  targetUserId: string | null;
  targetResourceId: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy: string | null;
  reviewedAt: DateTime | null;
  expiresAt: DateTime;              // Auto-deny after 24 hours
  createdAt: DateTime;
}

async function requestApproval(
  adminUser: User,
  action: PermissionKey,
  reason: string
): Promise<ApprovalRequest> {
  // Create approval request
  const request = await db.approvalRequest.create({
    data: {
      requestedBy: adminUser.id,
      action: action,
      reason: reason,
      status: 'pending',
      expiresAt: addHours(new Date(), 24),
    },
  });

  // Notify Super Admins
  const superAdmins = await getUsersByRole('super_admin');
  for (const admin of superAdmins) {
    await sendEmail({
      to: admin.email,
      subject: `Approval Required: ${action}`,
      body: `${adminUser.email} has requested approval for ${action}.\nReason: ${reason}\n\nReview at: ${ADMIN_URL}/approvals/${request.id}`,
    });
  }

  return request;
}

async function approveRequest(
  superAdmin: User,
  requestId: string,
  approvalNotes: string
): Promise<void> {
  // Update request status
  const request = await db.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
  });

  // Execute original action
  await executeApprovedAction(request);

  // Notify requester
  const requester = await getUser(request.requestedBy);
  await sendEmail({
    to: requester.email,
    subject: `Approval Granted: ${request.action}`,
    body: `Your request for ${request.action} has been approved.\nNotes: ${approvalNotes}`,
  });
}
```

---

### 4. IP Whitelisting

**Super Admin Restrictions**:
```typescript
interface IPWhitelist {
  id: string;
  userId: string;                   // Super Admin user ID
  ipAddress: string;                // CIDR notation: "192.168.1.0/24"
  description: string;              // "Office VPN", "Home network"
  isActive: boolean;
  createdAt: DateTime;
  expiresAt: DateTime | null;
}

async function validateIPAccess(user: User, ipAddress: string): Promise<void> {
  // Check if Super Admin
  const isSuperAdmin = await hasRole(user.id, 'super_admin');
  if (!isSuperAdmin) {
    return; // IP whitelisting only for Super Admins
  }

  // Get whitelisted IPs
  const whitelist = await db.ipWhitelist.findMany({
    where: {
      userId: user.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  // Check if IP is whitelisted
  const isWhitelisted = whitelist.some(entry =>
    isIPInCIDR(ipAddress, entry.ipAddress)
  );

  if (!isWhitelisted) {
    // Log unauthorized access attempt
    await logSecurityEvent({
      type: 'ip_whitelist_violation',
      userId: user.id,
      ipAddress: ipAddress,
      severity: 'critical',
    });

    throw new ForbiddenError('Access denied: IP not whitelisted for Super Admin role');
  }
}
```

**Office VPN Example**:
```
192.168.100.0/24 → Office VPN (permanent)
10.0.5.0/24 → Home network (expires after 90 days)
```

---

### 5. Rate Limiting

**Role Assignment Rate Limits**:
```typescript
interface RateLimit {
  action: string;
  limit: number;                    // Max actions per time window
  window: number;                   // Time window in seconds
}

const RATE_LIMITS: Record<string, RateLimit> = {
  'role.assign': { limit: 10, window: 3600 },        // 10 assignments per hour
  'permission.override': { limit: 5, window: 3600 }, // 5 overrides per hour
  'role.create': { limit: 3, window: 86400 },        // 3 roles per day
};

async function checkRateLimit(
  adminUser: User,
  action: string
): Promise<void> {
  const limit = RATE_LIMITS[action];
  if (!limit) return; // No rate limit for this action

  // Count recent actions
  const recentActions = await db.auditLog.count({
    where: {
      actorUserId: adminUser.id,
      action: action,
      timestamp: { gt: subSeconds(new Date(), limit.window) },
    },
  });

  if (recentActions >= limit.limit) {
    throw new TooManyRequestsError(
      `Rate limit exceeded for ${action}. Max ${limit.limit} per ${limit.window / 3600} hour(s).`
    );
  }
}
```

**Monitoring**:
- Alert when admin exceeds 80% of rate limit
- Automatic temporary suspension after 3 consecutive violations
- Dashboard showing admin action velocity

---

## Database Schema Design

### Prisma Schema Models

**Add to `backend/prisma/schema.prisma`**:

```prisma
// =============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
// User-Role-Permission Management for Admin Moderation
// =============================================================================

// Enums for RBAC
enum RoleChangeAction {
  role_assigned
  role_revoked
  role_changed
  permission_override_granted
  permission_override_revoked
  permission_override_expired

  @@map("role_change_action")
}

// Role Model
// Defines reusable role templates with default permissions
model Role {
  id                  String   @id @default(uuid()) @db.Uuid
  name                String   @unique @db.VarChar(50)
  // Values: "super_admin", "admin", "ops", "support", "analyst", "auditor"
  displayName         String   @map("display_name") @db.VarChar(255)
  description         String   @db.Text

  // System Protection
  isSystemRole        Boolean  @default(false) @map("is_system_role")
  // If true, prevents deletion/modification (Super Admin only can edit)

  // Hierarchy
  hierarchy           Int      @db.SmallInt
  // 1 = Super Admin (highest), 6 = Auditor (lowest)

  // Default Permissions (JSON array of permission keys)
  defaultPermissions  Json     @map("default_permissions")
  // Example: ["users.view", "users.edit", "subscriptions.view"]

  // Timestamps
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relations
  userRoleAssignments UserRoleAssignment[]
  roleChangeLogs      RoleChangeLog[]      @relation("RoleChangeLogs")

  @@index([name])
  @@index([isSystemRole])
  @@index([hierarchy])
  @@map("role")
}

// User Role Assignment Model
// Links users to roles with optional permission overrides
model UserRoleAssignment {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @map("user_id") @db.Uuid
  roleId              String   @map("role_id") @db.Uuid

  // Assignment Details
  assignedBy          String   @map("assigned_by") @db.Uuid
  // FK to User (admin who assigned)
  assignedAt          DateTime @default(now()) @map("assigned_at")
  expiresAt           DateTime? @map("expires_at")
  // NULL = permanent, otherwise temporary role

  // Status (auto-calculated based on expiresAt)
  isActive            Boolean  @default(true) @map("is_active")

  // Permission Overrides (JSON array)
  permissionOverrides Json     @default("[]") @map("permission_overrides")
  // Example:
  // [
  //   {
  //     "permission": "licenses.revoke",
  //     "action": "grant",
  //     "expiresAt": "2025-11-10T23:59:59Z",
  //     "reason": "Emergency fraud investigation",
  //     "grantedBy": "admin-uuid-123",
  //     "grantedAt": "2025-11-09T10:00:00Z"
  //   }
  // ]

  // Metadata
  assignmentReason    String?  @map("assignment_reason") @db.Text
  notifyUser          Boolean  @default(true) @map("notify_user")

  // Timestamps
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relations
  user                User     @relation("UserRoleAssignments", fields: [userId], references: [id], onDelete: Cascade)
  role                Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  assignedByUser      User     @relation("AssignedByUser", fields: [assignedBy], references: [id])

  @@unique([userId, roleId], name: "unique_user_role")
  @@index([userId])
  @@index([roleId])
  @@index([assignedBy])
  @@index([isActive])
  @@index([expiresAt])
  @@map("user_role_assignment")
}

// Role Change Log Model
// Immutable audit trail of all role/permission changes
model RoleChangeLog {
  id                          String            @id @default(uuid()) @db.Uuid

  // Target & Actor
  targetUserId                String            @map("target_user_id") @db.Uuid
  // User whose role/permissions changed
  changedBy                   String            @map("changed_by") @db.Uuid
  // Admin who made the change

  // Change Details
  action                      RoleChangeAction
  oldRoleId                   String?           @map("old_role_id") @db.Uuid
  newRoleId                   String?           @map("new_role_id") @db.Uuid

  // Permission Snapshots
  oldPermissions              Json?             @map("old_permissions")
  // Snapshot of effective permissions before change
  newPermissions              Json?             @map("new_permissions")
  // Snapshot of effective permissions after change

  // Override Tracking
  permissionOverrideAdded     Json?             @map("permission_override_added")
  permissionOverrideRemoved   Json?             @map("permission_override_removed")

  // Metadata
  reason                      String?           @db.Text
  ipAddress                   String?           @map("ip_address") @db.VarChar(45)
  userAgent                   String?           @map("user_agent") @db.Text

  // Timestamp
  timestamp                   DateTime          @default(now())

  // Relations
  targetUser                  User              @relation("TargetUserChangeLogs", fields: [targetUserId], references: [id], onDelete: Cascade)
  adminUser                   User              @relation("AdminUserChangeLogs", fields: [changedBy], references: [id])
  oldRole                     Role?             @relation("RoleChangeLogs", fields: [oldRoleId], references: [id])

  @@index([targetUserId])
  @@index([changedBy])
  @@index([action])
  @@index([timestamp])
  @@map("role_change_log")
}

// Permission Catalog Model (Optional - for UI documentation)
// Stores permission metadata for admin UI display
// Not used for permission checks (permissions are enum-based)
model PermissionCatalog {
  id                  String   @id @default(uuid()) @db.Uuid
  key                 String   @unique @db.VarChar(100)
  // Permission key: "subscriptions.view", "users.edit", etc.

  // Metadata
  category            String   @db.VarChar(50)
  // Category: "subscriptions", "licenses", "credits", "users", etc.
  name                String   @db.VarChar(255)
  // Human-readable name: "View Subscriptions"
  description         String   @db.Text

  // Risk Assessment
  riskLevel           String   @db.VarChar(20)
  // Values: "low", "medium", "high", "critical"
  requiresApproval    Boolean  @default(false) @map("requires_approval")
  requiresMFA         Boolean  @default(false) @map("requires_mfa")

  // Timestamps
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([category])
  @@index([riskLevel])
  @@map("permission_catalog")
}

// Approval Request Model
// Tracks approval workflows for critical operations
model ApprovalRequest {
  id                  String   @id @default(uuid()) @db.Uuid

  // Request Details
  requestedBy         String   @map("requested_by") @db.Uuid
  // Admin user ID who requested approval
  action              String   @db.VarChar(100)
  // Permission key: "subscriptions.refund", "users.ban", etc.

  // Target
  targetUserId        String?  @map("target_user_id") @db.Uuid
  targetResourceId    String?  @map("target_resource_id") @db.Uuid

  // Request Metadata
  reason              String   @db.Text
  requestMetadata     Json?    @map("request_metadata")
  // Additional context: amount, duration, etc.

  // Status
  status              String   @db.VarChar(20)
  // Values: "pending", "approved", "denied", "expired"

  // Review Details
  reviewedBy          String?  @map("reviewed_by") @db.Uuid
  reviewedAt          DateTime? @map("reviewed_at")
  reviewNotes         String?  @map("review_notes") @db.Text

  // Expiration
  expiresAt           DateTime @map("expires_at")
  // Auto-deny after 24 hours

  // Timestamps
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relations
  requester           User     @relation("ApprovalRequester", fields: [requestedBy], references: [id])
  reviewer            User?    @relation("ApprovalReviewer", fields: [reviewedBy], references: [id])

  @@index([requestedBy])
  @@index([status])
  @@index([expiresAt])
  @@index([createdAt])
  @@map("approval_request")
}

// IP Whitelist Model
// Stores IP whitelisting for Super Admin access
model IPWhitelist {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @map("user_id") @db.Uuid
  // Super Admin user ID

  // IP Address (CIDR notation)
  ipAddress           String   @map("ip_address") @db.VarChar(50)
  // Example: "192.168.1.0/24", "10.0.5.0/24"

  // Metadata
  description         String?  @db.VarChar(255)
  // Example: "Office VPN", "Home network"

  // Status
  isActive            Boolean  @default(true) @map("is_active")
  expiresAt           DateTime? @map("expires_at")
  // NULL = permanent, otherwise temporary

  // Timestamps
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relations
  user                User     @relation("UserIPWhitelist", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isActive])
  @@index([expiresAt])
  @@map("ip_whitelist")
}

// Update User Model (add RBAC relations)
model User {
  // ... existing fields ...

  // RBAC Relations
  userRoleAssignments     UserRoleAssignment[] @relation("UserRoleAssignments")
  assignedRoles           UserRoleAssignment[] @relation("AssignedByUser")
  targetUserChangeLogs    RoleChangeLog[]      @relation("TargetUserChangeLogs")
  adminUserChangeLogs     RoleChangeLog[]      @relation("AdminUserChangeLogs")
  approvalRequests        ApprovalRequest[]    @relation("ApprovalRequester")
  approvalReviews         ApprovalRequest[]    @relation("ApprovalReviewer")
  ipWhitelists            IPWhitelist[]        @relation("UserIPWhitelist")
}
```

### Database Indexes

**Performance Optimization**:
```sql
-- Role lookups
CREATE INDEX idx_role_name ON role(name);
CREATE INDEX idx_role_hierarchy ON role(hierarchy);

-- User role assignments
CREATE INDEX idx_user_role_assignment_user_id ON user_role_assignment(user_id);
CREATE INDEX idx_user_role_assignment_role_id ON user_role_assignment(role_id);
CREATE INDEX idx_user_role_assignment_active ON user_role_assignment(is_active, expires_at);

-- Audit logs
CREATE INDEX idx_role_change_log_target_user ON role_change_log(target_user_id, timestamp DESC);
CREATE INDEX idx_role_change_log_admin_user ON role_change_log(changed_by, timestamp DESC);
CREATE INDEX idx_role_change_log_action ON role_change_log(action, timestamp DESC);

-- Approval requests
CREATE INDEX idx_approval_request_status_created ON approval_request(status, created_at DESC);
CREATE INDEX idx_approval_request_expires ON approval_request(expires_at) WHERE status = 'pending';
```

---

## Migration Strategy

### Existing User Migration

**Phase 1: Create RBAC Infrastructure** (Week 1)
1. Run Prisma migration to create RBAC tables
2. Seed 6 system roles (Super Admin, Admin, Ops, Support, Analyst, Auditor)
3. Seed permission catalog (40+ permissions)
4. Verify schema with integration tests

**Phase 2: Migrate Existing Admins** (Week 2)
```typescript
async function migrateExistingAdmins() {
  // Get all existing admin users (User.role = "admin")
  const existingAdmins = await db.user.findMany({
    where: { role: 'admin' },
  });

  console.log(`Found ${existingAdmins.length} existing admin users`);

  for (const admin of existingAdmins) {
    // Determine target role based on email domain or manual mapping
    let targetRoleName = 'admin'; // Default: Admin role

    if (admin.email.endsWith('@cto.rephlo.com')) {
      targetRoleName = 'super_admin';
    } else if (admin.email.endsWith('@ops.rephlo.com')) {
      targetRoleName = 'ops';
    } else if (admin.email.endsWith('@support.rephlo.com')) {
      targetRoleName = 'support';
    }

    // Get role ID
    const role = await db.role.findUnique({
      where: { name: targetRoleName },
    });

    // Create role assignment
    await db.userRoleAssignment.create({
      data: {
        userId: admin.id,
        roleId: role.id,
        assignedBy: 'system', // System migration
        assignedAt: new Date(),
        assignmentReason: 'Migrated from legacy admin system',
        notifyUser: true,
      },
    });

    // Log migration
    await db.roleChangeLog.create({
      data: {
        targetUserId: admin.id,
        changedBy: 'system',
        action: 'role_assigned',
        newRoleId: role.id,
        newPermissions: role.defaultPermissions,
        reason: 'RBAC migration from legacy admin system',
        timestamp: new Date(),
      },
    });

    console.log(`Migrated ${admin.email} → ${targetRoleName}`);
  }

  console.log('Migration complete!');
}
```

**Phase 3: Preserve Existing Audit Logs** (Week 3)
```typescript
async function migrateExistingAuditLogs() {
  // Migrate AdminAuditLog → RoleChangeLog (if applicable)
  const existingLogs = await db.adminAuditLog.findMany({
    where: {
      action: { in: ['user.edit', 'subscription.edit', 'credits.grant'] },
    },
  });

  for (const log of existingLogs) {
    // Map to new RoleChangeLog format
    await db.roleChangeLog.create({
      data: {
        targetUserId: log.resourceId, // Assuming resourceId is user ID
        changedBy: log.adminUserId,
        action: 'role_changed', // Generic legacy action
        oldPermissions: null,
        newPermissions: null,
        reason: `Legacy action: ${log.action}`,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.createdAt,
      },
    });
  }

  console.log(`Migrated ${existingLogs.length} legacy audit logs`);
}
```

**Phase 4: Backward Compatibility** (Week 4)
```typescript
// Maintain User.role field for backward compatibility
// Automatically sync User.role with highest UserRoleAssignment
async function syncUserRoleField(userId: string) {
  const assignments = await db.userRoleAssignment.findMany({
    where: { userId: userId, isActive: true },
    include: { role: true },
  });

  // Get highest role (lowest hierarchy number)
  const highestRole = assignments.reduce((highest, current) => {
    return current.role.hierarchy < highest.role.hierarchy ? current : highest;
  });

  // Update User.role field (legacy compatibility)
  await db.user.update({
    where: { id: userId },
    data: { role: highestRole.role.name },
  });
}
```

### Rollback Plan

**If RBAC migration fails**:
1. Restore from database snapshot (pre-migration)
2. Keep legacy `User.role` field active
3. Disable RBAC feature flag
4. Investigate failures and re-plan migration

**Rollback Script**:
```bash
#!/bin/bash
# Rollback RBAC migration

# 1. Restore database snapshot
pg_restore -d rephlo_production backup_pre_rbac_migration.dump

# 2. Disable RBAC feature flag
psql -d rephlo_production -c "UPDATE feature_flags SET enabled = false WHERE name = 'rbac_system';"

# 3. Clear RBAC-related cache
redis-cli FLUSHDB

# 4. Restart backend services
systemctl restart rephlo-backend

echo "RBAC migration rolled back successfully"
```

---

## Implementation Phases

### Phase 1: Database Schema & Seed Data (Week 1-2)

**Tasks**:
1. Add RBAC Prisma models to `schema.prisma`
2. Generate Prisma migration
3. Create seed script for 6 system roles
4. Create seed script for 40+ permissions (PermissionCatalog)
5. Write integration tests for schema

**Deliverables**:
- Prisma migration file
- Seed data script (`backend/prisma/seed-rbac.ts`)
- Integration tests (`backend/tests/rbac/schema.test.ts`)

**Timeline**: 2 weeks

---

### Phase 2: Permission Check Logic (Week 3-4)

**Tasks**:
1. Create `PermissionService` with `hasPermission()` function
2. Implement permission override logic
3. Create middleware for permission enforcement
4. Write unit tests for permission checks
5. Document permission check API

**Deliverables**:
- `backend/src/services/PermissionService.ts`
- `backend/src/middleware/requirePermission.ts`
- Unit tests (`backend/tests/rbac/permissions.test.ts`)

**Timeline**: 2 weeks

---

### Phase 3: Role Assignment API (Week 5-6)

**Tasks**:
1. Create `RoleManagementService`
2. Implement CRUD endpoints for roles
3. Implement role assignment endpoints
4. Implement permission override endpoints
5. Write integration tests

**Deliverables**:
- `backend/src/services/RoleManagementService.ts`
- `backend/src/controllers/RoleController.ts`
- API routes (`/admin/roles/*`)
- Integration tests

**Timeline**: 2 weeks

---

### Phase 4: Audit Logging (Week 7-8)

**Tasks**:
1. Create `AuditLogService`
2. Implement audit log recording for all role/permission changes
3. Create audit log viewer API endpoints
4. Add IP address and User-Agent tracking
5. Write audit log query tests

**Deliverables**:
- `backend/src/services/AuditLogService.ts`
- API routes (`/admin/roles/audit-log`)
- Integration tests

**Timeline**: 2 weeks

---

### Phase 5: Security Features (Week 9-10)

**Tasks**:
1. Implement session invalidation on role change
2. Add MFA enforcement for critical permissions
3. Create approval workflow system
4. Implement IP whitelisting for Super Admin
5. Add rate limiting for role operations

**Deliverables**:
- `backend/src/services/SessionService.ts`
- `backend/src/services/MFAService.ts`
- `backend/src/services/ApprovalService.ts`
- Security tests

**Timeline**: 2 weeks

---

### Phase 6: Admin UI - Roles List & Detail (Week 11-13)

**Tasks**:
1. Create Roles List Page (`frontend/src/pages/admin/RolesList.tsx`)
2. Create Role Detail/Edit Page (`frontend/src/pages/admin/RoleDetail.tsx`)
3. Implement permission matrix UI component
4. Add role user list component
5. Integrate with backend APIs

**Deliverables**:
- 2 admin pages
- Reusable UI components
- E2E tests

**Timeline**: 3 weeks

---

### Phase 7: Admin UI - User Assignment & Overrides (Week 14-16)

**Tasks**:
1. Create User Assignment Page (`frontend/src/pages/admin/UserAssignments.tsx`)
2. Create Permission Override Modal
3. Implement role assignment workflow
4. Add permission override UI
5. Integrate with backend APIs

**Deliverables**:
- 1 admin page + 1 modal
- Role assignment components
- E2E tests

**Timeline**: 3 weeks

---

### Phase 8: Admin UI - Audit Log Viewer (Week 17-18)

**Tasks**:
1. Create Audit Log Viewer Page (`frontend/src/pages/admin/AuditLog.tsx`)
2. Implement filter/search UI
3. Add detail expansion view
4. Implement CSV export
5. Add real-time log streaming (optional)

**Deliverables**:
- 1 admin page
- Audit log components
- E2E tests

**Timeline**: 2 weeks

---

### Phase 9: Migration & Testing (Week 19-20)

**Tasks**:
1. Write migration scripts for existing admins
2. Test migration on staging environment
3. Perform load testing (1000+ permission checks/sec)
4. Security audit (penetration testing)
5. Fix bugs and performance issues

**Deliverables**:
- Migration scripts
- Load test results
- Security audit report
- Bug fixes

**Timeline**: 2 weeks

---

### Phase 10: Production Deployment (Week 21-22)

**Tasks**:
1. Deploy to production (blue-green deployment)
2. Run migration scripts
3. Monitor performance and errors
4. Train admin team on new UI
5. Create user documentation

**Deliverables**:
- Production deployment
- Admin training materials
- User documentation

**Timeline**: 2 weeks

**Total Implementation Time**: 22 weeks (~5.5 months)

---

## Testing Strategy

### Unit Tests

**Permission Check Tests**:
```typescript
describe('PermissionService', () => {
  test('should grant permission from default role', async () => {
    const user = await createTestUser();
    await assignRole(user.id, 'ops');

    const hasPermission = await permissionService.hasPermission(
      user.id,
      'subscriptions.view'
    );

    expect(hasPermission).toBe(true);
  });

  test('should deny permission not in role', async () => {
    const user = await createTestUser();
    await assignRole(user.id, 'support');

    const hasPermission = await permissionService.hasPermission(
      user.id,
      'subscriptions.refund'
    );

    expect(hasPermission).toBe(false);
  });

  test('should grant temporary permission via override', async () => {
    const user = await createTestUser();
    await assignRole(user.id, 'ops');

    // Ops does not have licenses.revoke by default
    let hasPermission = await permissionService.hasPermission(
      user.id,
      'licenses.revoke'
    );
    expect(hasPermission).toBe(false);

    // Grant temporary override
    await permissionService.addOverride(user.id, {
      permission: 'licenses.revoke',
      action: 'grant',
      expiresAt: addHours(new Date(), 24),
      reason: 'Emergency fraud investigation',
    });

    // Now user should have permission
    hasPermission = await permissionService.hasPermission(
      user.id,
      'licenses.revoke'
    );
    expect(hasPermission).toBe(true);
  });

  test('should revoke default permission via override', async () => {
    const user = await createTestUser();
    await assignRole(user.id, 'admin');

    // Admin has credits.grant by default
    let hasPermission = await permissionService.hasPermission(
      user.id,
      'credits.grant'
    );
    expect(hasPermission).toBe(true);

    // Revoke permission
    await permissionService.addOverride(user.id, {
      permission: 'credits.grant',
      action: 'revoke',
      expiresAt: null, // Permanent
      reason: 'Training period restriction',
    });

    // Now user should NOT have permission
    hasPermission = await permissionService.hasPermission(
      user.id,
      'credits.grant'
    );
    expect(hasPermission).toBe(false);
  });

  test('should ignore expired overrides', async () => {
    const user = await createTestUser();
    await assignRole(user.id, 'ops');

    // Grant temporary override (already expired)
    await permissionService.addOverride(user.id, {
      permission: 'licenses.revoke',
      action: 'grant',
      expiresAt: subHours(new Date(), 1), // Expired 1 hour ago
      reason: 'Emergency fraud investigation',
    });

    // Should not have permission (override expired)
    const hasPermission = await permissionService.hasPermission(
      user.id,
      'licenses.revoke'
    );
    expect(hasPermission).toBe(false);
  });
});
```

### Integration Tests

**Role Assignment API Tests**:
```typescript
describe('POST /admin/roles/assign', () => {
  test('should assign role to user', async () => {
    const admin = await createAdminUser('admin');
    const targetUser = await createTestUser();

    const response = await request(app)
      .post('/admin/roles/assign')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: targetUser.id,
        roleName: 'ops',
        reason: 'New hire - operations team',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.roleId).toBe('ops-role-uuid');

    // Verify audit log created
    const auditLog = await db.roleChangeLog.findFirst({
      where: { targetUserId: targetUser.id },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe('role_assigned');
  });

  test('should deny role assignment if admin lacks permission', async () => {
    const support = await createAdminUser('support');
    const targetUser = await createTestUser();

    await request(app)
      .post('/admin/roles/assign')
      .set('Authorization', `Bearer ${support.token}`)
      .send({
        userId: targetUser.id,
        roleName: 'ops',
        reason: 'New hire',
      })
      .expect(403);
  });

  test('should deny assigning Super Admin role by non-Super Admin', async () => {
    const admin = await createAdminUser('admin');
    const targetUser = await createTestUser();

    await request(app)
      .post('/admin/roles/assign')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: targetUser.id,
        roleName: 'super_admin',
        reason: 'Promotion',
      })
      .expect(403);
  });
});
```

### E2E Tests

**Permission Override Workflow E2E Test**:
```typescript
describe('Permission Override Workflow E2E', () => {
  test('should complete full override lifecycle', async () => {
    // Setup
    const admin = await createAdminUser('admin');
    const opsUser = await createAdminUser('ops');

    // Step 1: Admin grants temporary permission to Ops user
    await page.goto('/admin/roles/assignments');
    await page.click(`[data-testid="edit-${opsUser.id}"]`);
    await page.click('[data-testid="add-override"]');

    await page.selectOption('[data-testid="permission-select"]', 'licenses.revoke');
    await page.fill('[data-testid="duration-hours"]', '24');
    await page.fill('[data-testid="reason-textarea"]', 'Emergency fraud investigation');
    await page.click('[data-testid="grant-override"]');

    // Verify success message
    await expect(page.locator('.toast-success')).toContainText('Permission override granted');

    // Step 2: Ops user now has licenses.revoke permission
    await loginAs(opsUser);
    await page.goto('/admin/licenses/abc-123');

    // Revoke license button should be visible
    await expect(page.locator('[data-testid="revoke-license"]')).toBeVisible();

    // Step 3: After 24 hours, override expires
    await setSystemTime(addHours(new Date(), 25));
    await page.reload();

    // Revoke license button should be disabled
    await expect(page.locator('[data-testid="revoke-license"]')).toBeDisabled();

    // Step 4: Verify audit log
    await loginAs(admin);
    await page.goto('/admin/roles/audit-log');

    await page.fill('[data-testid="search-user"]', opsUser.email);
    await page.click('[data-testid="search"]');

    // Should see 2 entries: grant and expiration
    await expect(page.locator('.audit-log-entry')).toHaveCount(2);

    await expect(page.locator('.audit-log-entry').first()).toContainText('Permission override granted');
    await expect(page.locator('.audit-log-entry').last()).toContainText('Permission override expired');
  });
});
```

### Load Tests

**Permission Check Performance**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
  },
};

export default function () {
  const payload = JSON.stringify({
    userId: 'test-user-uuid',
    permission: 'subscriptions.view',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`,
    },
  };

  const res = http.post('http://localhost:3000/admin/permissions/check', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has permission': (r) => JSON.parse(r.body).hasPermission === true,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
```

**Expected Results**:
- 1000 concurrent users
- 95th percentile response time < 100ms
- 0% error rate
- Permission check queries < 50ms (database)

### Security Tests

**Penetration Testing Checklist**:
- [ ] Test privilege escalation (Ops → Admin → Super Admin)
- [ ] Test permission override bypass attempts
- [ ] Test rate limit evasion
- [ ] Test SQL injection in audit log filters
- [ ] Test XSS in permission override reasons
- [ ] Test CSRF in role assignment endpoints
- [ ] Test session hijacking after role change
- [ ] Test IP whitelist bypass for Super Admin
- [ ] Test MFA bypass for critical operations
- [ ] Test approval workflow manipulation

---

## Approval & Next Steps

### Required Approvals

**Design Approval**:
- [ ] Product Owner: Entity design and role hierarchy
- [ ] Engineering Lead: Database schema and implementation plan
- [ ] Security Team: Security measures and audit logging
- [ ] Legal/Compliance: Audit retention and GDPR compliance

### Approval Criteria

**Must Have**:
- Clear separation of concerns (6 roles with distinct permissions)
- Complete audit trail (7-year retention)
- Permission override system with expiration
- MFA enforcement for critical operations
- IP whitelisting for Super Admin

**Nice to Have**:
- Real-time audit log streaming
- Permission analytics dashboard
- Role usage reports
- Automated permission recommendations

### Post-Approval Next Steps

1. **Create Implementation Tasks** (Week 0)
   - Break down phases into Jira/Linear tickets
   - Assign development team
   - Set up project tracking board

2. **Design Mockups** (Week 1)
   - Create high-fidelity UI mockups for all 5 admin pages
   - Get design approval from product team
   - Document UI component library requirements

3. **Phase 1 Kickoff** (Week 2)
   - Begin database schema implementation
   - Set up development environment
   - Create seed data scripts

4. **Weekly Progress Reviews**
   - Every Friday: Review completed tasks
   - Demo working features to stakeholders
   - Adjust timeline if needed

---

## Document Metadata

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Next Review**: 2025-11-16 (after approval)
**Owner**: Engineering Team
**Contributors**: Product, Security, Legal, Engineering

**Approval Status**: ⏳ AWAITING APPROVAL

---

## Appendix

### A. Permission Key Reference

Complete list of all 40 permissions organized by category:

**Subscriptions (6)**:
- `subscriptions.view`
- `subscriptions.create`
- `subscriptions.edit`
- `subscriptions.cancel`
- `subscriptions.reactivate`
- `subscriptions.refund` (⚠️ Approval required)

**Licenses (6)**:
- `licenses.view`
- `licenses.create`
- `licenses.activate`
- `licenses.deactivate`
- `licenses.suspend`
- `licenses.revoke` (⚠️ Approval required)

**Coupons (7)**:
- `coupons.view`
- `coupons.create`
- `coupons.edit`
- `coupons.delete`
- `coupons.approve_redemption`
- `campaigns.create`
- `campaigns.set_budget`

**Credits (5)**:
- `credits.view_balance`
- `credits.view_history`
- `credits.grant` (💰 Amount limits apply)
- `credits.deduct` (⚠️ Approval required)
- `credits.adjust_expiration`

**Users (7)**:
- `users.view`
- `users.edit_profile`
- `users.suspend`
- `users.unsuspend`
- `users.ban` (⚠️ Approval required)
- `users.delete` (⚠️ Approval required)
- `users.impersonate` (⚠️ Approval required + MFA)

**Roles (6)**:
- `roles.view`
- `roles.create`
- `roles.edit`
- `roles.delete`
- `roles.assign`
- `roles.view_audit_log`

**Analytics (4)**:
- `analytics.view_dashboard`
- `analytics.view_revenue`
- `analytics.view_usage`
- `analytics.export_data`

**Total**: 40 permissions

---

### B. Role Permission Matrix

| Permission | Super Admin | Admin | Ops | Support | Analyst | Auditor |
|------------|-------------|-------|-----|---------|---------|---------|
| **Subscriptions** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| cancel | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| reactivate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| refund | ✅ | ✅ (approval) | ❌ | ❌ | ❌ | ❌ |
| **Licenses** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| activate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| deactivate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| suspend | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| revoke | ✅ | ✅ (approval) | ❌ | ❌ | ❌ | ❌ |
| **Coupons** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| approve_redemption | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| campaigns.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| campaigns.set_budget | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Credits** |
| view_balance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| view_history | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| grant | ✅ | ✅ ($500) | ✅ ($100) | ✅ ($50) | ❌ | ❌ |
| deduct | ✅ | ✅ (approval) | ❌ | ❌ | ❌ | ❌ |
| adjust_expiration | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ (masked) | ✅ (audit) |
| edit_profile | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| suspend | ✅ | ✅ | ✅ (30 days) | ❌ | ❌ | ❌ |
| unsuspend | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ban | ✅ | ✅ (approval) | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ (approval) | ❌ | ❌ | ❌ | ❌ |
| impersonate | ✅ (MFA) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Roles** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| assign | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| view_audit_log | ✅ | ✅ (own) | ❌ | ❌ | ❌ | ✅ (all) |
| **Analytics** |
| view_dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view_revenue | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| view_usage | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| export_data | ✅ | ✅ | ❌ | ❌ | ✅ (anon) | ❌ |

**Legend**:
- ✅ = Full access
- ✅ (approval) = Requires Super Admin approval
- ✅ (MFA) = Requires multi-factor authentication
- ✅ ($amount) = Amount limit per transaction
- ✅ (anon) = Anonymized data only
- ✅ (masked) = PII masked
- ✅ (own) = Own actions only
- ✅ (all) = All actions
- ❌ = No access

---

### C. Glossary

**RBAC**: Role-Based Access Control - permission system based on user roles
**Permission**: Atomic operation (e.g., "view subscriptions", "edit users")
**Role**: Collection of permissions (e.g., "Admin" has 35 permissions)
**Permission Override**: Temporary or permanent deviation from role defaults
**Audit Log**: Immutable record of all permission-sensitive actions
**MFA**: Multi-Factor Authentication - secondary verification step
**Approval Workflow**: Process requiring Super Admin approval for critical operations
**Session Invalidation**: Force logout when permissions change
**IP Whitelisting**: Restrict access to approved IP addresses
**Rate Limiting**: Limit number of actions per time window

---

**END OF DOCUMENT**
