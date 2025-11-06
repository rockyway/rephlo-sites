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
 * 5. Authentication Placeholder
 * 6. Rate Limiting Placeholder
 * 7. Routes
 * 8. 404 Handler
 * 9. Error Handler
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import utilities and middleware
import logger, { morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import routes
import routes from './routes';

// Load environment variables
dotenv.config();

// ===== Configuration Constants =====

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS allowed origins (supporting multiple origins)
const allowedOrigins = [
  CORS_ORIGIN,
  'http://localhost:8080',  // Desktop app development
  'textassistant://*',      // Desktop app deep links (will be handled separately)
];

// ===== Create Express Application =====

const app: Application = express();

// ===== 1. Security Middleware =====

/**
 * Helmet.js - Set security-related HTTP headers
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 1; mode=block
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    // Allow framing from same origin (for embedded content)
    frameguard: { action: 'sameorigin' },
  })
);

// ===== 2. CORS Configuration =====

/**
 * CORS - Allow cross-origin requests from specified origins
 * Supports both web and desktop applications
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes('*')) {
          // Handle wildcard patterns (e.g., textassistant://*)
          const pattern = allowedOrigin.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  })
);

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
  const requestId = req.headers['x-request-id'] ||
    `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  (req as any).requestId = requestId;
  next();
});

// ===== 6. Authentication Middleware Placeholder =====

/**
 * TODO: Authentication middleware will be implemented by OIDC Authentication Agent
 *
 * This middleware will:
 * - Extract and validate JWT access tokens from Authorization header
 * - Verify token signature and expiration
 * - Attach user information to req.user
 * - Handle token refresh if needed
 * - Return 401 Unauthorized for invalid tokens
 *
 * Example:
 * app.use('/v1', authMiddleware);
 * app.use('/admin', authMiddleware, adminMiddleware);
 */

// ===== 7. Rate Limiting Middleware Placeholder =====

/**
 * TODO: Rate limiting middleware will be implemented by Rate Limiting & Security Agent
 *
 * This middleware will:
 * - Use Redis for distributed rate limiting
 * - Apply tier-based limits (free: 10 RPM, pro: 60 RPM, enterprise: 300 RPM)
 * - Track requests per minute, tokens per minute, credits per day
 * - Add rate limit headers to responses (X-RateLimit-*)
 * - Return 429 Too Many Requests when limits are exceeded
 *
 * Example:
 * import { rateLimitMiddleware } from './middleware/ratelimit.middleware';
 * app.use('/v1', rateLimitMiddleware);
 */

// ===== 8. Routes =====

/**
 * Mount all application routes
 * Routes are organized by prefix in routes/index.ts
 */
app.use('/', routes);

// ===== 9. 404 Handler =====

/**
 * Handle requests to undefined routes
 * This must come AFTER all valid routes
 */
app.use(notFoundHandler);

// ===== 10. Error Handler =====

/**
 * Centralized error handling middleware
 * This must be the LAST middleware in the chain
 */
app.use(errorHandler);

// ===== Log Application Startup =====

logger.info('Express application configured', {
  environment: NODE_ENV,
  corsOrigins: allowedOrigins,
});

// ===== Export Application =====

export default app;
