/**
 * Refund Service (Plan 192)
 *
 * Handles subscription refund operations including:
 * - Creating refund requests (pending admin approval)
 * - Processing Stripe refunds
 * - Refund history tracking
 * - Admin approval workflows
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md (Section 3.2)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, subscription_refund as SubscriptionRefund } from '@prisma/client';
import crypto from 'crypto';
import Stripe from 'stripe';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { badRequestError } from '../middleware/error.middleware';
import { IRefundService, CreateRefundInput } from '../interfaces/services/refund.interface';
import { stripe } from './stripe.service';

@injectable()
export class RefundService implements IRefundService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('RefundService: Initialized');
  }

  /**
   * Create refund request (pending admin approval)
   */
  async createRefundRequest(input: CreateRefundInput): Promise<SubscriptionRefund> {
    logger.info('RefundService.createRefundRequest', {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      refundType: input.refundType,
      refundAmountUsd: input.refundAmountUsd,
    });

    try {
      // Validate subscription exists
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: input.subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Check for existing pending/completed refunds for this subscription
      const existingRefund = await this.prisma.subscription_refund.findFirst({
        where: {
          subscription_id: input.subscriptionId,
          status: { in: ['pending', 'approved', 'processing', 'completed'] },
        },
      });

      if (existingRefund) {
        throw badRequestError(
          `A refund already exists for this subscription (status: ${existingRefund.status})`
        );
      }

      // Create refund record
      const refund = await this.prisma.subscription_refund.create({
        data: {
          id: crypto.randomUUID(),
          user_id: input.userId,
          subscription_id: input.subscriptionId,
          refund_type: input.refundType,
          refund_reason: input.refundReason || null,
          requested_by: input.requestedBy,
          requested_at: new Date(),
          original_charge_amount_usd: input.originalChargeAmountUsd,
          refund_amount_usd: input.refundAmountUsd,
          stripe_charge_id: input.stripeChargeId || null,
          stripe_refund_id: null,
          status: 'pending',
          processed_at: null,
          stripe_processed_at: null,
          failure_reason: null,
          admin_notes: input.adminNotes || null,
          ip_address: input.ipAddress || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      logger.info('RefundService: Refund request created', {
        refundId: refund.id,
        subscriptionId: input.subscriptionId,
        status: refund.status,
      });

      return refund;
    } catch (error) {
      logger.error('RefundService.createRefundRequest: Error', { error });
      throw error;
    }
  }

  /**
   * Approve refund and process with Stripe
   */
  async approveAndProcessRefund(refundId: string, adminId: string): Promise<SubscriptionRefund> {
    logger.info('RefundService.approveAndProcessRefund', {
      refundId,
      adminId,
    });

    try {
      // Get refund record
      const refund = await this.prisma.subscription_refund.findUnique({
        where: { id: refundId },
      });

      if (!refund) {
        throw new NotFoundError('Refund not found');
      }

      // Validate status
      if (refund.status !== 'pending') {
        throw badRequestError(`Cannot approve refund with status: ${refund.status}`);
      }

      // Update status to approved
      await this.prisma.subscription_refund.update({
        where: { id: refundId },
        data: {
          status: 'approved',
          updated_at: new Date(),
        },
      });

      // Process Stripe refund
      try {
        const stripeRefund = await this.processStripeRefund(refund);

        // Update refund record with Stripe details
        const updatedRefund = await this.prisma.subscription_refund.update({
          where: { id: refundId },
          data: {
            status: 'processing',
            stripe_refund_id: stripeRefund.id,
            processed_at: new Date(),
            updated_at: new Date(),
          },
        });

        logger.info('RefundService: Refund approved and processed', {
          refundId,
          stripeRefundId: stripeRefund.id,
          status: 'processing',
        });

        return updatedRefund;
      } catch (stripeError) {
        // Mark refund as failed
        await this.prisma.subscription_refund.update({
          where: { id: refundId },
          data: {
            status: 'failed',
            failure_reason: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
            updated_at: new Date(),
          },
        });

        logger.error('RefundService: Stripe refund failed', {
          refundId,
          error: stripeError,
        });

        throw stripeError;
      }
    } catch (error) {
      logger.error('RefundService.approveAndProcessRefund: Error', { error });
      throw error;
    }
  }

  /**
   * Process Stripe refund (internal method)
   */
  async processStripeRefund(refund: SubscriptionRefund): Promise<Stripe.Refund> {
    logger.info('RefundService.processStripeRefund', {
      refundId: refund.id,
      stripeChargeId: refund.stripe_charge_id,
      refundAmountUsd: refund.refund_amount_usd,
    });

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!refund.stripe_charge_id) {
      throw badRequestError('No Stripe charge ID found for this refund');
    }

    try {
      // Convert USD to cents for Stripe
      const refundAmountCents = Math.round(Number(refund.refund_amount_usd) * 100);

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        charge: refund.stripe_charge_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
        metadata: {
          refund_id: refund.id,
          user_id: refund.user_id,
          subscription_id: refund.subscription_id,
          refund_type: refund.refund_type,
        },
      });

      logger.info('RefundService: Stripe refund created', {
        refundId: refund.id,
        stripeRefundId: stripeRefund.id,
        amount: stripeRefund.amount,
        status: stripeRefund.status,
      });

      return stripeRefund;
    } catch (error) {
      logger.error('RefundService.processStripeRefund: Stripe API error', {
        refundId: refund.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get refund history for user
   */
  async getRefundHistory(userId: string): Promise<SubscriptionRefund[]> {
    logger.debug('RefundService.getRefundHistory', { userId });

    try {
      const refunds = await this.prisma.subscription_refund.findMany({
        where: { user_id: userId },
        orderBy: { requested_at: 'desc' },
      });

      return refunds;
    } catch (error) {
      logger.error('RefundService.getRefundHistory: Error', { error });
      throw error;
    }
  }

  /**
   * Get pending refunds (admin review queue)
   */
  async getPendingRefunds(): Promise<SubscriptionRefund[]> {
    logger.debug('RefundService.getPendingRefunds');

    try {
      const refunds = await this.prisma.subscription_refund.findMany({
        where: { status: 'pending' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          subscription_monetization: {
            select: {
              id: true,
              tier: true,
              status: true,
              base_price_usd: true,
            },
          },
        },
        orderBy: { requested_at: 'desc' },
      });

      return refunds;
    } catch (error) {
      logger.error('RefundService.getPendingRefunds: Error', { error });
      throw error;
    }
  }

  /**
   * Cancel refund request
   */
  async cancelRefund(refundId: string, adminId: string, reason: string): Promise<SubscriptionRefund> {
    logger.info('RefundService.cancelRefund', {
      refundId,
      adminId,
      reason,
    });

    try {
      // Get refund record
      const refund = await this.prisma.subscription_refund.findUnique({
        where: { id: refundId },
      });

      if (!refund) {
        throw new NotFoundError('Refund not found');
      }

      // Validate status (can only cancel pending/approved refunds)
      if (!['pending', 'approved'].includes(refund.status)) {
        throw badRequestError(`Cannot cancel refund with status: ${refund.status}`);
      }

      // Update refund record
      const cancelledRefund = await this.prisma.subscription_refund.update({
        where: { id: refundId },
        data: {
          status: 'cancelled',
          failure_reason: reason,
          updated_at: new Date(),
        },
      });

      logger.info('RefundService: Refund cancelled', {
        refundId,
        reason,
      });

      return cancelledRefund;
    } catch (error) {
      logger.error('RefundService.cancelRefund: Error', { error });
      throw error;
    }
  }
}
