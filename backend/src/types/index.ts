// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Download tracking types
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

// Diagnostic types
export interface DiagnosticResponse {
  success: boolean;
  diagnosticId: string;
}

// Version types
export interface VersionResponse {
  version: string;
  downloadUrl: string;
  changelog: string;
}

// Admin metrics types
export interface MetricsResponse {
  downloads: {
    windows: number;
    macos: number;
    linux: number;
  };
  feedbackCount: number;
  diagnosticsCount: number;
}
