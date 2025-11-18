/**
 * Refund API Validation Types
 *
 * Zod schemas and TypeScript types for admin refund management endpoints.
 * Used for request validation and type safety.
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md (Section 7)
 */

import { z } from 'zod';

// =============================================================================
// Request Validation Schemas
// =============================================================================

/**
 * Schema for approving a refund request
 * (No body required, just path parameter validation)
 */
export const approveRefundSchema = z.object({
  // Empty body schema - approval doesn't require additional data
  // The refundId comes from path params
});

export type ApproveRefundRequest = z.infer<typeof approveRefundSchema>;

/**
 * Schema for cancelling a refund request
 */
export const cancelRefundSchema = z.object({
  reason: z
    .string()
    .min(1, 'Cancellation reason is required')
    .max(500, 'Reason must be 500 characters or less'),
});

export type CancelRefundRequest = z.infer<typeof cancelRefundSchema>;

/**
 * Schema for manual subscription cancellation with refund
 */
export const cancelWithRefundSchema = z.object({
  refundReason: z
    .string()
    .min(1, 'Refund reason is required')
    .max(500, 'Refund reason must be 500 characters or less'),
  adminNotes: z
    .string()
    .max(1000, 'Admin notes must be 1000 characters or less')
    .optional(),
});

export type CancelWithRefundRequest = z.infer<typeof cancelWithRefundSchema>;

/**
 * Schema for refund list query parameters
 */
export const refundListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum(['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'])
    .optional(),
  refundType: z
    .enum(['manual_admin', 'proration_credit', 'chargeback'])
    .optional(),
});

export type RefundListQueryParams = z.infer<typeof refundListQuerySchema>;
