/**
 * Tspec API Specification - Admin Device Management
 *
 * This file defines the OpenAPI spec for device management endpoints.
 * Phase 3 Addition: Perpetual licensing device activation management.
 *
 * Endpoints:
 * - GET /admin/licenses/devices - List all device activations (paginated)
 * - GET /admin/licenses/devices/stats - Device activation statistics
 * - POST /admin/licenses/devices/{id}/deactivate - Deactivate a device
 * - POST /admin/licenses/devices/{id}/revoke - Revoke device permanently
 * - POST /admin/licenses/devices/bulk-action - Bulk operations on devices
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Device List Query Parameters
 * Used for filtering and pagination of device activations
 */
export type DeviceListQueryParams = {
  /** Page number for pagination (default: 1, min: 1) */
  page?: number;
  /** Number of devices per page (default: 20, min: 1, max: 100) */
  limit?: number;
  /** Filter by activation status */
  status?: 'active' | 'inactive' | 'revoked';
  /** Filter by operating system */
  os?: 'windows' | 'macos' | 'linux';
  /** Filter by suspicious flag */
  suspicious?: boolean;
  /** Search by device name, device ID, or user email */
  search?: string;
};

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Revoke Device Request
 * Used for POST /admin/licenses/devices/{id}/revoke
 */
export interface RevokeDeviceRequest {
  /** Reason for revoking device (required for audit log entry) */
  reason: string;
}

/**
 * Bulk Action Request
 * Used for POST /admin/licenses/devices/bulk-action
 */
