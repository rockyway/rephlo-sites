/**
 * Shared API Response Types
 * Standardized response wrappers for all API endpoints
 */

import { z } from 'zod';

/**
 * Standard API Response Wrapper
 * All API endpoints should return this structure for consistency
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  pagination?: PaginationData;
}

/**
 * API Error Structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string; // For validation errors
}

/**
 * Pagination Data
 * Consistent pagination metadata across all list endpoints
 */
export interface PaginationData {
  page: number; // Current page (0-indexed)
  limit: number; // Items per page (also called page_size)
  total: number; // Total items across all pages
  totalPages: number; // Total number of pages
}

/**
 * Pagination Query Parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Zod Schemas
export const PaginationDataSchema = z.object({
  page: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Helper function to create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: PaginationData
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination,
  };
}

/**
 * Helper function to create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  field?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      field,
    },
  };
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
