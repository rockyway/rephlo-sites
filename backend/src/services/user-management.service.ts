/**
 * User Management Service (Plan 109)
 *
 * Handles admin operations for user management, moderation, and bulk operations.
 * Provides tools for user lifecycle management, suspension, banning, and auditing.
 *
 * Core Responsibilities:
 * - User listing, searching, and filtering
 * - User profile editing and status management
 * - Moderation actions (suspend, ban, unsuspend, unban)
 * - Bulk operations (update, suspend, credit adjustments)
 * - Credit management (view history, manual adjustments)
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { notFoundError } from '../middleware/error.middleware';
import { RoleCacheService } from './role-cache.service';
import { PermissionCacheService } from './permission-cache.service';
import { SessionManagementService } from './session-management.service';
import {
  User,
  UserDetails,
} from '@rephlo/shared-types';
import {
  mapUserToApiType,
  mapUserDetailsToApiType,
} from '../utils/typeMappers';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface UserFilters {
  search?: string; // Email, name, or username
  tier?: string;
  status?: 'active' | 'suspended' | 'banned';
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastActiveBefore?: Date;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfileUpdates {
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

export interface BulkUserUpdate {
  role?: string;
  isActive?: boolean;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface CreditAdjustment {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  source: string;
  createdAt: Date;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'allocation' | 'deduction';
  source: string;
  createdAt: Date;
}

// =============================================================================
// User Management Service
// =============================================================================

@injectable()
export class UserManagementService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    private roleCacheService: RoleCacheService,
    private permissionCacheService: PermissionCacheService,
    private sessionManagementService: SessionManagementService
  ) {
    logger.debug('UserManagementService: Initialized');
  }

  // ===========================================================================
  // User Listing & Search
  // ===========================================================================

  /**
   * List users with optional filters and pagination
   * @param filters - User filters (tier, status, search, etc.)
   * @param pagination - Page number and limit
   * @returns Paginated user list
   */
  async listUsers(
    filters: UserFilters = {},
    pagination: Pagination = { page: 1, limit: 50 }
  ): Promise<PaginatedUsers> {
    logger.debug('UserManagementService.listUsers', { filters, pagination });

    try {
      // Build where clause
      const where: Prisma.UserWhereInput = {};

      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { username: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.status === 'active') {
        where.isActive = true;
        where.deactivatedAt = null;
        where.deletedAt = null;
      } else if (filters.status === 'suspended') {
        where.deactivatedAt = { not: null };
      } else if (filters.status === 'banned') {
        where.deletedAt = { not: null };
      }

      if (filters.registeredAfter) {
        where.createdAt = { ...(where.createdAt as any), gte: filters.registeredAfter };
      }

      if (filters.registeredBefore) {
        where.createdAt = { ...(where.createdAt as any), lte: filters.registeredBefore };
      }

      if (filters.lastActiveBefore) {
        where.lastLoginAt = { lte: filters.lastActiveBefore };
      }

      // Calculate offset
      const skip = (pagination.page - 1) * pagination.limit;

      // Execute query
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            credit_balance: true,
            subscriptionMonetization: {
              where: { status: { in: ['trial', 'active'] } },
              take: 1,
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      // Map database users to API type using shared type mapper
      const mappedUsers = users.map((user) => mapUserToApiType(user));

      logger.info('UserManagementService: Users listed', {
        count: users.length,
        total,
        page: pagination.page,
      });

      return {
        users: mappedUsers,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
      };
    } catch (error) {
      logger.error('UserManagementService.listUsers: Error', { error });
      throw error;
    }
  }

  /**
   * Search users by query string
   * @param query - Search query (email, name, username)
   * @returns Array of matching users
   */
  async searchUsers(query: string): Promise<User[]> {
    logger.debug('UserManagementService.searchUsers', { query });

    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 20, // Limit search results
        include: {
          credit_balance: true,
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
        },
      });

      logger.info('UserManagementService: Users searched', { query, count: users.length });

      return users.map((user) => mapUserToApiType(user));
    } catch (error) {
      logger.error('UserManagementService.searchUsers: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // User Actions
  // ===========================================================================

  /**
   * View detailed user profile
   * @param userId - User ID
   * @returns User details including subscription and usage
   */
  async viewUserDetails(userId: string): Promise<UserDetails> {
    logger.debug('UserManagementService.viewUserDetails', { userId });

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          credit_balance: true,
          token_usage: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
          credit_deductions: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw notFoundError('User');
      }

      // Get total API calls count
      const totalApiCalls = await this.prisma.usageHistory.count({
        where: { userId },
      });

      // Calculate credits used from deductions
      const creditsUsed = user.credit_deductions.reduce(
        (sum, deduction) => sum + deduction.amount,
        0
      );

      // Calculate average calls per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentApiCalls = await this.prisma.usageHistory.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      const averageCallsPerDay = recentApiCalls / 30;

      const usageStats = {
        totalApiCalls,
        creditsUsed,
        averageCallsPerDay: Math.round(averageCallsPerDay * 100) / 100,
      };

      // Map to shared UserDetails type using type mapper
      const userDetails = mapUserDetailsToApiType(user, usageStats);

      logger.info('UserManagementService: User details retrieved', { userId });

      return userDetails;
    } catch (error) {
      logger.error('UserManagementService.viewUserDetails: Error', { error });
      throw error;
    }
  }

  /**
   * Edit user profile
   * @param userId - User ID
   * @param updates - Profile updates
   * @returns Updated user
   */
  async editUserProfile(userId: string, updates: UserProfileUpdates): Promise<User> {
    logger.info('UserManagementService.editUserProfile', { userId, updates });

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updates.username && { username: updates.username }),
          ...(updates.firstName && { firstName: updates.firstName }),
          ...(updates.lastName && { lastName: updates.lastName }),
          ...(updates.profilePictureUrl && { profilePictureUrl: updates.profilePictureUrl }),
          updatedAt: new Date(),
        },
      });

      // Fetch updated user with relations for mapper
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
          credit_balance: true,
        },
      });

      logger.info('UserManagementService: User profile updated', { userId });

      return mapUserToApiType(updatedUser!);
    } catch (error) {
      logger.error('UserManagementService.editUserProfile: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Moderation Actions
  // ===========================================================================

  /**
   * Suspend user account
   * @param userId - User ID to suspend
   * @param reason - Suspension reason
   * @param duration - Suspension duration in days (optional, null = indefinite)
   * @returns Updated user
   */
  async suspendUser(userId: string, reason: string, duration?: number): Promise<User> {
    logger.info('UserManagementService.suspendUser', { userId, reason, duration });

    try {
      const now = new Date();
      const expiresAt = duration ? new Date(now.getTime() + duration * 24 * 60 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deactivatedAt: now,
          updatedAt: now,
        },
      });

      // TODO: Create user_suspension record (need to add this table to schema)
      // await this.prisma.userSuspension.create({
      //   data: { userId, reason, suspendedAt: now, expiresAt }
      // });

      // Fetch user with relations for mapper
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
          credit_balance: true,
        },
      });

      logger.info('UserManagementService: User suspended', { userId, expiresAt });

      return mapUserToApiType(updatedUser!);
    } catch (error) {
      logger.error('UserManagementService.suspendUser: Error', { error });
      throw error;
    }
  }

  /**
   * Unsuspend user account
   * @param userId - User ID to unsuspend
   * @returns Updated user
   */
  async unsuspendUser(userId: string): Promise<User> {
    logger.info('UserManagementService.unsuspendUser', { userId });

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          deactivatedAt: null,
          updatedAt: new Date(),
        },
      });

      // Fetch user with relations for mapper
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
          credit_balance: true,
        },
      });

      logger.info('UserManagementService: User unsuspended', { userId });

      return mapUserToApiType(updatedUser!);
    } catch (error) {
      logger.error('UserManagementService.unsuspendUser: Error', { error });
      throw error;
    }
  }

  /**
   * Ban user account (soft delete)
   * @param userId - User ID to ban
   * @param reason - Ban reason
   * @param permanent - If true, ban is permanent
   * @returns Updated user
   */
  async banUser(userId: string, reason: string, permanent: boolean = true): Promise<User> {
    logger.info('UserManagementService.banUser', { userId, reason, permanent });

    try {
      const now = new Date();

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: now,
          updatedAt: now,
        },
      });

      // TODO: Store ban reason in separate table or use metadata field

      // Fetch user with relations for mapper
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
          credit_balance: true,
        },
      });

      logger.info('UserManagementService: User banned', { userId, permanent });

      return mapUserToApiType(updatedUser!);
    } catch (error) {
      logger.error('UserManagementService.banUser: Error', { error });
      throw error;
    }
  }

  /**
   * Unban user account
   * @param userId - User ID to unban
   * @returns Updated user
   */
  async unbanUser(userId: string): Promise<User> {
    logger.info('UserManagementService.unbanUser', { userId });

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      // Fetch user with relations for mapper
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionMonetization: {
            where: { status: { in: ['trial', 'active'] } },
            take: 1,
          },
          credit_balance: true,
        },
      });

      logger.info('UserManagementService: User unbanned', { userId });

      return mapUserToApiType(updatedUser!);
    } catch (error) {
      logger.error('UserManagementService.unbanUser: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Bulk update users
   * @param userIds - Array of user IDs to update
   * @param updates - Updates to apply
   * @returns Operation result with success/failure counts
   */
  async bulkUpdateUsers(userIds: string[], updates: BulkUserUpdate): Promise<BulkOperationResult> {
    logger.info('UserManagementService.bulkUpdateUsers', {
      count: userIds.length,
      updates,
    });

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...(updates.role && { role: updates.role }),
            ...(updates.isActive !== undefined && { isActive: updates.isActive }),
            updatedAt: new Date(),
          },
        });

        // Phase 5: Invalidate caches and sessions when role is updated
        if (updates.role) {
          // Invalidate role cache (Phase 1)
          await this.roleCacheService.invalidateUserRole(userId);

          // Invalidate permission cache (Phase 3)
          await this.permissionCacheService.invalidateUserPermissions(userId);

          // Invalidate all sessions - force re-login (Phase 5)
          const sessionsInvalidated = await this.sessionManagementService.invalidateAllSessions(userId);

          logger.info('UserManagementService: Role changed - invalidated caches and sessions', {
            userId,
            newRole: updates.role,
            sessionsInvalidated,
          });
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          userId,
          error: error.message || 'Unknown error',
        });
      }
    }

    logger.info('UserManagementService: Bulk update completed', result);

    return result;
  }

  /**
   * Bulk suspend users
   * @param userIds - Array of user IDs to suspend
   * @param reason - Suspension reason
   * @param duration - Suspension duration in days (optional)
   * @returns Operation result
   */
  async bulkSuspend(
    userIds: string[],
    reason: string,
    duration?: number
  ): Promise<BulkOperationResult> {
    logger.info('UserManagementService.bulkSuspend', {
      count: userIds.length,
      reason,
      duration,
    });

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        await this.suspendUser(userId, reason, duration);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          userId,
          error: error.message || 'Unknown error',
        });
      }
    }

    logger.info('UserManagementService: Bulk suspend completed', result);

    return result;
  }

  // ===========================================================================
  // Credit Management
  // ===========================================================================

  /**
   * Manually adjust user credits
   * @param userId - User ID
   * @param amount - Credit amount (positive = add, negative = deduct)
   * @param reason - Adjustment reason
   * @returns Credit adjustment record
   */
  async adjustUserCredits(userId: string, amount: number, reason: string): Promise<CreditAdjustment> {
    logger.info('UserManagementService.adjustUserCredits', { userId, amount, reason });

    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw notFoundError('User');
      }

      // Create credit allocation record and update user's credit balance atomically
      const [allocation, updatedBalance] = await this.prisma.$transaction([
        this.prisma.creditAllocation.create({
          data: {
            userId,
            amount: Math.abs(amount),
            source: amount > 0 ? 'admin_grant' : 'admin_grant', // TODO: Add 'admin_deduction' source
            allocationPeriodStart: new Date(),
            allocationPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        }),
        this.prisma.userCreditBalance.upsert({
          where: { userId },
          create: {
            userId,
            amount: Math.max(0, amount), // Ensure non-negative
          },
          update: {
            amount: {
              increment: amount, // Positive = add, negative = deduct
            },
          },
        }),
      ]);

      logger.info('UserManagementService: Credits adjusted', {
        userId,
        amount,
        allocationId: allocation.id,
        newBalance: updatedBalance.amount,
      });

      return {
        id: allocation.id,
        userId: allocation.userId,
        amount: amount,
        reason,
        source: allocation.source,
        createdAt: allocation.createdAt,
      };
    } catch (error) {
      logger.error('UserManagementService.adjustUserCredits: Error', { error });
      throw error;
    }
  }

  /**
   * View user credit history
   * @param userId - User ID
   * @returns Array of credit transactions
   */
  async viewCreditHistory(userId: string): Promise<CreditTransaction[]> {
    logger.debug('UserManagementService.viewCreditHistory', { userId });

    try {
      const allocations = await this.prisma.creditAllocation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const transactions: CreditTransaction[] = allocations.map((alloc) => ({
        id: alloc.id,
        amount: alloc.amount,
        type: 'allocation' as const,
        source: alloc.source,
        createdAt: alloc.createdAt,
      }));

      // TODO: Also fetch deductions from Plan 112's credit_deduction_ledger

      logger.info('UserManagementService: Credit history retrieved', {
        userId,
        count: transactions.length,
      });

      return transactions;
    } catch (error) {
      logger.error('UserManagementService.viewCreditHistory: Error', { error });
      throw error;
    }
  }

}
