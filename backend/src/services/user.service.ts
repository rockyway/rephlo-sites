/**
 * User Management Service (Refactored with DI)
 *
 * Handles user profile and preferences management operations.
 * Provides business logic for user data retrieval, updates, and preference management.
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (User APIs)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
import {
  isUniqueConstraintError,
  getUniqueConstraintFields,
  isRecordNotFoundError,
} from '../config/database';
import {
  UpdateProfileInput,
  UpdatePreferencesInput,
  UserProfileResponse,
  UserPreferencesResponse,
  DefaultModelResponse,
} from '../types/user-validation';
import { IUserService } from '../interfaces';

// =============================================================================
// User Service Class
// =============================================================================

@injectable()
export class UserService implements IUserService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('UserService: Initialized');
  }

  // ===========================================================================
  // User Profile Operations
  // ===========================================================================

  /**
   * Get user profile by ID
   * @param userId - User ID from JWT token
   * @returns User profile data
   * @throws Error if user not found
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    logger.debug('UserService: Getting user profile', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      logger.warn('UserService: User not found', { userId });
      throw new Error('User not found');
    }

    logger.info('UserService: User profile retrieved', { userId });

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }

  /**
   * Update user profile
   * @param userId - User ID from JWT token
   * @param data - Profile update data
   * @returns Updated user profile
   * @throws Error if user not found or username already taken
   */
  async updateUserProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<UserProfileResponse> {
    logger.debug('UserService: Updating user profile', { userId, data });

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      logger.info('UserService: User profile updated', {
        userId,
        updatedFields: Object.keys(data),
      });

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const fields = getUniqueConstraintFields(error);
        logger.warn('UserService: Unique constraint violation', {
          userId,
          fields,
        });
        throw new Error(`Username already taken`);
      }

      if (isRecordNotFoundError(error)) {
        logger.warn('UserService: User not found during update', { userId });
        throw new Error('User not found');
      }

      logger.error('UserService: Error updating user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * Called after successful authentication
   * @param userId - User ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    logger.debug('UserService: Updating last login', { userId });

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
        },
      });

      logger.debug('UserService: Last login updated', { userId });
    } catch (error) {
      // Don't throw error for login timestamp update failure
      // This is a non-critical operation
      logger.error('UserService: Error updating last login', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify user email
   * @param userId - User ID
   */
  async verifyEmail(userId: string): Promise<void> {
    logger.debug('UserService: Verifying email', { userId });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        updatedAt: new Date(),
      },
    });

    logger.info('UserService: Email verified', { userId });
  }

  // ===========================================================================
  // User Preferences Operations
  // ===========================================================================

  /**
   * Get user preferences
   * Creates default preferences if none exist
   * @param userId - User ID from JWT token
   * @returns User preferences
   */
  async getUserPreferences(
    userId: string
  ): Promise<UserPreferencesResponse> {
    logger.debug('UserService: Getting user preferences', { userId });

    // Find or create user preferences
    let preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: {
        defaultModelId: true,
        enableStreaming: true,
        maxTokens: true,
        temperature: true,
        preferencesMetadata: true,
      },
    });

    // Create default preferences if none exist
    if (!preferences) {
      logger.info('UserService: Creating default preferences', { userId });
      preferences = await this.prisma.userPreference.create({
        data: {
          userId,
        },
        select: {
          defaultModelId: true,
          enableStreaming: true,
          maxTokens: true,
          temperature: true,
          preferencesMetadata: true,
        },
      });
    }

    logger.debug('UserService: User preferences retrieved', { userId });

    return {
      defaultModelId: preferences.defaultModelId,
      enableStreaming: preferences.enableStreaming,
      maxTokens: preferences.maxTokens,
      temperature: preferences.temperature.toNumber(),
      preferencesMetadata: preferences.preferencesMetadata as Record<
        string,
        any
      > | null,
    };
  }

  /**
   * Update user preferences
   * @param userId - User ID from JWT token
   * @param data - Preferences update data
   * @returns Updated user preferences
   */
  async updateUserPreferences(
    userId: string,
    data: UpdatePreferencesInput
  ): Promise<UserPreferencesResponse> {
    logger.debug('UserService: Updating user preferences', { userId, data });

    // Ensure user preferences record exists
    await this.ensurePreferencesExist(userId);

    // Prepare update data
    const updateData: Prisma.UserPreferenceUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.enableStreaming !== undefined) {
      updateData.enableStreaming = data.enableStreaming;
    }
    if (data.maxTokens !== undefined) {
      updateData.maxTokens = data.maxTokens;
    }
    if (data.temperature !== undefined) {
      updateData.temperature = data.temperature;
    }
    if (data.preferencesMetadata !== undefined) {
      updateData.preferencesMetadata = data.preferencesMetadata as Prisma.InputJsonValue;
    }

    const preferences = await this.prisma.userPreference.update({
      where: { userId },
      data: updateData,
      select: {
        defaultModelId: true,
        enableStreaming: true,
        maxTokens: true,
        temperature: true,
        preferencesMetadata: true,
      },
    });

    logger.info('UserService: User preferences updated', {
      userId,
      updatedFields: Object.keys(data),
    });

    return {
      defaultModelId: preferences.defaultModelId,
      enableStreaming: preferences.enableStreaming,
      maxTokens: preferences.maxTokens,
      temperature: preferences.temperature.toNumber(),
      preferencesMetadata: preferences.preferencesMetadata as Record<
        string,
        any
      > | null,
    };
  }

  /**
   * Set default model for user
   * Validates that model exists before setting
   * @param userId - User ID from JWT token
   * @param modelId - Model ID to set as default
   * @returns Default model info
   * @throws Error if model not found
   */
  async setDefaultModel(
    userId: string,
    modelId: string
  ): Promise<DefaultModelResponse> {
    logger.debug('UserService: Setting default model', { userId, modelId });

    // Verify model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        displayName: true,
        capabilities: true,
        isAvailable: true,
      },
    });

    if (!model) {
      logger.warn('UserService: Model not found', { userId, modelId });
      throw new Error(`Model '${modelId}' does not exist`);
    }

    if (!model.isAvailable) {
      logger.warn('UserService: Model is not available', { userId, modelId });
      throw new Error(`Model '${modelId}' is not available`);
    }

    // Ensure user preferences record exists
    await this.ensurePreferencesExist(userId);

    // Update default model
    await this.prisma.userPreference.update({
      where: { userId },
      data: {
        defaultModelId: modelId,
        updatedAt: new Date(),
      },
    });

    logger.info('UserService: Default model set', { userId, modelId });

    return {
      defaultModelId: modelId,
      model: {
        id: model.id,
        name: model.displayName ?? model.id,
        capabilities: model.capabilities,
      },
    };
  }

  /**
   * Get default model for user
   * @param userId - User ID from JWT token
   * @returns Default model info or null if not set
   */
  async getDefaultModel(userId: string): Promise<DefaultModelResponse> {
    logger.debug('UserService: Getting default model', { userId });

    const preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: {
        defaultModelId: true,
        defaultModel: {
          select: {
            id: true,
            displayName: true,
            capabilities: true,
          },
        },
      },
    });

    if (!preferences || !preferences.defaultModelId) {
      logger.debug('UserService: No default model set', { userId });
      return {
        defaultModelId: null,
        model: null,
      };
    }

    logger.debug('UserService: Default model retrieved', {
      userId,
      modelId: preferences.defaultModelId,
    });

    return {
      defaultModelId: preferences.defaultModelId,
      model: preferences.defaultModel
        ? {
            id: preferences.defaultModel.id,
            name: preferences.defaultModel.displayName ?? preferences.defaultModel.id,
            capabilities: preferences.defaultModel.capabilities,
          }
        : null,
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Ensure user preferences record exists
   * Creates default preferences if they don't exist
   * @param userId - User ID
   */
  private async ensurePreferencesExist(userId: string): Promise<void> {
    const exists = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!exists) {
      logger.debug('UserService: Creating default preferences', { userId });
      await this.prisma.userPreference.create({
        data: { userId },
      });
    }
  }

  /**
   * Check if user exists and is active
   * @param userId - User ID
   * @returns true if user exists and is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        deletedAt: true,
      },
    });

    return user !== null && user.isActive && user.deletedAt === null;
  }

  /**
   * Soft delete user account
   * Sets deletedAt timestamp and deactivates account
   * @param userId - User ID
   */
  async softDeleteUser(userId: string): Promise<void> {
    logger.warn('UserService: Soft deleting user', { userId });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info('UserService: User soft deleted', { userId });
  }

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
  async getDetailedUserProfile(userId: string): Promise<any | null> {
    logger.debug('UserService: Getting detailed user profile', { userId });

    // Query user with subscriptions and preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: {
            status: 'active',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        userPreferences: true,
      },
    });

    if (!user) {
      logger.warn('UserService: User not found', { userId });
      return null;
    }

    // Get active subscription (first item from subscriptions array)
    const activeSubscription = user.subscriptions && user.subscriptions.length > 0
      ? user.subscriptions[0]
      : null;

    // Map subscription data (use defaults if no subscription exists)
    const subscription: any = activeSubscription
      ? {
          tier: activeSubscription.tier as 'free' | 'pro' | 'enterprise',
          status: activeSubscription.status as
            | 'active'
            | 'cancelled'
            | 'expired'
            | 'trialing',
          currentPeriodStart: activeSubscription.currentPeriodStart,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        }
      : {
          // Default free tier subscription
          tier: 'free' as const,
          status: 'active' as const,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };

    // Map preferences data (use defaults if no preferences exist)
    const preferences: any = user.userPreferences
      ? {
          defaultModel: user.userPreferences.defaultModelId,
          emailNotifications: user.userPreferences.emailNotifications,
          usageAlerts: user.userPreferences.usageAlerts,
        }
      : {
          // Default preferences
          defaultModel: null,
          emailNotifications: true,
          usageAlerts: true,
        };

    // Construct display name from firstName + lastName or null
    let displayName: string | null = null;
    if (user.firstName || user.lastName) {
      displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    const detailedProfile = {
      userId: user.id,
      email: user.email,
      displayName,
      subscription,
      preferences,
      accountCreatedAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    logger.info('UserService: Detailed user profile retrieved', {
      userId,
      tier: subscription.tier,
      hasPreferences: !!user.userPreferences,
    });

    return detailedProfile;
  }
}
