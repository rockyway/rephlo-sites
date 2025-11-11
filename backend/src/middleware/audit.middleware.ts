/**
 * Audit Logging Middleware
 *
 * Automatically captures admin actions for SOC 2 Type II and GDPR Article 30 compliance.
 * Logs admin operations asynchronously after response is sent (non-blocking).
 *
 * Usage:
 *   router.post('/admin/users/:id/ban',
 *     authMiddleware,
 *     requireAdmin,
 *     auditLog({ action: 'delete', resourceType: 'user', captureRequestBody: true }),
 *     asyncHandler(userController.banUser)
 *   );
 *
 * @module middleware/audit.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AuditLogService } from '../services/audit-log.service';
import logger from '../utils/logger';

export interface AuditOptions {
  action: 'create' | 'update' | 'delete' | 'read';
  resourceType: string;
  captureRequestBody?: boolean;
  capturePreviousValue?: boolean;
}

/**
 * Audit logging middleware for admin actions
 *
 * This middleware intercepts the response to capture the result status
 * and logs the action asynchronously after the response is sent to the client.
 *
 * IMPORTANT: This middleware must be placed AFTER authMiddleware and requireAdmin
 * to ensure req.user is populated.
 *
 * @param options - Configuration for audit logging
 * @returns Express middleware function
 */
export function auditLog(options: AuditOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auditService = container.resolve(AuditLogService);

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // Override res.json to capture response data
    res.json = function (body: any) {
      // Log after response is sent (async, non-blocking)
      // Using setImmediate ensures this runs after the response is sent
      setImmediate(async () => {
        try {
          // Extract admin user ID from request
          const adminUserId = (req as any).user?.id || (req as any).user?.sub || 'unknown';

          // Extract resource ID from URL params or response body
          const resourceId = req.params.id || body?.data?.id;

          // Capture request body if specified (sanitize sensitive data)
          const requestBody = options.captureRequestBody
            ? sanitizeRequestBody(req.body)
            : undefined;

          // Capture previous value if set by controller
          const previousValue = options.capturePreviousValue
            ? (req as any).previousValue
            : undefined;

          // Capture new value from response
          const newValue = body?.data;

          // Extract error message if present
          const errorMessage = body?.error?.message;

          // Log the audit entry
          await auditService.log({
            adminUserId,
            action: options.action,
            resourceType: options.resourceType,
            resourceId,
            endpoint: req.route?.path || req.path,
            method: req.method,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestBody,
            previousValue,
            newValue,
            statusCode: res.statusCode,
            errorMessage
          });
        } catch (error) {
          // Log error but don't throw - audit logging must not break the app
          logger.error('[AuditMiddleware] Failed to create audit log', {
            error: error instanceof Error ? error.message : String(error),
            endpoint: req.path,
            method: req.method
          });
        }
      });

      // Return the original response
      return originalJson(body);
    };

    next();
  };
}

/**
 * Sanitize request body to remove sensitive information
 *
 * Removes passwords, API keys, tokens, and other sensitive data
 * before storing in audit logs.
 *
 * @param body - Request body to sanitize
 * @returns Sanitized request body
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'secret',
    'clientSecret',
    'client_secret',
    'privateKey',
    'private_key'
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
