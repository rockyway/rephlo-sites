import { inject, injectable } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Model Version History Service
 *
 * Tracks all changes to models for audit trail and rollback capability.
 * Creates snapshots of model state before/after each change.
 */
@injectable()
export class ModelVersionHistoryService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Create a version history entry
   *
   * @param data - Version history data
   * @returns Created version history entry
   */
  async createVersionEntry(data: {
    model_id: string;
    changed_by: string;
    change_type: 'update' | 'legacy_mark' | 'legacy_unmark' | 'archive' | 'unarchive' | 'tier_change';
    change_reason?: string;
    previous_state: any;
    new_state: any;
    ip_address?: string;
    user_agent?: string;
  }) {
    logger.debug('ModelVersionHistoryService: Creating version entry', {
      model_id: data.model_id,
      change_type: data.change_type,
    });

    try {
      // Get the next version number for this model
      const lastVersion = await this.prisma.model_version_history.findFirst({
        where: { model_id: data.model_id },
        orderBy: { version_number: 'desc' },
        select: { version_number: true },
      });

      const version_number = (lastVersion?.version_number ?? 0) + 1;

      // Calculate changes summary (diff between previous and new state)
      const changes_summary = this.calculateChangesSummary(
        data.previous_state,
        data.new_state
      );

      // Create version history entry
      const versionEntry = await this.prisma.model_version_history.create({
        data: {
          model_id: data.model_id,
          version_number,
          changed_by: data.changed_by,
          change_type: data.change_type,
          change_reason: data.change_reason,
          previous_state: data.previous_state,
          new_state: data.new_state,
          changes_summary,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
        },
      });

      logger.info('ModelVersionHistoryService: Version entry created', {
        id: versionEntry.id,
        model_id: data.model_id,
        version_number,
        change_type: data.change_type,
      });

      return versionEntry;
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error creating version entry', {
        model_id: data.model_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get version history for a model
   *
   * @param model_id - Model ID
   * @param options - Query options
   * @returns Version history entries
   */
  async getModelHistory(
    model_id: string,
    options?: {
      limit?: number;
      offset?: number;
      change_type?: string;
    }
  ) {
    logger.debug('ModelVersionHistoryService: Getting model history', {
      model_id,
      options,
    });

    try {
      const where: any = { model_id };
      if (options?.change_type) {
        where.change_type = options.change_type;
      }

      const [history, total] = await Promise.all([
        this.prisma.model_version_history.findMany({
          where,
          orderBy: { version_number: 'desc' },
          take: options?.limit ?? 50,
          skip: options?.offset ?? 0,
          include: {
            admin: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        }),
        this.prisma.model_version_history.count({ where }),
      ]);

      logger.debug('ModelVersionHistoryService: Retrieved model history', {
        model_id,
        count: history.length,
        total,
      });

      return {
        history,
        total,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      };
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error getting model history', {
        model_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a specific version entry
   *
   * @param model_id - Model ID
   * @param version_number - Version number
   * @returns Version history entry
   */
  async getVersionByNumber(model_id: string, version_number: number) {
    logger.debug('ModelVersionHistoryService: Getting version by number', {
      model_id,
      version_number,
    });

    try {
      const versionEntry = await this.prisma.model_version_history.findUnique({
        where: {
          model_id_version_number: {
            model_id,
            version_number,
          },
        },
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      if (!versionEntry) {
        throw new Error(
          `Version ${version_number} not found for model '${model_id}'`
        );
      }

      return versionEntry;
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error getting version by number', {
        model_id,
        version_number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get the latest version number for a model
   *
   * @param model_id - Model ID
   * @returns Latest version number
   */
  async getLatestVersionNumber(model_id: string): Promise<number> {
    const lastVersion = await this.prisma.model_version_history.findFirst({
      where: { model_id },
      orderBy: { version_number: 'desc' },
      select: { version_number: true },
    });

    return lastVersion?.version_number ?? 0;
  }

  /**
   * Calculate changes summary (diff between two states)
   *
   * @param previous - Previous state
   * @param current - Current state
   * @returns Changes summary object
   */
  private calculateChangesSummary(previous: any, current: any): any {
    const changes: any = {};

    // Compare top-level fields
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of allKeys) {
      const oldValue = previous[key];
      const newValue = current[key];

      // Deep comparison for objects and arrays
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    }

    return changes;
  }

  /**
   * Compare two versions and get detailed diff
   *
   * @param model_id - Model ID
   * @param from_version - From version number
   * @param to_version - To version number
   * @returns Detailed diff between versions
   */
  async compareVersions(
    model_id: string,
    from_version: number,
    to_version: number
  ) {
    logger.debug('ModelVersionHistoryService: Comparing versions', {
      model_id,
      from_version,
      to_version,
    });

    try {
      const [fromEntry, toEntry] = await Promise.all([
        this.getVersionByNumber(model_id, from_version),
        this.getVersionByNumber(model_id, to_version),
      ]);

      const diff = this.calculateChangesSummary(
        fromEntry.new_state,
        toEntry.new_state
      );

      return {
        from_version,
        to_version,
        from_timestamp: fromEntry.created_at,
        to_timestamp: toEntry.created_at,
        diff,
      };
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error comparing versions', {
        model_id,
        from_version,
        to_version,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get changes by admin user
   *
   * @param admin_user_id - Admin user ID
   * @param options - Query options
   * @returns Version history entries
   */
  async getChangesByAdmin(
    admin_user_id: string,
    options?: {
      limit?: number;
      offset?: number;
      start_date?: Date;
      end_date?: Date;
    }
  ) {
    logger.debug('ModelVersionHistoryService: Getting changes by admin', {
      admin_user_id,
      options,
    });

    try {
      const where: any = { changed_by: admin_user_id };

      if (options?.start_date || options?.end_date) {
        where.created_at = {};
        if (options.start_date) {
          where.created_at.gte = options.start_date;
        }
        if (options.end_date) {
          where.created_at.lte = options.end_date;
        }
      }

      const [history, total] = await Promise.all([
        this.prisma.model_version_history.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: options?.limit ?? 50,
          skip: options?.offset ?? 0,
          include: {
            model: {
              select: {
                id: true,
                name: true,
                provider: true,
              },
            },
          },
        }),
        this.prisma.model_version_history.count({ where }),
      ]);

      logger.debug('ModelVersionHistoryService: Retrieved changes by admin', {
        admin_user_id,
        count: history.length,
        total,
      });

      return {
        history,
        total,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      };
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error getting changes by admin', {
        admin_user_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get statistics about model changes
   *
   * @param model_id - Model ID
   * @returns Statistics object
   */
  async getModelChangeStats(model_id: string) {
    logger.debug('ModelVersionHistoryService: Getting model change stats', {
      model_id,
    });

    try {
      const [total, byType, recentChanges] = await Promise.all([
        this.prisma.model_version_history.count({ where: { model_id } }),
        this.prisma.model_version_history.groupBy({
          by: ['change_type'],
          where: { model_id },
          _count: true,
        }),
        this.prisma.model_version_history.findMany({
          where: { model_id },
          orderBy: { created_at: 'desc' },
          take: 10,
          select: {
            version_number: true,
            change_type: true,
            created_at: true,
            admin: {
              select: {
                email: true,
              },
            },
          },
        }),
      ]);

      const changesByType: Record<string, number> = {};
      for (const item of byType) {
        changesByType[item.change_type] = item._count;
      }

      return {
        total_changes: total,
        changes_by_type: changesByType,
        recent_changes: recentChanges,
      };
    } catch (error) {
      logger.error('ModelVersionHistoryService: Error getting model change stats', {
        model_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
