/**
 * Request Validation Utilities
 *
 * Common Zod schemas and validation helpers for request validation.
 * Provides reusable schemas for:
 * - Email validation
 * - URL validation
 * - UUID validation
 * - Pagination
 * - Input sanitization
 *
 * Usage:
 * import { validateRequest } from './middleware/error.middleware';
 * import { emailSchema, paginationSchema } from './utils/validators';
 *
 * app.post('/endpoint', validateRequest('body', emailSchema), handler);
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { z } from 'zod';

// ===== Common Field Validators =====

/**
 * Email validation schema
 * Validates email format and normalizes to lowercase
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()
  .max(255, 'Email must be less than 255 characters');

/**
 * URL validation schema
 * Validates HTTP/HTTPS URLs
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://');

/**
 * UUID validation schema
 * Validates UUID v4 format
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Non-empty string schema
 * Validates non-empty strings with trimming
 */
export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, 'Field cannot be empty');

/**
 * Username schema
 * Alphanumeric with underscores, 3-30 characters
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Password schema
 * Minimum 8 characters, requires letter and number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Name schema (first name, last name)
 * Letters, spaces, hyphens, apostrophes only
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name cannot be empty')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

/**
 * Phone number schema (international format)
 * Optional, but must be valid if provided
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (use international format: +1234567890)')
  .optional();

// ===== Pagination Schemas =====

/**
 * Pagination query parameters schema
 * Standard limit/offset pagination
 */
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
});

/**
 * Cursor-based pagination schema
 * For more efficient pagination on large datasets
 */
export const cursorPaginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
  cursor: z.string().optional(),
});

// ===== Date/Time Schemas =====

/**
 * ISO date string schema
 * Validates ISO 8601 date format
 */
export const isoDateSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 date format' });

/**
 * Date range schema
 * Validates start_date and end_date query parameters
 */
export const dateRangeSchema = z.object({
  start_date: isoDateSchema.optional(),
  end_date: isoDateSchema.optional(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  { message: 'start_date must be before or equal to end_date' }
);

// ===== Model & Inference Schemas =====

/**
 * Model ID schema
 * Validates model identifier format
 */
export const modelIdSchema = z
  .string()
  .min(1, 'Model ID cannot be empty')
  .max(100, 'Model ID must be less than 100 characters')
  .regex(/^[a-z0-9-_.]+$/, 'Model ID can only contain lowercase letters, numbers, hyphens, underscores, and dots');

/**
 * Temperature schema (LLM parameter)
 * 0.0 to 2.0
 */
export const temperatureSchema = z
  .number()
  .min(0, 'Temperature must be at least 0')
  .max(2, 'Temperature must be at most 2');

/**
 * Max tokens schema (LLM parameter)
 * 1 to 100,000
 */
export const maxTokensSchema = z
  .number()
  .int('Max tokens must be an integer')
  .min(1, 'Max tokens must be at least 1')
  .max(100000, 'Max tokens must be at most 100,000');

/**
 * Text completion request schema
 */
export const completionRequestSchema = z.object({
  model: modelIdSchema,
  prompt: z.string().min(1, 'Prompt cannot be empty').max(100000, 'Prompt too long'),
  max_tokens: maxTokensSchema.optional().default(1000),
  temperature: temperatureSchema.optional().default(0.7),
  stream: z.boolean().optional().default(false),
});

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant'], {
    errorMap: () => ({ message: 'Role must be system, user, or assistant' }),
  }),
  content: z.string().min(1, 'Message content cannot be empty'),
});

/**
 * Chat completion request schema
 */
export const chatCompletionRequestSchema = z.object({
  model: modelIdSchema,
  messages: z
    .array(chatMessageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages (max 100)'),
  max_tokens: maxTokensSchema.optional().default(1000),
  temperature: temperatureSchema.optional().default(0.7),
  stream: z.boolean().optional().default(false),
});

// ===== Subscription Schemas =====

/**
 * Subscription tier schema
 */
export const subscriptionTierSchema = z.enum(['free', 'pro', 'enterprise'], {
  errorMap: () => ({ message: 'Tier must be free, pro, or enterprise' }),
});

/**
 * Billing interval schema
 */
export const billingIntervalSchema = z.enum(['monthly', 'yearly'], {
  errorMap: () => ({ message: 'Billing interval must be monthly or yearly' }),
});

/**
 * Create subscription request schema
 */
export const createSubscriptionSchema = z.object({
  plan_id: subscriptionTierSchema,
  billing_interval: billingIntervalSchema,
  payment_method_id: z.string().min(1, 'Payment method ID is required'),
});

/**
 * Update subscription request schema
 */
export const updateSubscriptionSchema = z.object({
  plan_id: subscriptionTierSchema.optional(),
  billing_interval: billingIntervalSchema.optional(),
}).refine(
  (data) => data.plan_id || data.billing_interval,
  { message: 'At least one field must be provided for update' }
);

/**
 * Cancel subscription request schema
 */
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  cancel_at_period_end: z.boolean().default(true),
});

// ===== User Schemas =====

/**
 * Update user profile schema
 */
export const updateUserProfileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  username: usernameSchema.optional(),
  profile_picture_url: urlSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  default_model_id: modelIdSchema.optional(),
  enable_streaming: z.boolean().optional(),
  max_tokens: maxTokensSchema.optional(),
  temperature: temperatureSchema.optional(),
  preferences_metadata: z.record(z.any()).optional(),
});

/**
 * Set default model schema
 */
export const setDefaultModelSchema = z.object({
  model_id: modelIdSchema,
});

// ===== Usage & Analytics Schemas =====

/**
 * Usage operation type schema
 */
export const usageOperationSchema = z.enum(['completion', 'chat', 'embedding', 'function_call'], {
  errorMap: () => ({ message: 'Operation must be completion, chat, embedding, or function_call' }),
});

/**
 * Usage query schema
 */
export const usageQuerySchema = z.object({
  start_date: isoDateSchema.optional(),
  end_date: isoDateSchema.optional(),
  model_id: modelIdSchema.optional(),
  operation: usageOperationSchema.optional(),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  { message: 'start_date must be before or equal to end_date' }
);

/**
 * Usage statistics query schema
 */
export const usageStatsQuerySchema = z.object({
  start_date: isoDateSchema.optional(),
  end_date: isoDateSchema.optional(),
  group_by: z.enum(['day', 'hour', 'model'], {
    errorMap: () => ({ message: 'group_by must be day, hour, or model' }),
  }).optional().default('day'),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  { message: 'start_date must be before or equal to end_date' }
);

// ===== Input Sanitization Helpers =====

/**
 * Sanitize HTML string
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - replace dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize SQL input
 * Escapes single quotes to prevent SQL injection
 * Note: Use parameterized queries instead whenever possible
 */
export function sanitizeSql(input: string): string {
  return input.replace(/'/g, "''");
}

/**
 * Strip dangerous characters from filename
 * Allows only alphanumeric, underscores, hyphens, and dots
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .substring(0, 255); // Limit length
}

/**
 * Validate and sanitize URL
 * Ensures URL is safe and well-formed
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

// ===== Validation Error Formatter =====

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return errors;
}

// ===== Common Validation Middleware Factories =====

/**
 * Create validation middleware for query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Query parameter validation failed',
            details: formatValidationErrors(error),
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create validation middleware for request body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Request body validation failed',
            details: formatValidationErrors(error),
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create validation middleware for route parameters
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          error: {
            code: 'validation_error',
            message: 'Route parameter validation failed',
            details: formatValidationErrors(error),
          },
        });
      } else {
        next(error);
      }
    }
  };
}
