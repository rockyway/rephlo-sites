/**
 * Subscriptions Controller
 *
 * Handles HTTP requests for subscription management endpoints.
 * Integrates with subscription service and Stripe webhooks.
 *
 * Endpoints:
 * - GET /v1/subscriptions/me          - Get current subscription
 * - GET /v1/subscription-plans        - List available plans
 * - POST /v1/subscriptions            - Create subscription
 * - PATCH /v1/subscriptions/me        - Update subscription
 * - POST /v1/subscriptions/me/cancel  - Cancel subscription
 * - POST /webhooks/stripe             - Stripe webhook handler
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Subscription APIs)
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
} from '../services/subscription.service';
import {
  verifyWebhookSignature,
  handleStripeWebhook,
  SubscriptionPlanId,
  BillingInterval,
} from '../services/stripe.service';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
  safeValidateRequest,
} from '../types/subscription-validation';
import logger from '../utils/logger';

/**
 * Subscriptions Controller Class
 */
@injectable()
export class SubscriptionsController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('SubscriptionsController: Initialized');
  }

  /**
   * GET /v1/subscriptions/me
   * Get current user subscription
   */
  async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      const subscription = await getCurrentSubscription(userId, this.prisma);

      if (!subscription) {
        res.status(404).json({
          error: {
            code: 'no_active_subscription',
            message: 'User does not have an active subscription',
          },
        });
        return;
      }

      res.json({
        id: subscription.id,
        user_id: subscription.userId,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.creditsPerMonth,
        credits_rollover: subscription.creditsRollover,
        billing_interval: subscription.billingInterval,
        price_cents: subscription.priceCents,
        current_period_start: subscription.currentPeriodStart.toISOString(),
        current_period_end: subscription.currentPeriodEnd.toISOString(),
        trial_end: subscription.trialEnd?.toISOString() || null,
        created_at: subscription.createdAt.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get current subscription', { userId, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve subscription',
        },
      });
    }
  }

  /**
   * GET /v1/subscription-plans
   * List available subscription plans
   * No authentication required
   */
  async listSubscriptionPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = listSubscriptionPlans();
      res.json({ plans });
    } catch (error) {
      logger.error('Failed to list subscription plans', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve subscription plans',
        },
      });
    }
  }

  /**
   * POST /v1/subscriptions
   * Create a new subscription
   */
  async createSubscription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      // Validate request body
      const validationResult = safeValidateRequest(createSubscriptionSchema, req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request data',
            details: validationResult.errors.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
        return;
      }

      const { plan_id, billing_interval, payment_method_id } = validationResult.data;

      // Create subscription
      const subscription = await createSubscription(
        userId,
        plan_id as SubscriptionPlanId,
        billing_interval as BillingInterval,
        payment_method_id,
        this.prisma
      );

      res.status(201).json({
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.creditsPerMonth,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        created_at: subscription.createdAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to create subscription', { userId, error });

      // Handle specific error cases
      if (error.message === 'User already has an active subscription') {
        res.status(409).json({
          error: {
            code: 'conflict',
            message: 'User already has an active subscription',
          },
        });
        return;
      }

      if (error.message === 'Payment method is required for paid plans') {
        res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Payment method is required for paid plans',
          },
        });
        return;
      }

      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: 'User not found',
          },
        });
        return;
      }

      // Handle Stripe errors
      if (error.type === 'StripeCardError') {
        res.status(402).json({
          error: {
            code: 'payment_error',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to create subscription',
        },
      });
    }
  }

  /**
   * PATCH /v1/subscriptions/me
   * Update user subscription (upgrade/downgrade)
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      // Validate request body
      const validationResult = safeValidateRequest(updateSubscriptionSchema, req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request data',
            details: validationResult.errors.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
        return;
      }

      const { plan_id, billing_interval } = validationResult.data;

      // Update subscription
      const subscription = await updateSubscription(
        userId,
        plan_id as SubscriptionPlanId,
        billing_interval as BillingInterval,
        this.prisma
      );

      res.json({
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.creditsPerMonth,
        price_cents: subscription.priceCents,
        billing_interval: subscription.billingInterval,
        updated_at: subscription.updatedAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to update subscription', { userId, error });

      if (error.message === 'No active subscription found') {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: 'No active subscription found',
          },
        });
        return;
      }

      if (error.message === 'Cannot update free subscription without payment method') {
        res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Cannot upgrade from free plan without payment method',
          },
        });
        return;
      }

      // Handle Stripe errors
      if (error.type === 'StripeCardError') {
        res.status(402).json({
          error: {
            code: 'payment_error',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to update subscription',
        },
      });
    }
  }

  /**
   * POST /v1/subscriptions/me/cancel
   * Cancel user subscription
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      // Validate request body
      const validationResult = safeValidateRequest(cancelSubscriptionSchema, req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request data',
            details: validationResult.errors.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
        return;
      }

      const { reason, cancel_at_period_end } = validationResult.data;

      // Cancel subscription
      const subscription = await cancelSubscription(
        userId,
        cancel_at_period_end,
        reason,
        this.prisma
      );

      res.json({
        id: subscription.id,
        status: subscription.status,
        cancelled_at: subscription.cancelledAt?.toISOString() || null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.currentPeriodEnd.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to cancel subscription', { userId, error });

      if (error.message === 'No active subscription found') {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: 'No active subscription found',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to cancel subscription',
        },
      });
    }
  }

  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   * No authentication required (signature verification instead)
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Missing Stripe signature',
        },
      });
      return;
    }

    try {
      // Verify webhook signature
      const event = verifyWebhookSignature(req.body, signature);

      // Process webhook event (this now handles all database syncing internally)
      await handleStripeWebhook(event, this.prisma);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Failed to process Stripe webhook', { error });

      if (error.message?.includes('signature')) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: 'Invalid webhook signature',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to process webhook',
        },
      });
    }
  }
}
