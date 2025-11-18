/**
 * Tspec API Specification - Admin Prorations, Coupons, and Campaigns
 *
 * This file defines the OpenAPI spec for proration management and coupon/campaign detail endpoints.
 * These are Phase 3 additions for enhanced admin capabilities.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// REQUEST BODIES
// =============================================================================

/**
 * Request body for reversing a proration event
 */
export interface ReverseProrationRequest {
  /** Reason for reversing proration (required for audit log) */
  reason: string;
}

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Proration Event
 * Represents a tier change proration with charge calculations
 */
export interface ProrationEvent {
  /** Proration event ID */
  id: string;
  /** Related subscription ID */
  subscriptionId: string;
  /** Original tier before change */
  fromTier: string;
  /** New tier after change */
  toTier: string;
  /** Unused credit amount from old tier */
  unusedCredit: number;
  /** Prorated cost for new tier */
  newTierCost: number;
  /** Net charge (newTierCost - unusedCredit) */
  netCharge: number;
  /** Proration status */
  status: 'pending' | 'applied' | 'reversed' | 'failed';
  /** Admin user who reversed this proration (if reversed) */
  reversedBy?: string;
  /** Reason for reversal (if reversed) */
  reversalReason?: string;
  /** Stripe invoice ID (if applicable) */
  stripeInvoiceId?: string;
  /** When proration was created */
  createdAt: string;
}

/**
 * Proration Calculation Breakdown
 * Detailed formulas and amounts for transparency
 */
export interface ProrationCalculationResponse {
  /** Response status */
  status: 'success';
  /** Calculation data */
  data: {
    /** Proration event ID */
    prorationId: string;
    /** Related subscription ID */
    subscriptionId: string;
    /** Detailed calculation breakdown */
    calculation: {
      /** Formula for unused credit calculation */
      unusedCreditFormula: string;
      /** Calculated unused credit amount */
      unusedCreditAmount: number;
      /** Formula for new tier cost calculation */
      newTierCostFormula: string;
      /** Calculated new tier cost amount */
      newTierCostAmount: number;
      /** Formula for net charge calculation */
      netChargeFormula: string;
      /** Calculated net charge amount */
      netChargeAmount: number;
    };
    /** Original tier */
    fromTier: string;
    /** New tier */
    toTier: string;
    /** Days remaining in billing cycle */
    daysRemaining: number;
    /** Total days in billing cycle */
    daysInCycle: number;
    /** Current proration status */
    status: string;
    /** Stripe invoice URL (if available) */
    stripeInvoiceUrl?: string;
  };
}

/**
 * Coupon Detail Response
 * Complete coupon information with usage statistics
 */
export interface Coupon {
  /** Coupon ID */
  id: string;
  /** Unique coupon code */
  code: string;
  /** Coupon type */
  type: 'percentage_discount' | 'fixed_amount_discount' | 'bonus_duration' | 'trial_extension';
  /** Discount type (for discount coupons) */
  discountType?: 'percentage' | 'fixed_amount';
  /** Discount percentage (0-100, for percentage coupons) */
  discountPercentage?: number;
  /** Fixed discount amount in USD (for fixed_amount coupons) */
  discountAmount?: number;
  /** Bonus subscription months (for bonus_duration coupons) */
  bonusDurationMonths?: number;
  /** Maximum discount cap for percentage coupons */
  maxDiscountAmount?: number;
  /** Coupon valid from date */
  validFrom: string;
  /** Coupon valid until date (optional) */
  validUntil?: string;
  /** Whether coupon is currently active */
  isActive: boolean;
  /** Maximum number of redemptions allowed */
  maxRedemptions?: number;
  /** Current redemption count */
  redemptionCount: number;
  /** Associated campaign ID (if part of campaign) */
  campaignId?: string;
  /** When coupon was created */
  createdAt: string;
}

/**
 * Campaign Detail Response
 * Complete campaign information with computed status and metrics
 */
export interface Campaign {
  /** Campaign ID */
  id: string;
  /** Campaign name */
  name: string;
  /** Campaign type */
  type: 'holiday' | 'marketing' | 'behavioral' | 'referral';
  /** Campaign status (computed from dates and isActive flag) */
  status: 'planning' | 'active' | 'paused' | 'ended';
  /** Campaign start date */
  startsAt: string;
  /** Campaign end date (optional) */
  endsAt?: string;
  /** Budget limit in USD (optional) */
  budgetCap?: number;
  /** Current spend amount */
  currentSpend: number;
  /** Number of coupons in this campaign */
  couponCount: number;
  /** Total redemptions across all coupons */
  redemptionCount: number;
  /** When campaign was created */
  createdAt: string;
}

