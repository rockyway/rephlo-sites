// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

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
