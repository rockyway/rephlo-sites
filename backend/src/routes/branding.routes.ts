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

import { Router } from 'express';
import { container } from '../container';
import { asyncHandler } from '../middleware/error.middleware';
import { createIPRateLimiter } from '../middleware/ratelimit.middleware';
import { BrandingController } from '../controllers/branding.controller';
import logger from '../utils/logger';

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
