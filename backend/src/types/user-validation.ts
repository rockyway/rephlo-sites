/**
 * User Management Validation Schemas
 *
 * Zod schemas for validating user profile and preferences requests.
 * These schemas ensure type safety and data integrity for user management operations.
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (User APIs)
 */

import { z } from 'zod';

// =============================================================================
// Profile Update Schema
// =============================================================================

/**
 * Username validation rules:
 * - 3-30 characters
 * - Alphanumeric, underscore, and hyphen only
 * - Must start with alphanumeric
 */
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    'Username must start with alphanumeric and contain only letters, numbers, underscores, and hyphens'
  )
  .optional();

/**
 * Schema for updating user profile
 * All fields are optional - only provided fields will be updated
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must be at most 100 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name must be at most 100 characters')
    .optional(),
  username: usernameSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// =============================================================================
// Preferences Update Schema
// =============================================================================

/**
 * Schema for updating user preferences
 * All fields are optional - only provided fields will be updated
 */
export const updatePreferencesSchema = z.object({
  enableStreaming: z.boolean().optional(),
  maxTokens: z
    .number()
    .int('Max tokens must be an integer')
    .min(1, 'Max tokens must be at least 1')
    .max(200000, 'Max tokens cannot exceed 200000')
    .optional(),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature cannot exceed 2')
    .optional(),
  preferencesMetadata: z.record(z.any()).optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// =============================================================================
// Default Model Schema
// =============================================================================

/**
 * Schema for setting default model
 * Model ID is required
 */
export const setDefaultModelSchema = z.object({
  modelId: z
    .string()
    .min(1, 'Model ID is required')
    .max(100, 'Model ID must be at most 100 characters'),
});

export type SetDefaultModelInput = z.infer<typeof setDefaultModelSchema>;

// =============================================================================
// Response Types (for TypeScript type safety)
// =============================================================================

/**
 * User profile response type
 * Matches API specification format
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * User preferences response type
 * Matches API specification format
 */
export interface UserPreferencesResponse {
  defaultModelId: string | null;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
  preferencesMetadata: Record<string, any> | null;
}

/**
 * Default model response type
 * Matches API specification format
 */
export interface DefaultModelResponse {
  defaultModelId: string | null;
  model: {
    id: string;
    name: string;
    capabilities: string[];
  } | null;
}

/**
 * Update response type (for profile and preferences)
 * Generic response with updated_at timestamp
 */
export interface UpdateResponse {
  updatedAt: string;
}
