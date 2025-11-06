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
}
