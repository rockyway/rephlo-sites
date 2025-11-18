import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/error.middleware';
import logger from '../utils/logger';

// Zod validation schemas
// Date string validator that accepts both YYYY-MM-DD and ISO datetime formats
const flexibleDateSchema = z.string().refine(
  (val) => {
    // Accept YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
    // Accept ISO datetime format
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return true;
    return false;
  },
  { message: 'Date must be in YYYY-MM-DD or ISO datetime format' }
);

const analyticsQuerySchema = z.object({
  period: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'custom']).optional().default('last_30_days'),
  startDate: flexibleDateSchema.optional(),
  endDate: flexibleDateSchema.optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  providerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
});

const trendQuerySchema = analyticsQuerySchema.extend({
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
});

const exportQuerySchema = analyticsQuerySchema.extend({
  format: z.enum(['csv']).optional().default('csv'),
});

@injectable()
export class VendorAnalyticsController {
  constructor(
    @inject(AnalyticsService) private analyticsService: AnalyticsService
  ) {
    logger.debug('VendorAnalyticsController: Initialized');
  }

  /**
   * Transform controller params to service params
   * Converts single providerId/modelId to arrays
   */
  private transformParams(validatedParams: any): any {
    const { providerId, modelId, ...rest } = validatedParams;
    return {
      ...rest,
      providers: providerId ? [providerId] : undefined,
      models: modelId ? [modelId] : undefined,
    };
  }

  /**
   * GET /admin/analytics/gross-margin
   *
   * Returns gross margin KPI with tier breakdown and period comparison.
   *
   * Query Parameters:
   * - startDate (ISO 8601): Start of date range (default: 30 days ago)
   * - endDate (ISO 8601): End of date range (default: now)
   * - tier: Filter by user tier (free/pro/enterprise)
   * - providerId: Filter by provider UUID
   * - modelId: Filter by model UUID
   *
   * Response: 200 OK
   * {
   *   "grossMarginUsd": 1234.56,
   *   "totalCost": 890.12,
   *   "totalRevenue": 2124.68,
   *   "marginPercent": 58.12,
   *   "tierBreakdown": [
   *     { "tier": "pro", "grossMarginUsd": 800.00, "marginPercent": 65.5 }
   *   ],
   *   "trend": {
   *     "change": 15.5,
   *     "direction": "up"
   *   }
   * }
   */
  public getGrossMargin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = analyticsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const serviceParams = this.transformParams(validationResult.data);

    logger.info('VendorAnalyticsController.getGrossMargin: Fetching gross margin KPI', {
      userId: req.user?.sub,
      params: serviceParams,
    });

    const data = await this.analyticsService.getGrossMarginKPI(serviceParams);

    res.status(200).json(data);
  });

  /**
   * GET /admin/analytics/cost-by-provider
   *
   * Returns top 5 providers by cost with breakdown.
   *
   * Query Parameters: Same as getGrossMargin
   *
   * Response: 200 OK
   * {
   *   "providers": [
   *     {
   *       "providerId": "uuid",
   *       "providerName": "OpenAI",
   *       "totalCost": 500.00,
   *       "requestCount": 10000,
   *       "avgCostPerRequest": 0.05
   *     }
   *   ],
   *   "totalCost": 890.12
   * }
   */
  public getCostByProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = analyticsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const serviceParams = this.transformParams(validationResult.data);

    logger.info('VendorAnalyticsController.getCostByProvider: Fetching provider costs', {
      userId: req.user?.sub,
      params: serviceParams,
    });

    const data = await this.analyticsService.getCostByProvider(serviceParams);

    res.status(200).json(data);
  });

  /**
   * GET /admin/analytics/margin-trend
   *
   * Returns time series data for gross margin with moving averages.
   *
   * Query Parameters:
   * - startDate, endDate, tier, providerId, modelId (same as above)
   * - granularity: hour | day | week | month (default: day)
   *
   * Response: 200 OK
   * {
   *   "dataPoints": [
   *     {
   *       "timestamp": "2025-01-15T00:00:00Z",
   *       "grossMarginUsd": 45.50,
   *       "totalCost": 30.00,
   *       "requestCount": 1500,
   *       "movingAvg7d": 42.30,
   *       "movingAvg30d": 40.10
   *     }
   *   ],
   *   "granularity": "day",
   *   "summary": {
   *     "avgMargin": 43.20,
   *     "minMargin": 35.00,
   *     "maxMargin": 52.00
   *   }
   * }
   */
  public getMarginTrend = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = trendQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const serviceParams = this.transformParams(validationResult.data);

    logger.info('VendorAnalyticsController.getMarginTrend: Fetching margin trend', {
      userId: req.user?.sub,
      params: serviceParams,
    });

    const data = await this.analyticsService.getMarginTrend(serviceParams);

    res.status(200).json(data);
  });

  /**
   * GET /admin/analytics/cost-distribution
   *
   * Returns cost distribution histogram with statistical analysis.
   *
   * Query Parameters: Same as getGrossMargin
   *
   * Response: 200 OK
   * {
   *   "buckets": [
   *     {
   *       "range": "$0.00-$0.01",
   *       "count": 5000,
   *       "percentage": 50.0
   *     }
   *   ],
   *   "statistics": {
   *     "mean": 0.045,
   *     "median": 0.030,
   *     "stdDev": 0.025,
   *     "p95": 0.10,
   *     "p99": 0.25
   *   },
   *   "anomalies": [
   *     {
   *       "requestId": "uuid",
   *       "cost": 5.00,
   *       "deviationFromMean": 4.5
   *     }
   *   ]
   * }
   */
  public getCostDistribution = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = analyticsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const serviceParams = this.transformParams(validationResult.data);

    logger.info('VendorAnalyticsController.getCostDistribution: Fetching cost distribution', {
      userId: req.user?.sub,
      params: serviceParams,
    });

    const data = await this.analyticsService.getCostDistribution(serviceParams);

    res.status(200).json(data);
  });

  /**
   * POST /admin/analytics/export-csv
   *
   * Exports analytics data as streaming CSV.
   *
   * Body: Same parameters as query (JSON)
   *
   * Response: 200 OK (text/csv)
   * Headers:
   * - Content-Type: text/csv
   * - Content-Disposition: attachment; filename="analytics-YYYY-MM-DD.csv"
   *
   * CSV Format:
   * date,tier,provider,model,totalCost,grossMargin,requestCount,avgCostPerRequest
   */
  public exportCSV = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = exportQuerySchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_BODY_PARAMS',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
      return;
    }

    const serviceParams = this.transformParams(validationResult.data);

    logger.info('VendorAnalyticsController.exportCSV: Starting CSV export', {
      userId: req.user?.sub,
      params: serviceParams,
    });

    // Set CSV headers
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${timestamp}.csv"`);

    // Get readable stream from service
    const stream = await this.analyticsService.exportToCSV(serviceParams);

    // Pipe stream to response
    stream.pipe(res);

    // Handle stream errors
    stream.on('error', (error) => {
      logger.error('VendorAnalyticsController.exportCSV: Stream error', {
        userId: req.user?.sub,
        error: error.message,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'EXPORT_FAILED',
            message: 'Failed to export CSV data',
          },
        });
      }
    });

    stream.on('end', () => {
      logger.info('VendorAnalyticsController.exportCSV: Export completed', {
        userId: req.user?.sub,
      });
    });
  });
}
