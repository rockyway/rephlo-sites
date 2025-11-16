/**
 * Approval Workflow Service
 *
 * Manages approval requests for sensitive operations requiring Super Admin review.
 * Supports automatic expiration of pending requests after 24 hours.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  IApprovalWorkflowService,
  ApprovalRequestResponse,
  ApprovalRequestFilters,
} from '../interfaces';

// =============================================================================
// Approval Workflow Service Class
// =============================================================================

@injectable()
export class ApprovalWorkflowService implements IApprovalWorkflowService {
  private readonly DEFAULT_EXPIRATION_HOURS = 24;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('ApprovalWorkflowService: Initialized');
  }

  // ===========================================================================
  // Create Approval Request
  // ===========================================================================

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    requestedBy: string,
    action: string,
    targetUserId: string | null,
    reason: string
  ): Promise<ApprovalRequestResponse> {
    logger.info('ApprovalWorkflowService: Creating approval request', {
      requestedBy,
      action,
      targetUserId,
    });

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.DEFAULT_EXPIRATION_HOURS);

    try {
      const approvalRequest = await this.prisma.approval_requests.create({
        data: {
          requested_by: requestedBy,
          action,
          target_user_id: targetUserId,
          reason,
          status: 'pending',
          expires_at: expiresAt,
        },
        include: {
          users_approval_requests_requested_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('ApprovalWorkflowService: Approval request created', {
        requestId: approvalRequest.id,
      });

      return this.mapToResponse(approvalRequest);
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to create approval request', {
        error,
        requestedBy,
        action,
      });
      throw new Error(`Failed to create approval request: ${error}`);
    }
  }

  // ===========================================================================
  // Get Approval Requests
  // ===========================================================================

  /**
   * Get all approval requests with optional filtering
   */
  async getApprovalRequests(
    filters?: ApprovalRequestFilters
  ): Promise<ApprovalRequestResponse[]> {
    logger.debug('ApprovalWorkflowService: Getting approval requests', { filters });

    try {
      const where: any = {};

      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.requestedBy) where.requested_by = filters.requestedBy;
        if (filters.action) where.action = filters.action;
        if (filters.createdAfter || filters.createdBefore) {
          where.created_at = {};
          if (filters.createdAfter) where.created_at.gte = filters.createdAfter;
          if (filters.createdBefore) where.created_at.lte = filters.createdBefore;
        }
      }

      const requests = await this.prisma.approval_requests.findMany({
        where,
        include: {
          users_approval_requests_requested_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
          users_approval_requests_reviewed_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return requests.map((request) => this.mapToResponse(request));
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to get approval requests', { error });
      throw new Error(`Failed to get approval requests: ${error}`);
    }
  }

  /**
   * Get a specific approval request by ID
   */
  async getApprovalRequestById(requestId: string): Promise<ApprovalRequestResponse> {
    logger.debug('ApprovalWorkflowService: Getting approval request by ID', { requestId });

    try {
      const request = await this.prisma.approval_requests.findUnique({
        where: { id: requestId },
        include: {
          users_approval_requests_requested_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
          users_approval_requests_reviewed_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error(`Approval request not found: ${requestId}`);
      }

      return this.mapToResponse(request);
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to get approval request', {
        error,
        requestId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Approve/Deny Requests
  // ===========================================================================

  /**
   * Approve an approval request
   */
  async approveRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<ApprovalRequestResponse> {
    logger.info('ApprovalWorkflowService: Approving request', { requestId, reviewedBy });

    return this.reviewRequest(requestId, reviewedBy, 'approved', reviewNotes);
  }

  /**
   * Deny an approval request
   */
  async denyRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes: string
  ): Promise<ApprovalRequestResponse> {
    logger.info('ApprovalWorkflowService: Denying request', { requestId, reviewedBy });

    return this.reviewRequest(requestId, reviewedBy, 'denied', reviewNotes);
  }

  /**
   * Cancel an approval request (by the requester)
   */
  async cancelRequest(
    requestId: string,
    requestedBy: string
  ): Promise<ApprovalRequestResponse> {
    logger.info('ApprovalWorkflowService: Cancelling request', { requestId, requestedBy });

    try {
      // First, verify the request exists and is pending
      const existingRequest = await this.prisma.approval_requests.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest) {
        throw new Error(`Approval request not found: ${requestId}`);
      }

      if (existingRequest.requested_by !== requestedBy) {
        throw new Error('Only the requester can cancel their own request');
      }

      if (existingRequest.status !== 'pending') {
        throw new Error(`Cannot cancel a request with status: ${existingRequest.status}`);
      }

      // Update the request to cancelled
      const updated = await this.prisma.approval_requests.update({
        where: { id: requestId },
        data: {
          status: 'cancelled',
          reviewed_at: new Date(),
          review_notes: 'Cancelled by requester',
        },
        include: {
          users_approval_requests_requested_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('ApprovalWorkflowService: Request cancelled', { requestId });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to cancel request', {
        error,
        requestId,
        requestedBy,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Automatic Expiration
  // ===========================================================================

  /**
   * Auto-expire pending requests that have passed their expiration time
   */
  async expirePendingRequests(): Promise<number> {
    logger.info('ApprovalWorkflowService: Expiring pending requests');

    try {
      const now = new Date();

      const result = await this.prisma.approval_requests.updateMany({
        where: {
          status: 'pending',
          expires_at: {
            lt: now,
          },
        },
        data: {
          status: 'expired',
          reviewed_at: now,
          review_notes: 'Automatically expired after 24 hours',
        },
      });

      logger.info('ApprovalWorkflowService: Expired requests', { count: result.count });

      return result.count;
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to expire requests', { error });
      throw new Error(`Failed to expire pending requests: ${error}`);
    }
  }

  /**
   * Check if a user has pending requests for a specific action
   */
  async hasPendingRequest(userId: string, action: string): Promise<boolean> {
    logger.debug('ApprovalWorkflowService: Checking for pending request', { userId, action });

    try {
      const count = await this.prisma.approval_requests.count({
        where: {
          requested_by: userId,
          action,
          status: 'pending',
        },
      });

      return count > 0;
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to check for pending request', {
        error,
        userId,
        action,
      });
      throw new Error(`Failed to check for pending request: ${error}`);
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Review a request (approve or deny)
   */
  private async reviewRequest(
    requestId: string,
    reviewedBy: string,
    status: string,
    reviewNotes?: string
  ): Promise<ApprovalRequestResponse> {
    try {
      // First, verify the request exists and is pending
      const existingRequest = await this.prisma.approval_requests.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest) {
        throw new Error(`Approval request not found: ${requestId}`);
      }

      if (existingRequest.status !== 'pending') {
        throw new Error(
          `Cannot review a request with status: ${existingRequest.status}. Only pending requests can be reviewed.`
        );
      }

      // Verify the reviewer is not the requester
      if (existingRequest.requested_by === reviewedBy) {
        throw new Error('Users cannot review their own approval requests');
      }

      // Update the request
      const updated = await this.prisma.approval_requests.update({
        where: { id: requestId },
        data: {
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
          review_notes: reviewNotes || null,
        },
        include: {
          users_approval_requests_requested_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
          users_approval_requests_reviewed_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('ApprovalWorkflowService: Request reviewed', {
        requestId,
        status,
        reviewedBy,
      });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('ApprovalWorkflowService: Failed to review request', {
        error,
        requestId,
        status,
      });
      throw error;
    }
  }

  /**
   * Map Prisma model to response type
   */
  private mapToResponse(request: any): ApprovalRequestResponse {
    return {
      id: request.id,
      requestedBy: request.requested_by,
      action: request.action,
      targetUserId: request.target_user_id,
      reason: request.reason,
      status: request.status,
      reviewedBy: request.reviewed_by,
      reviewedAt: request.reviewed_at,
      reviewNotes: request.review_notes,
      expiresAt: request.expires_at,
      createdAt: request.created_at,
      requester: request.requester
        ? {
            id: request.requester.id,
            email: request.requester.email,
          }
        : undefined,
      reviewer: request.reviewer
        ? {
            id: request.reviewer.id,
            email: request.reviewer.email,
          }
        : null,
    };
  }
}
