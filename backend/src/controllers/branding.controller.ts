/**
 * Branding Controller
 *
 * Handles HTTP endpoints for public branding website API.
 *
 * Endpoints:
 * - POST /api/track-download   - Track download events
 * - POST /api/feedback          - Submit user feedback
 * - GET  /api/version           - Get latest app version
 * - POST /api/diagnostics       - Upload diagnostic files
 *
 * Standard Response Format:
 * Success: { status: 'success', data: {...}, meta?: {...} }
 * Error:   { status: 'error', error: { code, message, details } }
 *
 * Reference: docs/analysis/080-batch7-branding-standardization-spec.md
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
// Note: Response format follows standard { status, data, meta } pattern
// No wrapper utilities needed - return response body directly via res.json()
// =============================================================================

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
   *   "status": "success",
   *   "data": {
   *     "downloadUrl": "https://...",
   *     "downloadId": "clx..."
   *   },
   *   "meta": {
   *     "message": "Download tracked successfully"
   *   }
   * }
   */
  async trackDownload(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = trackDownloadSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message);
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${errors.join(', ')}`,
          },
        });
        return;
      }

      const { os } = validationResult.data as TrackDownloadInput;

      // Extract metadata
      const userAgent = req.headers['user-agent'];
      const ipHash = getHashedClientIp(req);

      // Log download to database
      const download = await this.prisma.downloads.create({
        data: {
          id: crypto.randomUUID(),
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

      res.status(200).json({
        status: 'success',
        data: {
          downloadUrl,
          downloadId: download.id,
        },
        meta: {
          message: 'Download tracked successfully',
        },
      });
    } catch (error) {
      logger.error('BrandingController.trackDownload: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
        },
      });
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
   *   "status": "success",
   *   "data": {
   *     "feedbackId": "clx..."
   *   },
   *   "meta": {
   *     "message": "Feedback submitted successfully"
   *   }
   * }
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = feedbackSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message);
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${errors.join(', ')}`,
          },
        });
        return;
      }

      const { message, email, userId } = validationResult.data as FeedbackInput;

      // Store feedback in database
      const feedback = await this.prisma.feedbacks.create({
        data: {
          id: crypto.randomUUID(),
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

      res.status(201).json({
        status: 'success',
        data: {
          feedbackId: feedback.id,
        },
        meta: {
          message: 'Feedback submitted successfully',
        },
      });
    } catch (error) {
      logger.error('BrandingController.submitFeedback: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
        },
      });
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
   *   "status": "success",
   *   "data": {
   *     "version": "1.2.0",
   *     "releaseDate": "2025-11-03T00:00:00Z",
   *     "downloadUrl": "https://...",
   *     "changelog": "## v1.2.0\n- Features..."
   *   },
   *   "meta": {
   *     "message": "Version information retrieved successfully"
   *   }
   * }
   */
  async getLatestVersion(_req: Request, res: Response): Promise<void> {
    try {
      // Query latest version from database (isLatest = true)
      const version = await this.prisma.app_versions.findFirst({
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
        res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'No version information available',
          },
        });
        return;
      }

      // Log for debugging
      logger.info('Version information retrieved', {
        version: version.version,
      });

      res.status(200).json({
        status: 'success',
        data: {
          version: version.version,
          releaseDate: version.releaseDate.toISOString(),
          downloadUrl: version.downloadUrl,
          changelog: version.changelog,
        },
        meta: {
          message: 'Version information retrieved successfully',
        },
      });
    } catch (error) {
      logger.error('BrandingController.getLatestVersion: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
        },
      });
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
   *   "status": "success",
   *   "data": {
   *     "diagnosticId": "clx...",
   *     "fileSize": 12345
   *   },
   *   "meta": {
   *     "message": "Diagnostic file uploaded successfully"
   *   }
   * }
   */
  async uploadDiagnostic(req: Request, res: Response): Promise<void> {
    try {
      // Validate file
      const validation = validateDiagnosticFile(req.file);
      if (!validation.valid) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error!,
          },
        });
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
      const diagnostic = await this.prisma.diagnostics.create({
        data: {
          id: crypto.randomUUID(),
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

      res.status(201).json({
        status: 'success',
        data: {
          diagnosticId: diagnostic.id,
          fileSize: file.size,
        },
        meta: {
          message: 'Diagnostic file uploaded successfully',
        },
      });
    } catch (error) {
      logger.error('BrandingController.uploadDiagnostic: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
        },
      });
    }
  }

  /**
   * Error handler for Multer file upload errors
   * This should be used as middleware after getUploadMiddleware()
   */
  handleMulterError(err: any, _req: Request, res: Response, next: any): void {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          status: 'error',
          error: {
            code: 'FILE_SIZE_EXCEEDED',
            message: 'File size exceeds 5MB limit',
          },
        });
        return;
      }
      res.status(400).json({
        status: 'error',
        error: {
          code: 'FILE_UPLOAD_ERROR',
          message: `File upload error: ${err.message}`,
        },
      });
      return;
    }

    if (err) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'FILE_UPLOAD_ERROR',
          message: err.message,
        },
      });
      return;
    }

    next();
  }
}
