/**
 * Branding Routes
 *
 * Routes for public branding website API endpoints.
 * These routes maintain backward compatibility with legacy response formats.
 *
 * All endpoints are public (no authentication required).
 * Rate limiting is applied to prevent abuse.
 *
 * Endpoints:
 * - POST /track-download   - Track download events (100 req/min per IP)
 * - POST /feedback          - Submit user feedback (100 req/min per IP)
 * - GET  /version           - Get latest app version (100 req/min per IP)
 * - POST /diagnostics       - Upload diagnostic files (100 req/min per IP)
 *
 * Reference: docs/plan/102-api-consolidation-plan.md
 */

import { Router, Request, Response } from 'express';
import { container } from '../container';
import { asyncHandler } from '../middleware/error.middleware';
import rateLimit from 'express-rate-limit';
import { BrandingController } from '../controllers/branding.controller';
import logger from '../utils/logger';

/**
 * Create IP-based rate limiter for branding endpoints
 * Prevents abuse of public API endpoints
 *
 * @param maxRequests Maximum requests per minute per IP
 * @returns Express rate limiter middleware
 */
function createIPRateLimiter(maxRequests: number) {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Legacy error format for backward compatibility
    message: {
      success: false,
      error: `Too many requests, please try again later. Limit: ${maxRequests} requests per minute.`,
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded for branding endpoint', {
        ip: req.ip,
        path: req.path,
        forwarded: req.headers['x-forwarded-for'],
      });
      res.status(429).json({
        success: false,
        error: `Too many requests, please try again later. Limit: ${maxRequests} requests per minute.`,
      });
    },
  });
}

/**
 * Create branding router
 * Factory pattern for router creation to ensure DI container is resolved
 *
 * @returns Express router configured with branding endpoints
 */
export function createBrandingRouter(): Router {
  const router = Router();

  // Resolve controller from DI container
  const brandingController = container.resolve(BrandingController);

  // Create rate limiter (100 requests per minute per IP)
  const rateLimiter = createIPRateLimiter(100);

  logger.debug('Branding Router: Initializing public endpoints');

  // ===========================================================================
  // Download Tracking Endpoint
  // ===========================================================================

  /**
   * POST /api/track-download
   * Track download events with OS, user agent, and hashed IP
   *
   * Public endpoint - No authentication required
   * Rate limit: 100 requests per minute per IP
   *
   * Request Body:
   * {
   *   "os": "windows" | "macos" | "linux"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "data": {
   *     "downloadUrl": "https://...",
   *     "downloadId": "clx..."
   *   }
   * }
   */
  router.post(
    '/track-download',
    rateLimiter,
    asyncHandler(brandingController.trackDownload.bind(brandingController))
  );

  // ===========================================================================
  // Feedback Submission Endpoint
  // ===========================================================================

  /**
   * POST /api/feedback
   * Submit user feedback
   *
   * Public endpoint - No authentication required
   * Rate limit: 100 requests per minute per IP
   *
   * Request Body:
   * {
   *   "message": "string (1-1000 chars)",
   *   "email": "optional email",
   *   "userId": "optional user ID"
   * }
   *
   * Response 201:
   * {
   *   "success": true,
   *   "data": {
   *     "feedbackId": "clx..."
   *   }
   * }
   */
  router.post(
    '/feedback',
    rateLimiter,
    asyncHandler(brandingController.submitFeedback.bind(brandingController))
  );

  // ===========================================================================
  // Version Information Endpoint
  // ===========================================================================

  /**
   * GET /api/version
   * Get latest app version metadata
   *
   * Public endpoint - No authentication required
   * Rate limit: 100 requests per minute per IP
   *
   * Response 200:
   * {
   *   "success": true,
   *   "data": {
   *     "version": "1.2.0",
   *     "releaseDate": "2025-11-03T00:00:00Z",
   *     "downloadUrl": "https://...",
   *     "changelog": "## v1.2.0\n- Features..."
   *   }
   * }
   */
  router.get(
    '/version',
    rateLimiter,
    asyncHandler(brandingController.getLatestVersion.bind(brandingController))
  );

  // ===========================================================================
  // Diagnostic Upload Endpoint
  // ===========================================================================

  /**
   * POST /api/diagnostics
   * Upload diagnostic file
   *
   * Public endpoint - No authentication required
   * Rate limit: 100 requests per minute per IP
   *
   * Content-Type: multipart/form-data
   * Fields:
   * - file: File upload (max 5MB, types: .json, .log, .txt, .zip)
   * - userId: Optional user ID (form field)
   *
   * Response 201:
   * {
   *   "success": true,
   *   "data": {
   *     "diagnosticId": "clx...",
   *     "fileSize": 12345
   *   }
   * }
   */
  router.post(
    '/diagnostics',
    rateLimiter,
    brandingController.getUploadMiddleware(), // Multer middleware
    brandingController.handleMulterError.bind(brandingController), // Multer error handler
    asyncHandler(brandingController.uploadDiagnostic.bind(brandingController))
  );

  logger.debug('Branding Router: Public endpoints registered');

  return router;
}

// =============================================================================
// Export Default
// =============================================================================

/**
 * Default export for backward compatibility
 */
export default createBrandingRouter();
