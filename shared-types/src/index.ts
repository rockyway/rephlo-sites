/**
 * @rephlo/shared-types
 * Single source of truth for TypeScript types across Rephlo backend and frontend
 */

// User Types
export * from './user.types';

// Coupon & Campaign Types
export * from './coupon.types';

// Billing Types
export * from './billing.types';

// Credit & Token Types
export * from './credit.types';

// Response Types
export * from './response.types';

// Re-export commonly used types for convenience
export type {
  // User
  User,
  UserDetails,
  UserListResponse,
  Subscription,
  SuspendUserRequest,
  AdjustCreditsRequest,
} from './user.types';

export type {
  // Coupon
  Coupon,
  CouponListResponse,
  CouponCampaign,
  CampaignListResponse,
  CouponRedemption,
  RedemptionListResponse,
  FraudDetectionEvent,
  FraudEventListResponse,
  CouponAnalyticsMetrics,
  TopPerformingCoupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ReviewFraudEventRequest,
} from './coupon.types';

export type {
  // Billing
  SubscriptionStats,
  BillingInvoice,
  PaymentTransaction,
  CreditAllocation,
  UserCreditBalance,
  ProrationEvent,
} from './billing.types';

export type {
  // Credit
  TokenUsage,
  CreditDeduction,
  ModelProviderPricing,
  PricingConfig,
  UsageStats,
} from './credit.types';

export type {
  // Response
  ApiResponse,
  ApiError,
  PaginationData,
  PaginationParams,
} from './response.types';

// Re-export commonly used enums
export {
  // User enums
  UserStatus,
  SubscriptionTier,
  SubscriptionStatus,
  BillingCycle,
} from './user.types';

export {
  // Coupon enums
  CouponType,
  DiscountType,
  CampaignType,
  CampaignStatus,
  RedemptionStatus,
  FraudDetectionType,
  FraudSeverity,
  FraudResolution,
} from './coupon.types';

export {
  // Billing enums
  InvoiceStatus,
  PaymentStatus,
  CreditSource,
  ProrationEventType,
  ProrationStatus,
} from './billing.types';

export {
  // Credit enums
  RequestType,
  RequestStatus,
  CreditDeductionReason,
  CreditDeductionStatus,
  PricingConfigScopeType,
  PricingConfigReason,
  PricingConfigApprovalStatus,
} from './credit.types';

// Re-export commonly used Zod schemas
export {
  // User schemas
  UserStatusSchema,
  SubscriptionTierSchema,
  UserSchema,
  SubscriptionSchema,
  SuspendUserRequestSchema,
  AdjustCreditsRequestSchema,
} from './user.types';

export {
  // Coupon schemas
  CouponTypeSchema,
  CampaignTypeSchema,
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
  CreateCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  ReviewFraudEventRequestSchema,
} from './coupon.types';

export {
  // Billing schemas
  SubscriptionStatsSchema,
} from './billing.types';

export {
  // Response schemas
  PaginationDataSchema,
  PaginationParamsSchema,
} from './response.types';

// Re-export helper functions
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from './response.types';
