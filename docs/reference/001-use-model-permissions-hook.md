# P0 RBAC Permission Hook - useModelPermissions

**Status**: Implemented
**Created**: 2025-11-13
**Location**: `frontend/src/hooks/useModelPermissions.ts`

## Overview

The `useModelPermissions` hook provides centralized Role-Based Access Control (RBAC) checks for model lifecycle management features in the React frontend.

## Key Features

### 1. Hybrid Permission Checking
- **Permission-Based**: Checks explicit permission strings (e.g., `models.create`)
- **Role-Based Fallback**: Falls back to role checks if permission strings unavailable
- **Unified Approach**: Single source of truth for all model-related permission checks

### 2. User Authentication
- Retrieves user data from `sessionStorage` (populated by OAuth callback)
- Gracefully handles missing/invalid user data
- Returns all false for unauthenticated users

### 3. Comprehensive Permission Flags

| Permission | Type | Access Control | Use Case |
|------------|------|-----------------|----------|
| `canReadModels` | Read | All authenticated users | List/view models |
| `canCreateModels` | Write | Admin only | Create new models |
| `canUpdateTiers` | Admin | Admin only | Configure tier limits |
| `canManageLifecycle` | Admin | Admin only | Mark legacy, archive |
| `canEditMeta` | Admin | Admin only | Edit metadata JSON |
| `canViewAuditLog` | Read | Admin, Analyst, Auditor | View change history |

## Usage Examples

### Basic Permission Check

```tsx
import { useModelPermissions } from '@/hooks/useModelPermissions';

export function ModelCreationButton() {
  const { canCreateModels } = useModelPermissions();

  return (
    <button disabled={!canCreateModels}>
      {canCreateModels ? 'Create Model' : 'Insufficient Permissions'}
    </button>
  );
}
```

### Multiple Permission Check

```tsx
export function ModelAdminPanel() {
  const {
    canCreateModels,
    canUpdateTiers,
    canManageLifecycle,
    canViewAuditLog
  } = useModelPermissions();

  return (
    <div>
      {canCreateModels && <CreateModelForm />}
      {canUpdateTiers && <TierConfigurationPanel />}
      {canManageLifecycle && <LifecycleActionsMenu />}
      {canViewAuditLog && <AuditLogViewer />}
    </div>
  );
}
```

### Conditional Rendering Based on Permissions

```tsx
export function ModelActionMenu({ modelId }: { modelId: string }) {
  const permissions = useModelPermissions();

  if (!permissions.canReadModels) {
    return <p>No access to models</p>;
  }

  return (
    <div>
      {/* All users can see basic info */}
      <div>Model ID: {modelId}</div>

      {/* Only admins see lifecycle actions */}
      {permissions.canManageLifecycle && (
        <div>
          <button>Mark as Legacy</button>
          <button>Archive</button>
        </div>
      )}
    </div>
  );
}
```

## Permission String Reference

The hook supports these explicit permission strings from the backend:

```
models.read          - View models (general access)
models.create        - Create new models
models.tier.update   - Update tier configurations
models.lifecycle.manage - Manage model lifecycle (legacy, archive)
models.meta.edit     - Edit model metadata
audit.read           - View audit logs
```

## Role-Based Fallback

When permission strings are not available, the hook falls back to role-based checks:

| Role | Permissions |
|------|-------------|
| `admin`, `super_admin` | Full access (all features) |
| `analyst` | Read models, view audit logs |
| `auditor` | Read models, view audit logs |
| `user` | Read models only |

## Implementation Details

### Data Flow

```
1. User logs in via OAuth
   ↓
2. OAuthCallback stores user data in sessionStorage
   ↓
3. useModelPermissions reads user from sessionStorage
   ↓
4. Checks explicit permissions array (if present)
   ↓
5. Falls back to role-based checks
   ↓
6. Returns permission flags
```

### Hook Behavior

- **No User**: Returns all `false` (deny all access)
- **Missing Permissions Array**: Uses role-based fallback
- **Explicit Permissions**: Takes precedence over role
- **Error Handling**: Catches JSON parse errors gracefully

### TypeScript Support

The hook includes full TypeScript support:

```tsx
import { useModelPermissions, ModelPermissions } from '@/hooks/useModelPermissions';

// Type-safe return value
const permissions: ModelPermissions = useModelPermissions();
```

## Integration Points

### Frontend Components That Use This Hook

After implementation, the following components should use this hook:

1. **Model Management Page** - Conditional rendering of create/edit buttons
2. **Tier Configuration Panel** - Show only for admins
3. **Lifecycle Actions Menu** - Show only for admins
4. **Audit Log Viewer** - Show only for authorized roles
5. **Admin Dashboard** - Control feature visibility

### Backend API Requirements

The identity provider's id_token should include:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["models.create", "models.tier.update", "audit.read"]
}
```

## Testing

A comprehensive test suite is included in `useModelPermissions.test.ts`:

```bash
# Run tests
npm run test -- useModelPermissions.test.ts
```

Test scenarios covered:
- No user (unauthenticated)
- Regular user (minimal permissions)
- Admin user (full permissions)
- User with explicit permission strings
- Analyst user (read + audit access)

## Files Created

1. **Hook Implementation**: `frontend/src/hooks/useModelPermissions.ts` (145 lines)
   - Main hook with full documentation
   - Permission checking logic
   - User data retrieval from sessionStorage

2. **Example Usage**: `frontend/src/hooks/useModelPermissions.example.tsx`
   - Practical component examples
   - Different permission check patterns
   - Reference for implementation

3. **Unit Tests**: `frontend/src/hooks/useModelPermissions.test.ts`
   - Comprehensive test coverage
   - Manual test scenarios
   - Validation helpers

## Next Steps

1. **Integrate into Components**
   - Update model management pages to use the hook
   - Add permission-based conditional rendering
   - Test with different user roles

2. **Backend Integration**
   - Ensure identity provider includes `permissions` in id_token
   - Validate permission strings match backend definitions
   - Update OIDC configuration if needed

3. **Audit Logging**
   - Track when permissions are checked in admin actions
   - Monitor permission denials for security

4. **Documentation**
   - Update component documentation with permission requirements
   - Add permission matrix to API docs
   - Create admin guide for role management

## Security Considerations

- **Client-Side Checks**: This hook is for UX only; always validate permissions server-side
- **Token Integrity**: Relies on backend to issue valid, signed tokens
- **Session Storage**: User data stored in sessionStorage (cleared on browser close)
- **Permission Scope**: Explicit permissions should be minimal and tightly scoped

## Related Documentation

- **API Standards**: `docs/reference/156-api-standards.md`
- **Architecture**: `docs/architect/` (RBAC design)
- **User Types**: `shared-types/src/user.types.ts`
- **Auth Flow**: `frontend/src/pages/auth/OAuthCallback.tsx`
