/**
 * Plan 109: Subscription Monetization Routes
 *
 * Administrative endpoints for subscription management, user management,
 * billing, credits, and platform analytics.
 *
 * All endpoints require admin authentication.
 *
 * Route Structure:
 * - /admin/subscriptions/*          - Subscription management
 * - /admin/users/*                  - User management and moderation
 * - /admin/billing/*                - Billing and payment methods
 * - /admin/credits/*                - Credit management
 * - /admin/analytics/*              - Platform analytics
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { SubscriptionManagementController } from '../controllers/subscription-management.controller';
import { UserManagementController } from '../controllers/user-management.controller';
import { BillingController } from '../controllers/billing.controller';
import { CreditManagementController } from '../controllers/credit-management.controller';
import { AnalyticsController } from '../controllers/analytics.controller';

/**
 * Create Plan 109 admin router
 * @returns Express router
 */
export function createPlan109Router(): Router {
  const router = Router();

  // All Plan 109 routes require authentication and admin role
  router.use(authMiddleware, requireAdmin);

  // Resolve controllers from DI container
  const subscriptionController = container.resolve(SubscriptionManagementController);
  const userManagementController = container.resolve(UserManagementController);
  const billingController = container.resolve(BillingController);
  const creditController = container.resolve(CreditManagementController);
  const analyticsController = container.resolve(AnalyticsController);

  // =============================================================================
  // Subscription Management Routes
  // =============================================================================

  /**
   * POST /admin/subscriptions
   * Create a new subscription
   */
  router.post(
    '/subscriptions',
    auditLog({ action: 'create', resourceType: 'subscription', captureRequestBody: true }),
    asyncHandler(subscriptionController.createSubscription.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/upgrade
   * Upgrade subscription tier
   */
  router.post(
    '/subscriptions/:id/upgrade',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(subscriptionController.upgradeTier.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/downgrade
   * Downgrade subscription tier
   */
  router.post(
    '/subscriptions/:id/downgrade',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(subscriptionController.downgradeTier.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/cancel
   * Cancel subscription
   */
  router.post(
    '/subscriptions/:id/cancel',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(subscriptionController.cancelSubscription.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/reactivate
   * Reactivate cancelled subscription
   */
  router.post(
    '/subscriptions/:id/reactivate',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(subscriptionController.reactivateSubscription.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/allocate-credits
   * Allocate monthly credits
   */
  router.post(
    '/subscriptions/:id/allocate-credits',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true }),
    asyncHandler(subscriptionController.allocateMonthlyCredits.bind(subscriptionController))
  );

  /**
   * POST /admin/subscriptions/:id/rollover
   * Handle credit rollover
   */
  router.post(
    '/subscriptions/:id/rollover',
    auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true }),
    asyncHandler(subscriptionController.handleRollover.bind(subscriptionController))
  );

  /**
   * GET /admin/subscriptions/:userId/features
   * Check feature access
   */
  router.get(
    '/subscriptions/:userId/features',
    asyncHandler(subscriptionController.checkFeatureAccess.bind(subscriptionController))
  );

  /**
   * GET /admin/subscriptions/:userId/limits
   * Get tier limits
   */
  router.get(
    '/subscriptions/:userId/limits',
    asyncHandler(subscriptionController.getTierLimits.bind(subscriptionController))
  );

  /**
   * GET /admin/subscriptions/user/:userId
   * Get user's active subscription
   */
  router.get(
    '/subscriptions/user/:userId',
    asyncHandler(subscriptionController.getActiveSubscription.bind(subscriptionController))
  );

  /**
   * GET /admin/subscriptions/all
   * List all subscriptions with pagination and filters
   */
  router.get(
    '/subscriptions/all',
    asyncHandler(subscriptionController.listAllSubscriptions.bind(subscriptionController))
  );

  /**
   * GET /admin/subscriptions/stats
   * Get subscription statistics
   */
  router.get(
    '/subscriptions/stats',
    asyncHandler(subscriptionController.getSubscriptionStats.bind(subscriptionController))
  );

  // =============================================================================
  // User Management Routes
  // =============================================================================

  /**
   * GET /admin/users
   * List users with pagination and filters
   */
  router.get(
    '/users',
    asyncHandler(userManagementController.listUsers.bind(userManagementController))
  );

  /**
   * GET /admin/users/search
   * Search users
   */
  router.get(
    '/users/search',
    asyncHandler(userManagementController.searchUsers.bind(userManagementController))
  );

  /**
   * GET /admin/users/:id
   * View user details
   */
  router.get(
    '/users/:id',
    asyncHandler(userManagementController.viewUserDetails.bind(userManagementController))
  );

  /**
   * PATCH /admin/users/:id
   * Edit user profile
   */
  router.patch(
    '/users/:id',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(userManagementController.editUserProfile.bind(userManagementController))
  );

  /**
   * POST /admin/users/:id/suspend
   * Suspend user account
   */
  router.post(
    '/users/:id/suspend',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(userManagementController.suspendUser.bind(userManagementController))
  );

  /**
   * POST /admin/users/:id/unsuspend
   * Unsuspend user account
   */
  router.post(
    '/users/:id/unsuspend',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(userManagementController.unsuspendUser.bind(userManagementController))
  );

  /**
   * POST /admin/users/:id/ban
   * Ban user account
   */
  router.post(
    '/users/:id/ban',
    auditLog({ action: 'delete', resourceType: 'user', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(userManagementController.banUser.bind(userManagementController))
  );

  /**
   * POST /admin/users/:id/unban
   * Unban user account
   */
  router.post(
    '/users/:id/unban',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(userManagementController.unbanUser.bind(userManagementController))
  );

  /**
   * POST /admin/users/bulk-update
   * Bulk update users
   */
  router.post(
    '/users/bulk-update',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true }),
    asyncHandler(userManagementController.bulkUpdateUsers.bind(userManagementController))
  );

  /**
   * POST /admin/users/:id/adjust-credits
   * Manually adjust user credits
   */
  router.post(
    '/users/:id/adjust-credits',
    auditLog({ action: 'update', resourceType: 'user', captureRequestBody: true }),
    asyncHandler(userManagementController.adjustUserCredits.bind(userManagementController))
  );

  // =============================================================================
  // Billing and Payment Routes
  // =============================================================================

  /**
   * POST /admin/billing/payment-methods
   * Add payment method
   */
  router.post(
    '/billing/payment-methods',
    auditLog({ action: 'create', resourceType: 'payment_method', captureRequestBody: true }),
    asyncHandler(billingController.addPaymentMethod.bind(billingController))
  );

  /**
   * DELETE /admin/billing/payment-methods/:id
   * Remove payment method
   */
  router.delete(
    '/billing/payment-methods/:id',
    auditLog({ action: 'delete', resourceType: 'payment_method', capturePreviousValue: true }),
    asyncHandler(billingController.removePaymentMethod.bind(billingController))
  );

  /**
   * GET /admin/billing/payment-methods/:userId
   * List payment methods
   */
  router.get(
    '/billing/payment-methods/:userId',
    asyncHandler(billingController.listPaymentMethods.bind(billingController))
  );

  /**
   * POST /admin/billing/invoices/:subscriptionId
   * Create invoice
   */
  router.post(
    '/billing/invoices/:subscriptionId',
    auditLog({ action: 'create', resourceType: 'invoice', captureRequestBody: true }),
    asyncHandler(billingController.createInvoice.bind(billingController))
  );

  /**
   * GET /admin/billing/invoices/upcoming/:userId
   * Get upcoming invoice
   */
  router.get(
    '/billing/invoices/upcoming/:userId',
    asyncHandler(billingController.getUpcomingInvoice.bind(billingController))
  );

  /**
   * GET /admin/billing/invoices/:userId
   * List invoices
   */
  router.get(
    '/billing/invoices/:userId',
    asyncHandler(billingController.listInvoices.bind(billingController))
  );

  /**
   * GET /admin/billing/transactions/:userId
   * List transactions
   */
  router.get(
    '/billing/transactions/:userId',
    asyncHandler(billingController.listTransactions.bind(billingController))
  );

  /**
   * POST /admin/billing/transactions/:id/refund
   * Refund transaction
   */
  router.post(
    '/billing/transactions/:id/refund',
    auditLog({ action: 'update', resourceType: 'transaction', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(billingController.refundTransaction.bind(billingController))
  );

  /**
   * POST /admin/billing/dunning/:attemptId/retry
   * Retry failed payment
   */
  router.post(
    '/billing/dunning/:attemptId/retry',
    auditLog({ action: 'update', resourceType: 'dunning_attempt', captureRequestBody: true }),
    asyncHandler(billingController.retryFailedPayment.bind(billingController))
  );

  // =============================================================================
  // Credit Management Routes
  // =============================================================================

  /**
   * POST /admin/credits/allocate
   * Allocate subscription credits
   */
  router.post(
    '/credits/allocate',
    auditLog({ action: 'create', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.allocateSubscriptionCredits.bind(creditController))
  );

  /**
   * POST /admin/credits/process-monthly
   * Process monthly allocations (cron)
   */
  router.post(
    '/credits/process-monthly',
    auditLog({ action: 'create', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.processMonthlyAllocations.bind(creditController))
  );

  /**
   * POST /admin/credits/grant-bonus
   * Grant bonus credits
   */
  router.post(
    '/credits/grant-bonus',
    auditLog({ action: 'create', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.grantBonusCredits.bind(creditController))
  );

  /**
   * POST /admin/credits/deduct
   * Deduct credits manually
   */
  router.post(
    '/credits/deduct',
    auditLog({ action: 'update', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.deductCreditsManually.bind(creditController))
  );

  /**
   * GET /admin/credits/rollover/:userId
   * Calculate rollover
   */
  router.get(
    '/credits/rollover/:userId',
    asyncHandler(creditController.calculateRollover.bind(creditController))
  );

  /**
   * POST /admin/credits/rollover/:userId/apply
   * Apply rollover
   */
  router.post(
    '/credits/rollover/:userId/apply',
    auditLog({ action: 'update', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.applyRollover.bind(creditController))
  );

  /**
   * POST /admin/credits/sync/:userId
   * Sync with token-credit system
   */
  router.post(
    '/credits/sync/:userId',
    auditLog({ action: 'update', resourceType: 'credit', captureRequestBody: true }),
    asyncHandler(creditController.syncWithTokenCreditSystem.bind(creditController))
  );

  /**
   * GET /admin/credits/reconcile/:userId
   * Reconcile credit balance
   */
  router.get(
    '/credits/reconcile/:userId',
    asyncHandler(creditController.reconcileCreditBalance.bind(creditController))
  );

  /**
   * GET /admin/credits/balance/:userId
   * Get credit balance
   */
  router.get(
    '/credits/balance/:userId',
    asyncHandler(creditController.getCreditBalance.bind(creditController))
  );

  /**
   * GET /admin/credits/history/:userId
   * Get allocation history
   */
  router.get(
    '/credits/history/:userId',
    asyncHandler(creditController.getCreditAllocationHistory.bind(creditController))
  );

  /**
   * GET /admin/credits/usage/:userId
   * Get usage by period
   */
  router.get(
    '/credits/usage/:userId',
    asyncHandler(creditController.getCreditUsageByPeriod.bind(creditController))
  );

  // =============================================================================
  // Platform Analytics Routes
  // =============================================================================

  /**
   * GET /admin/analytics/revenue/mrr
   * Get Monthly Recurring Revenue
   */
  router.get(
    '/analytics/revenue/mrr',
    asyncHandler(analyticsController.getMRR.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/revenue/arr
   * Get Annual Recurring Revenue
   */
  router.get(
    '/analytics/revenue/arr',
    asyncHandler(analyticsController.getARR.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/revenue/by-tier
   * Get revenue by tier
   */
  router.get(
    '/analytics/revenue/by-tier',
    asyncHandler(analyticsController.getRevenueByTier.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/users/total
   * Get total active users
   */
  router.get(
    '/analytics/users/total',
    asyncHandler(analyticsController.getTotalActiveUsers.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/users/by-tier
   * Get user distribution by tier
   */
  router.get(
    '/analytics/users/by-tier',
    asyncHandler(analyticsController.getUsersByTier.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/churn-rate
   * Get churn rate
   */
  router.get(
    '/analytics/churn-rate',
    asyncHandler(analyticsController.getChurnRate.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/credit-utilization
   * Get credit utilization rate
   */
  router.get(
    '/analytics/credit-utilization',
    asyncHandler(analyticsController.getCreditUtilizationRate.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/conversion-rate
   * Get free-to-pro conversion rate
   */
  router.get(
    '/analytics/conversion-rate',
    asyncHandler(analyticsController.getFreeToProConversionRate.bind(analyticsController))
  );

  /**
   * GET /admin/analytics/dashboard
   * Get dashboard summary
   */
  router.get(
    '/analytics/dashboard',
    asyncHandler(analyticsController.getDashboardSummary.bind(analyticsController))
  );

  return router;
}
