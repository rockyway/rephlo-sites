/**
 * Tspec API Specification - Branding Endpoints
 *
 * This file defines the OpenAPI spec for branding and user-facing endpoints using Tspec.
 * Most endpoints are public (no authentication required) except diagnostics (admin only).
 *
 * Endpoints:
 * - POST /api/track-download - Track download events with OS and metadata
 * - POST /api/feedback - Submit user feedback
 * - GET /api/version - Get latest app version metadata
 * - POST /api/diagnostics - Upload diagnostic files (admin only)
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// POST /api/track-download - Track Download Event
// =============================================================================

/**
 * Track Download Request Body
 */
export interface TrackDownloadRequest {
  /**
   * Operating system
   * Must be one of: windows, macos, linux
   */
  os: 'windows' | 'macos' | 'linux';
}

/**
 * Track Download Success Response
 */
export interface TrackDownloadResponse {
  /** Operation success flag */
  success: boolean;
  /** Download tracking data */
  data: {
    /** Download URL for the specified OS */
    downloadUrl: string;
    /** Unique download tracking ID */
    downloadId: string;
  };
}

// =============================================================================
// POST /api/feedback - Submit User Feedback
// =============================================================================

/**
 * Submit Feedback Request Body
 */
export interface SubmitFeedbackRequest {
  /**
   * Feedback message (1-1000 characters)
   * Required field
   */
  message: string;
  /**
   * Optional email for follow-up
   * Must be valid email format
   */
  email?: string;
  /**
   * Optional user ID
   * For authenticated users
   */
  userId?: string;
}

/**
 * Submit Feedback Success Response
 */
export interface SubmitFeedbackResponse {
  /** Operation success flag */
  success: boolean;
  /** Feedback submission data */
  data: {
    /** Unique feedback ID */
    feedbackId: string;
  };
}

// =============================================================================
// GET /api/version - Get Latest App Version
// =============================================================================

/**
 * Get Version Success Response
 */
export interface GetVersionResponse {
  /** Operation success flag */
  success: boolean;
  /** Version metadata */
  data: {
    /** Semantic version string (e.g., "1.2.0") */
    version: string;
    /** Release date (ISO 8601 format) */
    releaseDate: string;
    /** Download URL for latest version */
    downloadUrl: string;
    /** Changelog or release notes */
    changelog: string;
  };
}

// =============================================================================
// POST /api/diagnostics - Upload Diagnostic File
// =============================================================================

/**
 * Upload Diagnostic Success Response
 */
export interface UploadDiagnosticResponse {
  /** Operation success flag */
  success: boolean;
  /** Diagnostic upload data */
  data: {
    /** Unique diagnostic ID */
    diagnosticId: string;
    /** Uploaded file size in bytes */
    fileSize: number;
  };
}

/**
 * Diagnostic Upload Error Response
 * Specific error for invalid file type or size
 */
export interface DiagnosticUploadError {
  /** Operation failure flag */
  success: boolean;
  /** Error object */
  error: {
    /** Error code */
    code: string;
    /** Human-readable error message */
    message: string;
  };
}

// =============================================================================
// Tspec API Specification
// =============================================================================

/**
 * Tspec API specification for branding endpoints
 */
export type BrandingApiSpec = Tspec.DefineApiSpec<{
  tags: ['Branding'];
  paths: {
    '/api/track-download': {
      post: {
        summary: 'Track download event';
        description: `Track download events with OS, user agent, and hashed IP.

**Flow:**
1. User clicks download button on website
2. Frontend submits OS selection (windows, macos, linux)
3. Backend logs download event with metadata:
   - OS type
   - User agent (for analytics)
   - Hashed IP address (privacy-preserving)
   - Timestamp
4. Returns download URL and tracking ID

**Use Case:**
- Track download analytics by OS
- Generate download statistics
- Provide OS-specific download links

**Rate Limit**: 100 requests per minute per IP

**No Authentication Required** - Public endpoint for website visitors`;
        body: TrackDownloadRequest;
        security: never;
        responses: {
          /** Download tracked successfully */
          200: TrackDownloadResponse;
          /** Invalid OS value or missing required field */
          400: ApiError;
          /** Rate limit exceeded (100 per minute per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/api/feedback': {
      post: {
        summary: 'Submit user feedback';
        description: `Submit user feedback to the system.

**Flow:**
1. User fills out feedback form (message required, email optional)
2. Frontend submits feedback with optional email and userId
3. Backend validates message length (1-1000 characters)
4. Feedback stored in database with timestamp
5. Optional: Send confirmation email if email provided

**Use Case:**
- Collect product feedback
- Bug reports
- Feature requests
- User complaints or compliments

**Message Requirements:**
- Minimum 1 character
- Maximum 1000 characters
- Plain text (no HTML)

**Rate Limit**: 100 requests per minute per IP

**No Authentication Required** - Public endpoint for all users`;
        body: SubmitFeedbackRequest;
        security: never;
        responses: {
          /** Feedback submitted successfully */
          201: SubmitFeedbackResponse;
          /** Invalid message length or email format */
          400: ApiError;
          /** Rate limit exceeded (100 per minute per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/api/version': {
      get: {
        summary: 'Get latest app version';
        description: `Get latest app version metadata including download URL and changelog.

**Flow:**
1. Client requests latest version information
2. Backend returns current release metadata
3. Client compares with local version
4. Client prompts user to update if newer version available

**Use Case:**
- Auto-update check in desktop app
- Version comparison
- Display changelog to users
- Download latest release

**Response Includes:**
- Semantic version (e.g., "1.2.0")
- Release date (ISO 8601)
- Download URL
- Changelog/release notes

**Caching Recommendation:**
Cache this response for 1 hour on client side.
Check once per app launch or every hour.

**Rate Limit**: 100 requests per minute per IP

**No Authentication Required** - Public endpoint for update checks`;
        security: never;
        responses: {
          /** Version information retrieved successfully */
          200: GetVersionResponse;
          /** No version found (should never happen in production) */
          404: ApiError;
          /** Rate limit exceeded (100 per minute per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/api/diagnostics': {
      post: {
        summary: 'Upload diagnostic file';
        description: `Upload diagnostic files for troubleshooting.

**Flow:**
1. User generates diagnostic file in desktop app
2. User submits file via support form or app
3. Backend validates file type and size
4. File stored securely with unique ID
5. Support team can access file for troubleshooting

**File Requirements:**
- Max file size: 5MB
- Allowed types: .json, .log, .txt, .zip
- Multipart form-data encoding
- Optional userId field for user identification

**Use Case:**
- Troubleshoot user-reported issues
- Collect crash logs
- Debug environment-specific problems
- Support ticket attachments

**Security:**
- Files scanned for malware (recommended)
- Stored with secure random filename
- Access restricted to support/admin users

**Rate Limit**: 100 requests per minute per IP

**No Authentication Required** - Public endpoint for support submissions
(Note: In production, consider adding authentication or admin-only access)`;
        security: never;
        responses: {
          /** Diagnostic file uploaded successfully */
          201: UploadDiagnosticResponse;
          /** Invalid file type, file too large, or missing file */
          400: DiagnosticUploadError;
          /** Rate limit exceeded (100 per minute per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
