/**
 * Billing and Payments Controller (Plan 109)
 *
 * Handles HTTP endpoints for billing, payment methods, and invoices.
 * Integrates with Stripe for payment processing.
 *
 * Endpoints:
 * - POST   /admin/billing/payment-methods              - Add payment method
 * - DELETE /admin/billing/payment-methods/:id          - Remove payment method
 * - GET    /admin/billing/payment-methods/:userId      - List payment methods
 * - POST   /admin/billing/invoices/:subscriptionId     - Create invoice
 * - GET    /admin/billing/invoices/upcoming/:userId    - Get upcoming invoice
 * - GET    /admin/billing/invoices/:userId             - List invoices
 * - GET    /admin/billing/transactions/:userId         - List transactions
 * - POST   /admin/billing/transactions/:id/refund      - Refund transaction
 * - POST   /admin/billing/dunning/:attemptId/retry     - Retry failed payment
 * - POST   /webhooks/stripe                            - Stripe webhook handler
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import logger from '../utils/logger';
import { BillingPaymentsService } from '../services/billing-payments.service';
import {
  badRequestError,
  validationError,
} from '../middleware/error.middleware';

// =============================================================================
// Validation Schemas
// =============================================================================

const addPaymentMethodSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const refundTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1).max(500).optional(),
});

// =============================================================================
// Billing Controller Class
// =============================================================================

@injectable()
export class BillingController {
  constructor(
    @inject('BillingPaymentsService')
    private billingService: BillingPaymentsService
  ) {
    logger.debug('BillingController: Initialized');
  }

  // ===========================================================================
  // Payment Methods Endpoints
  // ===========================================================================

  /**
   * POST /admin/billing/payment-methods
   * Add a payment method for a user
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userId: string,
   *   paymentMethodId: string
   * }
   */
  async addPaymentMethod(req: Request, res: Response): Promise<void> {
    logger.info('BillingController.addPaymentMethod', {
      body: req.body,
    });

    // Validate request body
    const parseResult = addPaymentMethodSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Payment method validation failed', errors);
    }

    const { userId, paymentMethodId } = parseResult.data;

    try {
      await this.billingService.addPaymentMethod(userId, paymentMethodId);

      res.status(200).json({
        success: true,
        message: 'Payment method added successfully',
      });
    } catch (error) {
      logger.error('BillingController.addPaymentMethod: Error', { error });
      throw error;
    }
  }

  /**
   * DELETE /admin/billing/payment-methods/:id
   * Remove a payment method
   *
   * Requires: Admin authentication
   */
  async removePaymentMethod(req: Request, res: Response): Promise<void> {
    const { id: paymentMethodId } = req.params;
    const { userId } = req.body;

    logger.info('BillingController.removePaymentMethod', {
      paymentMethodId,
      userId,
    });

    if (!userId) {
      throw badRequestError('User ID is required in request body');
    }

    try {
      await this.billingService.removePaymentMethod(userId);

      res.status(200).json({
        success: true,
        message: 'Payment method removed successfully',
      });
    } catch (error) {
      logger.error('BillingController.removePaymentMethod: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/billing/payment-methods/:userId
   * List payment methods for a user
   *
   * Requires: Admin authentication
   *
   * TODO: Implement listPaymentMethods in BillingPaymentsService
   */
  async listPaymentMethods(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('BillingController.listPaymentMethods', {
      userId,
    });

    // TODO: Implement this method in the service
    res.status(501).json({
      success: false,
      message: 'Method not yet implemented',
    });
  }

  // ===========================================================================
  // Invoice Endpoints
  // ===========================================================================

  /**
   * POST /admin/billing/invoices/:subscriptionId
   * Create an invoice for a subscription
   *
   * Requires: Admin authentication
   */
  async createInvoice(req: Request, res: Response): Promise<void> {
    const { subscriptionId } = req.params;

    logger.info('BillingController.createInvoice', {
      subscriptionId,
    });

    try {
      const invoice = await this.billingService.createInvoice(subscriptionId);

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice created successfully',
      });
    } catch (error) {
      logger.error('BillingController.createInvoice: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/billing/invoices/upcoming/:userId
   * Get upcoming invoice for a user
   *
   * Requires: Admin authentication
   *
   * TODO: Implement getUpcomingInvoice in BillingPaymentsService
   */
  async getUpcomingInvoice(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('BillingController.getUpcomingInvoice', {
      userId,
    });

    // TODO: Implement this method in the service
    res.status(501).json({
      success: false,
      message: 'Method not yet implemented',
    });
  }

  /**
   * GET /admin/billing/invoices
   * GET /admin/billing/invoices/:userId
   * List all invoices (admin) or invoices for a specific user
   *
   * Requires: Admin authentication
   *
   * Query: { page?: number, limit?: number }
   */
  async listInvoices(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('BillingController.listInvoices', {
      userId: userId || 'all',
      query: req.query,
    });

    // Validate query parameters
    const parseResult = listInvoicesQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { page, limit } = parseResult.data;

    try {
      // If userId is provided, filter by user (not yet implemented)
      // If no userId, return all invoices (admin view)
      if (userId) {
        // TODO: Implement user-specific invoice filtering
        res.status(501).json({
          success: false,
          message: 'User-specific invoice listing not yet implemented',
        });
        return;
      }

      const result = await this.billingService.listAllInvoices(page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('BillingController.listInvoices: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Transaction Endpoints
  // ===========================================================================

  /**
   * GET /admin/billing/transactions
   * GET /admin/billing/transactions/:userId
   * List all transactions (admin) or transactions for a specific user
   *
   * Requires: Admin authentication
   *
   * Query: { page?: number, limit?: number }
   */
  async listTransactions(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('BillingController.listTransactions', {
      userId: userId || 'all',
      query: req.query,
    });

    // Validate query parameters
    const parseResult = listInvoicesQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { page, limit } = parseResult.data;

    try {
      // If userId is provided, filter by user (not yet implemented)
      // If no userId, return all transactions (admin view)
      if (userId) {
        // TODO: Implement user-specific transaction filtering
        res.status(501).json({
          success: false,
          message: 'User-specific transaction listing not yet implemented',
        });
        return;
      }

      const result = await this.billingService.listAllTransactions(page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('BillingController.listTransactions: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/billing/transactions/:id/refund
   * Refund a transaction
   *
   * Requires: Admin authentication
   *
   * Body: { amount?: number, reason?: string }
   */
  async refundTransaction(req: Request, res: Response): Promise<void> {
    const { id: transactionId } = req.params;

    logger.info('BillingController.refundTransaction', {
      transactionId,
      body: req.body,
    });

    // Validate request body
    const parseResult = refundTransactionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Refund validation failed', errors);
    }

    // TODO: Implement refundTransaction in BillingPaymentsService
    res.status(501).json({
      success: false,
      message: 'Method not yet implemented',
    });
  }

  // ===========================================================================
  // Dunning (Failed Payment Recovery) Endpoints
  // ===========================================================================

  /**
   * GET /admin/billing/dunning
   * List all dunning attempts
   *
   * Requires: Admin authentication
   */
  async listDunningAttempts(_req: Request, res: Response): Promise<void> {
    logger.info('BillingController.listDunningAttempts');

    try {
      const attempts = await this.billingService.listDunningAttempts();

      res.status(200).json({
        success: true,
        attempts,
      });
    } catch (error) {
      logger.error('BillingController.listDunningAttempts: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/billing/dunning/:attemptId/retry
   * Retry a failed payment
   *
   * Requires: Admin authentication
   */
  async retryFailedPayment(req: Request, res: Response): Promise<void> {
    const { attemptId } = req.params;

    logger.info('BillingController.retryFailedPayment', {
      attemptId,
    });

    try {
      const transaction = await this.billingService.retryFailedPayment(attemptId);

      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Payment retry initiated',
      });
    } catch (error) {
      logger.error('BillingController.retryFailedPayment: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Webhook Endpoints
  // ===========================================================================

  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   *
   * No authentication required - uses Stripe signature verification
   *
   * This endpoint is registered in the main routes file
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    logger.info('BillingController.handleStripeWebhook', {
      signature: signature ? 'present' : 'missing',
    });

    if (!signature) {
      throw badRequestError('Missing Stripe signature');
    }

    try {
      // Note: req.body should be raw buffer for webhook verification
      // This is handled by Express configuration in app.ts
      const event = req.body as Stripe.Event;

      await this.billingService.handleStripeWebhook(event);

      res.status(200).json({
        received: true,
      });
    } catch (error) {
      logger.error('BillingController.handleStripeWebhook: Error', { error });
      throw error;
    }
  }
}
