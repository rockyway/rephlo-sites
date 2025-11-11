/**
 * Pricing Configuration Service Interface
 *
 * Manages margin multipliers and pricing configuration.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 */

export interface PricingConfig {
  id: string;
  scopeType: 'tier' | 'provider' | 'model' | 'combination';
  subscriptionTier?: string;
  providerId?: string;
  modelId?: string;
  marginMultiplier: number;
  targetGrossMarginPercent?: number;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  reason: string;
  reasonDetails?: string;
  previousMultiplier?: number;
  changePercent?: number;
  expectedMarginChangeDollars?: number;
  expectedRevenueImpact?: number;
  createdBy: string;
  approvedBy?: string;
  requiresApproval: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  monitored: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingConfigInput {
  scopeType: 'tier' | 'provider' | 'model' | 'combination';
  subscriptionTier?: string;
  providerId?: string;
  modelId?: string;
  marginMultiplier: number;
  targetGrossMarginPercent?: number;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  reason: 'initial_setup' | 'vendor_price_change' | 'tier_optimization' | 'margin_protection' | 'manual_adjustment';
  reasonDetails?: string;
  previousMultiplier?: number;
  changePercent?: number;
  expectedMarginChangeDollars?: number;
  expectedRevenueImpact?: number;
  createdBy: string;
  requiresApproval?: boolean;
}

export interface PricingConfigFilters {
  scopeType?: 'tier' | 'provider' | 'model' | 'combination';
  subscriptionTier?: string;
  providerId?: string;
  modelId?: string;
  isActive?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface ImpactAnalysis {
  scenarioId: string;
  currentMultiplier: number;
  proposedMultiplier: number;
  affectedUsers: number;
  estimatedMarginChange: number;
  estimatedRevenueImpact: number;
  averageCreditCostIncrease: number;
  estimatedChurnImpact: number;
}

export interface IPricingConfigService {
  /**
   * Get applicable multiplier for a user/provider/model combination
   * Uses cascade lookup: combination → model → provider → tier → default
   * @param userId - User ID
   * @param providerId - Provider ID
   * @param modelId - Model ID
   * @returns Applicable margin multiplier
   */
  getApplicableMultiplier(
    userId: string,
    providerId: string,
    modelId: string
  ): Promise<number>;

  /**
   * Create new pricing configuration
   * @param config - Pricing configuration data
   * @returns Created configuration
   */
  createPricingConfig(config: PricingConfigInput): Promise<PricingConfig>;

  /**
   * Update existing pricing configuration
   * @param id - Configuration ID
   * @param updates - Partial updates
   * @returns Updated configuration
   */
  updatePricingConfig(
    id: string,
    updates: Partial<PricingConfigInput>
  ): Promise<PricingConfig>;

  /**
   * List active pricing configurations
   * @param filters - Optional filters
   * @returns List of configurations
   */
  listActivePricingConfigs(
    filters?: PricingConfigFilters
  ): Promise<PricingConfig[]>;

  /**
   * Simulate impact of multiplier change
   * @param scenarioId - Scenario identifier
   * @param newMultiplier - Proposed new multiplier
   * @returns Impact analysis
   */
  simulateMultiplierChange(
    scenarioId: string,
    newMultiplier: number
  ): Promise<ImpactAnalysis>;

  /**
   * Get configuration by ID
   * @param id - Configuration ID
   * @returns Configuration or null
   */
  getPricingConfigById(id: string): Promise<PricingConfig | null>;

  /**
   * Delete pricing configuration
   * @param id - Configuration ID
   */
  deletePricingConfig(id: string): Promise<void>;
}
