/**
 * Stripe Service
 *
 * Handles all Stripe API interactions for subscription management.
 * Provides functions for:
 * - Customer management (create, retrieve, update)
 * - Subscription lifecycle (create, update, cancel)
 * - Payment method management
 * - Webhook event processing
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Subscription APIs)
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { syncSubscriptionFromStripe } from './subscription.service';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.warn('STRIPE_SECRET_KEY not configured. Stripe service will not function.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null;

/**
 * Subscription plan configuration
 * These are hardcoded as per the specification
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try out with limited credits',
    creditsPerMonth: 5000,
    priceCents: 0,
    billingIntervals: ['monthly'] as const,
    features: [
      '5,000 credits per month',
      'Access to standard models',
      'Basic support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    creditsPerMonth: 100000,
    priceCents: 2999, // $29.99
    billingIntervals: ['monthly', 'yearly'] as const,
    yearlyDiscountPercent: 20,
    features: [
      '100,000 credits per month',
      'Access to all models',
      'Priority support',
      'Advanced analytics',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and businesses',
    creditsPerMonth: 1000000,
    priceCents: 19900, // $199.00
    billingIntervals: ['monthly', 'yearly'] as const,
    yearlyDiscountPercent: 25,
    features: [
      '1,000,000 credits per month',
      'Access to all models',
      'Dedicated support',
      'Custom integrations',
      'SSO',
      'SLA',
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingInterval = 'monthly' | 'yearly';

/**
 * Calculate price with yearly discount
 */
export function calculatePrice(planId: SubscriptionPlanId, interval: BillingInterval): number {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (interval === 'yearly' && 'yearlyDiscountPercent' in plan) {
    const monthlyPrice = plan.priceCents;
    const yearlyPrice = monthlyPrice * 12;
    const discount = yearlyPrice * (plan.yearlyDiscountPercent / 100);
    return Math.round(yearlyPrice - discount);
  }
  return plan.priceCents;
}

/**
 * Create or retrieve Stripe customer for a user
 */
export async function createOrGetCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Creating or retrieving Stripe customer', { userId, email });

  try {
    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      logger.info('Found existing Stripe customer', { userId, customerId: customer.id });

      // Update metadata if needed
      if (customer.metadata.userId !== userId) {
        await stripe.customers.update(customer.id, {
          metadata: { userId },
        });
      }

      return customer;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    logger.info('Created new Stripe customer', { userId, customerId: customer.id });
    return customer;
  } catch (error) {
    logger.error('Failed to create or retrieve Stripe customer', { userId, email, error });
    throw error;
  }
}

/**
 * Create a Stripe subscription
 */
export async function createStripeSubscription(
  customerId: string,
  planId: SubscriptionPlanId,
  billingInterval: BillingInterval,
  paymentMethodId?: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Creating Stripe subscription', { customerId, planId, billingInterval });

  try {
    const plan = SUBSCRIPTION_PLANS[planId];

    // For free plan, we don't create a Stripe subscription
    if (plan.priceCents === 0) {
      throw new Error('Free plan does not require Stripe subscription');
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Calculate price based on interval
    const priceAmount = calculatePrice(planId, billingInterval);

    // Create subscription with inline price
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product: plan.name,
            recurring: {
              interval: billingInterval === 'yearly' ? 'year' : 'month',
            },
            unit_amount: billingInterval === 'yearly' ? priceAmount : plan.priceCents,
          } as any, // Type assertion needed for inline price creation
        },
      ],
      metadata: {
        planId,
        billingInterval,
        creditsPerMonth: plan.creditsPerMonth.toString(),
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    logger.info('Created Stripe subscription', {
      customerId,
      subscriptionId: subscription.id,
      planId,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to create Stripe subscription', {
      customerId,
      planId,
      billingInterval,
      error,
    });
    throw error;
  }
}

/**
 * Update a Stripe subscription (upgrade/downgrade)
 */
export async function updateStripeSubscription(
  subscriptionId: string,
  newPlanId: SubscriptionPlanId,
  newBillingInterval: BillingInterval
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Updating Stripe subscription', {
    subscriptionId,
    newPlanId,
    newBillingInterval,
  });

  try {
    const plan = SUBSCRIPTION_PLANS[newPlanId];
    const priceAmount = calculatePrice(newPlanId, newBillingInterval);

    // Retrieve current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!currentSubscription.items.data[0]) {
      throw new Error('Subscription has no items');
    }

    // Update subscription with new price
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price_data: {
            currency: 'usd',
            product: plan.name,
            recurring: {
              interval: newBillingInterval === 'yearly' ? 'year' : 'month',
            },
            unit_amount:
              newBillingInterval === 'yearly' ? priceAmount : plan.priceCents,
          } as any, // Type assertion needed for inline price creation
        },
      ],
      metadata: {
        planId: newPlanId,
        billingInterval: newBillingInterval,
        creditsPerMonth: plan.creditsPerMonth.toString(),
      },
      proration_behavior: 'create_prorations', // Prorate charges
    });

    logger.info('Updated Stripe subscription', { subscriptionId, newPlanId });
    return subscription;
  } catch (error) {
    logger.error('Failed to update Stripe subscription', {
      subscriptionId,
      newPlanId,
      error,
    });
    throw error;
  }
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Cancelling Stripe subscription', { subscriptionId, cancelAtPeriodEnd });

  try {
    let subscription: Stripe.Subscription;

    if (cancelAtPeriodEnd) {
      // Cancel at end of billing period
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    }

    logger.info('Cancelled Stripe subscription', { subscriptionId, cancelAtPeriodEnd });
    return subscription;
  } catch (error) {
    logger.error('Failed to cancel Stripe subscription', { subscriptionId, error });
    throw error;
  }
}

