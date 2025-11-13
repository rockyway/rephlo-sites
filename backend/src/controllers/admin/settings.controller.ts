/**
 * Settings Controller
 *
 * Handles HTTP requests for admin settings management.
 * All endpoints require admin authentication.
 *
 * Endpoints:
 * - GET    /admin/settings              - Get all settings
 * - GET    /admin/settings/:category    - Get category settings
 * - PUT    /admin/settings/:category    - Update category settings
 * - POST   /admin/settings/test-email   - Test email configuration
 * - POST   /admin/settings/clear-cache  - Clear application cache
 * - POST   /admin/settings/run-backup   - Create database backup
 */

import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { SettingsService, SettingCategory } from '../../services/settings.service';

/**
 * SettingsController
 *
 * Handles admin settings operations with proper error handling and validation.
 */
@injectable()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * GET /admin/settings
   * Get all settings from all categories
   */
  async getAllSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await this.settingsService.getAllSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error getting all settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_FETCH_ERROR',
          message: error.message || 'Failed to fetch settings',
        },
      });
    }
  }

  /**
   * GET /admin/settings/:category
   * Get settings for a specific category
   */
  async getCategorySettings(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;

      // Validate category
      const validCategories: SettingCategory[] = [
        'general',
        'email',
        'security',
        'integrations',
        'feature_flags',
        'system',
      ];

      if (!validCategories.includes(category as SettingCategory)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          },
        });
        return;
      }

      const settings = await this.settingsService.getCategorySettings(
        category as SettingCategory
      );

      res.json({
        success: true,
        data: settings,
        category,
      });
    } catch (error: any) {
      console.error('Error getting category settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_FETCH_ERROR',
          message: error.message || 'Failed to fetch settings',
        },
      });
    }
  }

  /**
   * PUT /admin/settings/:category
   * Update settings for a specific category
   */
  async updateCategorySettings(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const settings = req.body;

      // Validate category
      const validCategories: SettingCategory[] = [
        'general',
        'email',
        'security',
        'integrations',
        'feature_flags',
        'system',
      ];

      if (!validCategories.includes(category as SettingCategory)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          },
        });
        return;
      }

      // Validate settings
      try {
        this.settingsService.validateSettings(category as SettingCategory, settings);
      } catch (validationError: any) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message || 'Invalid settings',
          },
        });
        return;
      }

      // Update settings
      const updatedSettings = await this.settingsService.updateCategorySettings(
        category as SettingCategory,
        settings
      );

      res.json({
        success: true,
        message: `${category} settings updated successfully`,
        data: updatedSettings,
        category,
      });
    } catch (error: any) {
      console.error('Error updating category settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_ERROR',
          message: error.message || 'Failed to update settings',
        },
      });
    }
  }

  /**
   * POST /admin/settings/test-email
   * Test email configuration
   */
  async testEmailConfig(req: Request, res: Response): Promise<void> {
    try {
      const emailConfig = req.body;

      const result = await this.settingsService.testEmailConfig(emailConfig);

      res.json({
        status: result.success ? 'success' : 'error',
        data: {
          message: result.message,
        },
      });
    } catch (error: any) {
      console.error('Error testing email config:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_TEST_ERROR',
          message: error.message || 'Failed to test email configuration',
        },
      });
    }
  }

  /**
   * POST /admin/settings/clear-cache
   * Clear application cache
   */
  async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.settingsService.clearCache();

      res.json({
        status: result.success ? 'success' : 'error',
        data: {
          message: result.message,
        },
      });
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CACHE_CLEAR_ERROR',
          message: error.message || 'Failed to clear cache',
        },
      });
    }
  }

  /**
   * POST /admin/settings/run-backup
   * Create database backup
   */
  async runBackup(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.settingsService.createBackup();

      res.json({
        status: result.success ? 'success' : 'error',
        data: {
          message: result.message,
          timestamp: result.timestamp,
        },
      });
    } catch (error: any) {
      console.error('Error running backup:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_ERROR',
          message: error.message || 'Failed to create backup',
        },
      });
    }
  }
}
