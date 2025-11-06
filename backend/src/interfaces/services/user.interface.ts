export const IUserService = Symbol('IUserService');

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
}
