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
import oauthRoutes from './oauth.routes';
import v1Routes from './v1.routes';
import adminRoutes from './admin.routes';

// Import existing branding website API handlers
import { trackDownload } from '../api/downloads';
import { submitFeedback } from '../api/feedback';
import { uploadDiagnostic, uploadMiddleware, handleMulterError } from '../api/diagnostics';
import { getLatestVersion } from '../api/version';

// Import subscription controller for webhooks
import { createSubscriptionsController } from '../controllers/subscriptions.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../config/database';

const router = Router();

// Initialize controllers for webhooks
const subscriptionsController = createSubscriptionsController(prisma);

// ===== Root Routes =====

/**
 * GET /
 * API overview and available endpoints
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Rephlo Backend API',
    version: '2.0.0',
    documentation: 'https://docs.rephlo.ai',
    endpoints: {
      oauth: {
        discovery: '/.well-known/openid-configuration',
        authorize: '/oauth/authorize',
        token: '/oauth/token',
        revoke: '/oauth/revoke',
        userinfo: '/oauth/userinfo',
        jwks: '/oauth/jwks',
      },
      api_v1: {
        models: '/v1/models',
        completions: '/v1/completions',
        chat: '/v1/chat/completions',
        subscriptions: '/v1/subscriptions',
        credits: '/v1/credits',
        usage: '/v1/usage',
        users: '/v1/users',
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
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
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
 *
 * NOTE: Database check will be implemented by Database Schema Agent
 */
router.get('/health/ready', (_req: Request, res: Response) => {
  // TODO: Add database connectivity check
  // TODO: Add Redis connectivity check
  // For now, return basic readiness
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'not_implemented',
      redis: 'not_implemented',
    },
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

// ===== OAuth/OIDC Routes =====
// OIDC Discovery is at root level: /.well-known/openid-configuration
// All other OAuth routes are under /oauth
router.use('/', oauthRoutes);

// ===== REST API v1 Routes =====
router.use('/v1', v1Routes);

// ===== Admin Routes =====
router.use('/admin', adminRoutes);

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

// ===== Branding Website API Routes (Existing) =====
// These routes maintain backward compatibility with the existing branding website

/**
 * POST /api/track-download
 * Log download event and return download URL
 */
router.post('/api/track-download', trackDownload);

/**
 * POST /api/feedback
 * Submit user feedback
 */
router.post('/api/feedback', submitFeedback);

/**
 * POST /api/diagnostics
 * Upload diagnostic file (multipart/form-data)
 */
router.post('/api/diagnostics', uploadMiddleware, handleMulterError, uploadDiagnostic);

/**
 * GET /api/version
 * Get latest app version metadata
 */
router.get('/api/version', getLatestVersion);

/**
 * GET /api
 * Branding API overview (for backward compatibility)
 */
router.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Rephlo Branding Website API',
    version: '1.0.0',
    endpoints: [
      'POST /api/track-download',
      'POST /api/feedback',
      'POST /api/diagnostics',
      'GET /api/version',
    ],
  });
});

export default router;
