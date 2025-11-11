/**
 * Express Application Configuration
 *
 * This file initializes the Express application with all necessary middleware
 * in the proper order. It separates app configuration from server lifecycle
 * management (which is handled in server.ts).
 *
 * Middleware Pipeline Order:
 * 1. Security (Helmet)
 * 2. CORS
 * 3. Body Parsers
 * 4. HTTP Logging (Morgan)
 * 5. Request ID
 * 6. Redis for Rate Limiting
 * 7. Authentication Middleware (for REST API endpoints)
 * 8. Rate Limiting
 * 9. Routes
 * 10. 404 Handler
 * 11. Error Handler
 *
 * Note: OIDC provider has been moved to separate Identity Provider service (port 7151)
 * This backend is now a simplified Resource API that validates tokens via introspection.
 *
 * Reference: docs/plan/106-implementation-roadmap.md (Phase 2)
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import utilities and middleware
import logger, { morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import {
  createUserRateLimiter,
  addRateLimitHeaders,
  initializeRedisForRateLimiting,
} from './middleware/ratelimit.middleware';

// Import security configuration
import { helmetConfig, corsConfig } from './config/security';

// Import routes
import routes from './routes';

// Load environment variables
dotenv.config();

// ===== Configuration Constants =====

const NODE_ENV = process.env.NODE_ENV || 'development';

// ===== Application Factory Function =====

/**
 * Create and configure Express application
 * This is async because Redis initialization is async
 */
export async function createApp(): Promise<Application> {
  const app: Application = express();

  // ===== 1. Security Middleware =====

  /**
   * Helmet.js - Set security-related HTTP headers
   * - Content-Security-Policy (CSP)
   * - HTTP Strict Transport Security (HSTS)
   * - X-Content-Type-Options: nosniff
   * - X-Frame-Options: sameorigin
   * - X-XSS-Protection: 1; mode=block
   * - Referrer-Policy
   * - Permissions-Policy
   *
   * Configuration imported from config/security.ts
   */
  app.use(helmet(helmetConfig));

  // ===== 2. CORS Configuration =====

  /**
   * CORS - Allow cross-origin requests from specified origins
   * Supports web applications, desktop applications, and deep links
   *
   * Configuration imported from config/security.ts
   * Includes:
   * - Origin validation with wildcard support
   * - Credentials handling
   * - Rate limit headers exposure
   * - Preflight caching
   */
  app.use(cors(corsConfig));

  // ===== 3. Body Parsers =====

  /**
   * Parse JSON bodies (application/json)
   * Limit: 10mb (for large payloads)
   */
  app.use(express.json({ limit: '10mb' }));

  /**
   * Parse URL-encoded bodies (application/x-www-form-urlencoded)
   * Extended: true (for rich objects and arrays)
   */
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ===== 4. HTTP Request Logging =====

  /**
   * Morgan - HTTP request logger
   * - Development: 'dev' format (colored, concise)
   * - Production: 'combined' format (Apache-style, detailed)
   *
   * Logs are piped to Winston for structured logging
   */
  if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: morganStream,
        // Skip logging for health checks to reduce noise
        skip: (req) => req.url.startsWith('/health'),
      })
    );
  }

  // ===== 5. Request ID Middleware =====

  /**
   * Add unique request ID to each request for tracing
   * Can be used to correlate logs across services
   */
  app.use((req, _res, next) => {
    const requestId =
      req.headers['x-request-id'] ||
      `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    (req as any).requestId = requestId;
    next();
  });

  // ===== 6. Initialize Redis for Rate Limiting =====

  /**
   * Initialize Redis client for distributed rate limiting
   * Falls back to in-memory store if Redis is unavailable
   */
  logger.info('Initializing Redis for rate limiting...');
  await initializeRedisForRateLimiting();

  // ===== 7. Authentication Middleware (for REST API) =====

  /**
   * Authentication middleware for REST API endpoints
   *
   * This middleware validates JWT tokens for /v1/* and /admin/* routes.
   * Tokens are validated via the Identity Provider service.
   *
   * Authentication is applied in routes/v1.routes.ts on a per-route basis
   * to allow for public endpoints (like /v1/subscription-plans)
   */

  // ===== 8. Rate Limiting Middleware =====

  /**
   * Rate limiting middleware
   *
   * Applies tier-based rate limiting to all API endpoints:
   * - Free tier: 10 requests/minute, 10k tokens/minute, 200 credits/day
   * - Pro tier: 60 requests/minute, 100k tokens/minute, 5k credits/day
   * - Enterprise tier: 300 requests/minute, 500k tokens/minute, 50k credits/day
   *
   * Uses Redis for distributed rate limiting (falls back to memory store if unavailable)
   * Adds rate limit headers to all responses (X-RateLimit-*)
   * Returns 429 Too Many Requests when limits are exceeded
   */

  // Add rate limit headers to all responses
  app.use(addRateLimitHeaders);

  // Apply user-based rate limiting to REST API endpoints (authenticated)
  // Tier-based limits will be applied based on user's subscription
  // NOTE: Admin routes are NOT rate limited - admins are trusted users
  const userRateLimiter = createUserRateLimiter();
  app.use('/v1', userRateLimiter);
  // app.use('/admin', userRateLimiter); // DISABLED - Admin routes should not be rate limited

  logger.info('Rate limiting middleware configured (admin routes excluded)');

  // ===== 9. Routes =====

  /**
   * Mount all application routes
   * Routes are organized by prefix in routes/index.ts
   */
  app.use('/', routes);

  logger.info('Routes mounted successfully');

  // ===== 10. 404 Handler =====

  /**
   * Handle requests to undefined routes
   * This must come AFTER all valid routes
   */
  app.use(notFoundHandler);

  // ===== 11. Error Handler =====

  /**
   * Centralized error handling middleware
   * This must be the LAST middleware in the chain
   */
  app.use(errorHandler);

  // ===== Log Application Startup =====

  logger.info('Express application configured', {
    environment: NODE_ENV,
    rateLimitingEnabled: true,
  });

  return app;
}

// ===== Export default app for backward compatibility (synchronous)
// Note: This version does NOT have OIDC provider initialized
// Use createApp() in server.ts for full functionality
const app: Application = express();
app.all('*', (_req, res) => {
  res.status(503).json({
    error: {
      code: 'service_unavailable',
      message:
        'Server is initializing. Please use createApp() from server.ts',
    },
  });
});

export default app;
