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
 * 5. OIDC Provider (OAuth/Authentication)
 * 6. Authentication Middleware (for REST API endpoints)
 * 7. Rate Limiting Placeholder
 * 8. Routes
 * 9. 404 Handler
 * 10. Error Handler
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import type { PrismaClient } from '@prisma/client';

// Import container to access services
import { container } from './container';

// Import utilities and middleware
import logger, { morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import {
  createUserRateLimiter,
  createIPRateLimiter,
  addRateLimitHeaders,
  initializeRedisForRateLimiting,
} from './middleware/ratelimit.middleware';

// Import security configuration
import { helmetConfig, corsConfig } from './config/security';

// Import OIDC provider configuration
import { createOIDCProvider } from './config/oidc';
import { initializeOIDCStorage } from './adapters/oidc-adapter';

// Import routes
import { createOAuthRouter } from './routes/oauth.routes';
import routes from './routes';

// Load environment variables
dotenv.config();

// ===== Configuration Constants =====

const NODE_ENV = process.env.NODE_ENV || 'development';

// ===== Application Factory Function =====

/**
 * Create and configure Express application with OIDC provider
 * This is async because OIDC provider initialization is async
 * Uses DI container to resolve dependencies
 */
export async function createApp(): Promise<Application> {
  const app: Application = express();

  // Resolve Prisma from DI container
  const prisma = container.resolve<PrismaClient>('PrismaClient');

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

  // ===== 7. Initialize OIDC Provider =====

  /**
   * Initialize OIDC storage table and create provider instance
   */
  logger.info('Initializing OIDC provider...');
  await initializeOIDCStorage(prisma);
  const oidcProvider = await createOIDCProvider(prisma);

  // Store provider instance for access in routes
  app.set('oidcProvider', oidcProvider);

  // Mount OIDC provider routes
  const oauthRouter = createOAuthRouter(oidcProvider, prisma);
  app.use('/', oauthRouter);

  logger.info('OIDC provider mounted successfully');

  // ===== 8. Authentication Middleware (for REST API) =====

  /**
   * Authentication middleware for REST API endpoints
   *
   * This middleware validates JWT tokens for /v1/* and /admin/* routes.
   * OAuth endpoints (/.well-known/*, /oauth/*, /interaction/*) are NOT authenticated
   * as they are handled by the OIDC provider.
   *
   * Authentication is applied in routes/v1.routes.ts on a per-route basis
   * to allow for public endpoints (like /v1/subscription-plans)
   */

  // ===== 9. Rate Limiting Middleware =====

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

  // Apply IP-based rate limiting to OAuth endpoints (unauthenticated)
  // More restrictive than user-based limits to prevent abuse
  const ipRateLimiter = createIPRateLimiter(30); // 30 requests/minute per IP
  app.use('/oauth', ipRateLimiter);
  app.use('/interaction', ipRateLimiter);

  // Apply user-based rate limiting to REST API endpoints (authenticated)
  // Tier-based limits will be applied based on user's subscription
  const userRateLimiter = createUserRateLimiter();
  app.use('/v1', userRateLimiter);
  app.use('/admin', userRateLimiter);

  logger.info('Rate limiting middleware configured');

  // ===== 10. Routes =====

  /**
   * Mount all application routes
   * Routes are organized by prefix in routes/index.ts
   *
   * Note: OAuth routes are already mounted above via OIDC provider
   */
  app.use('/', routes);

  // ===== 11. 404 Handler =====

  /**
   * Handle requests to undefined routes
   * This must come AFTER all valid routes
   */
  app.use(notFoundHandler);

  // ===== 12. Error Handler =====

  /**
   * Centralized error handling middleware
   * This must be the LAST middleware in the chain
   */
  app.use(errorHandler);

  // ===== Log Application Startup =====

  logger.info('Express application configured', {
    environment: NODE_ENV,
    oidcEnabled: true,
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
