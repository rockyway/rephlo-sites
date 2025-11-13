// Re-export from shared-types using import/export pattern to satisfy isolatedModules
import type {
  ApiResponse as ApiResponseType,
  ApiError as ApiErrorType,
  PaginationData as PaginationDataType,
  PaginationParams as PaginationParamsType
} from '@rephlo/shared-types';

export type ApiResponse<T = any> = ApiResponseType<T>;
export type ApiError = ApiErrorType;
export type PaginationData = PaginationDataType;
export type PaginationParams = PaginationParamsType;

// Re-export helper functions
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse
} from '@rephlo/shared-types';

// Download types
export interface DownloadRequest {
  os: 'windows' | 'macos' | 'linux';
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl: string;
}

// Feedback types
export interface FeedbackRequest {
  message: string;
  email?: string;
  userId?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId: string;
}

// Version types
export interface VersionInfo {
  version: string;
  downloadUrl: string;
  changelog: string;
}

// Metrics types
export interface Metrics {
  downloads: {
    windows: number;
    macos: number;
    linux: number;
    total: number;
  };
  feedback: {
    total: number;
    recentCount: number;
  };
  diagnostics: {
    total: number;
    totalSize: number;
  };
  timestamps: {
    firstDownload: string;
    lastDownload: string;
  };
}

// For backward compatibility with existing API
export interface LegacyMetrics {
  downloads: {
    windows: number;
    macos: number;
    linux: number;
  };
  feedbackCount: number;
  diagnosticsCount: number;
}
