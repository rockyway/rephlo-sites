/**
 * Approval Workflow Service Interface
 *
 * Defines the contract for approval workflow operations.
 * Supports the RBAC approval request system for sensitive operations.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

export interface IApprovalWorkflowService {
  /**
   * Create a new approval request
   * @param requestedBy - User ID making the request
   * @param action - Action requiring approval (e.g., "subscriptions.refund", "users.ban")
   * @param targetUserId - Target user ID (optional, depends on action)
   * @param reason - Reason for the request
   * @returns Created approval request
   */
  createApprovalRequest(
    requestedBy: string,
    action: string,
    targetUserId: string | null,
    reason: string
  ): Promise<ApprovalRequestResponse>;

  /**
   * Get all approval requests (with optional filtering)
   * @param filters - Optional filters (status, requestedBy, etc.)
   * @returns List of approval requests
   */
  getApprovalRequests(filters?: ApprovalRequestFilters): Promise<ApprovalRequestResponse[]>;

  /**
   * Get a specific approval request by ID
   * @param requestId - Approval request ID
   * @returns Approval request details
   * @throws Error if request not found
   */
  getApprovalRequestById(requestId: string): Promise<ApprovalRequestResponse>;

  /**
   * Approve an approval request
   * @param requestId - Approval request ID
   * @param reviewedBy - User ID of the reviewer
   * @param reviewNotes - Optional notes about the approval
   * @returns Updated approval request
   * @throws Error if request not found or already reviewed
   */
  approveRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<ApprovalRequestResponse>;

  /**
   * Deny an approval request
   * @param requestId - Approval request ID
   * @param reviewedBy - User ID of the reviewer
   * @param reviewNotes - Reason for denial
   * @returns Updated approval request
   * @throws Error if request not found or already reviewed
   */
  denyRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes: string
  ): Promise<ApprovalRequestResponse>;

  /**
   * Cancel an approval request (by the requester)
   * @param requestId - Approval request ID
   * @param requestedBy - User ID of the requester (must match original requester)
   * @returns Updated approval request
   * @throws Error if request not found, already reviewed, or user is not the requester
   */
  cancelRequest(requestId: string, requestedBy: string): Promise<ApprovalRequestResponse>;

  /**
   * Auto-expire pending requests that have passed their expiration time
   * @returns Number of requests expired
   */
  expirePendingRequests(): Promise<number>;

  /**
   * Check if a user has pending requests for a specific action
   * @param userId - User ID
   * @param action - Action to check
   * @returns True if user has pending requests for this action
   */
  hasPendingRequest(userId: string, action: string): Promise<boolean>;
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface ApprovalRequestResponse {
  id: string;
  requestedBy: string;
  action: string;
  targetUserId: string | null;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  expiresAt: Date;
  createdAt: Date;
  requester?: {
    id: string;
    email: string;
    name: string | null;
  };
  reviewer?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export interface ApprovalRequestFilters {
  status?: string;
  requestedBy?: string;
  action?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}
