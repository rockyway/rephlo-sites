/**
 * Billing & Payments Service (Plan 109)
 *
 * Handles Stripe integration for billing, invoice management, payment processing,
 * and dunning (failed payment recovery).
 *
 * Core Responsibilities:
 * - Stripe customer and subscription management
 * - Payment method management
 * - Invoice creation and payment tracking
 * - Webhook event processing
 * - Dunning management (retry failed payments)
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import logger from '../utils/logger';
import { notFoundError, badRequestError, createApiError } from '../middleware/error.middleware';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string | null;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string | null;
  subscriptionId: string | null;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethodType: string | null;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface DunningAttempt {
  id: string;
  userId: string;
  invoiceId: string;
  attemptNumber: number;
  scheduledAt: Date;
  attemptedAt: Date | null;
  result: 'success' | 'failed' | 'pending' | 'skipped' | null;
  failureReason: string | null;
  nextRetryAt: Date | null;
}

// =============================================================================
// Billing & Payments Service
// =============================================================================

@injectable()
export class BillingPaymentsService {
  private stripe: Stripe;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('BillingPaymentsService: Initialized');

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      logger.error('STRIPE_SECRET_KEY not configured');
      throw new Error('Stripe is not configured');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  // ===========================================================================
  // Stripe Integration
  // ===========================================================================

  /**
   * Create a Stripe customer
   * @param userId - User ID
   * @param email - User email
   * @returns Stripe customer ID
   */
  async createStripeCustomer(userId: string, email: string): Promise<string> {
    logger.info('BillingPaymentsService.createStripeCustomer', { userId, email });

    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { userId },
      });

      logger.info('BillingPaymentsService: Stripe customer created', {
        userId,
        customerId: customer.id,
      });

      return customer.id;
    } catch (error) {
      logger.error('BillingPaymentsService.createStripeCustomer: Error', { error });
      throw createApiError('Failed to create Stripe customer', 500);
    }
  }

  /**
   * Add a payment method to a customer
   * @param userId - User ID
   * @param paymentMethodId - Stripe payment method ID
   */
  async addPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    logger.info('BillingPaymentsService.addPaymentMethod', { userId, paymentMethodId });

    try {
      // Get subscription to find customer ID
      const subscription = await this.prisma.subscriptionMonetization.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription || !subscription.stripeCustomerId) {
        throw badRequestError('No Stripe customer found for user');
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: subscription.stripeCustomerId,
      });

      logger.info('BillingPaymentsService: Payment method added', { userId, paymentMethodId });
    } catch (error: any) {
      logger.error('BillingPaymentsService.addPaymentMethod: Error', { error });
      if (error.type === 'StripeCardError') {
        throw badRequestError(error.message);
      }
      throw error;
    }
  }

  /**
   * Set default payment method for a customer
   * @param userId - User ID
   * @param paymentMethodId - Stripe payment method ID
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    logger.info('BillingPaymentsService.setDefaultPaymentMethod', { userId, paymentMethodId });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription || !subscription.stripeCustomerId) {
        throw badRequestError('No Stripe customer found for user');
      }

      await this.stripe.customers.update(subscription.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info('BillingPaymentsService: Default payment method set', { userId, paymentMethodId });
    } catch (error: any) {
      logger.error('BillingPaymentsService.setDefaultPaymentMethod: Error', { error });
      throw error;
    }
  }

  /**
   * Remove a payment method
   * @param paymentMethodId - Stripe payment method ID
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    logger.info('BillingPaymentsService.removePaymentMethod', { paymentMethodId });

    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);

      logger.info('BillingPaymentsService: Payment method removed', { paymentMethodId });
    } catch (error: any) {
      logger.error('BillingPaymentsService.removePaymentMethod: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Invoice Management
  // ===========================================================================

  /**
   * Create an invoice for a subscription
   * @param subscriptionId - Subscription ID
   * @returns Created invoice
   */
  async createInvoice(subscriptionId: string): Promise<Invoice> {
    logger.info('BillingPaymentsService.createInvoice', { subscriptionId });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      if (!subscription.stripeSubscriptionId) {
        throw badRequestError('Subscription does not have Stripe subscription ID');
      }

      // Create invoice in Stripe
      const stripeInvoice = await this.stripe.invoices.create({
        customer: subscription.stripeCustomerId!,
        subscription: subscription.stripeSubscriptionId,
        auto_advance: true,
      });

      // Create invoice record in database
      const invoice = await this.prisma.billingInvoice.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripeInvoiceId: stripeInvoice.id,
          amountDue: stripeInvoice.amount_due / 100,
          amountPaid: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency,
          status: stripeInvoice.status || 'draft',
          periodStart: new Date(stripeInvoice.period_start * 1000),
          periodEnd: new Date(stripeInvoice.period_end * 1000),
          invoicePdf: stripeInvoice.invoice_pdf,
          hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        },
      });

      logger.info('BillingPaymentsService: Invoice created', { invoiceId: invoice.id });

      return this.mapInvoice(invoice);
    } catch (error) {
      logger.error('BillingPaymentsService.createInvoice: Error', { error });
      throw error;
    }
  }

  /**
   * Pay an invoice
   * @param invoiceId - Invoice ID
   * @returns Payment transaction
   */
  async payInvoice(invoiceId: string): Promise<PaymentTransaction> {
    logger.info('BillingPaymentsService.payInvoice', { invoiceId });

    try {
      const invoice = await this.prisma.billingInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw notFoundError('Invoice');
      }

      // Pay invoice in Stripe
      const stripeInvoice = await this.stripe.invoices.pay(invoice.stripeInvoiceId);

      // Update invoice status
      await this.prisma.billingInvoice.update({
        where: { id: invoiceId },
        data: {
          status: stripeInvoice.status || 'paid',
          amountPaid: stripeInvoice.amount_paid / 100,
          paidAt: new Date(),
        },
      });

      // Create payment transaction record
      const transaction = await this.prisma.paymentTransaction.create({
        data: {
          userId: invoice.userId,
          invoiceId: invoice.id,
          subscriptionId: invoice.subscriptionId,
          stripePaymentIntentId: stripeInvoice.payment_intent as string,
          amount: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency,
          status: 'succeeded',
          paymentMethodType: 'card', // TODO: Get actual payment method type
          completedAt: new Date(),
        },
      });

      logger.info('BillingPaymentsService: Invoice paid', { invoiceId, transactionId: transaction.id });

      return this.mapTransaction(transaction);
    } catch (error: any) {
      logger.error('BillingPaymentsService.payInvoice: Error', { error });
      throw error;
    }
  }

  /**
   * Void an invoice
   * @param invoiceId - Invoice ID
   * @returns Updated invoice
   */
  async voidInvoice(invoiceId: string): Promise<Invoice> {
    logger.info('BillingPaymentsService.voidInvoice', { invoiceId });

    try {
      const invoice = await this.prisma.billingInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw notFoundError('Invoice');
      }

      // Void invoice in Stripe
      await this.stripe.invoices.voidInvoice(invoice.stripeInvoiceId);

      // Update invoice status
      const updatedInvoice = await this.prisma.billingInvoice.update({
        where: { id: invoiceId },
        data: { status: 'void' },
      });

      logger.info('BillingPaymentsService: Invoice voided', { invoiceId });

      return this.mapInvoice(updatedInvoice);
    } catch (error) {
      logger.error('BillingPaymentsService.voidInvoice: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Webhook Handlers
  // ===========================================================================

  /**
   * Handle Stripe webhook events
   * @param event - Stripe event
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    logger.info('BillingPaymentsService.handleStripeWebhook', { type: event.type });

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          logger.debug('BillingPaymentsService: Unhandled webhook event type', { type: event.type });
      }

      logger.info('BillingPaymentsService: Webhook processed', { type: event.type });
    } catch (error) {
      logger.error('BillingPaymentsService.handleStripeWebhook: Error', { error, event });
      throw error;
    }
  }

  /**
   * Handle successful payment
   * @param invoice - Stripe invoice
   */
  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('BillingPaymentsService.handlePaymentSucceeded', { invoiceId: invoice.id });

    try {
      // Update or create invoice record
      await this.prisma.billingInvoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        update: {
          status: 'paid',
          amountPaid: invoice.amount_paid / 100,
          paidAt: new Date(),
        },
        create: {
          userId: invoice.customer_email || '', // TODO: Get userId from customer metadata
          stripeInvoiceId: invoice.id,
          amountDue: invoice.amount_due / 100,
          amountPaid: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: 'paid',
          periodStart: new Date(invoice.period_start * 1000),
          periodEnd: new Date(invoice.period_end * 1000),
          invoicePdf: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          paidAt: new Date(),
        },
      });

      // TODO: Allocate credits for the billing period

      logger.info('BillingPaymentsService: Payment succeeded handled', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('BillingPaymentsService.handlePaymentSucceeded: Error', { error });
      throw error;
    }
  }

  /**
   * Handle failed payment
   * @param invoice - Stripe invoice
   */
  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info('BillingPaymentsService.handlePaymentFailed', { invoiceId: invoice.id });

    try {
      // Update invoice status
      const dbInvoice = await this.prisma.billingInvoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });

      if (!dbInvoice) {
        logger.warn('Invoice not found in database', { invoiceId: invoice.id });
        return;
      }

      await this.prisma.billingInvoice.update({
        where: { id: dbInvoice.id },
        data: { status: 'open' }, // Keep as open for retry
      });

      // Schedule dunning attempts
      await this.scheduleDunningAttempts(dbInvoice.id);

      logger.info('BillingPaymentsService: Payment failed handled', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('BillingPaymentsService.handlePaymentFailed: Error', { error });
      throw error;
    }
  }

  /**
   * Handle subscription update
   * @param subscription - Stripe subscription
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('BillingPaymentsService.handleSubscriptionUpdated', {
      subscriptionId: subscription.id,
    });

    try {
      await this.prisma.subscriptionMonetization.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status as any,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        },
      });

      logger.info('BillingPaymentsService: Subscription updated', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('BillingPaymentsService.handleSubscriptionUpdated: Error', { error });
      throw error;
    }
  }

  /**
   * Handle subscription deletion
   * @param subscription - Stripe subscription
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('BillingPaymentsService.handleSubscriptionDeleted', {
      subscriptionId: subscription.id,
    });

    try {
      await this.prisma.subscriptionMonetization.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('BillingPaymentsService: Subscription deleted', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('BillingPaymentsService.handleSubscriptionDeleted: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Dunning Management
  // ===========================================================================

  /**
   * Handle failed payment and initiate dunning
   * @param invoiceId - Invoice ID
   */
  async handleFailedPayment(invoiceId: string): Promise<void> {
    logger.info('BillingPaymentsService.handleFailedPayment', { invoiceId });

    try {
      await this.scheduleDunningAttempts(invoiceId);

      logger.info('BillingPaymentsService: Failed payment handled', { invoiceId });
    } catch (error) {
      logger.error('BillingPaymentsService.handleFailedPayment: Error', { error });
      throw error;
    }
  }

  /**
   * Schedule dunning attempts for a failed invoice
   * Retry strategy: Day 3, Day 7, Day 14
   * @param invoiceId - Invoice ID
   * @returns Array of dunning attempts
   */
  async scheduleDunningAttempts(invoiceId: string): Promise<DunningAttempt[]> {
    logger.info('BillingPaymentsService.scheduleDunningAttempts', { invoiceId });

    try {
      const invoice = await this.prisma.billingInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw notFoundError('Invoice');
      }

      const now = new Date();
      const attempts: DunningAttempt[] = [];

      // Retry schedule: 3 days, 7 days, 14 days after failure
      const retrySchedule = [3, 7, 14];

      for (let i = 0; i < retrySchedule.length; i++) {
        const scheduledAt = new Date(now);
        scheduledAt.setDate(scheduledAt.getDate() + retrySchedule[i]);

        const nextRetryAt = i < retrySchedule.length - 1
          ? new Date(scheduledAt.getTime() + retrySchedule[i + 1] * 24 * 60 * 60 * 1000)
          : null;

        const attempt = await this.prisma.dunningAttempt.create({
          data: {
            userId: invoice.userId,
            invoiceId: invoice.id,
            subscriptionId: invoice.subscriptionId,
            attemptNumber: i + 1,
            scheduledAt,
            result: 'pending',
            nextRetryAt,
          },
        });

        attempts.push(this.mapDunningAttempt(attempt));
      }

      logger.info('BillingPaymentsService: Dunning attempts scheduled', {
        invoiceId,
        attemptCount: attempts.length,
      });

      return attempts;
    } catch (error) {
      logger.error('BillingPaymentsService.scheduleDunningAttempts: Error', { error });
      throw error;
    }
  }

  /**
   * Retry a failed payment
   * @param attemptId - Dunning attempt ID
   * @returns Payment transaction
   */
  async retryFailedPayment(attemptId: string): Promise<PaymentTransaction> {
    logger.info('BillingPaymentsService.retryFailedPayment', { attemptId });

    try {
      const attempt = await this.prisma.dunningAttempt.findUnique({
        where: { id: attemptId },
        include: { invoice: true },
      });

      if (!attempt) {
        throw notFoundError('Dunning attempt');
      }

      // Try to pay the invoice
      const transaction = await this.payInvoice(attempt.invoiceId);

      // Update dunning attempt
      await this.prisma.dunningAttempt.update({
        where: { id: attemptId },
        data: {
          attemptedAt: new Date(),
          result: 'success',
        },
      });

      logger.info('BillingPaymentsService: Payment retry succeeded', { attemptId });

      return transaction;
    } catch (error: any) {
      logger.error('BillingPaymentsService.retryFailedPayment: Error', { error });

      // Update dunning attempt with failure
      await this.prisma.dunningAttempt.update({
        where: { id: attemptId },
        data: {
          attemptedAt: new Date(),
          result: 'failed',
          failureReason: error.message,
        },
      });

      throw error;
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Map Prisma invoice to service interface
   */
  private mapInvoice(invoice: any): Invoice {
    return {
      id: invoice.id,
      userId: invoice.userId,
      subscriptionId: invoice.subscriptionId,
      stripeInvoiceId: invoice.stripeInvoiceId,
      amountDue: Number(invoice.amountDue),
      amountPaid: Number(invoice.amountPaid),
      currency: invoice.currency,
      status: invoice.status,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      invoicePdf: invoice.invoicePdf,
      hostedInvoiceUrl: invoice.hostedInvoiceUrl,
      createdAt: invoice.createdAt,
      paidAt: invoice.paidAt,
    };
  }

  /**
   * Map Prisma transaction to service interface
   */
  private mapTransaction(transaction: any): PaymentTransaction {
    return {
      id: transaction.id,
      userId: transaction.userId,
      invoiceId: transaction.invoiceId,
      subscriptionId: transaction.subscriptionId,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      paymentMethodType: transaction.paymentMethodType,
      failureReason: transaction.failureReason,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  /**
   * Map Prisma dunning attempt to service interface
   */
  private mapDunningAttempt(attempt: any): DunningAttempt {
    return {
      id: attempt.id,
      userId: attempt.userId,
      invoiceId: attempt.invoiceId,
      attemptNumber: attempt.attemptNumber,
      scheduledAt: attempt.scheduledAt,
      attemptedAt: attempt.attemptedAt,
      result: attempt.result,
      failureReason: attempt.failureReason,
      nextRetryAt: attempt.nextRetryAt,
    };
  }

  // ===========================================================================
  // Admin Endpoints: List All Data
  // ===========================================================================

  /**
   * List all invoices (admin endpoint)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50, max: 100)
   * @returns Paginated invoice list
   */
  async listAllInvoices(page: number = 1, limit: number = 50): Promise<{
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    logger.info('BillingPaymentsService.listAllInvoices', { page, limit });

    try {
      const skip = (page - 1) * limit;

      const [invoices, total] = await Promise.all([
        this.prisma.billingInvoice.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.billingInvoice.count(),
      ]);

      const mappedInvoices = invoices.map((inv) => this.mapInvoice(inv));

      return {
        data: mappedInvoices,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('BillingPaymentsService.listAllInvoices: Error', { error });
      throw error;
    }
  }

  /**
   * List all payment transactions (admin endpoint)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50, max: 100)
   * @returns Paginated transaction list
   */
  async listAllTransactions(page: number = 1, limit: number = 50): Promise<{
    data: PaymentTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    logger.info('BillingPaymentsService.listAllTransactions', { page, limit });

    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        this.prisma.paymentTransaction.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.paymentTransaction.count(),
      ]);

      const mappedTransactions = transactions.map((txn) => this.mapTransaction(txn));

      return {
        data: mappedTransactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('BillingPaymentsService.listAllTransactions: Error', { error });
      throw error;
    }
  }

  /**
   * List all dunning attempts (admin endpoint)
   * @returns All dunning attempts ordered by scheduled date
   */
  async listDunningAttempts(): Promise<DunningAttempt[]> {
    logger.info('BillingPaymentsService.listDunningAttempts');

    try {
      const attempts = await this.prisma.dunningAttempt.findMany({
        orderBy: { scheduledAt: 'desc' },
        take: 100, // Limit to recent 100 attempts
      });

      return attempts.map((attempt) => this.mapDunningAttempt(attempt));
    } catch (error) {
      logger.error('BillingPaymentsService.listDunningAttempts: Error', { error });
      throw error;
    }
  }
}
