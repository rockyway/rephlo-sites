/**
 * User Suspension Service
 *
 * Manages user suspensions with automatic expiration and lifecycle tracking.
 * Supports temporary and permanent suspensions.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  IUserSuspensionService,
  UserSuspensionResponse,
  SuspensionFilters,
} from '../interfaces';

// =============================================================================
// User Suspension Service Class
// =============================================================================

@injectable()
export class UserSuspensionService implements IUserSuspensionService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('UserSuspensionService: Initialized');
  }

  // ===========================================================================
  // Suspend User
  // ===========================================================================

  /**
   * Suspend a user temporarily or permanently
   */
  async suspendUser(
    userId: string,
    suspendedBy: string,
    reason: string,
    expiresAt: Date | null
  ): Promise<UserSuspensionResponse> {
    logger.info('UserSuspensionService: Suspending user', {
      userId,
      suspendedBy,
      expiresAt,
    });

    // Validate that suspendedBy is not the same as userId
    if (userId === suspendedBy) {
      throw new Error('Users cannot suspend themselves');
    }

    try {
      // Check if user already has an active suspension
      const activeSuspension = await this.getActiveSuspension(userId);
      if (activeSuspension) {
        throw new Error(
          `User ${userId} already has an active suspension (ID: ${activeSuspension.id})`
        );
      }

      // Create the suspension record
      const suspension = await this.prisma.userSuspension.create({
        data: {
          userId,
          suspendedBy,
          reason,
          expiresAt,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Update user status to suspended
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'suspended',
          suspendedUntil: expiresAt,
        },
      });

      logger.info('UserSuspensionService: User suspended', {
        suspensionId: suspension.id,
        userId,
      });

      return this.mapToResponse(suspension);
    } catch (error) {
      logger.error('UserSuspensionService: Failed to suspend user', {
        error,
        userId,
        suspendedBy,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Lift Suspension
  // ===========================================================================

  /**
   * Lift (remove) a user suspension before expiration
   */
  async liftSuspension(
    suspensionId: string,
    liftedBy: string
  ): Promise<UserSuspensionResponse> {
    logger.info('UserSuspensionService: Lifting suspension', { suspensionId, liftedBy });

    try {
      // First, verify the suspension exists and is active
      const existing = await this.prisma.userSuspension.findUnique({
        where: { id: suspensionId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error(`Suspension not found: ${suspensionId}`);
      }

      if (existing.liftedAt) {
        throw new Error(`Suspension ${suspensionId} has already been lifted`);
      }

      // Check if suspension has expired
      if (existing.expiresAt && existing.expiresAt < new Date()) {
        throw new Error(`Suspension ${suspensionId} has already expired`);
      }

      // Update the suspension record
      const updated = await this.prisma.userSuspension.update({
        where: { id: suspensionId },
        data: {
          liftedAt: new Date(),
          liftedBy,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
          lifter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Update user status back to active
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          status: 'active',
          suspendedUntil: null,
        },
      });

      logger.info('UserSuspensionService: Suspension lifted', { suspensionId });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('UserSuspensionService: Failed to lift suspension', {
        error,
        suspensionId,
        liftedBy,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Get Suspensions
  // ===========================================================================

  /**
   * Get all suspensions for a user
   */
  async getUserSuspensions(userId: string): Promise<UserSuspensionResponse[]> {
    logger.debug('UserSuspensionService: Getting user suspensions', { userId });

    try {
      const suspensions = await this.prisma.userSuspension.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
          lifter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          suspendedAt: 'desc',
        },
      });

      return suspensions.map((suspension) => this.mapToResponse(suspension));
    } catch (error) {
      logger.error('UserSuspensionService: Failed to get user suspensions', {
        error,
        userId,
      });
      throw new Error(`Failed to get user suspensions: ${error}`);
    }
  }

  /**
   * Get active suspension for a user (if any)
   */
  async getActiveSuspension(userId: string): Promise<UserSuspensionResponse | null> {
    logger.debug('UserSuspensionService: Getting active suspension', { userId });

    try {
      const now = new Date();

      const suspension = await this.prisma.userSuspension.findFirst({
        where: {
          userId,
          liftedAt: null,
          OR: [
            { expiresAt: null }, // Permanent suspension
            { expiresAt: { gt: now } }, // Not expired yet
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          suspendedAt: 'desc',
        },
      });

      return suspension ? this.mapToResponse(suspension) : null;
    } catch (error) {
      logger.error('UserSuspensionService: Failed to get active suspension', {
        error,
        userId,
      });
      throw new Error(`Failed to get active suspension: ${error}`);
    }
  }

  /**
   * Check if a user is currently suspended
   */
  async isUserSuspended(userId: string): Promise<boolean> {
    logger.debug('UserSuspensionService: Checking if user is suspended', { userId });

    try {
      const activeSuspension = await this.getActiveSuspension(userId);
      return activeSuspension !== null;
    } catch (error) {
      logger.error('UserSuspensionService: Failed to check if user is suspended', {
        error,
        userId,
      });
      throw new Error(`Failed to check if user is suspended: ${error}`);
    }
  }

  /**
   * Get all suspensions with optional filtering
   */
  async getAllSuspensions(filters?: SuspensionFilters): Promise<UserSuspensionResponse[]> {
    logger.debug('UserSuspensionService: Getting all suspensions', { filters });

    try {
      const where: any = {};

      if (filters) {
        if (filters.userId) where.userId = filters.userId;
        if (filters.suspendedBy) where.suspendedBy = filters.suspendedBy;

        if (filters.active !== undefined) {
          const now = new Date();
          if (filters.active) {
            // Only active suspensions
            where.liftedAt = null;
            where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
          } else {
            // Only lifted or expired suspensions
            where.OR = [{ liftedAt: { not: null } }, { expiresAt: { lte: now } }];
          }
        }

        if (filters.suspendedAfter || filters.suspendedBefore) {
          where.suspendedAt = {};
          if (filters.suspendedAfter) where.suspendedAt.gte = filters.suspendedAfter;
          if (filters.suspendedBefore) where.suspendedAt.lte = filters.suspendedBefore;
        }
      }

      const suspensions = await this.prisma.userSuspension.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
          lifter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          suspendedAt: 'desc',
        },
      });

      return suspensions.map((suspension) => this.mapToResponse(suspension));
    } catch (error) {
      logger.error('UserSuspensionService: Failed to get all suspensions', { error });
      throw new Error(`Failed to get all suspensions: ${error}`);
    }
  }

  // ===========================================================================
  // Auto-Expire Suspensions
  // ===========================================================================

  /**
   * Auto-expire suspensions that have passed their expiration time
   */
  async expireSuspensions(): Promise<number> {
    logger.info('UserSuspensionService: Expiring suspensions');

    try {
      const now = new Date();

      // Find all expired suspensions that haven't been lifted
      const expiredSuspensions = await this.prisma.userSuspension.findMany({
        where: {
          liftedAt: null,
          expiresAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (expiredSuspensions.length === 0) {
        logger.info('UserSuspensionService: No suspensions to expire');
        return 0;
      }

      // Update each suspension
      for (const suspension of expiredSuspensions) {
        await this.prisma.userSuspension.update({
          where: { id: suspension.id },
          data: {
            liftedAt: now,
          },
        });

        // Update user status back to active
        await this.prisma.user.update({
          where: { id: suspension.userId },
          data: {
            status: 'active',
            suspendedUntil: null,
          },
        });
      }

      logger.info('UserSuspensionService: Suspensions expired', {
        count: expiredSuspensions.length,
      });

      return expiredSuspensions.length;
    } catch (error) {
      logger.error('UserSuspensionService: Failed to expire suspensions', { error });
      throw new Error(`Failed to expire suspensions: ${error}`);
    }
  }

  /**
   * Extend a suspension's expiration time
   */
  async extendSuspension(
    suspensionId: string,
    newExpiresAt: Date | null,
    extendedBy: string,
    extendReason: string
  ): Promise<UserSuspensionResponse> {
    logger.info('UserSuspensionService: Extending suspension', {
      suspensionId,
      newExpiresAt,
      extendedBy,
    });

    try {
      // First, verify the suspension exists and is active
      const existing = await this.prisma.userSuspension.findUnique({
        where: { id: suspensionId },
      });

      if (!existing) {
        throw new Error(`Suspension not found: ${suspensionId}`);
      }

      if (existing.liftedAt) {
        throw new Error(`Cannot extend a lifted suspension: ${suspensionId}`);
      }

      // Check if suspension has already expired
      if (existing.expiresAt && existing.expiresAt < new Date()) {
        throw new Error(`Cannot extend an expired suspension: ${suspensionId}`);
      }

      // Update the suspension
      const updated = await this.prisma.userSuspension.update({
        where: { id: suspensionId },
        data: {
          expiresAt: newExpiresAt,
          reason: `${existing.reason}\n\nExtension: ${extendReason}`,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          suspender: {
            select: {
              id: true,
              email: true,
            },
          },
          lifter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Update user's suspendedUntil field
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          suspendedUntil: newExpiresAt,
        },
      });

      logger.info('UserSuspensionService: Suspension extended', { suspensionId });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('UserSuspensionService: Failed to extend suspension', {
        error,
        suspensionId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Map Prisma model to response type
   */
  private mapToResponse(suspension: any): UserSuspensionResponse {
    return {
      id: suspension.id,
      userId: suspension.userId,
      suspendedBy: suspension.suspendedBy,
      reason: suspension.reason,
      expiresAt: suspension.expiresAt,
      liftedAt: suspension.liftedAt,
      liftedBy: suspension.liftedBy,
      suspendedAt: suspension.suspendedAt,
      user: suspension.user
        ? {
            id: suspension.user.id,
            email: suspension.user.email,
            status: suspension.user.status,
          }
        : undefined,
      suspender: suspension.suspender
        ? {
            id: suspension.suspender.id,
            email: suspension.suspender.email,
          }
        : undefined,
      lifter: suspension.lifter
        ? {
            id: suspension.lifter.id,
            email: suspension.lifter.email,
          }
        : null,
    };
  }
}
