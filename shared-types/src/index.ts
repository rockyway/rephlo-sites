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

  // Billing
  SubscriptionStats,
  BillingInvoice,
  PaymentTransaction,
  CreditAllocation,
  UserCreditBalance,
  ProrationEvent,

  // Credit
  TokenUsage,
  CreditDeduction,
  ModelProviderPricing,
  PricingConfig,
  UsageStats,

  // Response
  ApiResponse,
  ApiError,
  PaginationData,
  PaginationParams,
} from './user.types';

// Re-export commonly used enums
export {
  // User enums
  UserStatus,
  SubscriptionTier,
  SubscriptionStatus,
  BillingCycle,

  // Coupon enums
  CouponType,
  DiscountType,
  CampaignType,
  CampaignStatus,
  RedemptionStatus,
  FraudDetectionType,
  FraudSeverity,
  FraudResolution,

  // Billing enums
  InvoiceStatus,
  PaymentStatus,
  CreditSource,
  ProrationEventType,
  ProrationStatus,

  // Credit enums
  RequestType,
  RequestStatus,
  CreditDeductionReason,
  CreditDeductionStatus,
  PricingConfigScopeType,
  PricingConfigReason,
  PricingConfigApprovalStatus,
} from './user.types';

// Re-export commonly used Zod schemas
export {
  // User schemas
  UserStatusSchema,
  SubscriptionTierSchema,
  UserSchema,
  SubscriptionSchema,
  SuspendUserRequestSchema,
  AdjustCreditsRequestSchema,

  // Coupon schemas
  CouponTypeSchema,
  CampaignTypeSchema,
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
  CreateCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  ReviewFraudEventRequestSchema,

  // Billing schemas
  SubscriptionStatsSchema,

  // Response schemas
  PaginationDataSchema,
  PaginationParamsSchema,
} from './user.types';

// Re-export helper functions
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from './response.types';
