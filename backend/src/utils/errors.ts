/**
 * Custom Error Classes
 *
 * Provides typed error classes for different error scenarios.
 * Allows better error handling and appropriate HTTP status codes.
 */

/**
 * Base API Error
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * File Too Large Error (413)
 */
export class FileTooLargeError extends ApiError {
  constructor(message: string = 'File size exceeds limit') {
    super(message, 413);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Unsupported Media Type Error (415)
 */
export class UnsupportedMediaTypeError extends ApiError {
  constructor(message: string = 'Unsupported file type') {
    super(message, 415);
    this.name = 'UnsupportedMediaTypeError';
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Check if error is an instance of ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
