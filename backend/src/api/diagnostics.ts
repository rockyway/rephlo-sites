/**
 * Diagnostics Upload API Handler
 *
 * Handles POST /api/diagnostics requests with file uploads.
 * Validates file size and type, stores diagnostic record in database.
 * Note: Actual file upload to S3 is Phase 3 stretch goal - storing path reference only.
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../db';
import { validateDiagnosticFile, DIAGNOSTIC_MAX_FILE_SIZE } from '../types/validation';
import { sendSuccess, sendError, sendServerError } from '../utils/responses';

/**
 * Configure Multer for file uploads
 * Using memory storage for now (files stored in memory as Buffer)
 * In production with S3, use multer-s3 or similar
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: DIAGNOSTIC_MAX_FILE_SIZE, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Basic validation in multer (additional validation in handler)
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.json', '.log', '.txt', '.zip'];

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  },
});

/**
 * Multer middleware for single file upload
 * Field name: "file"
 */
export const uploadMiddleware = upload.single('file');

/**
 * POST /api/diagnostics
 *
 * Content-Type: multipart/form-data
 * Fields:
 * - file: File upload (max 5MB, types: .json, .log, .txt, .zip)
 * - userId: Optional user ID (form field)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "diagnosticId": "clx...",
 *     "fileSize": 12345
 *   }
 * }
 */
export async function uploadDiagnostic(req: Request, res: Response): Promise<Response> {
  try {
    // Validate file
    const validation = validateDiagnosticFile(req.file);
    if (!validation.valid) {
      return sendError(res, validation.error!, 400);
    }

    const file = req.file!;
    const userId = req.body.userId; // Optional userId from form

    // Generate file path reference (placeholder for S3 path)
    // In production, this would be the S3 key or URL
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `diagnostics/${timestamp}-${sanitizedFilename}`;

    // Store diagnostic record in database
    const diagnostic = await prisma.diagnostic.create({
      data: {
        userId,
        filePath,
        fileSize: file.size,
      },
    });

    // Log for debugging
    console.log(`[Diagnostic] ID: ${diagnostic.id}, Size: ${file.size} bytes, UserID: ${userId || 'anonymous'}`);

    // TODO: In Phase 3 stretch goal, upload to S3 here
    // const s3Key = await uploadToS3(file.buffer, filePath);

    return sendSuccess(res, {
      diagnosticId: diagnostic.id,
      fileSize: file.size,
    }, 201);

  } catch (error) {
    console.error('[Diagnostic] Error:', error);
    return sendServerError(res, error as Error);
  }
}

/**
 * Error handler for multer errors
 * Call this in the route to handle file upload errors
 */
export function handleMulterError(err: any, _req: Request, res: Response, next: any): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 'File size exceeds 5MB limit', 413);
      return;
    }
    sendError(res, `File upload error: ${err.message}`, 400);
    return;
  }

  if (err) {
    sendError(res, err.message, 400);
    return;
  }

  next();
}
