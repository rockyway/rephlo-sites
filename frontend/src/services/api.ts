import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { refreshAccessToken } from '@/utils/oauth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7150';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('[API Client] axios instance created with baseURL:', API_URL);
console.log('[API Client] Registering request/response interceptors...');

/**
 * Get access token from session storage
 */
function getAccessToken(): string | null {
  return sessionStorage.getItem('access_token');
}

/**
 * Get refresh token from session storage
 */
function getRefreshToken(): string | null {
  return sessionStorage.getItem('refresh_token');
}

/**
 * Store tokens in session storage
 */
function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  sessionStorage.setItem('access_token', accessToken);
  sessionStorage.setItem('refresh_token', refreshToken);
  sessionStorage.setItem('token_expires_at', String(Date.now() + expiresIn * 1000));
}

/**
 * Clear all authentication data
 */
function clearAuth(reason?: string): void {
  const hadTokens = !!sessionStorage.getItem('access_token') && !!sessionStorage.getItem('refresh_token');

  console.warn('[Auth] Clearing all authentication data', {
    reason: reason || 'unknown',
    currentPath: window.location.pathname,
    hadAccessToken: !!sessionStorage.getItem('access_token'),
    hadRefreshToken: !!sessionStorage.getItem('refresh_token'),
    timestamp: new Date().toISOString(),
  });

  // Only log stack trace if we're actually clearing existing tokens
  if (hadTokens) {
    console.error('[Auth] Stack trace for token clearing:', new Error().stack);
  }

  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('token_expires_at');
  sessionStorage.removeItem('user');
}

/**
 * Get user data from session storage
 */
function getUser() {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('[Auth] Failed to parse user data from sessionStorage:', error);
    return null;
  }
}

/**
 * Check if token is expired or about to expire (within 60 seconds)
 */
function isTokenExpired(): boolean {
  const expiresAt = sessionStorage.getItem('token_expires_at');
  if (!expiresAt) return true;

  const expiryTime = parseInt(expiresAt, 10);
  const now = Date.now();

  // Consider token expired if it expires within 60 seconds
  return now >= expiryTime - 60000;
}

// Track if a token refresh is currently in progress to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token if expired
 * Returns the new access token or null if refresh failed
 */
async function refreshTokenIfNeeded(): Promise<string | null> {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const currentToken = getAccessToken();

  // If token is not expired, return it
  if (!isTokenExpired() && currentToken) {
    return currentToken;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  // Start refresh process
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const tokenResponse = await refreshAccessToken(refreshToken);
      storeTokens(tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in);
      return tokenResponse.access_token;
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      clearAuth('token_refresh_failed');
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Request Interceptor
 * Adds Authorization header with access token to all requests
 * Automatically refreshes token if expired before sending request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip token refresh on OAuth callback route to prevent interference
    const isOAuthCallback = window.location.pathname.includes('/oauth/callback');
    const isLoginPage = window.location.pathname.includes('/login');

    if (isOAuthCallback || isLoginPage) {
      console.log('[API Interceptor] Skipping token check on auth route:', window.location.pathname);
      return config;
    }

    // Try to refresh token if needed before making the request
    const token = await refreshTokenIfNeeded();

    console.log('[API Interceptor] Request', {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
      currentPath: window.location.pathname,
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API Interceptor] No token available, request will be sent without auth');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles 401 errors by attempting to refresh the access token and retry the request
 */
apiClient.interceptors.response.use(
  (response) => {
    // If response is successful, just return it
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const newToken = await refreshTokenIfNeeded();

        if (newToken) {
          // Update the authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Retry the original request with new token
          return apiClient(originalRequest);
        } else {
          // Token refresh failed - redirect to login
          console.warn('[API Interceptor] Token refresh failed on 401, redirecting to login');
          clearAuth('401_refresh_failed');

          // Redirect to login page (only if not already on callback or login page)
          if (!window.location.pathname.includes('/oauth/callback') &&
              !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }

          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed
        console.error('[API Interceptor] Failed to refresh token on 401:', refreshError);
        clearAuth('401_refresh_exception');

        // Redirect to login page
        if (!window.location.pathname.includes('/oauth/callback') &&
            !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    }

    // For non-401 errors or after retry, just reject
    return Promise.reject(error);
  }
);

// Export helper functions for external use
export const authHelpers = {
  getAccessToken,
  getRefreshToken,
  getUser,
  storeTokens,
  clearAuth,
  isTokenExpired,
  refreshTokenIfNeeded,
};

// API functions
export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Download tracking
  trackDownload: async (os: 'windows' | 'macos' | 'linux') => {
    const response = await apiClient.post('/api/track-download', { os });
    return response.data.data; // Unwrap standardized response
  },

  // Feedback submission
  submitFeedback: async (data: { message: string; email?: string; userId?: string }) => {
    const response = await apiClient.post('/api/feedback', data);
    return response.data.data; // Unwrap standardized response
  },

  // Version check
  getVersion: async () => {
    const response = await apiClient.get('/api/version');
    return response.data.data; // Unwrap standardized response
  },

  // Admin metrics
  getMetrics: async () => {
    const response = await apiClient.get('/admin/metrics');
    return response.data;
  },
};
