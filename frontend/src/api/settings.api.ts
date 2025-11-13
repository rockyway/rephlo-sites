/**
 * Settings API Client
 *
 * API client for admin settings management endpoints.
 * All endpoints require admin authentication.
 *
 * Reference: backend/src/routes/admin.routes.ts (Settings endpoints)
 */

import { apiClient } from '@/services/api';

/**
 * Setting category types
 */
export type SettingCategory =
  | 'general'
  | 'email'
  | 'security'
  | 'integrations'
  | 'feature_flags'
  | 'system';

/**
 * Settings value interface
 */
export interface CategorySettings {
  [key: string]: any;
}

/**
 * API Response interface
 */
export interface SettingsResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Settings API Client
 */
export const settingsApi = {
  /**
   * Get all settings from all categories
   */
  getAllSettings: async (): Promise<Record<SettingCategory, CategorySettings>> => {
    const response = await apiClient.get<SettingsResponse<Record<SettingCategory, CategorySettings>>>(
      '/admin/settings'
    );
    return response.data.data || {} as Record<SettingCategory, CategorySettings>;
  },

  /**
   * Get settings for a specific category
   */
  getCategorySettings: async (category: SettingCategory): Promise<CategorySettings> => {
    const response = await apiClient.get<SettingsResponse<CategorySettings>>(
      `/admin/settings/${category}`
    );
    return response.data.data || {};
  },

  /**
   * Update settings for a specific category
   */
  updateCategorySettings: async (
    category: SettingCategory,
    settings: CategorySettings
  ): Promise<CategorySettings> => {
    const response = await apiClient.put<SettingsResponse<CategorySettings>>(
      `/admin/settings/${category}`,
      settings
    );
    return response.data.data || {};
  },

  /**
   * Test email configuration
   */
  testEmailConfig: async (emailConfig: CategorySettings): Promise<SettingsResponse<{ message: string }>> => {
    const response = await apiClient.post<SettingsResponse<{ message: string }>>(
      '/admin/settings/test-email',
      emailConfig
    );
    return response.data;
  },

  /**
   * Clear application cache
   */
  clearCache: async (): Promise<SettingsResponse<{ message: string }>> => {
    const response = await apiClient.post<SettingsResponse<{ message: string }>>(
      '/admin/settings/clear-cache'
    );
    return response.data;
  },

  /**
   * Create database backup
   */
  runBackup: async (): Promise<SettingsResponse<{ message: string; timestamp: string }>> => {
    const response = await apiClient.post<SettingsResponse<{ message: string; timestamp: string }>>(
      '/admin/settings/run-backup'
    );
    return response.data;
  },
};
