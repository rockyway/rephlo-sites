import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions will be implemented in Phase 3
export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Download tracking - Phase 3
  trackDownload: async (os: 'windows' | 'macos' | 'linux') => {
    const response = await apiClient.post('/api/track-download', { os });
    return response.data;
  },

  // Feedback submission - Phase 3
  submitFeedback: async (data: { message: string; email?: string; userId?: string }) => {
    const response = await apiClient.post('/api/feedback', data);
    return response.data;
  },

  // Version check - Phase 3
  getVersion: async () => {
    const response = await apiClient.get('/api/version');
    return response.data;
  },

  // Admin metrics - Phase 3
  getMetrics: async () => {
    const response = await apiClient.get('/admin/metrics');
    return response.data;
  },
};
