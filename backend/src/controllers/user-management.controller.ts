/**
 * User Management Controller (Plan 109)
 *
 * Handles HTTP endpoints for admin user management and moderation.
 * All endpoints require admin authentication.
 *
 * Endpoints:
 * - GET    /admin/users                    - List users with pagination/filters
 * - GET    /admin/users/search             - Search users by email/username
 * - GET    /admin/users/:id                - View user details
 * - PATCH  /admin/users/:id                - Edit user profile
 * - POST   /admin/users/:id/suspend        - Suspend user account
 * - POST   /admin/users/:id/unsuspend      - Unsuspend user account
 * - POST   /admin/users/:id/ban            - Ban user account
 * - POST   /admin/users/:id/unban          - Unban user account
 * - POST   /admin/users/bulk-update        - Bulk update users
 * - POST   /admin/users/:id/adjust-credits - Adjust user credits manually
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { UserManagementService } from '../services/user-management.service';
import {
  badRequestError,
  validationError,
} from '../middleware/error.middleware';

// =============================================================================
// Validation Schemas
// =============================================================================

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  tier: z.enum(['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'tier']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const searchUsersSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
});

const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
});

const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
  duration: z.number().int().min(1).optional(), // Days
});

const banUserSchema = z.object({
  reason: z.string().min(1, 'Ban reason is required'),
  permanent: z.boolean().default(true),
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID required'),
  updates: z.object({
    role: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const adjustCreditsSchema = z.object({
  amount: z.number().int().refine((val) => val !== 0, {
    message: 'Amount cannot be zero',
  }),
  reason: z.string().min(1, 'Reason is required'),
});

// =============================================================================
// User Management Controller Class
// =============================================================================

@injectable()
export class UserManagementController {
  constructor(
    @inject('UserManagementService')
    private userManagementService: UserManagementService
  ) {
    logger.debug('UserManagementController: Initialized');
  }

  // ===========================================================================
  // User Listing and Search Endpoints
  // ===========================================================================

  /**
   * GET /admin/users
   * List users with pagination and filters
   *
   * Requires: Admin authentication
   *
   * Query: {
   *   page?: number,
   *   limit?: number,
   *   tier?: string,
   *   status?: string,
   *   search?: string,
   *   sortBy?: 'createdAt' | 'email' | 'tier',
   *   sortOrder?: 'asc' | 'desc'
   * }
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    logger.info('UserManagementController.listUsers', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = listUsersQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const { page, limit, tier, status, search, sortBy, sortOrder } = parseResult.data;

    try {
      const filters = {
        tier,
        status,
        search,
        sortBy,
        sortOrder,
      };

      const pagination = {
        page,
        limit,
      };

      const result = await this.userManagementService.listUsers(filters, pagination);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('UserManagementController.listUsers: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/users/search
   * Search users by email or username
   *
   * Requires: Admin authentication
   *
   * Query: { query: string }
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    logger.info('UserManagementController.searchUsers', {
      query: req.query,
    });

    // Validate query parameter
    const parseResult = searchUsersSchema.safeParse(req.query);

    if (!parseResult.success) {
      throw validationError('Search query is required');
    }

    const { query } = parseResult.data;

    try {
      const users = await this.userManagementService.searchUsers(query);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('UserManagementController.searchUsers: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/users/:id
   * View detailed user information
   *
   * Requires: Admin authentication
   */
  async viewUserDetails(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.viewUserDetails', {
      userId,
    });

    try {
      const userDetails = await this.userManagementService.viewUserDetails(userId);

      // UserDetails from shared types already has the correct structure with:
      // - name (computed from firstName + lastName)
      // - currentTier (from active subscription)
      // - status (from database enum)
      // - creditsBalance (from credit_balance table)
      // - usageStats (totalApiCalls, creditsUsed, averageCallsPerDay)

      res.status(200).json(userDetails);
    } catch (error) {
      logger.error('UserManagementController.viewUserDetails: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // User Profile Management Endpoints
  // ===========================================================================

  /**
   * PATCH /admin/users/:id
   * Edit user profile
   *
   * Requires: Admin authentication
   *
   * Body: { email?, firstName?, lastName?, username? }
   */
  async editUserProfile(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.editUserProfile', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = updateUserProfileSchema.safeParse(req.body);

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

    const updates = parseResult.data;

    if (Object.keys(updates).length === 0) {
      throw badRequestError('At least one field must be provided for update');
    }

    try {
      const user = await this.userManagementService.editUserProfile(userId, updates);

      res.status(200).json({
        status: 'success',
        data: user,
        meta: {
          message: 'User profile updated successfully',
        },
      });
    } catch (error) {
      logger.error('UserManagementController.editUserProfile: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // User Moderation Endpoints
  // ===========================================================================

  /**
   * POST /admin/users/:id/suspend
   * Suspend user account
   *
   * Requires: Admin authentication
   *
   * Body: { reason: string, duration?: number }
   */
  async suspendUser(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.suspendUser', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = suspendUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Suspension validation failed', errors);
    }

    const { reason, duration } = parseResult.data;

    try {
      const user = await this.userManagementService.suspendUser(userId, reason, duration);

      res.status(200).json({
        status: 'success',
        data: user,
        meta: {
          message: duration
            ? `User suspended for ${duration} days`
            : 'User suspended indefinitely',
        },
      });
    } catch (error) {
      logger.error('UserManagementController.suspendUser: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/users/:id/unsuspend
   * Unsuspend user account
   *
   * Requires: Admin authentication
   */
  async unsuspendUser(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.unsuspendUser', {
      userId,
    });

    try {
      const user = await this.userManagementService.unsuspendUser(userId);

      res.status(200).json({
        status: 'success',
        data: user,
        meta: {
          message: 'User unsuspended successfully',
        },
      });
    } catch (error) {
      logger.error('UserManagementController.unsuspendUser: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/users/:id/ban
   * Ban user account
   *
   * Requires: Admin authentication
   *
   * Body: { reason: string, permanent?: boolean }
   */
  async banUser(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.banUser', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = banUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Ban validation failed', errors);
    }

    const { reason, permanent } = parseResult.data;

    try {
      const user = await this.userManagementService.banUser(userId, reason, permanent);

      res.status(200).json({
        status: 'success',
        data: user,
        meta: {
          message: permanent ? 'User permanently banned' : 'User temporarily banned',
        },
      });
    } catch (error) {
      logger.error('UserManagementController.banUser: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/users/:id/unban
   * Unban user account
   *
   * Requires: Admin authentication
   */
  async unbanUser(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.unbanUser', {
      userId,
    });

    try {
      const user = await this.userManagementService.unbanUser(userId);

      res.status(200).json({
        status: 'success',
        data: user,
        meta: {
          message: 'User unbanned successfully',
        },
      });
    } catch (error) {
      logger.error('UserManagementController.unbanUser: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Bulk Operations Endpoints
  // ===========================================================================

  /**
   * POST /admin/users/bulk-update
   * Bulk update users
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userIds: string[],
   *   updates: { tier?, status? }
   * }
   */
  async bulkUpdateUsers(req: Request, res: Response): Promise<void> {
    logger.info('UserManagementController.bulkUpdateUsers', {
      body: req.body,
    });

    // Validate request body
    const parseResult = bulkUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Bulk update validation failed', errors);
    }

    const { userIds, updates } = parseResult.data;

    try {
      const result = await this.userManagementService.bulkUpdateUsers(userIds, updates);

      res.status(200).json({
        status: 'success',
        data: result,
        meta: {
          message: `Bulk update completed: ${result.success} succeeded, ${result.failed} failed`,
        },
      });
    } catch (error) {
      logger.error('UserManagementController.bulkUpdateUsers: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Credit Adjustment Endpoints
  // ===========================================================================

  /**
   * POST /admin/users/:id/adjust-credits
   * Manually adjust user credits
   *
   * Requires: Admin authentication
   *
   * Body: { amount: number, reason: string }
   */
  async adjustUserCredits(req: Request, res: Response): Promise<void> {
    const { id: userId } = req.params;

    logger.info('UserManagementController.adjustUserCredits', {
      userId,
      body: req.body,
    });

    // Validate request body
    const parseResult = adjustCreditsSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Credit adjustment validation failed', errors);
    }

    const { amount, reason } = parseResult.data;

    try {
      const adjustment = await this.userManagementService.adjustUserCredits(
        userId,
        amount,
        reason
      );

      res.status(200).json({
        status: 'success',
        data: adjustment,
        meta: {
          message: `Credits ${amount > 0 ? 'added' : 'deducted'} successfully`,
        },
      });
    } catch (error) {
      logger.error('UserManagementController.adjustUserCredits: Error', { error });
      throw error;
    }
  }
}
