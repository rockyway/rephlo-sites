/**
 * User Management Controller
 *
 * Handles HTTP endpoints for user profile and preferences management.
 * All endpoints require authentication (JWT bearer token).
 *
 * Endpoints:
 * - GET    /v1/users/me                     - Get current user profile
 * - PATCH  /v1/users/me                     - Update user profile
 * - GET    /v1/users/me/preferences         - Get user preferences
 * - PATCH  /v1/users/me/preferences         - Update user preferences
 * - POST   /v1/users/me/preferences/model   - Set default model
 * - GET    /v1/users/me/preferences/model   - Get default model
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (User APIs)
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { IUserService } from '../interfaces';
import {
  updateProfileSchema,
  updatePreferencesSchema,
  setDefaultModelSchema,
  UpdateProfileInput,
  UpdatePreferencesInput,
  SetDefaultModelInput,
} from '../types/user-validation';
import {
  notFoundError,
  conflictError,
  validationError,
  unauthorizedError,
} from '../middleware/error.middleware';
import { getUserId } from '../middleware/auth.middleware';

// =============================================================================
// Users Controller Class
// =============================================================================

@injectable()
export class UsersController {
  constructor(@inject('IUserService') private userService: IUserService) {
    logger.debug('UsersController: Initialized');
  }

  // ===========================================================================
  // User Profile Endpoints
  // ===========================================================================

  /**
   * GET /v1/users/me
   * Get current user profile
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('UsersController.getCurrentUser: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.getCurrentUser', { userId });

    try {
      const profile = await this.userService.getUserProfile(userId);

      res.status(200).json(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw notFoundError('User');
      }
      throw error;
    }
  }

  /**
   * PATCH /v1/users/me
   * Update user profile
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   *
   * Body: { firstName?, lastName?, username? }
   */
  async updateCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('UsersController.updateCurrentUser: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.updateCurrentUser', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = updateProfileSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Profile validation failed', errors);
    }

    const data: UpdateProfileInput = parseResult.data;

    // Check if at least one field is provided
    if (Object.keys(data).length === 0) {
      throw validationError('At least one field must be provided for update');
    }

    try {
      const profile = await this.userService.updateUserProfile(userId, data);

      res.status(200).json(profile);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          throw notFoundError('User');
        }
        if (error.message === 'Username already taken') {
          throw conflictError('Username already taken', {
            field: 'username',
          });
        }
      }
      throw error;
    }
  }

  // ===========================================================================
  // User Preferences Endpoints
  // ===========================================================================

  /**
   * GET /v1/users/me/preferences
   * Get user preferences
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error(
        'UsersController.getUserPreferences: No user ID in request'
      );
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.getUserPreferences', { userId });

    const preferences = await this.userService.getUserPreferences(userId);

    res.status(200).json(preferences);
  }

  /**
   * PATCH /v1/users/me/preferences
   * Update user preferences
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   *
   * Body: { enableStreaming?, maxTokens?, temperature?, preferencesMetadata? }
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error(
        'UsersController.updateUserPreferences: No user ID in request'
      );
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.updateUserPreferences', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = updatePreferencesSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Preferences validation failed', errors);
    }

    const data: UpdatePreferencesInput = parseResult.data;

    // Check if at least one field is provided
    if (Object.keys(data).length === 0) {
      throw validationError('At least one field must be provided for update');
    }

    const preferences = await this.userService.updateUserPreferences(
      userId,
      data
    );

    res.status(200).json(preferences);
  }

  // ===========================================================================
  // Default Model Endpoints
  // ===========================================================================

  /**
   * POST /v1/users/me/preferences/model
   * Set default model
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   *
   * Body: { modelId: string }
   */
  async setDefaultModel(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('UsersController.setDefaultModel: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.setDefaultModel', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = setDefaultModelSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Model validation failed', errors);
    }

    const data: SetDefaultModelInput = parseResult.data;

    try {
      const result = await this.userService.setDefaultModel(
        userId,
        data.modelId
      );

      res.status(200).json({
        defaultModelId: result.defaultModelId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('does not exist')) {
          throw notFoundError(`Model '${data.modelId}'`);
        }
        if (error.message.includes('is not available')) {
          throw validationError(`Model '${data.modelId}' is not available`);
        }
      }
      throw error;
    }
  }

  /**
   * GET /v1/users/me/preferences/model
   * Get default model
   *
   * Requires: Authentication (JWT token)
   * Scope: user.info
   */
  async getDefaultModel(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('UsersController.getDefaultModel: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('UsersController.getDefaultModel', { userId });

    const result = await this.userService.getDefaultModel(userId);

    res.status(200).json(result);
  }

  // ===========================================================================
  // Enhanced User Profile Endpoint (Phase 3)
  // ===========================================================================

  /**
   * GET /api/user/profile
   * Get authenticated user's profile and account information
   *
   * Returns complete user profile including email, subscription tier/status,
   * preferences, and account timestamps
   *
   * Response 200:
   * {
   *   "userId": "usr_abc123xyz",
   *   "email": "user@example.com",
   *   "displayName": "John Doe",
   *   "subscription": {
   *     "tier": "pro",
   *     "status": "active",
   *     "currentPeriodStart": "2025-11-01T00:00:00Z",
   *     "currentPeriodEnd": "2025-12-01T00:00:00Z",
   *     "cancelAtPeriodEnd": false
   *   },
   *   "preferences": {
   *     "defaultModel": "gpt-5",
   *     "emailNotifications": true,
   *     "usageAlerts": true
   *   },
   *   "accountCreatedAt": "2024-01-15T10:30:00Z",
   *   "lastLoginAt": "2025-11-06T08:00:00Z"
   * }
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    logger.info('UsersController: Getting user profile', { userId });

    try {
      // Fetch detailed user profile from service
      const userProfile = await this.userService.getDetailedUserProfile(userId);

      if (!userProfile) {
        logger.warn('UsersController: User not found', { userId });
        throw notFoundError('User profile not found');
      }

      // Format response according to API specification
      const response = {
        userId: userProfile.userId,
        email: userProfile.email,
        displayName: userProfile.displayName || userProfile.email.split('@')[0], // Fallback to email username
        subscription: {
          tier: userProfile.subscription.tier,
          status: userProfile.subscription.status,
          currentPeriodStart: userProfile.subscription.currentPeriodStart?.toISOString() || null,
          currentPeriodEnd: userProfile.subscription.currentPeriodEnd?.toISOString() || null,
          cancelAtPeriodEnd: userProfile.subscription.cancelAtPeriodEnd
        },
        preferences: {
          defaultModel: userProfile.preferences.defaultModel,
          emailNotifications: userProfile.preferences.emailNotifications,
          usageAlerts: userProfile.preferences.usageAlerts
        },
        accountCreatedAt: userProfile.accountCreatedAt.toISOString(),
        lastLoginAt: userProfile.lastLoginAt?.toISOString() || null
      };

      logger.info('UsersController: User profile retrieved successfully', {
        userId,
        tier: response.subscription.tier,
        status: response.subscription.status
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('UsersController: Failed to get user profile', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
