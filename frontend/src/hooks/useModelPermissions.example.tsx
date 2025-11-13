/**
 * EXAMPLE: Using useModelPermissions Hook
 *
 * This file demonstrates how to use the useModelPermissions hook
 * in your React components for RBAC checks.
 *
 * File Type: Example (can be deleted after reference)
 */

import { useModelPermissions } from './useModelPermissions';

/**
 * Example 1: Simple permission check
 */
export function ModelActionsExample() {
  const { canCreateModels, canUpdateTiers, canManageLifecycle } = useModelPermissions();

  return (
    <div>
      {canCreateModels && (
        <button>Create New Model</button>
      )}

      {canUpdateTiers && (
        <button>Configure Tiers</button>
      )}

      {canManageLifecycle && (
        <button>Mark as Legacy</button>
      )}
    </div>
  );
}

/**
 * Example 2: Rendering based on multiple permissions
 */
export function ModelAdminPanel() {
  const permissions = useModelPermissions();

  if (!permissions.canReadModels) {
    return <p>You don't have access to model management.</p>;
  }

  return (
    <div>
      <h1>Model Management</h1>

      {/* Show create section for admins */}
      {permissions.canCreateModels && (
        <section>
          <h2>Create New Model</h2>
          {/* Create form */}
        </section>
      )}

      {/* Show audit logs for analysts and admins */}
      {permissions.canViewAuditLog && (
        <section>
          <h2>Audit Logs</h2>
          {/* Audit log viewer */}
        </section>
      )}

      {/* Show tier configuration for admins only */}
      {permissions.canUpdateTiers && (
        <section>
          <h2>Tier Configuration</h2>
          {/* Tier config form */}
        </section>
      )}
    </div>
  );
}

/**
 * Example 3: Conditional rendering in action menu
 */
export function ModelActionMenu({ modelId }: { modelId: string }) {
  const { canManageLifecycle, canEditMeta } = useModelPermissions();

  // modelId would be used in actual onclick handlers
  console.log('Model:', modelId);

  return (
    <div>
      {canManageLifecycle && (
        <>
          <button>Mark as Legacy</button>
          <button>Archive Model</button>
        </>
      )}

      {canEditMeta && (
        <button>Edit Metadata</button>
      )}
    </div>
  );
}
