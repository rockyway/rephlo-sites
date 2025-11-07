/**
 * Main Route Aggregator
 *
 * Combines all route modules and organizes them under their respective prefixes.
 * This provides a centralized location for route management.
 *
 * Route Structure:
 * - /                        - Root routes (health check, API overview)
 * - /.well-known/*           - OIDC discovery
 * - /oauth/*                 - OAuth/OIDC endpoints
 * - /v1/*                    - REST API v1 endpoints
 * - /admin/*                 - Admin endpoints
 * - /api/*                   - Branding website API (existing)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router, Request, Response } from 'express';
import { createV1Router } from './v1.routes';
import { createAPIRouter } from './api.routes';
import adminRoutes from './admin.routes';
import { createSwaggerRouter } from './swagger.routes';
import { createBrandingRouter } from './branding.routes';
import { createAuthRouter } from './auth.routes';
import { createSocialAuthRouter } from './social-auth.routes';

// Import subscription controller for webhooks
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { container } from '../container';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const router = Router();

// Resolve controllers and Prisma from DI container
const subscriptionsController = container.resolve(SubscriptionsController);
const prisma = container.resolve<PrismaClient>('PrismaClient');

// ===== Root Routes =====

/**
 * GET /
 * API overview and available endpoints
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Rephlo Backend API',
    version: '2.0.0',
    description: 'Backend API with Enhanced Credits and User Profile endpoints',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      documentation: {
        swagger_ui: '/api-docs',
        openapi_spec: '/api-docs/swagger.json',
      },
      health: {
        basic: '/health',
        ready: '/health/ready',
        live: '/health/live',
      },
      auth: {
        register: '/auth/register',
        verify_email: '/auth/verify-email',
        forgot_password: '/auth/forgot-password',
        reset_password: '/auth/reset-password',
      },
      oauth: {
        discovery: '/.well-known/openid-configuration',
        authorize: '/oauth/authorize',
        token: '/oauth/token',
        revoke: '/oauth/revoke',
        userinfo: '/oauth/userinfo',
        jwks: '/oauth/jwks',
        google_authorize: '/oauth/google/authorize',
        google_callback: '/oauth/google/callback',
      },
      v1: {
        models: '/v1/models',
        completions: '/v1/completions',
        chat: '/v1/chat/completions',
        subscriptions: '/v1/subscriptions',
        credits: '/v1/credits',
        usage: '/v1/usage',
        users: '/v1/users',
      },
      api: {
        user_profile: '/api/user/profile',
        detailed_credits: '/api/user/credits',
        oauth_token_enhance: '/oauth/token/enhance',
      },
      admin: {
        metrics: '/admin/metrics',
        users: '/admin/users',
        subscriptions: '/admin/subscriptions',
        usage: '/admin/usage',
      },
      branding: {
        downloads: '/api/track-download',
        feedback: '/api/feedback',
        diagnostics: '/api/diagnostics',
        version: '/api/version',
      },
    },
  });
});

/**
 * GET /health
 * Health check endpoint
 * Returns server status and basic diagnostics
 */
router.get('/health', async (_req: Request, res: Response) => {
  const checks: any = {
    database: 'unknown',
    redis: 'not_configured',
    di_container: 'initialized',
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch (error) {
    checks.database = 'disconnected';
    logger.warn('Health check: Database connectivity failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    checks.redis = 'configured';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    services: checks,
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
  });
});

/**
 * GET /health/ready
 * Readiness check endpoint
 * Checks database connectivity and other critical dependencies
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: any = {
    database: 'healthy',
    redis: 'not_configured',
  };

  let isReady = true;

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
    isReady = false;
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check Redis connectivity (if configured)
  // Note: Redis initialization will be added by Rate Limiting & Security Agent
  // For now, we just mark it as not configured
  if (process.env.REDIS_URL) {
    checks.redis = 'not_implemented';
  }

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /health/live
 * Liveness check endpoint
 * Simple check to verify the server is running
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// ===== REST API v1 Routes =====
// Note: OAuth/OIDC routes are mounted in app.ts after application routes
router.use('/v1', createV1Router());

// ===== Enhanced API Routes (Phase 3) =====
// Enhanced endpoints with detailed user profile and credit information
router.use('/api', createAPIRouter());

// ===== API Documentation (Swagger UI) =====
router.use('/api-docs', createSwaggerRouter());

// ===== Admin Routes =====
router.use('/admin', adminRoutes);

// ===== Authentication Routes =====
// User registration, email verification, password reset
router.use('/auth', createAuthRouter());

// ===== Social Authentication Routes =====
// OAuth integration with external providers (Google)
// Note: Social auth routes are now mounted at root to avoid conflicts with OIDC provider
router.use('/', createSocialAuthRouter());

// ===== Webhook Routes =====
// Webhook routes must be registered before body parsing middleware
// Stripe webhook requires raw body for signature verification

/**
 * POST /webhooks/stripe
 * Stripe webhook handler
 * No authentication required - uses signature verification
 */
router.post(
  '/webhooks/stripe',
  asyncHandler(subscriptionsController.handleStripeWebhook.bind(subscriptionsController))
);

// ===== Branding Website API Routes =====
// Public branding website endpoints (no authentication required)
// Migrated to BrandingController with DI pattern
// Note: Must mount at /api prefix to maintain backward compatibility
router.use('/api', createBrandingRouter());

export default router;
