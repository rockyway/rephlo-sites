/**
 * Download Tracking API Handler
 *
 * Handles POST /api/track-download requests.
 * Logs download events with OS, user agent, and hashed IP.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { trackDownloadSchema } from '../types/validation';
import { sendSuccess, sendError, sendServerError } from '../utils/responses';
import { getHashedClientIp } from '../utils/hash';
import { getDownloadUrl } from '../config/downloads';

/**
 * POST /api/track-download
 *
 * Request Body:
 * {
 *   "os": "windows" | "macos" | "linux"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "downloadUrl": "https://...",
 *     "downloadId": "clx..."
 *   }
 * }
 */
export async function trackDownload(req: Request, res: Response): Promise<Response> {
  try {
    // Validate request body
    const validationResult = trackDownloadSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      return sendError(res, `Validation failed: ${errors.join(', ')}`, 400);
    }

    const { os } = validationResult.data;

    // Extract metadata
    const userAgent = req.headers['user-agent'];
    const ipHash = getHashedClientIp(req);

    // Log download to database
    const download = await prisma.download.create({
      data: {
        os,
        userAgent,
        ipHash,
      },
    });

    // Get download URL for the OS
    const downloadUrl = getDownloadUrl(os);

    // Log for debugging
    console.log(`[Download] OS: ${os}, ID: ${download.id}, Hash: ${ipHash?.substring(0, 8)}...`);

    return sendSuccess(res, {
      downloadUrl,
      downloadId: download.id,
    });

  } catch (error) {
    console.error('[Download] Error:', error);
    return sendServerError(res, error as Error);
  }
}
