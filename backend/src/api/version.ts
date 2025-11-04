/**
 * Version API Handler
 *
 * Handles GET /api/version requests.
 * Returns the latest app version metadata from database.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError, sendServerError } from '../utils/responses';

/**
 * GET /api/version
 *
 * No query parameters required
 *
 * Response:
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
export async function getLatestVersion(_req: Request, res: Response): Promise<Response> {
  try {
    // Query latest version from database (isLatest = true)
    const version = await prisma.appVersion.findFirst({
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
      return sendError(res, 'No version information available', 404);
    }

    // Log for debugging
    console.log(`[Version] Returned version: ${version.version}`);

    return sendSuccess(res, {
      version: version.version,
      releaseDate: version.releaseDate.toISOString(),
      downloadUrl: version.downloadUrl,
      changelog: version.changelog,
    });

  } catch (error) {
    console.error('[Version] Error:', error);
    return sendServerError(res, error as Error);
  }
}
