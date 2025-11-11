/**
 * Subscription Validation Schemas
 *
 * Zod schemas for validating subscription-related requests.
 * Ensures data integrity and provides type-safe validation.
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Subscription APIs)
 */

import { z } from 'zod';

/**
 * Valid subscription plan IDs
 */
export const PLAN_IDS = ['free', 'pro', 'enterprise'] as const;

/**
 * Valid billing intervals
 */
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const;

/**
 * Create Subscription Request Schema
 * POST /v1/subscriptions
 */
export const createSubscriptionSchema = z.object({
  plan_id: z.enum(PLAN_IDS, {
    errorMap: () => ({ message: 'Invalid plan ID. Must be: free, pro, or enterprise' }),
  }),
  billing_interval: z.enum(BILLING_INTERVALS, {
    errorMap: () => ({ message: 'Invalid billing interval. Must be: monthly or yearly' }),
  }),
  payment_method_id: z
    .string()
    .min(1, 'Payment method ID is required for paid plans')
    .optional(),
});

export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionSchema>;

/**
 * Update Subscription Request Schema
 * PATCH /v1/subscriptions/me
 */
export const updateSubscriptionSchema = z.object({
  plan_id: z.enum(PLAN_IDS, {
    errorMap: () => ({ message: 'Invalid plan ID. Must be: free, pro, or enterprise' }),
  }),
  billing_interval: z.enum(BILLING_INTERVALS, {
    errorMap: () => ({ message: 'Invalid billing interval. Must be: monthly or yearly' }),
  }),
});

export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionSchema>;

/**
 * Cancel Subscription Request Schema
 * POST /v1/subscriptions/me/cancel
 */
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  cancel_at_period_end: z.boolean().default(true),
});

export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionSchema>;

/**
 * Stripe Webhook Event Schema
 * POST /webhooks/stripe
 */
export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  livemode: z.boolean(),
});

export type StripeWebhookEvent = z.infer<typeof stripeWebhookSchema>;

/**
 * Validate request body with Zod schema
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
