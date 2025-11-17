import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { container } from '../container';
import logger from '../utils/logger';
import { IEmailService } from '../services/email/email.service.interface';

/**
 * Billing Reminder Worker
 *
 * Runs daily at 9 AM UTC to send billing reminder emails
 * to users whose subscription renews in 3 days.
 *
 * Schedule: '0 9 * * *' (daily at 9:00 AM UTC)
 */
export class BillingReminderWorker {
  private readonly prisma: PrismaClient;
  private readonly emailService: IEmailService;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
    this.emailService = container.resolve<IEmailService>('IEmailService');
  }

  /**
   * Start the billing reminder worker
   */
  start(): void {
    logger.info('BillingReminderWorker: Starting worker');

    // Run daily at 9 AM UTC
    this.task = cron.schedule('0 9 * * *', async () => {
      await this.processBillingReminders();
    });

    logger.info('BillingReminderWorker: Worker started successfully', {
      schedule: '0 9 * * * (daily at 9:00 AM UTC)',
    });
  }

  /**
   * Stop the billing reminder worker
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('BillingReminderWorker: Worker stopped');
    }
  }

  /**
   * Process billing reminders for subscriptions renewing in 3 days
   */
  private async processBillingReminders(): Promise<void> {
    const startTime = Date.now();
    logger.info('BillingReminderWorker: Processing billing reminders');

    try {
      // Calculate date 3 days from now (start and end of day)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);

      const threeDaysFromNowEnd = new Date(threeDaysFromNow);
      threeDaysFromNowEnd.setHours(23, 59, 59, 999);

      logger.debug('BillingReminderWorker: Query parameters', {
        startDate: threeDaysFromNow.toISOString(),
        endDate: threeDaysFromNowEnd.toISOString(),
      });

      // Query subscriptions renewing in 3 days
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          status: 'active',
          current_period_end: {
            gte: threeDaysFromNow,
            lte: threeDaysFromNowEnd,
          },
        },
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
      });

      logger.info('BillingReminderWorker: Found subscriptions to remind', {
        count: subscriptions.length,
      });

      // Send reminder emails
      let successCount = 0;
      let errorCount = 0;

      for (const subscription of subscriptions) {
        try {
          await this.emailService.sendBillingReminderEmail(
            subscription.users.email,
            subscription.users.first_name || 'there',
            subscription.current_period_end!,
            Number(subscription.base_price_usd),
            subscription.tier
          );

          successCount++;

          logger.debug('BillingReminderWorker: Email sent', {
            userId: subscription.user_id,
            email: subscription.users.email,
            tier: subscription.tier,
            amount: subscription.base_price_usd,
            dueDate: subscription.current_period_end,
          });
        } catch (error) {
          errorCount++;

          logger.error('BillingReminderWorker: Failed to send email', {
            userId: subscription.user_id,
            email: subscription.users.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('BillingReminderWorker: Processing completed', {
        totalSubscriptions: subscriptions.length,
        successCount,
        errorCount,
        durationMs: duration,
      });
    } catch (error) {
      logger.error('BillingReminderWorker: Fatal error processing reminders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Run billing reminders manually (for testing)
   */
  async runManually(): Promise<void> {
    logger.info('BillingReminderWorker: Manual execution requested');
    await this.processBillingReminders();
  }
}

// Export singleton instance
export const billingReminderWorker = new BillingReminderWorker();
