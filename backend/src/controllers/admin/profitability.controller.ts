/**
 * Admin Profitability Controller
 *
 * HTTP endpoints for profitability analytics and pricing management.
 *
 * Endpoints:
 * - GET  /admin/pricing/margin-metrics          - Margin metrics with date range
 * - GET  /admin/pricing/margin-by-tier          - Margin breakdown by subscription tier
 * - GET  /admin/pricing/margin-by-provider      - Margin breakdown by LLM provider
 * - GET  /admin/pricing/top-models              - Top performing models by profitability
 * - GET  /admin/pricing/configs                 - Pricing configuration rules
 * - GET  /admin/pricing/alerts                  - Pricing alerts for margin thresholds
 * - GET  /admin/pricing/vendor-prices           - Vendor price monitoring data
 * - POST /admin/pricing/simulate                - Pricing simulation endpoint
 *
 * Reference: Plan 131 Phase 6 - Missing Backend Endpoints
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../utils/logger';
import { AdminProfitabilityService } from '../../services/admin-profitability.service';
import { validationError } from '../../middleware/error.middleware';

// =============================================================================
// Validation Schemas
// =============================================================================

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const configFiltersSchema = z.object({
  onlyActive: z.coerce.boolean().default(true),
});

const vendorPriceFiltersSchema = z.object({
  includeHistorical: z.coerce.boolean().default(false),
});

const simulationSchema = z.object({
  modelId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  tier: z.string().optional(),
  newMultiplier: z.number().positive(),
  simulationPeriodDays: z.number().int().min(1).max(365).default(30),
});

// =============================================================================
// Profitability Controller Class
// =============================================================================

@injectable()
export class ProfitabilityController {
  constructor(
    @inject('AdminProfitabilityService')
    private profitabilityService: AdminProfitabilityService
  ) {
    logger.debug('ProfitabilityController: Initialized');
  }

  // ===========================================================================
  // Margin Metrics Endpoints
  // ===========================================================================

  /**
   * GET /admin/pricing/margin-metrics
   * Get margin metrics with optional date range
   *
   * Requires: Admin authentication
   *
   * Query: { startDate?: string, endDate?: string }
   */
  async getMarginMetrics(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getMarginMetrics', {
      query: req.query,
    });

    try {
      const { startDate, endDate } = req.query;

      const metrics = await this.profitabilityService.getMarginMetrics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getMarginMetrics: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/pricing/margin-by-tier
   * Get margin breakdown by subscription tier
   *
   * Requires: Admin authentication
   *
   * Query: { startDate?: string, endDate?: string }
   */
  async getMarginByTier(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getMarginByTier', {
      query: req.query,
    });

    try {
      const { startDate, endDate } = req.query;

      const margins = await this.profitabilityService.getMarginByTier(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: margins,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getMarginByTier: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/pricing/margin-by-provider
   * Get margin breakdown by LLM provider
   *
   * Requires: Admin authentication
   *
   * Query: { startDate?: string, endDate?: string }
   */
  async getMarginByProvider(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getMarginByProvider', {
      query: req.query,
    });

    try {
      const { startDate, endDate } = req.query;

      const margins = await this.profitabilityService.getMarginByProvider(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: margins,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getMarginByProvider: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/pricing/top-models
   * Get top performing models by profitability
   *
   * Requires: Admin authentication
   *
   * Query: { limit?: number, startDate?: string, endDate?: string }
   */
  async getTopModels(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getTopModels', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = dateRangeSchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { limit, startDate, endDate } = parseResult.data;

    try {
      const models = await this.profitabilityService.getTopModels(
        limit,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(200).json({
        success: true,
        data: models,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getTopModels: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Pricing Configuration Endpoints
  // ===========================================================================

  /**
   * GET /admin/pricing/configs
   * Get pricing configuration rules
   *
   * Requires: Admin authentication
   *
   * Query: { onlyActive?: boolean }
   */
  async getPricingConfigs(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getPricingConfigs', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = configFiltersSchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { onlyActive } = parseResult.data;

    try {
      const configs = await this.profitabilityService.getPricingConfigs(onlyActive);

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getPricingConfigs: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/pricing/alerts
   * Get pricing alerts for margin thresholds
   *
   * Requires: Admin authentication
   */
  async getPricingAlerts(_req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getPricingAlerts');

    try {
      const alerts = await this.profitabilityService.getPricingAlerts();

      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getPricingAlerts: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Vendor Price Monitoring Endpoints
  // ===========================================================================

  /**
   * GET /admin/pricing/vendor-prices
   * Get vendor price monitoring data
   *
   * Requires: Admin authentication
   *
   * Query: { includeHistorical?: boolean }
   */
  async getVendorPrices(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.getVendorPrices', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = vendorPriceFiltersSchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { includeHistorical } = parseResult.data;

    try {
      const prices = await this.profitabilityService.getVendorPrices(includeHistorical);

      res.status(200).json({
        success: true,
        data: prices,
      });
    } catch (error) {
      logger.error('ProfitabilityController.getVendorPrices: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Pricing Simulation Endpoints
  // ===========================================================================

  /**
   * POST /admin/pricing/simulate
   * Simulate pricing changes
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   modelId?: string,
   *   providerId?: string,
   *   tier?: string,
   *   newMultiplier: number,
   *   simulationPeriodDays?: number
   * }
   */
  async simulatePricing(req: Request, res: Response): Promise<void> {
    logger.info('ProfitabilityController.simulatePricing', {
      body: req.body,
    });

    // Validate request body
    const parseResult = simulationSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Simulation validation failed', errors);
    }

    const simulationInput = parseResult.data;

    try {
      const result = await this.profitabilityService.simulatePricing(simulationInput);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('ProfitabilityController.simulatePricing: Error', { error });
      throw error;
    }
  }
}
