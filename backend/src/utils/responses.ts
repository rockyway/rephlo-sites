/**
 * Standard API Response Formatter
 *
 * Provides consistent response format across all API endpoints.
 * Modern format: { status: 'success', data: T, meta?: PaginationMeta }
 * Legacy format: { success: boolean, data?: any, error?: string }
 */

import { Response } from 'express';

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Send success response
 * @param res - Express response object
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send error response
 * @param res - Express response object
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 400)
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 400
): Response {
  return res.status(statusCode).json({
    success: false,
    error,
  });
}

/**
 * Send validation error response
 * @param res - Express response object
 * @param errors - Validation error messages
 */
export function sendValidationError(
  res: Response,
  errors: string[]
): Response {
  return res.status(400).json({
    success: false,
    error: `Validation failed: ${errors.join(', ')}`,
  });
}

/**
 * Send server error response
 * @param res - Express response object
 * @param error - Error object
 * @param isDev - Whether in development mode
 */
export function sendServerError(
  res: Response,
  error: Error,
  isDev: boolean = process.env.NODE_ENV === 'development'
): Response {
  console.error('Server error:', error);

  return res.status(500).json({
    success: false,
    error: isDev ? error.message : 'Internal server error',
  });
}

// ========================================
// Modern API Response Format (Phase 2)
// ========================================

/**
 * Create a modern success response object (without sending)
 * Format: { status: 'success', data: T, meta?: PaginationMeta }
 *
 * @param data - Response data
 * @param meta - Optional pagination metadata
 * @returns Response object
 */
export const successResponse = <T>(data: T, meta?: PaginationMeta) => ({
  status: 'success' as const,
  data,
  ...(meta && { meta })
});

/**
 * Create a modern paginated response object
 * Format: { status: 'success', data: T[], meta: PaginationMeta }
 *
 * @param items - Array of items
 * @param total - Total count of items
 * @param page - Current page number (0-indexed)
 * @param limit - Items per page
 * @returns Response object with pagination metadata
 */
export const paginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) => ({
  status: 'success' as const,
  data: items,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit + items.length < total
  }
});

/**
 * Send modern success response
 * @param res - Express response object
 * @param data - Response data
 * @param meta - Optional pagination metadata
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendModernSuccess<T>(
  res: Response,
  data: T,
  meta?: PaginationMeta,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json(successResponse(data, meta));
}

/**
 * Send modern paginated response
 * @param res - Express response object
 * @param items - Array of items
 * @param total - Total count of items
 * @param page - Current page number (0-indexed)
 * @param limit - Items per page
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendPaginatedResponse<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json(paginatedResponse(items, total, page, limit));
}
