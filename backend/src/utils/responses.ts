/**
 * Standard API Response Formatter
 *
 * Provides consistent response format across all API endpoints.
 * All responses follow the pattern: { success: boolean, data?: any, error?: string }
 */

import { Response } from 'express';

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
