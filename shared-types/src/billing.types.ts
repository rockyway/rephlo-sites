/**
 * Shared Billing Types
 * Types for subscription billing, invoices, and payments
 */

import { z } from 'zod';

// Subscription Stats Interface
export interface SubscriptionStats {
  totalActive: number; // Count of active subscriptions
  mrr: number; // Monthly Recurring Revenue in USD
  pastDueCount: number; // Count of past_due subscriptions
  trialConversionsThisMonth: number; // Count of trial->active conversions
}

// Invoice Interface
export interface BillingInvoice {
  id: string;
  userId: string;
  subscriptionId: string | null;
  stripeInvoiceId: string;
  amountDue: number; // USD
  amountPaid: number; // USD
  currency: string; // 'usd'
  status: InvoiceStatus;
  periodStart: string; // ISO 8601
  periodEnd: string; // ISO 8601
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

// Payment Transaction Interface
export interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string | null;
  subscriptionId: string | null;
  stripePaymentIntentId: string;
  amount: number; // USD
  currency: string;
  status: PaymentStatus;
  paymentMethodType: string | null; // 'card' | 'bank_account' | 'paypal'
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Credit Allocation Interface
export interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  allocationPeriodStart: string;
  allocationPeriodEnd: string;
  source: CreditSource;
  createdAt: string;
}

export enum CreditSource {
  SUBSCRIPTION = 'subscription',
  BONUS = 'bonus',
  ADMIN_GRANT = 'admin_grant',
  REFERRAL = 'referral',
  COUPON = 'coupon',
}

// Credit Balance Interface
export interface UserCreditBalance {
  userId: string;
  amount: number;
  subscriptionCredits: number; // Credits from subscription allocation
  bonusCredits: number; // Bonus/referral/coupon credits
  lastDeductionAt: string | null;
  lastDeductionAmount: number | null;
  updatedAt: string;
}

// Proration Event Interface
export interface ProrationEvent {
  id: string;
  userId: string;
  subscriptionId: string;
  fromTier: string | null;
  toTier: string | null;
  changeType: ProrationEventType;
  daysRemaining: number;
  daysInCycle: number;
  unusedCreditValueUsd: number;
  newTierProratedCostUsd: number;
  netChargeUsd: number; // Positive = charge, negative = credit
  effectiveDate: string;
  stripeInvoiceId: string | null;
  status: ProrationStatus;
  createdAt: string;
  updatedAt: string;

  // Optional populated fields from joins
  user?: {
    email: string;
  };
}

export enum ProrationEventType {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  INTERVAL_CHANGE = 'interval_change',
  MIGRATION = 'migration',
  CANCELLATION = 'cancellation',
}

export enum ProrationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

// Zod Schemas
export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus);
export const PaymentStatusSchema = z.nativeEnum(PaymentStatus);
export const CreditSourceSchema = z.nativeEnum(CreditSource);
export const ProrationEventTypeSchema = z.nativeEnum(ProrationEventType);
export const ProrationStatusSchema = z.nativeEnum(ProrationStatus);

export const SubscriptionStatsSchema = z.object({
  totalActive: z.number().int().min(0),
  mrr: z.number().min(0),
  pastDueCount: z.number().int().min(0),
  trialConversionsThisMonth: z.number().int().min(0),
});

// Subscription Refund Interface
export interface SubscriptionRefund {
  id: string;
  userId: string;
  subscriptionId: string;
  refundType: RefundType;
  refundReason: string | null;
  requestedBy: string; // Admin user ID
  requestedAt: string; // ISO 8601
  originalChargeAmountUsd: number;
  refundAmountUsd: number;
  stripeChargeId: string | null;
  stripeRefundId: string | null;
  status: RefundStatus;
  processedAt: string | null;
  stripeProcessedAt: string | null;
  failureReason: string | null;
  adminNotes: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;

  // Optional populated fields from joins
  user?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  subscription?: {
    tier: string;
    status: string;
  };
  adminUser?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export enum RefundType {
  MANUAL_ADMIN = 'manual_admin',
  PRORATION_CREDIT = 'proration_credit',
  CHARGEBACK = 'chargeback',
}

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Zod Schemas
export const RefundTypeSchema = z.nativeEnum(RefundType);
export const RefundStatusSchema = z.nativeEnum(RefundStatus);
