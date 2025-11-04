/**
 * Prisma Database Client
 *
 * Singleton instance of PrismaClient with connection pooling and error handling.
 * This module ensures only one instance of PrismaClient is created across the application.
 *
 * Features:
 * - Connection pooling for optimal performance
 * - Automatic reconnection on connection loss
 * - Graceful shutdown handling
 * - Query logging in development mode
 * - Error handling and logging
 */

import { PrismaClient } from '@prisma/client';

// Global type declaration for Prisma singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient Instance
 *
 * In development, we use a global variable to preserve the instance
 * across module reloads (hot reload). In production, we create a new
 * instance for each deployment.
 */
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});

// Store instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful Shutdown Handler
 *
 * Disconnects from database when process terminates
 * to ensure clean shutdown and prevent connection leaks.
 */
async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('Prisma client disconnected');
}

// Register shutdown handlers
process.on('beforeExit', disconnectPrisma);
process.on('SIGINT', disconnectPrisma);
process.on('SIGTERM', disconnectPrisma);

/**
 * Health Check Function
 *
 * Verifies database connectivity by executing a simple query.
 * Used for health check endpoints and startup verification.
 *
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Database Statistics
 *
 * Returns count of records in each table for monitoring.
 * Useful for admin dashboards and system health checks.
 *
 * @returns Promise with counts for each table
 */
export async function getDatabaseStats() {
  try {
    const [downloadCount, feedbackCount, diagnosticCount, versionCount] = await Promise.all([
      prisma.download.count(),
      prisma.feedback.count(),
      prisma.diagnostic.count(),
      prisma.appVersion.count(),
    ]);

    return {
      downloads: downloadCount,
      feedbacks: feedbackCount,
      diagnostics: diagnosticCount,
      versions: versionCount,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Export Prisma types for use in other modules
 *
 * This allows importing types like:
 * import type { Download, Feedback } from './db';
 */
export type {
  Download,
  Feedback,
  Diagnostic,
  AppVersion
} from '@prisma/client';

// Default export
export default prisma;
