/**
 * Unit Tests for useModelPermissions Hook
 *
 * Tests for RBAC permission checking in model lifecycle management.
 * Note: Run in an environment with proper React hooks testing setup (react-hooks/testing-library).
 *
 * Run with: npm run test -- useModelPermissions.test.ts
 */

import { useModelPermissions } from './useModelPermissions';
import type { User } from '@/types/auth';

/**
 * Test 1: No user (unauthenticated)
 * All permissions should be false
 */
function testNoUser() {
  // Clear sessionStorage
  sessionStorage.clear();

  const permissions = useModelPermissions();

  console.assert(!permissions.canReadModels, 'canReadModels should be false');
  console.assert(!permissions.canCreateModels, 'canCreateModels should be false');
  console.assert(!permissions.canUpdateTiers, 'canUpdateTiers should be false');
  console.assert(!permissions.canManageLifecycle, 'canManageLifecycle should be false');
  console.assert(!permissions.canEditMeta, 'canEditMeta should be false');
  console.assert(!permissions.canViewAuditLog, 'canViewAuditLog should be false');

  console.log('✓ Test: No user - PASSED');
}

/**
 * Test 2: Regular user (non-admin)
 * Should only have read access
 */
function testRegularUser() {
  const user: User = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'John User',
    firstName: 'John',
    lastName: 'User',
    username: null,
    profilePictureUrl: null,
    status: 'active',
    isActive: true,
    currentTier: 'free',
    creditsBalance: 0,
    role: 'user',
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    deactivatedAt: null,
    deletedAt: null,
    suspendedUntil: null,
    bannedAt: null,
    lifetimeValue: 0,
  };

  sessionStorage.setItem('user', JSON.stringify(user));

  const permissions = useModelPermissions();

  console.assert(permissions.canReadModels, 'Regular user should be able to read models');
  console.assert(!permissions.canCreateModels, 'Regular user should NOT be able to create models');
  console.assert(!permissions.canUpdateTiers, 'Regular user should NOT be able to update tiers');
  console.assert(!permissions.canManageLifecycle, 'Regular user should NOT be able to manage lifecycle');
  console.assert(!permissions.canEditMeta, 'Regular user should NOT be able to edit meta');
  console.assert(!permissions.canViewAuditLog, 'Regular user should NOT be able to view audit logs');

  console.log('✓ Test: Regular user - PASSED');
}

/**
 * Test 3: Admin user
 * Should have access to all admin features
 */
function testAdminUser() {
  const adminUser: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    username: null,
    profilePictureUrl: null,
    status: 'active',
    isActive: true,
    currentTier: 'enterprise_pro',
    creditsBalance: 0,
    role: 'admin',
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    deactivatedAt: null,
    deletedAt: null,
    suspendedUntil: null,
    bannedAt: null,
    lifetimeValue: 0,
  };

  sessionStorage.setItem('user', JSON.stringify(adminUser));

  const permissions = useModelPermissions();

  console.assert(permissions.canReadModels, 'Admin should be able to read models');
  console.assert(permissions.canCreateModels, 'Admin should be able to create models');
  console.assert(permissions.canUpdateTiers, 'Admin should be able to update tiers');
  console.assert(permissions.canManageLifecycle, 'Admin should be able to manage lifecycle');
  console.assert(permissions.canEditMeta, 'Admin should be able to edit meta');
  console.assert(permissions.canViewAuditLog, 'Admin should be able to view audit logs');

  console.log('✓ Test: Admin user - PASSED');
}

/**
 * Test 4: User with explicit permissions (permission-based check)
 * Should override role-based checks
 */
function testExplicitPermissions() {
  const userWithPermissions: User & { permissions?: string[] } = {
    id: 'user-with-perms',
    email: 'user@example.com',
    name: 'User With Permissions',
    firstName: 'User',
    lastName: 'Perms',
    username: null,
    profilePictureUrl: null,
    status: 'active',
    isActive: true,
    currentTier: 'free',
    creditsBalance: 0,
    role: 'user', // Regular user
    permissions: ['models.read', 'models.create', 'models.lifecycle.manage'], // But has explicit permissions
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    deactivatedAt: null,
    deletedAt: null,
    suspendedUntil: null,
    bannedAt: null,
    lifetimeValue: 0,
  };

  sessionStorage.setItem('user', JSON.stringify(userWithPermissions));

  const permissions = useModelPermissions();

  console.assert(permissions.canReadModels, 'User should have explicit models.read permission');
  console.assert(permissions.canCreateModels, 'User should have explicit models.create permission');
  console.assert(!permissions.canUpdateTiers, 'User should NOT have tier.update permission');
  console.assert(permissions.canManageLifecycle, 'User should have explicit lifecycle.manage permission');
  console.assert(!permissions.canEditMeta, 'User should NOT have meta.edit permission');
  console.assert(!permissions.canViewAuditLog, 'User should NOT have audit.read permission');

  console.log('✓ Test: Explicit permissions - PASSED');
}

/**
 * Test 5: Analyst user
 * Should have read access and audit log access
 */
function testAnalystUser() {
  const analystUser: User = {
    id: 'analyst-123',
    email: 'analyst@example.com',
    name: 'Analyst User',
    firstName: 'Analyst',
    lastName: 'User',
    username: null,
    profilePictureUrl: null,
    status: 'active',
    isActive: true,
    currentTier: 'pro',
    creditsBalance: 0,
    role: 'analyst',
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    deactivatedAt: null,
    deletedAt: null,
    suspendedUntil: null,
    bannedAt: null,
    lifetimeValue: 0,
  };

  sessionStorage.setItem('user', JSON.stringify(analystUser));

  const permissions = useModelPermissions();

  console.assert(permissions.canReadModels, 'Analyst should be able to read models');
  console.assert(!permissions.canCreateModels, 'Analyst should NOT be able to create models');
  console.assert(!permissions.canUpdateTiers, 'Analyst should NOT be able to update tiers');
  console.assert(!permissions.canManageLifecycle, 'Analyst should NOT be able to manage lifecycle');
  console.assert(!permissions.canEditMeta, 'Analyst should NOT be able to edit meta');
  console.assert(permissions.canViewAuditLog, 'Analyst should be able to view audit logs');

  console.log('✓ Test: Analyst user - PASSED');
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.group('useModelPermissions Tests');

  try {
    testNoUser();
    testRegularUser();
    testAdminUser();
    testExplicitPermissions();
    testAnalystUser();

    console.log('\n✓ All tests PASSED!');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
  } finally {
    console.groupEnd();
  }
}

// Uncomment below to run tests in development
// if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
//   runAllTests();
// }
