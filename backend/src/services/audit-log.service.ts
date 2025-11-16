/**
 * Audit Log Service
 *
 * Provides comprehensive audit logging functionality for all admin operations.
 * Implements SOC 2 Type II and GDPR Article 30 compliance requirements.
 *
 * Key Features:
 * - Non-blocking audit logging (never throws errors that break the app)
 * - Async operation (logs after response sent)
 * - Complete audit trail with before/after states
 * - Query capabilities for compliance reporting
 *
 * @module services/audit-log.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, admin_audit_log as AdminAuditLog } from '@prisma/client';
import logger from '../utils/logger';

export interface AuditLogEntry {
  adminUserId: string;
  action: 'create' | 'update' | 'delete' | 'read';
  resourceType: string;
  resourceId?: string;
  endpoint: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: any;
  previousValue?: any;
  newValue?: any;
  statusCode: number;
  errorMessage?: string;
}

export interface AuditLogFilters {
  adminUserId?: string;
  resourceType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@injectable()
export class AuditLogService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Create an audit log entry
   *
   * IMPORTANT: This method never throws errors. Audit logging failures
   * are logged but do not break the application flow.
   *
   * @param entry - Audit log entry data
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          admin_user_id: entry.adminUserId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          endpoint: entry.endpoint,
          method: entry.method,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          request_body: entry.requestBody || null,
          previous_value: entry.previousValue || null,
          new_value: entry.newValue || null,
          status_code: entry.statusCode,
          error_message: entry.errorMessage,
          timestamp: new Date()
        }
      });

      logger.info('[AuditLogService] Audit log created', {
        adminUserId: entry.adminUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
      });
    } catch (error) {
      // CRITICAL: Never throw - audit logging must not break the app
      logger.error('[AuditLogService] Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        entry,
      });
    }
  }

  /**
   * Retrieve audit logs with optional filters
   *
   * @param filters - Query filters for audit logs
   * @returns Array of audit log entries with admin user details
   */
  async getLogs(filters: AuditLogFilters): Promise<AdminAuditLog[]> {
    return this.prisma.adminAuditLog.findMany({
      where: {
        admin_user_id: filters.adminUserId,
        resource_type: filters.resourceType,
        action: filters.action,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        admin_user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Get total count of audit logs matching filters
   *
   * Used for pagination in the admin UI.
   *
   * @param filters - Query filters (without limit/offset)
   * @returns Total count of matching audit logs
   */
  async getLogCount(filters: Omit<AuditLogFilters, 'limit' | 'offset'>): Promise<number> {
    return this.prisma.adminAuditLog.count({
      where: {
        admin_user_id: filters.adminUserId,
        resource_type: filters.resourceType,
        action: filters.action,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
    });
  }

  /**
   * Get audit logs for a specific resource
   *
   * Useful for viewing the complete history of changes to a resource.
   *
   * @param resourceType - Type of resource (e.g., 'subscription', 'user')
   * @param resourceId - ID of the resource
   * @param limit - Maximum number of logs to return
   * @returns Array of audit log entries
   */
  async getLogsForResource(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AdminAuditLog[]> {
    return this.prisma.adminAuditLog.findMany({
      where: {
        resource_type: resourceType,
        resource_id: resourceId
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        admin_user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Get recent audit logs for an admin user
   *
   * Useful for admin activity monitoring and security audits.
   *
   * @param adminUserId - ID of the admin user
   * @param limit - Maximum number of logs to return
   * @returns Array of audit log entries
   */
  async getLogsForAdmin(
    adminUserId: string,
    limit: number = 100
  ): Promise<AdminAuditLog[]> {
    return this.prisma.adminAuditLog.findMany({
      where: {
        admin_user_id: adminUserId
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}
