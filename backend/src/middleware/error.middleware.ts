/**
 * Centralized Error Handling Middleware
 *
 * Handles all errors in the Express application with standardized error responses.
 * Provides different error details based on environment (development vs. production).
 *
 * Error Response Format (matching specification):
 * {
 *   "error": {
 *     "code": "error_code",
 *     "message": "Human-readable error message",
 *     "details": { ... }  // Optional, environment-dependent
 *   }
 * }
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Standard error interface for API errors
 */
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
  isOperational?: boolean; // Differentiates expected errors from bugs
}

/**
 * HTTP Status Code to Error Code mapping
 */
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limit_exceeded',
  500: 'internal_server_error',
  503: 'service_unavailable',
};

/**
 * Create an API error with standard format
 */
export const createApiError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, any>
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code || STATUS_CODE_MAP[statusCode] || 'unknown_error';
  error.details = details;
  error.isOperational = true;

  return error;
};

/**
 * Not Found (404) error creator
 */
export const notFoundError = (resource: string = 'Resource'): ApiError => {
  return createApiError(`${resource} not found`, 404, 'not_found');
};

/**
 * Validation error creator
 */
export const validationError = (message: string, details?: Record<string, any>): ApiError => {
  return createApiError(message, 422, 'validation_error', details);
};

/**
 * Unauthorized error creator
 */
export const unauthorizedError = (message: string = 'Missing or invalid access token'): ApiError => {
  return createApiError(message, 401, 'unauthorized');
};

/**
 * Forbidden error creator
 */
export const forbiddenError = (message: string = 'Insufficient permissions', details?: Record<string, any>): ApiError => {
  return createApiError(message, 403, 'forbidden', details);
};

/**
 * Bad request error creator
 */
export const badRequestError = (message: string = 'Invalid request', details?: Record<string, any>): ApiError => {
  return createApiError(message, 400, 'invalid_request', details);
};

/**
 * Rate limit error creator
 */
export const rateLimitError = (message: string = 'Rate limit exceeded. Please try again later.'): ApiError => {
  return createApiError(message, 429, 'rate_limit_exceeded');
};

/**
 * Insufficient credits error creator
 */
export const insufficientCreditsError = (required: number, available: number): ApiError => {
  return createApiError(
    'You do not have enough credits to complete this request',
    403,
    'insufficient_credits',
    { required_credits: required, available_credits: available }
  );
};

/**
 * Conflict error creator
 */
export const conflictError = (message: string, details?: Record<string, any>): ApiError => {
  return createApiError(message, 409, 'conflict', details);
};

/**
 * Service unavailable error creator
 */
export const serviceUnavailableError = (message: string = 'Service temporarily unavailable'): ApiError => {
  return createApiError(message, 503, 'service_unavailable');
};

/**
 * Main error handling middleware
 *
 * IMPORTANT: This must be the last middleware in the chain
 * Place after all routes and other middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 Internal Server Error if not specified
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || STATUS_CODE_MAP[statusCode] || 'internal_server_error';

  // Log the error
  if (statusCode >= 500) {
    // Server errors - log with full details
    logger.error('Server Error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message: err.message,
      stack: err.stack,
      userId: (req as any).user?.id, // Attach user ID if available from auth middleware
    });
  } else if (statusCode >= 400) {
    // Client errors - log as warnings
    logger.warn('Client Error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message: err.message,
      userId: (req as any).user?.id,
    });
  }

  // Prepare error response
  const errorResponse: any = {
    error: {
      code: errorCode,
      message: err.message,
    },
  };

  // In development, include additional details
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;

    if (err.details) {
      errorResponse.error.details = err.details;
    }
  } else {
    // In production, only include details for operational errors
    if (err.isOperational && err.details) {
      errorResponse.error.details = err.details;
    }

    // Hide internal error messages in production
    if (statusCode >= 500 && !err.isOperational) {
      errorResponse.error.message = 'Internal server error';
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for undefined routes
 *
 * Place this BEFORE the error handler but AFTER all valid routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = createApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'not_found'
  );

  next(error);
};

/**
 * Async error wrapper for route handlers
 *
 * Wraps async route handlers to catch promise rejections
 * and pass them to the error middleware
 *
 * Usage:
 * app.get('/route', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validation middleware creator
 *
 * Validates request body/query/params against a Zod schema
 * and returns a 422 Validation Error if validation fails
 *
 * Usage:
 * import { z } from 'zod';
 * const schema = z.object({ email: z.string().email() });
 * app.post('/route', validateRequest('body', schema), handler);
 */
import { z } from 'zod';

export const validateRequest = (
  target: 'body' | 'query' | 'params',
  schema: z.ZodSchema
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>);

        next(validationError('Request validation failed', details));
      } else {
        next(error);
      }
    }
  };
};

export default errorHandler;