export interface BulkActionRequest {
  /** Action to perform on selected devices */
  action: 'deactivate' | 'revoke' | 'flag_suspicious';
  /** Array of device activation IDs (min: 1, max: 100) */
  activationIds: string[];
  /** Reason for action (required for revoke action) */
  reason?: string;
  /** Suspicious flags for flag_suspicious action */
  flags?: string[];
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Device Activation
 * Represents a single device activation record
 */
export interface DeviceActivation {
  /** Device activation ID (UUID) */
  id: string;
  /** User ID who activated the device */
  userId: string;
  /** Device unique identifier */
  deviceId: string;
  /** Device name/hostname */
  deviceName: string;
  /** Operating system */
  os: string;
  /** Activation status */
  status: string;
  /** Timestamp when device was activated */
  activatedAt: string;
  /** Timestamp of last device activity */
  lastSeenAt: string;
  /** Whether device is flagged as suspicious */
  suspicious: boolean;
  /** Array of suspicious flags (if flagged) */
  suspiciousFlags?: string[];
}

/**
 * Pagination Metadata
 * Standard pagination information for list endpoints
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Device List Response
 * Response for GET /admin/licenses/devices
 */
export interface DeviceListResponse {
  /** Status indicator */
  status: 'success';
  /** Array of device activations */
  data: DeviceActivation[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

/**
 * Device Statistics Response
 * Response for GET /admin/licenses/devices/stats
 */
export interface DeviceStatsResponse {
  /** Status indicator */
  status: 'success';
  /** Statistics data */
  data: {
    /** Total device activations */
    total: number;
    /** Active devices count */
    active: number;
    /** Suspicious devices count */
    suspicious: number;
    /** Device count by operating system */
    byOS: {
      /** Windows devices */
      windows: number;
      /** macOS devices */
      macos: number;
      /** Linux devices */
      linux: number;
    };
  };
}

/**
 * Deactivate Device Response
 * Response for POST /admin/licenses/devices/{id}/deactivate
 */
export interface DeactivateDeviceResponse {
  /** Status indicator */
  status: 'success';
  /** Response data */
  data: {
    /** Success message */
    message: string;
    /** Activation ID of deactivated device */
    activationId: string;
  };
}

/**
 * Revoke Device Response
 * Response for POST /admin/licenses/devices/{id}/revoke
 */
export interface RevokeDeviceResponse {
  /** Status indicator */
  status: 'success';
  /** Response data */
  data: {
    /** Success message */
    message: string;
    /** Activation ID of revoked device */
    activationId: string;
    /** Reason for revocation (audit trail) */
    reason: string;
  };
}

/**
 * Bulk Action Error
 * Individual error details for bulk operations
 */
export interface BulkActionError {
  /** Activation ID that failed */
  activationId: string;
  /** Error message */
  error: string;
}

/**
 * Bulk Action Response
 * Response for POST /admin/licenses/devices/bulk-action
 */
export interface BulkActionResponse {
  /** Status indicator */
  status: 'success';
  /** Response data */
  data: {
    /** Action performed */
    action: string;
    /** Number of successful operations */
    successCount: number;
    /** Number of failed operations */
    failedCount: number;
    /** Array of errors for failed operations */
    errors: BulkActionError[];
  };
}

// ============================================================================
// Tspec API Specification
// ============================================================================

/**
 * Device Management API Specification
 * Admin endpoints for managing device activations
 */
export type AdminDeviceManagementApiSpec = Tspec.DefineApiSpec<{
  tags: ['Device Management'];
  paths: {
    '/admin/licenses/devices': {
      get: {
        summary: 'List all device activations';
        description: `Get paginated list of all device activations across all licenses with filtering options.

**Phase 3 Addition**: Device activation management backend infrastructure

**Authentication**: Requires Bearer token and admin role

**Response Format**: Modern format with pagination

**Rate Limit**: 30 requests per minute

**Query Filters**:
- \`status\` - Filter by activation status (active, inactive, revoked)
- \`os\` - Filter by operating system (windows, macos, linux)
- \`suspicious\` - Filter by suspicious flag (boolean)
- \`search\` - Search by device name, device ID, or user email

**Pagination**:
- \`page\` - Page number (default: 1, min: 1)
- \`limit\` - Items per page (default: 20, min: 1, max: 100)`;
        security: 'bearerAuth';
        query: DeviceListQueryParams;
        responses: {
          /** Device activations retrieved successfully */
          200: DeviceListResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };

    '/admin/licenses/devices/stats': {
      get: {
        summary: 'Get device activation statistics';
        description: `Get dashboard statistics for device activations including counts by status and OS.

**Phase 3 Addition**: Device management dashboard metrics

**Authentication**: Requires Bearer token and admin role

**Response Format**: Modern format

**Rate Limit**: 30 requests per minute

**Statistics Included**:
- Total device activations
- Active devices count
- Suspicious devices count
- Device count breakdown by operating system (Windows, macOS, Linux)`;
        security: 'bearerAuth';
        responses: {
          /** Device statistics retrieved successfully */
          200: DeviceStatsResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };

    '/admin/licenses/devices/{id}/deactivate': {
      post: {
        summary: 'Deactivate a device';
        description: `Deactivate a device activation (user-initiated or admin action).

**Phase 3 Addition**: Device deactivation management

**Authentication**: Requires Bearer token and admin role

**Audit**: Creates audit log entry

**Note**: Deactivation is reversible (device can be reactivated by user). For permanent revocation, use the revoke endpoint.`;
        security: 'bearerAuth';
        path: { id: string };
        responses: {
          /** Device deactivated successfully */
          200: DeactivateDeviceResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Device activation not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };

    '/admin/licenses/devices/{id}/revoke': {
      post: {
        summary: 'Revoke a device permanently';
        description: `Permanently revoke a device activation (admin only). This action cannot be undone.

**Phase 3 Addition**: Permanent device revocation for security/fraud cases

**Authentication**: Requires Bearer token and admin role

**Audit**: Creates audit log entry with reason

**Required**: \`reason\` field in request body for audit trail

**Use Cases**:
- Suspected fraud or license abuse
- Multiple suspicious activations from same device
- Security policy violations

**Note**: This action is permanent and cannot be reversed. The device will not be able to reactivate.`;
        security: 'bearerAuth';
        path: { id: string };
        body: RevokeDeviceRequest;
        responses: {
          /** Device revoked successfully */
          200: RevokeDeviceResponse;
          /** Bad request - Missing or invalid reason */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Device activation not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };

    '/admin/licenses/devices/bulk-action': {
      post: {
        summary: 'Perform bulk actions on devices';
        description: `Perform bulk operations on multiple device activations (deactivate, revoke, flag as suspicious).

**Phase 3 Addition**: Bulk device management for administrative efficiency

**Authentication**: Requires Bearer token and admin role

**Audit**: Creates audit log entries for each action

**Supported Actions**:
- \`deactivate\` - Deactivate multiple devices (reversible)
- \`revoke\` - Permanently revoke multiple devices (requires reason)
- \`flag_suspicious\` - Flag multiple devices as suspicious (requires flags array)

**Constraints**:
- Minimum 1 activation ID
- Maximum 100 activation IDs per request
- \`reason\` field required for revoke action

**Response**: Returns success/failure counts and detailed errors for failed operations`;
        security: 'bearerAuth';
        body: BulkActionRequest;
        responses: {
          /** Bulk action completed (may include partial failures) */
          200: BulkActionResponse;
          /** Bad request - Invalid action or missing parameters */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
