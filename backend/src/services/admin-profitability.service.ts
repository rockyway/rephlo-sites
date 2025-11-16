/**
 * Admin Profitability Service
 *
 * Handles profitability analytics and pricing management for admin dashboard.
 * Provides margin tracking, vendor price monitoring, and profitability insights.
 *
 * Endpoints supported:
 * - Margin metrics with date range
 * - Margin breakdown by tier and provider
 * - Top performing models by profitability
 * - Pricing configuration management
 * - Pricing alerts for margin thresholds
 * - Vendor price monitoring
 * - Pricing simulation
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface MarginMetrics {
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPercentage: number;
  period: string;
  change?: {
    revenue: number;
    cost: number;
    margin: number;
  };
}

export interface MarginByTier {
  tier: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercentage: number;
  requests: number;
}

export interface MarginByProvider {
  provider: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercentage: number;
  requests: number;
}

export interface TopModel {
  modelId: string;
  modelName: string;
  provider: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercentage: number;
  requests: number;
}

export interface PricingConfigData {
  id: string;
  scopeType: string;
  tier?: string;
  provider?: string;
  modelId?: string;
  marginMultiplier: number;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  approvalStatus: string;
  isActive: boolean;
}

export interface PricingAlert {
  id: string;
  type: 'low_margin' | 'high_cost' | 'price_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedEntity: string;
  currentValue: number;
  threshold: number;
  createdAt: Date;
}

export interface VendorPrice {
  id: string;
  provider: string;
  modelName: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  priceChangePercentInput?: number | null;
  priceChangePercentOutput?: number | null;
  lastVerified: Date;
}

export interface SimulationInput {
  modelId?: string;
  providerId?: string;
  tier?: string;
  newMultiplier: number;
  simulationPeriodDays?: number;
}

export interface SimulationResult {
  currentMarginDollars: number;
  projectedMarginDollars: number;
  marginChange: number;
  marginChangePercent: number;
  currentMarginPercent: number;
  projectedMarginPercent: number;
  affectedRequests: number;
  revenueImpact: number;
}

// =============================================================================
// Admin Profitability Service
// =============================================================================

@injectable()
export class AdminProfitabilityService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AdminProfitabilityService: Initialized');
  }

  // ===========================================================================
  // Margin Metrics
  // ===========================================================================

  /**
   * Get margin metrics with optional date range
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @returns Margin metrics including revenue, cost, and margin percentage
   */
  async getMarginMetrics(startDate?: Date, endDate?: Date): Promise<MarginMetrics> {
    logger.info('AdminProfitabilityService.getMarginMetrics', { startDate, endDate });

    try {
      // Build where clause for date filtering
      const whereClause: any = {};
      if (startDate || endDate) {
        whereClause.request_started_at = {};
        if (startDate) whereClause.request_started_at.gte = startDate;
        if (endDate) whereClause.request_started_at.lte = endDate;
      }

      // Aggregate token usage ledger to calculate revenue and cost
      const usageData = await this.prisma.token_usage_ledger.aggregate({
        where: whereClause,
        _sum: {
          vendor_cost: true,
          credit_value_usd: true,
        },
        _count: true,
      });

      const totalCost = Number(usageData._sum?.vendor_cost || 0);
      const totalRevenue = Number(usageData._sum?.credit_value_usd || 0);
      const grossMargin = totalRevenue - totalCost;
      const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        totalCost,
        grossMargin,
        marginPercentage,
        period: startDate && endDate ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}` : 'all-time',
      };
    } catch (error) {
      logger.error('AdminProfitabilityService.getMarginMetrics: Error', { error });
      throw error;
    }
  }

  /**
   * Get margin breakdown by subscription tier
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @returns Array of margin metrics grouped by tier
   */
  async getMarginByTier(startDate?: Date, endDate?: Date): Promise<MarginByTier[]> {
    logger.info('AdminProfitabilityService.getMarginByTier', { startDate, endDate });

    try {
      // Query token usage ledger grouped by user's subscription tier
      const query = `
        SELECT
          s.tier,
          COUNT(tul.id) as requests,
          COALESCE(SUM(tul.vendor_cost), 0) as cost,
          COALESCE(SUM(tul.credit_value_usd), 0) as revenue
        FROM token_usage_ledger tul
        JOIN users u ON tul.user_id = u.id
        LEFT JOIN subscription_monetization s ON u.id = s.user_id AND s.status = 'active'
        ${startDate || endDate ? `WHERE ${startDate ? `tul.request_started_at >= '${startDate.toISOString()}'` : ''} ${startDate && endDate ? 'AND' : ''} ${endDate ? `tul.request_started_at <= '${endDate.toISOString()}'` : ''}` : ''}
        GROUP BY s.tier
        ORDER BY revenue DESC
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(query);

      return results.map((row) => {
        const revenue = Number(row.revenue);
        const cost = Number(row.cost);
        const margin = revenue - cost;
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
          tier: row.tier || 'free',
          revenue,
          cost,
          margin,
          marginPercentage,
          requests: Number(row.requests),
        };
      });
    } catch (error) {
      logger.error('AdminProfitabilityService.getMarginByTier: Error', { error });
      throw error;
    }
  }

  /**
   * Get margin breakdown by LLM provider
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @returns Array of margin metrics grouped by provider
   */
  async getMarginByProvider(startDate?: Date, endDate?: Date): Promise<MarginByProvider[]> {
    logger.info('AdminProfitabilityService.getMarginByProvider', { startDate, endDate });

    try {
      // Query token usage ledger grouped by provider
      const query = `
        SELECT
          p.name as provider,
          COUNT(tul.id) as requests,
          COALESCE(SUM(tul.vendor_cost), 0) as cost,
          COALESCE(SUM(tul.credit_value_usd), 0) as revenue
        FROM token_usage_ledger tul
        JOIN providers p ON tul.provider_id = p.id
        ${startDate || endDate ? `WHERE ${startDate ? `tul.request_started_at >= '${startDate.toISOString()}'` : ''} ${startDate && endDate ? 'AND' : ''} ${endDate ? `tul.request_started_at <= '${endDate.toISOString()}'` : ''}` : ''}
        GROUP BY p.name
        ORDER BY revenue DESC
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(query);

      return results.map((row) => {
        const revenue = Number(row.revenue);
        const cost = Number(row.cost);
        const margin = revenue - cost;
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
          provider: row.provider,
          revenue,
          cost,
          margin,
          marginPercentage,
          requests: Number(row.requests),
        };
      });
    } catch (error) {
      logger.error('AdminProfitabilityService.getMarginByProvider: Error', { error });
      throw error;
    }
  }

  /**
   * Get top performing models by profitability
   * @param limit - Number of top models to return
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @returns Array of top models sorted by margin
   */
  async getTopModels(limit: number = 10, startDate?: Date, endDate?: Date): Promise<TopModel[]> {
    logger.info('AdminProfitabilityService.getTopModels', { limit, startDate, endDate });

    try {
      const query = `
        SELECT
          tul.model_id,
          p.name as provider,
          COUNT(tul.id) as requests,
          COALESCE(SUM(tul.vendor_cost), 0) as cost,
          COALESCE(SUM(tul.credit_value_usd), 0) as revenue
        FROM token_usage_ledger tul
        JOIN providers p ON tul.provider_id = p.id
        ${startDate || endDate ? `WHERE ${startDate ? `tul.request_started_at >= '${startDate.toISOString()}'` : ''} ${startDate && endDate ? 'AND' : ''} ${endDate ? `tul.request_started_at <= '${endDate.toISOString()}'` : ''}` : ''}
        GROUP BY tul.model_id, p.name
        ORDER BY (COALESCE(SUM(tul.credit_value_usd), 0) - COALESCE(SUM(tul.vendor_cost), 0)) DESC
        LIMIT ${limit}
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(query);

      return results.map((row) => {
        const revenue = Number(row.revenue);
        const cost = Number(row.cost);
        const margin = revenue - cost;
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
          modelId: row.model_id,
          modelName: row.model_id, // TokenUsageLedger stores model_id as string
          provider: row.provider,
          revenue,
          cost,
          margin,
          marginPercentage,
          requests: Number(row.requests),
        };
      });
    } catch (error) {
      logger.error('AdminProfitabilityService.getTopModels: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Pricing Configuration
  // ===========================================================================

  /**
   * Get all pricing configurations
   * @param onlyActive - Filter to only active configurations
   * @returns Array of pricing configurations
   */
  async getPricingConfigs(onlyActive: boolean = true): Promise<PricingConfigData[]> {
    logger.info('AdminProfitabilityService.getPricingConfigs', { onlyActive });

    try {
      const configs = await this.prisma.pricing_configs.findMany({
        where: onlyActive ? { is_active: true } : undefined,
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      return configs.map((config) => ({
        id: config.id,
        scopeType: config.scope_type,
        tier: config.subscription_tier || undefined,
        provider: config.provider_id || undefined,
        modelId: config.model_id || undefined,
        marginMultiplier: Number(config.margin_multiplier),
        effectiveFrom: config.effective_from,
        effectiveUntil: config.effective_until,
        approvalStatus: config.approval_status,
        isActive: config.is_active,
      }));
    } catch (error) {
      logger.error('AdminProfitabilityService.getPricingConfigs: Error', { error });
      throw error;
    }
  }

  /**
   * Get pricing alerts for margin thresholds
   * @returns Array of pricing alerts
   */
  async getPricingAlerts(): Promise<PricingAlert[]> {
    logger.info('AdminProfitabilityService.getPricingAlerts');

    try {
      const alerts: PricingAlert[] = [];

      // Check for low margin models (margin < 20%)
      const lowMarginModels = await this.prisma.$queryRaw<any[]>`
        SELECT
          tul.model_id as id,
          tul.model_id as model_name,
          p.name as provider_name,
          COALESCE(SUM(tul.credit_value_usd), 0) as revenue,
          COALESCE(SUM(tul.vendor_cost), 0) as cost
        FROM token_usage_ledger tul
        JOIN providers p ON tul.provider_id = p.id
        WHERE tul.request_started_at >= NOW() - INTERVAL '7 days'
        GROUP BY tul.model_id, p.name
        HAVING COALESCE(SUM(tul.credit_value_usd), 0) > 0
          AND ((COALESCE(SUM(tul.credit_value_usd), 0) - COALESCE(SUM(tul.vendor_cost), 0)) / COALESCE(SUM(tul.credit_value_usd), 0)) < 0.2
        LIMIT 20
      `;

      lowMarginModels.forEach((model) => {
        const revenue = Number(model.revenue);
        const cost = Number(model.cost);
        const marginPercent = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

        alerts.push({
          id: model.id,
          type: 'low_margin',
          severity: marginPercent < 10 ? 'critical' : marginPercent < 15 ? 'high' : 'medium',
          message: `Model ${model.model_name} (${model.provider_name}) has low margin of ${marginPercent.toFixed(2)}%`,
          affectedEntity: `${model.provider_name}:${model.model_name}`,
          currentValue: marginPercent,
          threshold: 20,
          createdAt: new Date(),
        });
      });

      return alerts;
    } catch (error) {
      logger.error('AdminProfitabilityService.getPricingAlerts: Error', { error });
      throw error;
    }
  }

  /**
   * Get vendor price monitoring data
   * @param includeHistorical - Include historical price changes
   * @returns Array of vendor prices with change tracking
   */
  async getVendorPrices(includeHistorical: boolean = false): Promise<VendorPrice[]> {
    logger.info('AdminProfitabilityService.getVendorPrices', { includeHistorical });

    try {
      const where: any = {};
      if (!includeHistorical) {
        where.isActive = true;
      }

      const prices = await this.prisma.model_provider_pricing.findMany({
        where,
        include: {
          provider: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { lastVerified: 'desc' },
        take: 100,
      });

      return prices.map((price) => ({
        id: price.id,
        provider: price.provider.name,
        modelName: price.modelName,
        inputPricePer1k: Number(price.inputPricePer1k),
        outputPricePer1k: Number(price.outputPricePer1k),
        effectiveFrom: price.effectiveFrom,
        effectiveUntil: price.effectiveUntil,
        priceChangePercentInput: price.priceChangePercentInput ? Number(price.priceChangePercentInput) : null,
        priceChangePercentOutput: price.priceChangePercentOutput ? Number(price.priceChangePercentOutput) : null,
        lastVerified: price.lastVerified,
      }));
    } catch (error) {
      logger.error('AdminProfitabilityService.getVendorPrices: Error', { error });
      throw error;
    }
  }

  /**
   * Simulate pricing changes
   * @param input - Simulation parameters
   * @returns Projected margin impact of pricing change
   */
  async simulatePricing(input: SimulationInput): Promise<SimulationResult> {
    logger.info('AdminProfitabilityService.simulatePricing', { input });

    try {
      const { modelId, providerId, newMultiplier, simulationPeriodDays = 30 } = input;

      // Build where clause for affected requests
      const where: any = {
        requestStartedAt: {
          gte: new Date(Date.now() - simulationPeriodDays * 24 * 60 * 60 * 1000),
        },
      };

      if (modelId) {
        where.model_id = modelId;
      }

      if (providerId) {
        where.provider_id = providerId;
      }

      // Get affected usage data
      const usageData = await this.prisma.token_usage_ledger.aggregate({
        where,
        _sum: {
          vendor_cost: true,
          credit_value_usd: true,
        },
        _count: true,
      });

      const currentCost = Number(usageData._sum?.vendor_cost || 0);
      const currentRevenue = Number(usageData._sum?.credit_value_usd || 0);
      const currentMargin = currentRevenue - currentCost;
      const currentMarginPercent = currentRevenue > 0 ? (currentMargin / currentRevenue) * 100 : 0;

      // Calculate projected values with new multiplier
      const projectedRevenue = currentCost * newMultiplier;
      const projectedMargin = projectedRevenue - currentCost;
      const projectedMarginPercent = projectedRevenue > 0 ? (projectedMargin / projectedRevenue) * 100 : 0;

      const marginChange = projectedMargin - currentMargin;
      const marginChangePercent = currentMargin !== 0 ? (marginChange / currentMargin) * 100 : 0;
      const revenueImpact = projectedRevenue - currentRevenue;

      return {
        currentMarginDollars: currentMargin,
        projectedMarginDollars: projectedMargin,
        marginChange,
        marginChangePercent,
        currentMarginPercent,
        projectedMarginPercent,
        affectedRequests: Number(usageData._count || 0),
        revenueImpact,
      };
    } catch (error) {
      logger.error('AdminProfitabilityService.simulatePricing: Error', { error });
      throw error;
    }
  }
}
