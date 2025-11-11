export const IUserService = Symbol('IUserService');

// =============================================================================
// Enhanced User Profile Data Structures (Phase 2)
// =============================================================================

/**
 * User subscription information
 * Contains tier, status, and billing period details
 */
export interface UserSubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * User preferences information
 * Contains default model and notification settings
 */
export interface UserPreferencesInfo {
  defaultModel: string | null;
  emailNotifications: boolean;
  usageAlerts: boolean;
}

/**
 * Detailed user profile
 * Complete view of user account with subscription and preferences
 */
export interface DetailedUserProfile {
  userId: string;
  email: string;
  displayName: string | null;
  subscription: UserSubscriptionInfo;
  preferences: UserPreferencesInfo;
  accountCreatedAt: Date;
  lastLoginAt: Date | null;
}

// =============================================================================
// User Service Interface
// =============================================================================

export interface IUserService {
  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): Promise<any>;

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, data: any): Promise<any>;

  /**
   * Update user's last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Verify user email
   */
  verifyEmail(userId: string): Promise<void>;

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): Promise<any>;

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, data: any): Promise<any>;

  /**
   * Set default model for user
   */
  setDefaultModel(userId: string, modelId: string): Promise<any>;

  /**
   * Get default model for user
   */
  getDefaultModel(userId: string): Promise<any>;

  /**
   * Check if user exists and is active
   */
  isUserActive(userId: string): Promise<boolean>;

  /**
   * Soft delete user account
   */
  softDeleteUser(userId: string): Promise<void>;

  // ===========================================================================
  // Enhanced User Profile API Methods (Phase 2)
  // ===========================================================================

  /**
   * Get detailed user profile with subscription and preferences
   * Returns complete user information for API response
   *
   * @param userId - User ID
   * @returns Detailed user profile or null if user not found
   */
  getDetailedUserProfile(userId: string): Promise<DetailedUserProfile | null>;
}
