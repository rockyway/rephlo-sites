/**
 * Tier Credit Upgrade Worker (Plan 190)
 *
 * Background job that processes scheduled tier credit upgrades.
 * Runs periodically to check for pending rollouts and applies credit increases
 * to existing users when scheduled rollout dates are reached.
 *
 * Features:
 * - Periodic execution (configurable via cron)
 * - Processes all pending tier upgrades in batch
 * - Comprehensive error handling and logging
 * - Integration with CreditUpgradeService
 *
 * Usage:
 * - Run as standalone process: `node dist/workers/tier-credit-upgrade.worker.js`
 * - Schedule via cron: `0 * * * *` (hourly)
 * - Or integrate with BullMQ for distributed job processing
 *
 * @module workers/tier-credit-upgrade.worker
 */

import 'reflect-metadata';
import { container } from '../container';
import { ICreditUpgradeService } from '../interfaces/services/credit-upgrade.interface';
import logger from '../utils/logger';

// =============================================================================
// Worker Configuration
// =============================================================================

const WORKER_NAME = 'TierCreditUpgradeWorker';
const CHECK_INTERVAL_MS = parseInt(process.env.TIER_UPGRADE_CHECK_INTERVAL_MS || '3600000', 10); // 1 hour default

// =============================================================================
// Worker Implementation
// =============================================================================

/**
 * Main worker function
 * Processes all pending scheduled tier credit upgrades
 */
async function processPendingTierUpgrades(): Promise<void> {
  const startTime = Date.now();

  logger.info(`${WORKER_NAME}: Starting scheduled tier upgrade processing`);

  try {
    // Resolve CreditUpgradeService from DI container
    const creditUpgradeService = container.resolve<ICreditUpgradeService>('ICreditUpgradeService');

    // Process all pending upgrades
    const result = await creditUpgradeService.processPendingUpgrades();

    const duration = Date.now() - startTime;

    logger.info(`${WORKER_NAME}: Completed scheduled tier upgrade processing`, {
      duration: `${duration}ms`,
      processedTiers: result.processedTiers,
      totalUpgrades: result.totalUpgrades,
      errorCount: result.errors.length,
    });

    // Log errors if any
    if (result.errors.length > 0) {
      logger.error(`${WORKER_NAME}: Encountered ${result.errors.length} errors during processing`, {
        errors: result.errors,
      });
    }

    // Success metrics
    if (result.processedTiers > 0) {
      logger.info(`${WORKER_NAME}: Successfully upgraded ${result.totalUpgrades} users across ${result.processedTiers} tiers`);
    } else {
      logger.debug(`${WORKER_NAME}: No pending tier upgrades found`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`${WORKER_NAME}: Fatal error during scheduled tier upgrade processing`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw to allow external monitoring/alerting
    throw error;
  }
}

// =============================================================================
// Worker Scheduling
// =============================================================================

/**
 * Run worker in continuous loop mode
 * Useful for containerized environments without cron
 */
async function runContinuously(): Promise<void> {
  logger.info(`${WORKER_NAME}: Starting in continuous mode`, {
    checkIntervalMs: CHECK_INTERVAL_MS,
    checkIntervalMinutes: CHECK_INTERVAL_MS / 60000,
  });

  // Run immediately on startup
  try {
    await processPendingTierUpgrades();
  } catch (error) {
    logger.error(`${WORKER_NAME}: Initial run failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Schedule periodic execution
  setInterval(async () => {
    try {
      await processPendingTierUpgrades();
    } catch (error) {
      logger.error(`${WORKER_NAME}: Periodic run failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue running despite errors
    }
  }, CHECK_INTERVAL_MS);

  logger.info(`${WORKER_NAME}: Continuous mode scheduled successfully`);
}

/**
 * Run worker once (for cron execution)
 */
async function runOnce(): Promise<void> {
  logger.info(`${WORKER_NAME}: Starting in one-time mode`);

  try {
    await processPendingTierUpgrades();
    logger.info(`${WORKER_NAME}: One-time execution completed successfully`);
    process.exit(0);
  } catch (error) {
    logger.error(`${WORKER_NAME}: One-time execution failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

/**
 * Main entry point
 * Determines execution mode based on environment variable
 */
async function main(): Promise<void> {
  const mode = process.env.TIER_UPGRADE_WORKER_MODE || 'continuous';

  logger.info(`${WORKER_NAME}: Initializing`, {
    mode,
    nodeEnv: process.env.NODE_ENV || 'development',
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${WORKER_NAME}: Received ${signal} signal, shutting down gracefully...`);

    try {
      // Dispose container resources
      const { disposeContainer } = await import('../container');
      await disposeContainer();

      logger.info(`${WORKER_NAME}: Graceful shutdown complete`);
      process.exit(0);
    } catch (error) {
      logger.error(`${WORKER_NAME}: Error during shutdown`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Run worker based on mode
  if (mode === 'once') {
    await runOnce();
  } else {
    await runContinuously();
  }
}

// =============================================================================
// Execute Worker
// =============================================================================

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  main().catch((error) => {
    logger.error(`${WORKER_NAME}: Unhandled error`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}

// Export for testing and manual invocation
export { processPendingTierUpgrades, runOnce, runContinuously };
