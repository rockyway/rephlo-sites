/**
 * Winston Logger Configuration
 *
 * Provides structured logging with multiple transports and log levels.
 * - Development: Console output with colors
 * - Production: File output (error.log, combined.log) + Console
 *
 * Log Levels: error, warn, info, http, debug
 */

import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format with colors for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.cli(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Append metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out empty/internal fields
      const filteredMeta = Object.fromEntries(
        Object.entries(metadata).filter(([key, value]) =>
          key !== 'timestamp' &&
          key !== 'level' &&
          key !== 'message' &&
          value !== undefined &&
          value !== null
        )
      );

      if (Object.keys(filteredMeta).length > 0) {
        msg += `\n${JSON.stringify(filteredMeta, null, 2)}`;
      }
    }

    return msg;
  })
);

console.log('process.env.NODE_ENV 1', process.env.NODE_ENV);

/**
 * Transports configuration
 */
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  // Error log file - only error level
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file - all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,  
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Log unhandled exceptions and rejections
 */
logger.exceptions.handle(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

logger.rejections.handle(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

/**
 * Create a stream for Morgan HTTP logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Helper functions for common logging patterns
 */
export const loggers = {
  /**
   * Log HTTP request
   */
  http: (method: string, url: string, statusCode: number, duration: number) => {
    logger.http('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
    });
  },

  /**
   * Log database query
   */
  db: (query: string, duration: number, error?: Error) => {
    if (error) {
      logger.error('Database Query Failed', {
        query: query.substring(0, 200), // Truncate long queries
        duration: `${duration}ms`,
        error: error.message,
      });
    } else {
      logger.debug('Database Query', {
        query: query.substring(0, 200),
        duration: `${duration}ms`,
      });
    }
  },

  /**
   * Log authentication event
   */
  auth: (event: string, userId?: string, success?: boolean, error?: Error) => {
    const level = error ? 'error' : 'info';
    logger.log(level, `Auth: ${event}`, {
      userId,
      success,
      error: error?.message,
    });
  },

  /**
   * Log API error
   */
  apiError: (method: string, url: string, error: Error, userId?: string) => {
    logger.error('API Error', {
      method,
      url,
      userId,
      error: error.message,
      stack: error.stack,
    });
  },

  /**
   * Log rate limit event
   */
  rateLimit: (userId: string, endpoint: string, limit: number) => {
    logger.warn('Rate Limit Exceeded', {
      userId,
      endpoint,
      limit,
    });
  },

  /**
   * Log credit usage
   */
  creditUsage: (userId: string, creditsUsed: number, remaining: number, modelId: string) => {
    logger.info('Credit Usage', {
      userId,
      creditsUsed,
      remaining,
      modelId,
    });
  },

  /**
   * Log subscription event
   */
  subscription: (event: string, userId: string, tier: string, details?: object) => {
    logger.info(`Subscription: ${event}`, {
      userId,
      tier,
      ...details,
    });
  },

  /**
   * Log webhook delivery
   */
  webhook: (event: string, url: string, success: boolean, statusCode?: number, error?: Error) => {
    const level = success ? 'info' : 'error';
    logger.log(level, `Webhook: ${event}`, {
      url,
      success,
      statusCode,
      error: error?.message,
    });
  },

  /**
   * Log startup/shutdown events
   */
  system: (event: string, details?: object) => {
    logger.info(`System: ${event}`, details);
  },
};

export default logger;
