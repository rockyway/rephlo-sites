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
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import logger from '../utils/logger';
import { notFoundError, badRequestError, createApiError } from '../middleware/error.middleware';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  period_start: Date;
  period_end: Date;
  invoice_pdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: Date;
  paid_at: Date | null;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  invoice_id: string | null;
  subscription_id: string | null;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  payment_method_type: string | null;
  failure_reason: string | null;
  createdAt: Date;
  completed_at: Date | null;
}

export interface DunningAttempt {
  id: string;
  user_id: string;
  invoice_id: string;
  attempt_number: number;
  scheduled_at: Date;
  attempted_at: Date | null;
  result: 'success' | 'failed' | 'pending' | 'skipped' | null;
  failure_reason: string | null;
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
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (!subscription || !subscription.stripe_customer_id) {
        throw badRequestError('No Stripe customer found for user');
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: subscription.stripe_customer_id,
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
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (!subscription || !subscription.stripe_customer_id) {
        throw badRequestError('No Stripe customer found for user');
      }

      await this.stripe.customers.update(subscription.stripe_customer_id, {
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
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      if (!subscription.stripe_subscription_id) {
        throw badRequestError('Subscription does not have Stripe subscription ID');
      }

      // Create invoice in Stripe
      const stripeInvoice = await this.stripe.invoices.create({
        customer: subscription.stripe_customer_id!,
        subscription: subscription.stripe_subscription_id,
        auto_advance: true,
      });

      // Create invoice record in database
      const invoice = await this.prisma.billing_invoice.create({
        data: {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          stripe_invoice_id: stripeInvoice.id,
          amount_due: stripeInvoice.amount_due / 100,
          amount_paid: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency,
          status: stripeInvoice.status || 'draft',
          period_start: new Date(stripeInvoice.period_start * 1000),
          period_end: new Date(stripeInvoice.period_end * 1000),
          invoice_pdf: stripeInvoice.invoice_pdf,
          hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        },
      });

      logger.info('BillingPaymentsService: Invoice created', { invoice_id: invoice.id });

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
      const invoice = await this.prisma.billing_invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw notFoundError('Invoice');
      }

      // Pay invoice in Stripe
      const stripeInvoice = await this.stripe.invoices.pay(invoice.stripe_invoice_id);

      // Update invoice status
      await this.prisma.billing_invoice.update({
        where: { id: invoiceId },
        data: {
          status: stripeInvoice.status || 'paid',
          amount_paid: stripeInvoice.amount_paid / 100,
          paid_at: new Date(),
        },
      });

      // Create payment transaction record
      const transaction = await this.prisma.payment_transaction.create({
        data: {
          id: randomUUID(),
          user_id: invoice.user_id,
          invoice_id: invoice.id,
          subscription_id: invoice.subscription_id,
          stripe_payment_intent_id: stripeInvoice.payment_intent as string,
          amount: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency,
          status: 'succeeded',
          payment_method_type: 'card', // TODO: Get actual payment method type
          completed_at: new Date(),
          updated_at: new Date(),
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
      const invoice = await this.prisma.billing_invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw notFoundError('Invoice');
      }

      // Void invoice in Stripe
      await this.stripe.invoices.voidInvoice(invoice.stripe_invoice_id);

      // Update invoice status
      const updatedInvoice = await this.prisma.billing_invoice.update({
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
    logger.info('BillingPaymentsService.handlePaymentSucceeded', { invoice_id: invoice.id });

    try {
      // Update or create invoice record
      await this.prisma.billing_invoice.upsert({
        where: { stripe_invoice_id: invoice.id },
        update: {
          status: 'paid',
          amount_paid: invoice.amount_paid / 100,
          paid_at: new Date(),
        },
        create: {
          user_id: invoice.customer_email || '', // TODO: Get userId from customer metadata
          stripe_invoice_id: invoice.id,
          amount_due: invoice.amount_due / 100,
          amount_paid: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: 'paid',
          period_start: new Date(invoice.period_start * 1000),
          period_end: new Date(invoice.period_end * 1000),
          invoice_pdf: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          paid_at: new Date(),
        },
      });

      // TODO: Allocate credits for the billing period

      logger.info('BillingPaymentsService: Payment succeeded handled', { invoice_id: invoice.id });
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
    logger.info('BillingPaymentsService.handlePaymentFailed', { invoice_id: invoice.id });

    try {
      // Update invoice status
      const dbInvoice = await this.prisma.billing_invoice.findUnique({
        where: { stripe_invoice_id: invoice.id },
      });

      if (!dbInvoice) {
        logger.warn('Invoice not found in database', { invoice_id: invoice.id });
        return;
      }

      await this.prisma.billing_invoice.update({
        where: { id: dbInvoice.id },
        data: { status: 'open' }, // Keep as open for retry
      });

      // Schedule dunning attempts
      await this.scheduleDunningAttempts(dbInvoice.id);

      logger.info('BillingPaymentsService: Payment failed handled', { invoice_id: invoice.id });
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
      subscription_id: subscription.id,
    });

    try {
      await this.prisma.subscription_monetization.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: {
          status: subscription.status as any,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          updated_at: new Date(),
        },
      });

      logger.info('BillingPaymentsService: Subscription updated', { subscription_id: subscription.id });
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
      subscription_id: subscription.id,
    });

    try {
      await this.prisma.subscription_monetization.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date(),
        },
      });

      logger.info('BillingPaymentsService: Subscription deleted', { subscription_id: subscription.id });
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
      const invoice = await this.prisma.billing_invoice.findUnique({
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

        const attempt = await this.prisma.dunning_attempt.create({
          data: {
            id: randomUUID(),
            user_id: invoice.user_id,
            invoice_id: invoice.id,
            subscription_id: invoice.subscription_id,
            attempt_number: i + 1,
            scheduled_at: scheduledAt,
            result: 'pending',
            next_retry_at: nextRetryAt,
            updated_at: new Date(),
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
      const attempt = await this.prisma.dunning_attempt.findUnique({
        where: { id: attemptId },
        include: { billing_invoice: true },
      });

      if (!attempt) {
        throw notFoundError('Dunning attempt');
      }

      // Try to pay the invoice
      const transaction = await this.payInvoice(attempt.invoice_id);

      // Update dunning attempt
      await this.prisma.dunning_attempt.update({
        where: { id: attemptId },
        data: {
          attempted_at: new Date(),
          result: 'success',
        },
      });

      logger.info('BillingPaymentsService: Payment retry succeeded', { attemptId });

      return transaction;
    } catch (error: any) {
      logger.error('BillingPaymentsService.retryFailedPayment: Error', { error });

      // Update dunning attempt with failure
      await this.prisma.dunning_attempt.update({
        where: { id: attemptId },
        data: {
          attempted_at: new Date(),
          result: 'failed',
          failure_reason: error.message,
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
      user_id: invoice.user_id,
      subscription_id: invoice.subscription_id,
      stripe_invoice_id: invoice.stripe_invoice_id,
      amount_due: Number(invoice.amountDue),
      amount_paid: Number(invoice.amountPaid),
      currency: invoice.currency,
      status: invoice.status,
      period_start: invoice.periodStart,
      period_end: invoice.periodEnd,
      invoice_pdf: invoice.invoicePdf,
      hostedInvoiceUrl: invoice.hostedInvoiceUrl,
      createdAt: invoice.createdAt,
      paid_at: invoice.paidAt,
    };
  }

  /**
   * Map Prisma transaction to service interface
   */
  private mapTransaction(transaction: any): PaymentTransaction {
    return {
      id: transaction.id,
      user_id: transaction.user_id,
      invoice_id: transaction.invoice_id,
      subscription_id: transaction.subscription_id,
      stripe_payment_intent_id: transaction.stripePaymentIntentId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      payment_method_type: transaction.paymentMethodType,
      failure_reason: transaction.failureReason,
      createdAt: transaction.createdAt,
      completed_at: transaction.completedAt,
    };
  }

  /**
   * Map Prisma dunning attempt to service interface
   */
  private mapDunningAttempt(attempt: any): DunningAttempt {
    return {
      id: attempt.id,
      user_id: attempt.user_id,
      invoice_id: attempt.invoice_id,
      attempt_number: attempt.attemptNumber,
      scheduled_at: attempt.scheduledAt,
      attempted_at: attempt.attemptedAt,
      result: attempt.result,
      failure_reason: attempt.failureReason,
      next_retry_at: attempt.nextRetryAt,
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
        this.prisma.billing_invoice.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.billing_invoice.count(),
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
        this.prisma.payment_transaction.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.payment_transaction.count(),
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
      const attempts = await this.prisma.dunning_attempt.findMany({
        orderBy: { scheduled_at: 'desc' },
        take: 100, // Limit to recent 100 attempts
      });

      return attempts.map((attempt) => this.mapDunningAttempt(attempt));
    } catch (error) {
      logger.error('BillingPaymentsService.listDunningAttempts: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // User Endpoints: Invoice List (Desktop App Integration - Plan 182)
  // ===========================================================================

  /**
   * Get invoices for a user (Desktop App endpoint)
   * @param userId - User ID
   * @param limit - Number of invoices to return (default: 10, max: 50)
   * @returns Invoice list response
   */
  async getInvoices(userId: string, limit: number = 10): Promise<{
    invoices: Array<{
      id: string;
      date: string;
      amount: number;
      currency: string;
      status: string;
      invoiceUrl: string;
      pdfUrl: string;
      description: string;
    }>;
    hasMore: boolean;
    count: number;
  }> {
    logger.info('BillingPaymentsService.getInvoices', { userId, limit });

    try {
      // Get user's Stripe customer ID
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          subscription_monetization: {
            select: {
              stripe_customer_id: true,
            },
            take: 1,
            orderBy: {
              created_at: 'desc',
            }
          }
        },
      });

      // Return empty array if user has no Stripe customer
      const stripeCustomerId = user?.subscription_monetization?.[0]?.stripe_customer_id;
      if (!stripeCustomerId) {
        logger.debug('BillingPaymentsService.getInvoices: User has no Stripe customer', { userId });
        return { invoices: [], hasMore: false, count: 0 };
      }

      // Fetch invoices from Stripe
      const stripeInvoices = await this.stripe.invoices.list({
        customer: stripeCustomerId,
        limit: Math.min(limit, 50), // Enforce max limit of 50
      });

      // Transform Stripe response to camelCase format
      const invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.amount_paid, // Amount in cents (Stripe standard)
        currency: inv.currency,
        status: inv.status || 'unknown',
        invoiceUrl: inv.hosted_invoice_url || '',
        pdfUrl: inv.invoice_pdf || '',
        description: inv.lines.data[0]?.description || 'Subscription',
      }));

      logger.info('BillingPaymentsService.getInvoices: Success', {
        userId,
        invoiceCount: invoices.length,
        hasMore: stripeInvoices.has_more,
      });

      return {
        invoices,
        hasMore: stripeInvoices.has_more,
        count: invoices.length,
      };
    } catch (error) {
      logger.error('BillingPaymentsService.getInvoices: Error', { error, userId });
      throw error;
    }
  }
}
