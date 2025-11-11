/**
 * Settings Service Unit Tests
 *
 * Tests for encryption, decryption, validation, and CRUD operations for settings.
 *
 * Test Coverage:
 * - Encryption/decryption functionality
 * - Sensitive field auto-encryption
 * - Non-sensitive fields not encrypted
 * - Settings retrieval by category
 * - Settings update with validation
 * - Default settings return when not set
 * - Category filtering
 * - Validation for each category
 */

import { PrismaClient } from '@prisma/client';
import { SettingsService, SettingCategory, CategorySettings } from '../../../src/services/settings.service';

describe('SettingsService', () => {
  let prisma: PrismaClient;
  let settingsService: SettingsService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
    settingsService = new SettingsService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up settings before each test
    await prisma.appSetting.deleteMany({});
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt sensitive fields (smtp_password)', async () => {
      const settings: CategorySettings = {
        smtp_host: 'smtp.example.com',
        smtp_password: 'my-secret-password',
      };

      await settingsService.updateCategorySettings('email', settings);

      // Check database directly - should be encrypted
      const dbSetting = await prisma.appSetting.findUnique({
        where: {
          category_key: {
            category: 'email',
            key: 'smtp_password',
          },
        },
      });

      expect(dbSetting).toBeDefined();
      expect(dbSetting!.isEncrypted).toBe(true);
      expect(dbSetting!.value).not.toBe('my-secret-password');
      expect(dbSetting!.value).toContain(':'); // Encrypted format: iv:authTag:encrypted
    });

    it('should decrypt sensitive fields when retrieving', async () => {
      const settings: CategorySettings = {
        smtp_password: 'my-secret-password',
      };

      await settingsService.updateCategorySettings('email', settings);

      // Retrieve settings
      const retrieved = await settingsService.getCategorySettings('email');

      expect(retrieved.smtp_password).toBe('my-secret-password');
    });

    it('should not encrypt non-sensitive fields', async () => {
      const settings: CategorySettings = {
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
      };

      await settingsService.updateCategorySettings('email', settings);

      // Check database directly - should NOT be encrypted
      const dbSetting = await prisma.appSetting.findUnique({
        where: {
          category_key: {
            category: 'email',
            key: 'smtp_host',
          },
        },
      });

      expect(dbSetting).toBeDefined();
      expect(dbSetting!.isEncrypted).toBe(false);
      expect(dbSetting!.value).toBe('smtp.example.com');
    });

    it('should encrypt multiple sensitive fields correctly', async () => {
      const settings: CategorySettings = {
        stripe_api_key: 'sk_test_123456',
        openai_api_key: 'sk-openai-123',
        anthropic_api_key: 'sk-ant-456',
      };

      await settingsService.updateCategorySettings('integrations', settings);

      // Retrieve and verify all are decrypted correctly
      const retrieved = await settingsService.getCategorySettings('integrations');

      expect(retrieved.stripe_api_key).toBe('sk_test_123456');
      expect(retrieved.openai_api_key).toBe('sk-openai-123');
      expect(retrieved.anthropic_api_key).toBe('sk-ant-456');
    });

    it('should handle empty string encryption gracefully', async () => {
      const settings: CategorySettings = {
        smtp_password: '',
      };

      await settingsService.updateCategorySettings('email', settings);

      const retrieved = await settingsService.getCategorySettings('email');
      expect(retrieved.smtp_password).toBe('');
    });
  });

  describe('Settings Retrieval', () => {
    it('should return default settings when none exist', async () => {
      const settings = await settingsService.getCategorySettings('general');

      expect(settings.platform_name).toBe('Rephlo');
      expect(settings.platform_description).toBe('Transform text. Keep your flow.');
      expect(settings.timezone).toBe('America/New_York');
    });

    it('should return merged settings (DB + defaults)', async () => {
      // Set one custom setting
      await settingsService.updateCategorySettings('general', {
        platform_name: 'Custom Rephlo',
      });

      const settings = await settingsService.getCategorySettings('general');

      // Custom setting
      expect(settings.platform_name).toBe('Custom Rephlo');

      // Default settings still present
      expect(settings.timezone).toBe('America/New_York');
      expect(settings.date_format).toBe('MM/DD/YYYY');
    });

    it('should get all settings for all categories', async () => {
      await settingsService.updateCategorySettings('general', {
        platform_name: 'Test Platform',
      });

      await settingsService.updateCategorySettings('email', {
        smtp_host: 'test.smtp.com',
      });

      const allSettings = await settingsService.getAllSettings();

      expect(allSettings.general.platform_name).toBe('Test Platform');
      expect(allSettings.email.smtp_host).toBe('test.smtp.com');
      expect(allSettings.security).toBeDefined();
      expect(allSettings.integrations).toBeDefined();
      expect(allSettings.feature_flags).toBeDefined();
      expect(allSettings.system).toBeDefined();
    });

    it('should return settings for specific category only', async () => {
      await settingsService.updateCategorySettings('general', {
        platform_name: 'General Test',
      });

      await settingsService.updateCategorySettings('email', {
        smtp_host: 'email.test.com',
      });

      const generalSettings = await settingsService.getCategorySettings('general');
      const emailSettings = await settingsService.getCategorySettings('email');

      expect(generalSettings.platform_name).toBe('General Test');
      expect(generalSettings.smtp_host).toBeUndefined();

      expect(emailSettings.smtp_host).toBe('email.test.com');
      expect(emailSettings.platform_name).toBeUndefined();
    });
  });

  describe('Settings Update', () => {
    it('should update settings successfully', async () => {
      const settings: CategorySettings = {
        platform_name: 'Updated Platform',
        timezone: 'America/Los_Angeles',
      };

      const updated = await settingsService.updateCategorySettings('general', settings);

      expect(updated.platform_name).toBe('Updated Platform');
      expect(updated.timezone).toBe('America/Los_Angeles');
    });

    it('should upsert settings (create if not exists, update if exists)', async () => {
      // First create
      await settingsService.updateCategorySettings('general', {
        platform_name: 'First Value',
      });

      // Then update
      await settingsService.updateCategorySettings('general', {
        platform_name: 'Second Value',
      });

      const settings = await settingsService.getCategorySettings('general');
      expect(settings.platform_name).toBe('Second Value');

      // Verify only one record in DB
      const count = await prisma.appSetting.count({
        where: {
          category: 'general',
          key: 'platform_name',
        },
      });
      expect(count).toBe(1);
    });

    it('should throw error for invalid category', async () => {
      await expect(
        settingsService.updateCategorySettings('invalid_category' as SettingCategory, {})
      ).rejects.toThrow('Invalid category');
    });
  });

  describe('Validation - General Settings', () => {
    it('should accept valid date_format', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          date_format: 'MM/DD/YYYY',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('general', {
          date_format: 'DD/MM/YYYY',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('general', {
          date_format: 'YYYY-MM-DD',
        });
      }).not.toThrow();
    });

    it('should reject invalid date_format', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          date_format: 'INVALID',
        });
      }).toThrow('Invalid date_format');
    });

    it('should accept valid time_format', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          time_format: '12h',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('general', {
          time_format: '24h',
        });
      }).not.toThrow();
    });

    it('should reject invalid time_format', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          time_format: 'invalid',
        });
      }).toThrow('Invalid time_format');
    });

    it('should accept valid default_currency', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          default_currency: 'USD',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('general', {
          default_currency: 'EUR',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('general', {
          default_currency: 'GBP',
        });
      }).not.toThrow();
    });

    it('should reject invalid default_currency', () => {
      expect(() => {
        settingsService.validateSettings('general', {
          default_currency: 'BTC',
        });
      }).toThrow('Invalid default_currency');
    });
  });

  describe('Validation - Email Settings', () => {
    it('should accept valid smtp_port', () => {
      expect(() => {
        settingsService.validateSettings('email', {
          smtp_port: 587,
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('email', {
          smtp_port: 465,
        });
      }).not.toThrow();
    });

    it('should reject invalid smtp_port (out of range)', () => {
      expect(() => {
        settingsService.validateSettings('email', {
          smtp_port: 0,
        });
      }).toThrow('Invalid smtp_port');

      expect(() => {
        settingsService.validateSettings('email', {
          smtp_port: 70000,
        });
      }).toThrow('Invalid smtp_port');
    });

    it('should accept valid from_email', () => {
      expect(() => {
        settingsService.validateSettings('email', {
          from_email: 'test@example.com',
        });
      }).not.toThrow();
    });

    it('should reject invalid from_email', () => {
      expect(() => {
        settingsService.validateSettings('email', {
          from_email: 'invalid-email',
        });
      }).toThrow('Invalid from_email');

      expect(() => {
        settingsService.validateSettings('email', {
          from_email: '@example.com',
        });
      }).toThrow('Invalid from_email');
    });
  });

  describe('Validation - Security Settings', () => {
    it('should accept valid session_timeout_minutes', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          session_timeout_minutes: 1440,
        });
      }).not.toThrow();
    });

    it('should reject session_timeout_minutes < 5', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          session_timeout_minutes: 2,
        });
      }).toThrow('session_timeout_minutes must be at least 5');
    });

    it('should accept valid password_min_length', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          password_min_length: 8,
        });
      }).not.toThrow();
    });

    it('should reject password_min_length < 6', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          password_min_length: 4,
        });
      }).toThrow('password_min_length must be at least 6');
    });

    it('should accept valid mfa_enforcement', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          mfa_enforcement: 'optional',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('security', {
          mfa_enforcement: 'required',
        });
      }).not.toThrow();

      expect(() => {
        settingsService.validateSettings('security', {
          mfa_enforcement: 'disabled',
        });
      }).not.toThrow();
    });

    it('should reject invalid mfa_enforcement', () => {
      expect(() => {
        settingsService.validateSettings('security', {
          mfa_enforcement: 'invalid',
        });
      }).toThrow('Invalid mfa_enforcement');
    });
  });

  describe('Validation - System Settings', () => {
    it('should accept valid log_level', () => {
      const levels = ['debug', 'info', 'warn', 'error'];

      levels.forEach((level) => {
        expect(() => {
          settingsService.validateSettings('system', {
            log_level: level,
          });
        }).not.toThrow();
      });
    });

    it('should reject invalid log_level', () => {
      expect(() => {
        settingsService.validateSettings('system', {
          log_level: 'verbose',
        });
      }).toThrow('Invalid log_level');
    });

    it('should accept valid backup_frequency', () => {
      const frequencies = ['daily', 'weekly', 'monthly'];

      frequencies.forEach((freq) => {
        expect(() => {
          settingsService.validateSettings('system', {
            backup_frequency: freq,
          });
        }).not.toThrow();
      });
    });

    it('should reject invalid backup_frequency', () => {
      expect(() => {
        settingsService.validateSettings('system', {
          backup_frequency: 'hourly',
        });
      }).toThrow('Invalid backup_frequency');
    });
  });

  describe('Test Email Configuration', () => {
    it('should return success for valid email config', async () => {
      const result = await settingsService.testEmailConfig({
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user',
        smtp_password: 'pass',
        from_email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('valid');
    });

    it('should return error for invalid email config', async () => {
      const result = await settingsService.testEmailConfig({
        smtp_port: 99999, // Invalid port
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });
  });

  describe('Clear Cache', () => {
    it('should clear cache successfully', async () => {
      const result = await settingsService.clearCache();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Create Backup', () => {
    it('should create backup and update timestamp', async () => {
      const result = await settingsService.createBackup();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.timestamp).toBeDefined();

      // Verify last_backup was updated
      const systemSettings = await settingsService.getCategorySettings('system');
      expect(systemSettings.last_backup).toBeDefined();
      expect(systemSettings.last_backup).toBe(result.timestamp);
    });
  });

  describe('Initialize Default Settings', () => {
    it('should initialize all default settings', async () => {
      await settingsService.initializeDefaultSettings();

      // Check that settings were created for all categories
      const allSettings = await settingsService.getAllSettings();

      expect(allSettings.general.platform_name).toBe('Rephlo');
      expect(allSettings.email.smtp_port).toBe(587);
      expect(allSettings.security.password_min_length).toBe(8);
      expect(allSettings.feature_flags.enable_perpetual_licenses).toBe(true);
      expect(allSettings.system.log_level).toBe('info');
    });

    it('should not overwrite existing settings when initializing', async () => {
      // Set custom value
      await settingsService.updateCategorySettings('general', {
        platform_name: 'Custom Platform',
      });

      // Initialize defaults
      await settingsService.initializeDefaultSettings();

      // Verify custom value was not overwritten
      const settings = await settingsService.getCategorySettings('general');
      expect(settings.platform_name).toBe('Custom Platform');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values gracefully', async () => {
      await settingsService.updateCategorySettings('system', {
        last_backup: null,
      });

      const settings = await settingsService.getCategorySettings('system');
      expect(settings.last_backup).toBeNull();
    });

    it('should handle boolean values correctly', async () => {
      await settingsService.updateCategorySettings('feature_flags', {
        enable_perpetual_licenses: true,
        maintenance_mode: false,
      });

      const settings = await settingsService.getCategorySettings('feature_flags');
      expect(settings.enable_perpetual_licenses).toBe(true);
      expect(settings.maintenance_mode).toBe(false);
    });

    it('should handle numeric values correctly', async () => {
      await settingsService.updateCategorySettings('email', {
        smtp_port: 465,
      });

      const settings = await settingsService.getCategorySettings('email');
      expect(settings.smtp_port).toBe(465);
      expect(typeof settings.smtp_port).toBe('number');
    });
  });
});
