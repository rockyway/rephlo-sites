/**
 * Model Lifecycle Management Permissions Hook
 *
 * Centralized hook for checking RBAC permissions related to model lifecycle management.
 * Supports both permission-based checks (explicit permission strings) and role-based fallbacks.
 *
 * @example
 * ```tsx
 * const { canCreateModels, canUpdateTiers, canManageLifecycle } = useModelPermissions();
 *
 * if (canCreateModels) {
 *   // Show create model button
 * }
 * ```
 *
 * @returns {ModelPermissions} Object with boolean flags for each permission check
 */

import type { User } from '@/types/auth';

/**
 * Model-related permission flags returned by the hook
 */
export interface ModelPermissions {
  /** View/read model list and details (all authenticated users) */
  canReadModels: boolean;

  /** Create new models (admin only) */
  canCreateModels: boolean;

  /** Update model tier configurations (admin only) */
  canUpdateTiers: boolean;

  /** Manage model lifecycle: mark as legacy, archive, deprecate (admin only) */
  canManageLifecycle: boolean;

  /** Edit model metadata JSON (admin only) */
  canEditMeta: boolean;

  /** View audit logs for model changes (admin, analyst, auditor) */
  canViewAuditLog: boolean;
}

/**
 * Get current user from session storage
 * User data is stored as JSON in sessionStorage by OAuthCallback
 *
 * @returns {User | null} Parsed user object or null if not authenticated
 */
function getCurrentUser(): User | null {
  try {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) return null;
    return JSON.parse(userJson) as User;
  } catch (error) {
    console.error('[useModelPermissions] Failed to parse user from sessionStorage:', error);
    return null;
  }
}

/**
 * Hook for checking model lifecycle management permissions
 *
 * Uses a hybrid approach:
 * 1. First checks explicit permission strings (e.g., 'models.create')
 * 2. Falls back to role-based checks if permission strings are not available
 * 3. Returns false for all permissions if user is not authenticated
 *
 * Permission strings supported:
 * - `models.read`: View models
 * - `models.create`: Create new models
 * - `models.tier.update`: Update tier configurations
 * - `models.lifecycle.manage`: Manage lifecycle (legacy, archive)
 * - `models.meta.edit`: Edit model metadata
 * - `audit.read`: View audit logs
 *
 * Role-based fallback (when permission strings not available):
 * - `admin`, `super_admin`: Full access to all model management features
 * - `analyst`, `auditor`: Read-only access to audit logs
 * - `user`: No special permissions
 *
 * @returns {ModelPermissions} Permission checks for model lifecycle management
 */
export function useModelPermissions(): ModelPermissions {
  const user = getCurrentUser();

  // If no user is authenticated, deny all permissions
  if (!user) {
    return {
      canReadModels: false,
      canCreateModels: false,
      canUpdateTiers: false,
      canManageLifecycle: false,
      canEditMeta: false,
      canViewAuditLog: false,
    };
  }

  // Get permissions array and role from user object
  const permissions = (user as any).permissions || [];
  const role = user.role || 'user';

  // Helper function to check permission with role fallback
  const hasPermission = (permissionString: string, allowedRoles: string[]): boolean => {
    // First check explicit permission string
    if (permissions.includes(permissionString)) {
      return true;
    }
    // Fall back to role-based check
    return allowedRoles.includes(role);
  };

  return {
    // View models: all authenticated users can read
    canReadModels: permissions.includes('models.read') || !!user,

    // Create models: admin only
    canCreateModels: hasPermission('models.create', ['admin', 'super_admin']),

    // Update tier configurations: admin only
    canUpdateTiers: hasPermission('models.tier.update', ['admin', 'super_admin']),

    // Manage lifecycle (mark legacy, archive): admin only
    canManageLifecycle: hasPermission('models.lifecycle.manage', ['admin', 'super_admin']),

    // Edit meta JSON: admin only
    canEditMeta: hasPermission('models.meta.edit', ['admin', 'super_admin']),

    // View audit logs: admin, analyst, auditor
    canViewAuditLog: hasPermission('audit.read', ['admin', 'super_admin', 'analyst', 'auditor']),
  };
}
