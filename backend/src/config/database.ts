/**
 * Database Configuration
 * Configures Prisma Client with connection pooling and optimization settings
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// =============================================================================
// Environment Variables
// =============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_POOL_SIZE = parseInt(process.env.DATABASE_POOL_SIZE || '20', 10);
const DATABASE_POOL_TIMEOUT = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// Prisma Client Configuration
// =============================================================================

/**
 * Global Prisma Client instance with connection pooling
 * Uses singleton pattern to prevent multiple instances in development (hot reload)
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  errorFormat: 'pretty',
});

if (NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// =============================================================================
// PostgreSQL Connection Pool Configuration
// =============================================================================

/**
 * Direct PostgreSQL connection pool for complex queries or raw SQL
 * Use this for operations that require advanced PostgreSQL features
 * not available through Prisma ORM
 */
export const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: DATABASE_POOL_SIZE,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: DATABASE_POOL_TIMEOUT,
  // SSL configuration for production
  ssl: NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
});

// Pool error handling
pgPool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// =============================================================================
// Database Utility Functions
// =============================================================================

/**
 * Test database connection
 * @returns Promise<boolean> - True if connection is successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

/**
 * Execute a database transaction with automatic rollback on error
 * @param callback - Function containing database operations
 * @returns Promise<T> - Result of the transaction
 */
export async function executeTransaction<T>(
  callback: Parameters<typeof prisma.$transaction>[0]
): Promise<T> {
  return prisma.$transaction(callback, {
    maxWait: 5000, // Maximum wait time to get a connection from the pool
    timeout: 10000, // Maximum time for the transaction to complete
    isolationLevel: 'ReadCommitted', // Default isolation level
  }) as Promise<T>;
}

/**
 * Gracefully disconnect from database
 * Call this during application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pgPool.end();
    console.log('✓ Database connections closed gracefully');
  } catch (error) {
    console.error('✗ Error disconnecting from database:', error);
    throw error;
  }
}

/**
 * Get database connection pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  return {
    total: pgPool.totalCount,
    idle: pgPool.idleCount,
    waiting: pgPool.waitingCount,
  };
}

// =============================================================================
// Database Health Check
// =============================================================================

/**
 * Comprehensive database health check
 * Returns detailed status information
 */
export async function getDatabaseHealth() {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    const poolStats = getPoolStats();

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      pool: {
        total: poolStats.total,
        idle: poolStats.idle,
        waiting: poolStats.waiting,
        utilization: `${Math.round((poolStats.total - poolStats.idle) / poolStats.total * 100)}%`,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Error Handling Helpers
// =============================================================================

/**
 * Check if error is a Prisma unique constraint violation
 */
export function isUniqueConstraintError(error: any): boolean {
  return error?.code === 'P2002';
}

/**
 * Check if error is a Prisma foreign key constraint violation
 */
export function isForeignKeyConstraintError(error: any): boolean {
  return error?.code === 'P2003';
}

/**
 * Check if error is a Prisma record not found error
 */
export function isRecordNotFoundError(error: any): boolean {
  return error?.code === 'P2025';
}

/**
 * Extract field names from Prisma unique constraint error
 */
export function getUniqueConstraintFields(error: any): string[] {
  if (!isUniqueConstraintError(error)) return [];
  return error?.meta?.target || [];
}

// =============================================================================
// Export Default
// =============================================================================

export default prisma;
