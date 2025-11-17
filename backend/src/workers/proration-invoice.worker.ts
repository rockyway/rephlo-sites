import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { container } from '../container';
import logger from '../utils/logger';
import { ProrationService } from '../services/proration.service';

/**
 * Proration Invoice Worker
 *
 * Runs hourly to create Stripe invoices for pending proration events.
 * When users upgrade their subscription tier, they're charged a prorated
 * amount for the remaining billing period. This worker automates the
 * invoice creation process.
 *
 * Schedule: '0 * * * *' (every hour at minute 0)
 */
export class ProrationInvoiceWorker {
  private readonly prisma: PrismaClient;
  private readonly prorationService: ProrationService;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
    this.prorationService = container.resolve<ProrationService>(ProrationService);
  }

  /**
   * Start the proration invoice worker
   */
  start(): void {
    logger.info('ProrationInvoiceWorker: Starting worker');

    // Run hourly at minute 0
    this.task = cron.schedule('0 * * * *', async () => {
      await this.processProrationInvoices();
    });

    logger.info('ProrationInvoiceWorker: Worker started successfully', {
      schedule: '0 * * * * (hourly at minute 0)',
    });
  }

  /**
   * Stop the proration invoice worker
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('ProrationInvoiceWorker: Worker stopped');
    }
  }

  /**
   * Process pending proration events and create Stripe invoices
   */
  private async processProrationInvoices(): Promise<void> {
    const startTime = Date.now();
    logger.info('ProrationInvoiceWorker: Processing proration invoices');

    try {
      // Query proration events that need invoices
      // Conditions:
      // 1. status = 'pending' (not yet invoiced)
      // 2. stripe_invoice_id is null (no invoice created)
      // 3. net_charge_usd > 0 (upgrade with charge, not downgrade)
      const pendingProrations = await this.prisma.proration_event.findMany({
        where: {
          status: 'pending',
          stripe_invoice_id: null,
          net_charge_usd: {
            gt: 0,
          },
        },
        include: {
          subscription_monetization: {
            include: {
              users: {
                select: {
                  id: true,
                  email: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'asc', // Process oldest first
        },
      });

      logger.info('ProrationInvoiceWorker: Found pending prorations', {
        count: pendingProrations.length,
      });

      if (pendingProrations.length === 0) {
        logger.debug('ProrationInvoiceWorker: No pending prorations to process');
        return;
      }

      // Process each proration event
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const proration of pendingProrations) {
        try {
          // Skip if subscription doesn't have Stripe customer ID
          if (!proration.subscription_monetization.stripe_customer_id) {
            logger.warn('ProrationInvoiceWorker: Skipping proration (no Stripe customer)', {
              prorationId: proration.id,
              userId: proration.user_id,
              subscriptionId: proration.subscription_id,
            });
            skippedCount++;
            continue;
          }

          // Create Stripe invoice
          const invoice = await this.prorationService.createProrationInvoice(proration.id);

          if (invoice) {
            successCount++;

            logger.info('ProrationInvoiceWorker: Invoice created successfully', {
              prorationId: proration.id,
              invoiceId: invoice.id,
              userId: proration.user_id,
              amount: proration.net_charge_usd,
              tierChange: `${proration.from_tier} → ${proration.to_tier}`,
            });
          } else {
            // Invoice creation returned null (no charge needed)
            skippedCount++;

            logger.debug('ProrationInvoiceWorker: No invoice needed', {
              prorationId: proration.id,
              reason: 'net_charge_usd <= 0',
            });
          }
        } catch (error) {
          errorCount++;

          logger.error('ProrationInvoiceWorker: Failed to create invoice', {
            prorationId: proration.id,
            userId: proration.user_id,
            subscriptionId: proration.subscription_id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Continue processing other prorations even if one fails
        }
      }

      const duration = Date.now() - startTime;

      logger.info('ProrationInvoiceWorker: Processing completed', {
        totalProrations: pendingProrations.length,
        successCount,
        errorCount,
        skippedCount,
        durationMs: duration,
      });
    } catch (error) {
      logger.error('ProrationInvoiceWorker: Fatal error processing invoices', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Run proration invoice processing manually (for testing)
   */
  async runManually(): Promise<void> {
    logger.info('ProrationInvoiceWorker: Manual execution requested');
    await this.processProrationInvoices();
  }
}

// Export singleton instance
export const prorationInvoiceWorker = new ProrationInvoiceWorker();
