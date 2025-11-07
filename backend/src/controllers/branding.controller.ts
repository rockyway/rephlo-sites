/**
 * Branding Controller
 *
 * Handles HTTP endpoints for public branding website API.
 * These endpoints maintain backward compatibility with the legacy format.
 *
 * Endpoints:
 * - POST /api/track-download   - Track download events
 * - POST /api/feedback          - Submit user feedback
 * - GET  /api/version           - Get latest app version
 * - POST /api/diagnostics       - Upload diagnostic files
 *
 * Legacy Response Format (maintained for backward compatibility):
 * Success: { success: true, data: {...} }
 * Error:   { success: false, error: "message" }
 *
 * Reference: docs/plan/102-api-consolidation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import logger from '../utils/logger';
import {
  trackDownloadSchema,
  feedbackSchema,
  validateDiagnosticFile,
  DIAGNOSTIC_MAX_FILE_SIZE,
  TrackDownloadInput,
  FeedbackInput,
} from '../types/validation';
import { getHashedClientIp } from '../utils/hash';
import { getDownloadUrl } from '../config/downloads';

// =============================================================================
// Legacy Response Format Utilities
// =============================================================================

/**
 * Legacy success response format
 * Maintains backward compatibility with existing branding website
 */
function legacySuccess<T>(data: T, statusCode: number = 200) {
  return {
    statusCode,
    body: {
      success: true,
      data,
    },
  };
}

/**
 * Legacy error response format
 * Maintains backward compatibility with existing branding website
 */
function legacyError(error: string, statusCode: number = 400) {
  return {
    statusCode,
    body: {
      success: false,
      error,
    },
  };
}

// =============================================================================
// Branding Controller Class
// =============================================================================

@injectable()
export class BrandingController {
  private uploadMiddleware: RequestHandler;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('BrandingController: Initialized');

    // Configure Multer for diagnostic file uploads
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: {
        fileSize: DIAGNOSTIC_MAX_FILE_SIZE, // 5MB
      },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.json', '.log', '.txt', '.zip'];

        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
        }
      },
    });

    this.uploadMiddleware = upload.single('file');
  }

  /**
   * Get Multer upload middleware for diagnostics endpoint
   * @returns Multer middleware configured for single file upload
   */
  getUploadMiddleware(): RequestHandler {
    return this.uploadMiddleware;
  }

  // ===========================================================================
  // Download Tracking Endpoint
  // ===========================================================================

  /**
   * POST /api/track-download
   * Track download events with OS, user agent, and hashed IP
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
  async trackDownload(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = trackDownloadSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message);
        const response = legacyError(`Validation failed: ${errors.join(', ')}`, 400);
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { os } = validationResult.data as TrackDownloadInput;

      // Extract metadata
      const userAgent = req.headers['user-agent'];
      const ipHash = getHashedClientIp(req);

      // Log download to database
      const download = await this.prisma.download.create({
        data: {
          os,
          userAgent,
          ipHash,
        },
      });

      // Get download URL for the OS
      const downloadUrl = getDownloadUrl(os);

      // Log for debugging
      logger.info('Download tracked', {
        os,
        downloadId: download.id,
        ipHash: ipHash?.substring(0, 8),
      });

      const response = legacySuccess({
        downloadUrl,
        downloadId: download.id,
      });

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('BrandingController.trackDownload: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      const response = legacyError(
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Feedback Submission Endpoint
  // ===========================================================================

  /**
   * POST /api/feedback
   * Submit user feedback
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
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = feedbackSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message);
        const response = legacyError(`Validation failed: ${errors.join(', ')}`, 400);
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { message, email, userId } = validationResult.data as FeedbackInput;

      // Store feedback in database
      const feedback = await this.prisma.feedback.create({
        data: {
          message,
          email,
          userId,
        },
      });

      // Log for debugging
      logger.info('Feedback submitted', {
        feedbackId: feedback.id,
        userId: userId || 'anonymous',
        hasEmail: !!email,
      });

      const response = legacySuccess(
        {
          feedbackId: feedback.id,
        },
        201
      );

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('BrandingController.submitFeedback: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      const response = legacyError(
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Version Information Endpoint
  // ===========================================================================

  /**
   * GET /api/version
   * Get latest app version metadata
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
  async getLatestVersion(_req: Request, res: Response): Promise<void> {
    try {
      // Query latest version from database (isLatest = true)
      const version = await this.prisma.appVersion.findFirst({
        where: {
          isLatest: true,
        },
        select: {
          version: true,
          releaseDate: true,
          downloadUrl: true,
          changelog: true,
        },
        orderBy: {
          releaseDate: 'desc', // Fallback ordering
        },
      });

      if (!version) {
        const response = legacyError('No version information available', 404);
        res.status(response.statusCode).json(response.body);
        return;
      }

      // Log for debugging
      logger.info('Version information retrieved', {
        version: version.version,
      });

      const response = legacySuccess({
        version: version.version,
        releaseDate: version.releaseDate.toISOString(),
        downloadUrl: version.downloadUrl,
        changelog: version.changelog,
      });

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('BrandingController.getLatestVersion: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      const response = legacyError(
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Diagnostic Upload Endpoint
  // ===========================================================================

  /**
   * POST /api/diagnostics
   * Upload diagnostic file
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
  async uploadDiagnostic(req: Request, res: Response): Promise<void> {
    try {
      // Validate file
      const validation = validateDiagnosticFile(req.file);
      if (!validation.valid) {
        const response = legacyError(validation.error!, 400);
        res.status(response.statusCode).json(response.body);
        return;
      }

      const file = req.file!;
      const userId = req.body.userId; // Optional userId from form

      // Generate file path reference (placeholder for S3 path)
      // In production, this would be the S3 key or URL
      const timestamp = Date.now();
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `diagnostics/${timestamp}-${sanitizedFilename}`;

      // Store diagnostic record in database
      const diagnostic = await this.prisma.diagnostic.create({
        data: {
          userId,
          filePath,
          fileSize: file.size,
        },
      });

      // Log for debugging
      logger.info('Diagnostic file uploaded', {
        diagnosticId: diagnostic.id,
        fileSize: file.size,
        userId: userId || 'anonymous',
      });

      // TODO: In Phase 3 stretch goal, upload to S3 here
      // const s3Key = await uploadToS3(file.buffer, filePath);

      const response = legacySuccess(
        {
          diagnosticId: diagnostic.id,
          fileSize: file.size,
        },
        201
      );

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('BrandingController.uploadDiagnostic: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      const response = legacyError(
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  /**
   * Error handler for Multer file upload errors
   * This should be used as middleware after getUploadMiddleware()
   */
  handleMulterError(err: any, _req: Request, res: Response, next: any): void {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const response = legacyError('File size exceeds 5MB limit', 413);
        res.status(response.statusCode).json(response.body);
        return;
      }
      const response = legacyError(`File upload error: ${err.message}`, 400);
      res.status(response.statusCode).json(response.body);
      return;
    }

    if (err) {
      const response = legacyError(err.message, 400);
      res.status(response.statusCode).json(response.body);
      return;
    }

    next();
  }
}
