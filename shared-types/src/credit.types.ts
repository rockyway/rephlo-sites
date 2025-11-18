/**
 * Shared Credit & Token Usage Types
 * Types for credit management and token-to-credit conversion
 */

import { z } from 'zod';

// Token Usage Interface
export interface TokenUsage {
  id: string;
  requestId: string;
  userId: string;
  subscriptionId: string | null;
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  vendorCost: number; // USD
  marginMultiplier: number;
  creditValueUsd: number;
  creditsDeducted: number;
  requestType: RequestType;
  status: RequestStatus;
  requestStartedAt: string;
  requestCompletedAt: string;
  processingTimeMs: number | null;
  errorMessage: string | null;
  userTierAtRequest: string | null;
  createdAt: string;
}

export enum RequestType {
  COMPLETION = 'completion',
  STREAMING = 'streaming',
  BATCH = 'batch',
}

export enum RequestStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RATE_LIMITED = 'rate_limited',
}

// Credit Deduction Interface
export interface CreditDeduction {
  id: string;
  userId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  requestId: string | null;
  tokenVendorCost: number | null;
  marginMultiplier: number | null;
  grossMargin: number | null;
  reason: CreditDeductionReason;
  status: CreditDeductionStatus;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
  processedAt: string;
  createdAt: string;
}

export enum CreditDeductionReason {
  API_COMPLETION = 'api_completion',
  SUBSCRIPTION_ALLOCATION = 'subscription_allocation',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  REFUND = 'refund',
  OVERAGE = 'overage',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  COUPON = 'coupon',
}

export enum CreditDeductionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REVERSED = 'reversed',
}

// Model Provider Pricing Interface
export interface ModelProviderPricing {
  id: string;
  providerId: string;
  modelName: string;
  vendorModelId: string | null;
  inputPricePer1k: number; // USD per 1000 tokens
  outputPricePer1k: number; // USD per 1000 tokens
  cacheInputPricePer1k: number | null;
  cacheHitPricePer1k: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  lastVerified: string;
  createdAt: string;
  updatedAt: string;
}

// Pricing Configuration Interface
export interface PricingConfig {
  id: string;
  scopeType: PricingConfigScopeType;
  subscriptionTier: string | null;
  providerId: string | null;
  modelId: string | null;
  marginMultiplier: number;
  targetGrossMarginPercent: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  reason: PricingConfigReason;
  reasonDetails: string | null;
  previousMultiplier: number | null;
  changePercent: number | null;
  expectedMarginChangeDollars: number | null;
  expectedRevenueImpact: number | null;
  createdBy: string;
  approvedBy: string | null;
  requiresApproval: boolean;
  approvalStatus: PricingConfigApprovalStatus;
  isActive: boolean;
  monitored: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum PricingConfigScopeType {
  TIER = 'tier',
  PROVIDER = 'provider',
  MODEL = 'model',
  COMBINATION = 'combination',
}

export enum PricingConfigReason {
  INITIAL_SETUP = 'initial_setup',
  VENDOR_PRICE_CHANGE = 'vendor_price_change',
  TIER_OPTIMIZATION = 'tier_optimization',
  MARGIN_PROTECTION = 'margin_protection',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

export enum PricingConfigApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Usage Statistics Interface
export interface UsageStats {
  totalApiCalls: number;
  creditsUsed: number;
  averageCallsPerDay: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

// Zod Schemas
export const RequestTypeSchema = z.nativeEnum(RequestType);
export const RequestStatusSchema = z.nativeEnum(RequestStatus);
export const CreditDeductionReasonSchema = z.nativeEnum(CreditDeductionReason);
export const CreditDeductionStatusSchema = z.nativeEnum(CreditDeductionStatus);
export const PricingConfigScopeTypeSchema = z.nativeEnum(PricingConfigScopeType);
export const PricingConfigReasonSchema = z.nativeEnum(PricingConfigReason);
export const PricingConfigApprovalStatusSchema = z.nativeEnum(PricingConfigApprovalStatus);
