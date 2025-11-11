/**
 * Identity Provider Server Entry Point
 *
 * Starts the Express server and handles graceful shutdown
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import logger from './utils/logger';

const PORT = process.env.PORT || 7151;
const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting Identity Provider service');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    const { app } = await createApp(prisma);

    const server = app.listen(PORT, () => {
      logger.info(`Identity Provider running on port ${PORT}`);
      logger.info(`OIDC Issuer: ${process.env.OIDC_ISSUER}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
