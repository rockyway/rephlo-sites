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

import http from 'http';
import { createApp } from './app';
import { prisma } from './config/database';
import logger, { loggers } from './utils/logger';

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
    // Initialize database connection (Prisma handles connection pooling)
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully');

    // TODO: Initialize Redis connection (Rate Limiting & Security Agent)
    // await connectRedis();

    // Create Express app with OIDC provider
    logger.info('Creating Express app with OIDC provider...');
    const app = await createApp(prisma);

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
      loggers.system('Server started', {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        pid: process.pid,
      });

      console.log(`🚀 Rephlo Backend API running on http://${HOST}:${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📚 API overview: http://${HOST}:${PORT}/`);
      console.log(`🔐 OIDC Discovery: http://${HOST}:${PORT}/.well-known/openid-configuration`);
      console.log('');
      console.log('Press Ctrl+C to stop the server');
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    process.exit(1);
  }
};

// ===== Graceful Shutdown =====

/**
 * Graceful shutdown handler
 * Closes all connections and cleans up resources
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  loggers.system('Shutdown signal received', { signal });
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    loggers.system('HTTP server closed');
    console.log('✓ HTTP server closed');
  });

  // Close all active connections
  let connectionsClosed = 0;
  for (const connection of connections) {
    connection.destroy();
    connectionsClosed++;
  }

  if (connectionsClosed > 0) {
    loggers.system('Active connections closed', { count: connectionsClosed });
    console.log(`✓ Closed ${connectionsClosed} active connection(s)`);
  }

  // Close database connection
  try {
    await prisma.$disconnect();
    loggers.system('Database connection closed');
    console.log('✓ Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // TODO: Close Redis connection (Rate Limiting & Security Agent)
  // await disconnectRedis();
  // console.log('✓ Redis connection closed');

  loggers.system('Graceful shutdown completed');
  console.log('✓ Graceful shutdown completed');

  process.exit(0);
};

// ===== Signal Handlers =====

/**
 * Handle SIGTERM (e.g., from Docker, Kubernetes)
 */
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

/**
 * Handle SIGINT (e.g., Ctrl+C in terminal)
 */
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

/**
 * Handle uncaught exceptions
 * Log and exit to prevent undefined behavior
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });

  console.error('💥 Uncaught Exception:', error);

  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * Handle unhandled promise rejections
 * Log and exit to prevent undefined behavior
 */
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  console.error('💥 Unhandled Promise Rejection:', reason);

  // Attempt graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ===== Start Server =====

startServer();

// ===== Export for Testing =====

export { server };
