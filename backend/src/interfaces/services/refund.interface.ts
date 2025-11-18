/**
 * Refund Service Interface (Plan 192)
 *
 * Interface for subscription refund operations.
 * Supports admin-initiated refunds, automatic processing, and refund history tracking.
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md (Section 3.2)
 */

import { subscription_refund as SubscriptionRefund } from '@prisma/client';

export interface CreateRefundInput {
  userId: string;
  subscriptionId: string;
  refundType: 'manual_admin' | 'proration_credit' | 'chargeback';
  refundReason?: string;
  requestedBy: string; // Admin user ID
  originalChargeAmountUsd: number;
  refundAmountUsd: number;
  stripeChargeId?: string;
  adminNotes?: string;
  ipAddress?: string;
}

export interface IRefundService {
  /**
   * Create refund request (pending admin approval)
   * @param input - Refund creation data
   * @returns Created refund record with status='pending'
   */
  createRefundRequest(input: CreateRefundInput): Promise<SubscriptionRefund>;

  /**
   * Approve refund and process with Stripe
   * @param refundId - Refund record ID
   * @param adminId - Admin user ID approving the refund
   * @returns Updated refund record with Stripe refund ID
   */
  approveAndProcessRefund(refundId: string, adminId: string): Promise<SubscriptionRefund>;

  /**
   * Process Stripe refund (internal method)
   * @param refund - Refund record
   * @returns Stripe refund object
   */
  processStripeRefund(refund: SubscriptionRefund): Promise<any>;

  /**
   * Get refund history for user
   * @param userId - User ID
   * @returns List of refund records
   */
  getRefundHistory(userId: string): Promise<SubscriptionRefund[]>;

  /**
   * Get pending refunds (admin review queue)
   * @returns List of pending refunds with user details
   */
  getPendingRefunds(): Promise<SubscriptionRefund[]>;

  /**
   * Cancel refund request
   * @param refundId - Refund record ID
   * @param adminId - Admin user ID cancelling the refund
   * @param reason - Reason for cancellation
   * @returns Updated refund record with status='cancelled'
   */
  cancelRefund(refundId: string, adminId: string, reason: string): Promise<SubscriptionRefund>;
}