/**
 * Retrieve a Stripe subscription
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Failed to retrieve Stripe subscription', { subscriptionId, error });
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    logger.info('Verified Stripe webhook signature', { eventType: event.type });
    return event;
  } catch (error) {
    logger.error('Failed to verify Stripe webhook signature', { error });
    throw error;
  }
}

/**
 * Handle Stripe webhook event
 * @param event - Stripe event object
 * @param prisma - Prisma client for database operations
 */
export async function handleStripeWebhook(event: Stripe.Event, prisma: PrismaClient): Promise<void> {
  logger.info('Processing Stripe webhook event', { eventType: event.type });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, prisma);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, prisma);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, prisma);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, prisma);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, prisma);
        break;

      default:
        logger.info('Unhandled Stripe webhook event type', { eventType: event.type });
    }

    logger.info('Successfully processed Stripe webhook event', { eventType: event.type });
  } catch (error) {
    logger.error('Failed to process Stripe webhook event', {
      eventType: event.type,
      error,
    });
    throw error;
  }
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription, prisma: PrismaClient): Promise<void> {
  logger.info('Handling subscription.created event', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  try {
    // Sync subscription to database
    await syncSubscriptionFromStripe(subscription.id, prisma);
    logger.info('Subscription synced to database', {
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to sync subscription to database', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, prisma: PrismaClient): Promise<void> {
  logger.info('Handling subscription.updated event', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  try {
    // Sync subscription status to database
    await syncSubscriptionFromStripe(subscription.id, prisma);
    logger.info('Subscription status synced to database', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    logger.error('Failed to sync subscription status', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, prisma: PrismaClient): Promise<void> {
  logger.info('Handling subscription.deleted event', {
    subscriptionId: subscription.id,
  });

  try {
    // Find and mark subscription as cancelled
    const dbSubscription = await prisma.subscriptions.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await prisma.subscriptions.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      });
      logger.info('Subscription marked as cancelled in database', {
        subscriptionId: subscription.id,
        dbSubscriptionId: dbSubscription.id,
      });
    } else {
      logger.warn('Subscription not found in database', {
        subscriptionId: subscription.id,
      });
    }
  } catch (error) {
    logger.error('Failed to mark subscription as cancelled', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, prisma: PrismaClient): Promise<void> {
  logger.info('Handling invoice.payment_succeeded event', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  try {
    // Only allocate credits if this is a subscription invoice
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      // Find subscription in database
      const dbSubscription = await prisma.subscriptions.findFirst({
        where: { stripeSubscriptionId: invoice.subscription },
      });

      if (dbSubscription) {
        // Allocate credits for the billing period
        const { container } = await import('../container');
        const creditService = container.resolve<import('../interfaces').ICreditService>('ICreditService');
        const periodStart = new Date(invoice.period_start * 1000);
        const periodEnd = new Date(invoice.period_end * 1000);

        await creditService.allocateCredits({
          userId: dbSubscription.userId,
          subscriptionId: dbSubscription.id,
          totalCredits: dbSubscription.creditsPerMonth,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
        });

        logger.info('Credits allocated for successful payment', {
          invoiceId: invoice.id,
          subscriptionId: dbSubscription.id,
          userId: dbSubscription.userId,
          credits: dbSubscription.creditsPerMonth,
        });
      } else {
        logger.warn('Subscription not found for invoice', {
          invoiceId: invoice.id,
          stripeSubscriptionId: invoice.subscription,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to allocate credits for invoice payment', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, prisma: PrismaClient): Promise<void> {
  logger.error('Handling invoice.payment_failed event', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  try {
    // Suspend subscription on payment failure
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      const dbSubscription = await prisma.subscriptions.findFirst({
        where: { stripeSubscriptionId: invoice.subscription },
      });

      if (dbSubscription) {
        await prisma.subscriptions.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'suspended',
            updatedAt: new Date(),
          },
        });

        logger.info('Subscription suspended due to payment failure', {
          invoiceId: invoice.id,
          subscriptionId: dbSubscription.id,
          userId: dbSubscription.userId,
        });
      } else {
        logger.warn('Subscription not found for failed payment', {
          invoiceId: invoice.id,
          stripeSubscriptionId: invoice.subscription,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to handle payment failure', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
