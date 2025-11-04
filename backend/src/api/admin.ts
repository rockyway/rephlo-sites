/**
 * Admin Metrics API Handler
 *
 * Handles GET /admin/metrics requests.
 * Returns aggregated metrics for admin dashboard.
 * Note: No authentication in v1.0 (placeholder for v1.1).
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendServerError } from '../utils/responses';

/**
 * GET /admin/metrics
 *
 * No query parameters required
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "downloads": {
 *       "windows": 1250,
 *       "macos": 450,
 *       "linux": 320,
 *       "total": 2020
 *     },
 *     "feedback": {
 *       "total": 42,
 *       "recentCount": 5
 *     },
 *     "diagnostics": {
 *       "total": 18,
 *       "totalSize": 52428800
 *     },
 *     "timestamps": {
 *       "firstDownload": "2025-11-01T00:00:00Z",
 *       "lastDownload": "2025-11-03T23:59:59Z"
 *     }
 *   }
 * }
 */
export async function getAdminMetrics(_req: Request, res: Response): Promise<Response> {
  try {
    // TODO: Add authentication check in v1.1
    // For now, metrics are publicly accessible

    // Aggregate download counts by OS
    const downloadsByOS = await prisma.download.groupBy({
      by: ['os'],
      _count: {
        id: true,
      },
    });

    // Convert to object format
    const downloadsMap: Record<string, number> = {};
    let totalDownloads = 0;

    downloadsByOS.forEach((item: { os: string; _count: { id: number } }) => {
      downloadsMap[item.os] = item._count.id;
      totalDownloads += item._count.id;
    });

    // Ensure all OS types are present
    const downloads = {
      windows: downloadsMap.windows || 0,
      macos: downloadsMap.macos || 0,
      linux: downloadsMap.linux || 0,
      total: totalDownloads,
    };

    // Get feedback counts
    const totalFeedback = await prisma.feedback.count();
    const recentFeedbackCount = await prisma.feedback.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    // Get diagnostic statistics
    const diagnosticStats = await prisma.diagnostic.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        fileSize: true,
      },
    });

    // Get timestamp ranges for downloads
    const firstDownload = await prisma.download.findFirst({
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        timestamp: true,
      },
    });

    const lastDownload = await prisma.download.findFirst({
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        timestamp: true,
      },
    });

    // Log for debugging
    console.log(`[Admin Metrics] Downloads: ${totalDownloads}, Feedback: ${totalFeedback}, Diagnostics: ${diagnosticStats._count.id}`);

    return sendSuccess(res, {
      downloads,
      feedback: {
        total: totalFeedback,
        recentCount: recentFeedbackCount,
      },
      diagnostics: {
        total: diagnosticStats._count.id || 0,
        totalSize: diagnosticStats._sum.fileSize || 0,
      },
      timestamps: {
        firstDownload: firstDownload?.timestamp.toISOString() || null,
        lastDownload: lastDownload?.timestamp.toISOString() || null,
      },
    });

  } catch (error) {
    console.error('[Admin Metrics] Error:', error);
    return sendServerError(res, error as Error);
  }
}
