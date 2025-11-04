/**
 * Zod Validation Schemas
 *
 * Contains all validation schemas for API request bodies.
 * Ensures type safety and proper validation of incoming data.
 */

import { z } from 'zod';

/**
 * Download Tracking Schema
 *
 * Validates POST /api/track-download requests
 * Required fields:
 * - os: One of "windows", "macos", or "linux"
 */
export const trackDownloadSchema = z.object({
  os: z.enum(['windows', 'macos', 'linux'], {
    errorMap: () => ({ message: 'OS must be one of: windows, macos, linux' }),
  }),
});

export type TrackDownloadInput = z.infer<typeof trackDownloadSchema>;

/**
 * Feedback Submission Schema
 *
 * Validates POST /api/feedback requests
 * Required fields:
 * - message: String between 1-1000 characters
 * Optional fields:
 * - email: Valid email format
 * - userId: String identifier
 */
export const feedbackSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(1000, 'Message must be 1000 characters or less'),
  email: z.string()
    .email('Invalid email format')
    .optional(),
  userId: z.string().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

/**
 * Diagnostic Upload Schema
 *
 * Validates file uploads for POST /api/diagnostics
 * Constraints:
 * - Max file size: 5MB (5242880 bytes)
 * - Allowed types: .json, .log, .txt, .zip
 */
export const DIAGNOSTIC_MAX_FILE_SIZE = 5242880; // 5MB in bytes
export const DIAGNOSTIC_ALLOWED_TYPES = [
  'application/json',
  'text/plain',
  'text/x-log',
  'application/x-log',
  'application/zip',
  'application/x-zip-compressed',
];

export const DIAGNOSTIC_ALLOWED_EXTENSIONS = ['.json', '.log', '.txt', '.zip'];

/**
 * Validates diagnostic file upload
 * @param file - Multer file object
 * @returns Validation result with error message if invalid
 */
export function validateDiagnosticFile(file: Express.Multer.File | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  // Check file size
  if (file.size > DIAGNOSTIC_MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit (${file.size} bytes)`,
    };
  }

  // Check file extension
  const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!DIAGNOSTIC_ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${DIAGNOSTIC_ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Version Query Schema (no validation needed, GET endpoint)
 */
export const versionQuerySchema = z.object({}).strict();

/**
 * Admin Metrics Query Schema (no validation needed for now)
 */
export const adminMetricsQuerySchema = z.object({}).strict();
