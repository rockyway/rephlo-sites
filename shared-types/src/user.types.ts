/**
 * Shared User Types
 * Single source of truth for user-related types across frontend and backend
 */

import { z } from 'zod';

// Enums
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
}

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_MAX = 'pro_max',
  ENTERPRISE_PRO = 'enterprise_pro',
  ENTERPRISE_MAX = 'enterprise_max',
  PERPETUAL = 'perpetual',
}

// Zod Schemas for validation
export const UserStatusSchema = z.nativeEnum(UserStatus);
export const SubscriptionTierSchema = z.nativeEnum(SubscriptionTier);

// User Interface (matches both frontend expectations and backend responses)
export interface User {
  id: string;
  email: string;
  name: string | null; // Computed from firstName + lastName
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  profilePictureUrl: string | null;

  // Status fields
  status: UserStatus; // DB enum field
  isActive: boolean;

  // Tier and credits (computed)
  currentTier: SubscriptionTier;
  creditsBalance: number; // Computed from credit_allocation

  // Timestamps
  createdAt: string; // ISO 8601
  lastActiveAt: string | null; // Maps to lastLoginAt
  deactivatedAt: string | null;
  deletedAt: string | null;

  // Suspension/ban fields
  suspendedUntil: string | null;
  bannedAt: string | null;

  // Optional nested subscription data
  subscription?: Subscription;

  // Role
  role: string; // 'user' | 'admin'

  // LTV for analytics
  lifetimeValue: number; // In cents
}

// User Details Interface (for admin user detail view)
export interface UserDetails extends User {
  usageStats: {
    totalApiCalls: number;
    creditsUsed: number;
    averageCallsPerDay: number;
  };
  emailVerified: boolean;
  hasActivePerpetualLicense: boolean;
  mfaEnabled: boolean;
}

// User List Response
export interface UserListResponse {
  users: User[];
  pagination: PaginationData;
}

// Subscription Interface
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;

  // Pricing (IMPORTANT: Use finalPriceUsd, not basePriceUsd)
  finalPriceUsd: number; // After discounts/coupons
  basePriceUsd: number; // Before discounts

  // Credits
  monthlyCreditsAllocated: number; // Standardized field name

  // Billing periods
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null; // Computed from currentPeriodEnd for active subs

  // Stripe
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;

  // Cancellation
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;

  // Trial
  trialEndsAt: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Optional user data
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  GRACE_PERIOD = 'grace_period',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  LIFETIME = 'lifetime', // For perpetual licenses
}

export const SubscriptionStatusSchema = z.nativeEnum(SubscriptionStatus);
export const BillingCycleSchema = z.nativeEnum(BillingCycle);

// Pagination Interface
export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Zod schema for User
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  username: z.string().nullable(),
  profilePictureUrl: z.string().url().nullable(),
  status: UserStatusSchema,
  isActive: z.boolean(),
  currentTier: SubscriptionTierSchema,
  creditsBalance: z.number().int().min(0),
  createdAt: z.string(),
  lastActiveAt: z.string().nullable(),
  deactivatedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  suspendedUntil: z.string().nullable(),
  bannedAt: z.string().nullable(),
  role: z.string(),
  lifetimeValue: z.number().int().min(0),
  subscription: z.any().optional(), // Use SubscriptionSchema when defined
});

// Zod schema for Subscription
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tier: SubscriptionTierSchema,
  status: SubscriptionStatusSchema,
  billingCycle: BillingCycleSchema,
  finalPriceUsd: z.number().min(0),
  basePriceUsd: z.number().min(0),
  monthlyCreditsAllocated: z.number().int().min(0),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  nextBillingDate: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  cancelledAt: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }).optional(),
});

// Request DTOs
export interface SuspendUserRequest {
  reason: string;
  duration?: number; // Days (null = indefinite)
}

export interface AdjustCreditsRequest {
  amount: number; // Positive = add, negative = deduct
  reason: string;
  expiresAt?: string; // ISO 8601
}

export const SuspendUserRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  duration: z.number().int().positive().optional(),
});

export const AdjustCreditsRequestSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
  expiresAt: z.string().optional(),
});
