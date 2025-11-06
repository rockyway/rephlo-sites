/**
 * Server Startup and Shutdown
 *
 * This file handles the server lifecycle:
 * - Starting the HTTP server
 * - Graceful shutdown handling (SIGTERM, SIGINT)
 * - Connection cleanup
 * - Database connection management (future)
 * - Redis connection management (future)
 *
 * The Express app configuration is handled in app.ts
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

/**
 * CRITICAL: This import must be FIRST
 * reflect-metadata must be imported before any other imports
 * for TSyringe decorators to work correctly
 */
import 'reflect-metadata';

// Import container to initialize it
import { container, verifyContainer, disposeContainer } from './container';

import http from 'http';
import { createApp } from './app';
import logger, { loggers } from './utils/logger';
import { PrismaClient } from '@prisma/client';

// ===== Configuration =====

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===== Server and Connection Tracking =====

let server: http.Server;
const connections = new Set<any>();

// ===== Server Startup =====

/**
 * Start the HTTP server
 */
const startServer = async (): Promise<void> => {
  try {
    // Verify DI container is properly configured
    logger.info('Server: Verifying DI container...');
    verifyContainer();

    // Get Prisma from DI container
    const prisma = container.resolve<PrismaClient>('PrismaClient');

    // Initialize database connection (Prisma handles connection pooling)
    logger.info('Server: Connecting to database...');
    await prisma.$connect();
    logger.info('Server: Database connected successfully');

    // Create Express app with OIDC provider
    logger.info('Server: Creating Express application...');
    const app = await createApp();

    // Create HTTP server
    server = http.createServer(app);

    // Track active connections for graceful shutdown
    server.on('connection', (connection) => {
      connections.add(connection);

      connection.on('close', () => {
        connections.delete(connection);
      });
    });

    // Start listening
    server.listen(PORT, HOST, () => {
      loggers.system('Server: Started successfully', {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        pid: process.pid,
      });

      logger.info('Server: Ready to accept requests');

      console.log(`🚀 Rephlo Backend API running on http://${HOST}:${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📚 API overview: http://${HOST}:${PORT}/`);
      console.log(`🔐 OIDC Discovery: http://${HOST}:${PORT}/.well-known/openid-configuration`);
      console.log('');
      console.log('Press Ctrl+C to stop the server');
    });

    // Setup graceful shutdown handlers
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error('Server: Failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.log(error);
    process.exit(1);
  }
};

// ===== Graceful Shutdown =====

/**
 * Setup graceful shutdown handlers
 * Handles SIGTERM, SIGINT, uncaught exceptions, and unhandled rejections
 */
function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    loggers.system('Server: Shutdown signal received', { signal });
    console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      loggers.system('Server: HTTP server closed');
      console.log('✓ HTTP server closed');
    });

    // Close all active connections
    let connectionsClosed = 0;
    for (const connection of connections) {
      connection.destroy();
      connectionsClosed++;
    }

    if (connectionsClosed > 0) {
      loggers.system('Server: Active connections closed', { count: connectionsClosed });
      console.log(`✓ Closed ${connectionsClosed} active connection(s)`);
    }

    // Close Redis connection (used for rate limiting)
    try {
      const { closeRedisForRateLimiting } = await import('./middleware/ratelimit.middleware');
      await closeRedisForRateLimiting();
      loggers.system('Server: Rate limiting Redis connection closed');
      console.log('✓ Rate limiting Redis connection closed');
    } catch (error) {
      logger.error('Server: Error closing rate limiting Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Dispose DI container resources (handles Prisma, Redis, etc.)
    await disposeContainer();
    console.log('✓ DI container disposed');

    loggers.system('Server: Graceful shutdown complete');
    console.log('✓ Graceful shutdown complete');

    process.exit(0);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Server: Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    console.error('💥 Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Server: Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    console.error('💥 Unhandled Promise Rejection:', reason);
    shutdown('unhandledRejection');
  });
}

// ===== Start Server =====

startServer();

// ===== Export for Testing =====

export { server };
