/**
 * Audit Log Controller
 *
 * Provides admin endpoints for viewing and querying audit logs.
 * Used for compliance reporting and security monitoring.
 *
 * @module controllers/audit-log.controller
 */

import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { AuditLogService } from '../services/audit-log.service';
import logger from '../utils/logger';

@injectable()
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * GET /admin/audit-logs
   * Retrieve audit logs with pagination and filtering
   *
   * Query parameters:
   * - adminUserId (optional): Filter by admin user ID
   * - resourceType (optional): Filter by resource type
   * - action (optional): Filter by action (create/update/delete/read)
   * - startDate (optional): Filter by start date (ISO 8601)
   * - endDate (optional): Filter by end date (ISO 8601)
   * - limit (optional): Number of results per page (default: 100)
   * - offset (optional): Pagination offset (default: 0)
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        adminUserId: req.query.adminUserId as string,
        resourceType: req.query.resourceType as string,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0
      };

      const [logs, total] = await Promise.all([
        this.auditLogService.getLogs(filters),
        this.auditLogService.getLogCount(filters)
      ]);

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: filters.offset + logs.length < total
        }
      });
    } catch (error) {
      logger.error('[AuditLogController] Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve audit logs'
        }
      });
    }
  }

  /**
   * GET /admin/audit-logs/resource/:resourceType/:resourceId
   * Get audit logs for a specific resource
   *
   * Path parameters:
   * - resourceType: Type of resource (subscription, license, coupon, etc.)
   * - resourceId: ID of the resource
   *
   * Query parameters:
   * - limit (optional): Number of results (default: 50)
   */
  async getLogsForResource(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const logs = await this.auditLogService.getLogsForResource(
        resourceType,
        resourceId,
        limit
      );

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          resource_type: resourceType,
          resource_id: resourceId,
          count: logs.length
        }
      });
    } catch (error) {
      logger.error('[AuditLogController] Get resource logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve resource audit logs'
        }
      });
    }
  }

  /**
   * GET /admin/audit-logs/admin/:adminUserId
   * Get audit logs for a specific admin user
   *
   * Path parameters:
   * - adminUserId: ID of the admin user
   *
   * Query parameters:
   * - limit (optional): Number of results (default: 100)
   */
  async getLogsForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { adminUserId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const logs = await this.auditLogService.getLogsForAdmin(
        adminUserId,
        limit
      );

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          admin_user_id: adminUserId,
          count: logs.length
        }
      });
    } catch (error) {
      logger.error('[AuditLogController] Get admin logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve admin audit logs'
        }
      });
    }
  }
}