/**
 * Standard success response wrapper
 */
export interface ProrationEventResponse {
  /** Response status */
  status: 'success';
  /** Proration event data */
  data: ProrationEvent;
}

/**
 * Standard success response wrapper for coupon
 */
export interface CouponResponse {
  /** Response status */
  status: 'success';
  /** Coupon data */
  data: Coupon;
}

/**
 * Standard success response wrapper for campaign
 */
export interface CampaignResponse {
  /** Response status */
  status: 'success';
  /** Campaign data */
  data: Campaign;
}

// =============================================================================
// TSPEC API SPECIFICATION
// =============================================================================

/**
 * Tspec API specification for admin proration, coupon, and campaign detail endpoints
 */
export type AdminProrationsCouponsApiSpec = Tspec.DefineApiSpec<{
  tags: ['Prorations', 'Coupons', 'Campaigns'];
  paths: {
    '/admin/prorations/{id}/reverse': {
      post: {
        summary: 'Reverse a proration event';
        description: `Reverse a proration event, restoring the subscription to its original tier.
This creates a compensating proration event and marks the original as reversed.

**Phase 3 Addition**: Fixed 501 Not Implemented status

**Authentication**: Requires Bearer token and admin role

**Audit**: Creates audit log entry with reason

**Transaction**: Atomic operation - all changes committed or rolled back together

**Error Cases**:
- 400 if proration already reversed
- 400 if reason is missing
- 404 if proration not found`;
        security: 'bearerAuth';
        path: { id: string };
        body: ReverseProrationRequest;
        responses: {
          /** Proration reversed successfully */
          200: ProrationEventResponse;
          /** Invalid request or already reversed */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Proration event not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/prorations/{id}/calculation': {
      get: {
        summary: 'Get calculation breakdown for proration';
        description: `Get detailed calculation breakdown for a proration event showing formulas and amounts.

**Phase 3 Addition**: New endpoint for proration transparency

**Authentication**: Requires Bearer token and admin role

**Response Format**: Modern format with calculation details including:
- Unused credit formula: "(25 days / 30 days) × $29.00 = $24.17"
- New tier cost formula: "(25 days / 30 days) × $99.00 = $82.50"
- Net charge formula: "$82.50 - $24.17 = $58.33"

This endpoint helps admins understand exactly how proration charges are calculated.`;
        security: 'bearerAuth';
        path: { id: string };
        responses: {
          /** Calculation breakdown retrieved successfully */
          200: ProrationCalculationResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Proration event not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/coupons/{id}': {
      get: {
        summary: 'Get single coupon details';
        description: `Get full details for a single coupon by ID including usage limits and campaign relations.

**Phase 3 Addition**: Single-item detail endpoint to avoid unnecessary list queries

**Authentication**: Requires Bearer token and admin role

**Response Format**: Modern format with full coupon object including:
- Discount type and value (percentage or fixed amount)
- Validity period (validFrom/validUntil)
- Usage limits (maxRedemptions)
- Current redemption count
- Campaign association (if applicable)

**Use Cases**:
- Viewing coupon details for editing
- Monitoring coupon usage and redemptions
- Verifying campaign associations`;
        security: 'bearerAuth';
        path: { id: string };
        responses: {
          /** Coupon retrieved successfully */
          200: CouponResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Coupon not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/campaigns/{id}': {
      get: {
        summary: 'Get single campaign details';
        description: `Get full details for a single campaign by ID including computed status and coupon count.

**Phase 3 Addition**: Single-item detail endpoint for campaign management

**Authentication**: Requires Bearer token and admin role

**Response Format**: Modern format with computed fields:
- **Status computed from dates**:
  - "planning": startDate in future
  - "active": between startDate and endDate, isActive=true
  - "ended": past endDate
  - "paused": isActive=false
- **Aggregated metrics**:
  - couponCount: Number of coupons in campaign
  - redemptionCount: Total redemptions across all coupons
  - currentSpend: Current budget spend

**Use Cases**:
- Viewing campaign details for editing
- Monitoring campaign performance
- Budget tracking`;
        security: 'bearerAuth';
        path: { id: string };
        responses: {
          /** Campaign retrieved successfully */
          200: CampaignResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient permissions (admin role required) */
          403: ApiError;
          /** Campaign not found */
          404: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
