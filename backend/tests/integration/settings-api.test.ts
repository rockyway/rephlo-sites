/**
 * Settings API Integration Tests
 *
 * Tests for admin settings REST API endpoints.
 *
 * Endpoints Tested:
 * - GET    /admin/settings              - Get all settings
 * - GET    /admin/settings/:category    - Get category settings
 * - PUT    /admin/settings/:category    - Update category settings
 * - POST   /admin/settings/test-email   - Test email configuration
 * - POST   /admin/settings/clear-cache  - Clear application cache
 * - POST   /admin/settings/run-backup   - Create database backup
 *
 * Test Coverage:
 * - Authentication required (401 without token)
 * - Admin role required (403 for non-admin)
 * - Category validation
 * - Settings validation
 * - Encryption verification
 * - Success/error responses
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { createTestUser } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Settings API Integration Tests', () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });

    // Create admin user
    const admin = await createTestUser(prisma, {
      email: 'admin@test.com',
      role: 'admin',
    });
    adminToken = await generateTestAccessToken(admin);

    // Create regular user
    const user = await createTestUser(prisma, {
      email: 'user@test.com',
      role: 'user',
    });
    userToken = await generateTestAccessToken(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up settings before each test
    await prisma.appSetting.deleteMany({});
  });

  describe('GET /admin/settings', () => {
    it('should return all settings for admin user', async () => {
      const res = await request(app)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('general');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('security');
      expect(res.body.data).toHaveProperty('integrations');
      expect(res.body.data).toHaveProperty('feature_flags');
      expect(res.body.data).toHaveProperty('system');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get('/admin/settings')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return default settings when none are set', async () => {
      const res = await request(app)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check default values
      expect(res.body.data.general.platform_name).toBe('Rephlo');
      expect(res.body.data.email.smtp_port).toBe(587);
      expect(res.body.data.security.password_min_length).toBe(8);
    });
  });

  describe('GET /admin/settings/:category', () => {
    it('should return settings for valid category', async () => {
      const res = await request(app)
        .get('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.category).toBe('general');
      expect(res.body.data.platform_name).toBeDefined();
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .get('/admin/settings/invalid_category')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CATEGORY');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get('/admin/settings/general')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .get('/admin/settings/general')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /admin/settings/:category', () => {
    it('should update general settings successfully', async () => {
      const updates = {
        platform_name: 'Custom Rephlo',
        timezone: 'America/Los_Angeles',
        date_format: 'YYYY-MM-DD',
      };

      const res = await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('updated successfully');
      expect(res.body.data.platform_name).toBe('Custom Rephlo');
      expect(res.body.data.timezone).toBe('America/Los_Angeles');
      expect(res.body.data.date_format).toBe('YYYY-MM-DD');
    });

    it('should update email settings with encryption', async () => {
      const updates = {
        smtp_host: 'smtp.test.com',
        smtp_port: 587,
        smtp_password: 'secret-password',
      };

      const res = await request(app)
        .put('/admin/settings/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.smtp_host).toBe('smtp.test.com');
      expect(res.body.data.smtp_password).toBe('secret-password'); // Decrypted in response

      // Verify encryption in database
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
      expect(dbSetting!.value).not.toBe('secret-password'); // Should be encrypted
    });

    it('should update security settings successfully', async () => {
      const updates = {
        session_timeout_minutes: 720,
        password_min_length: 10,
        mfa_enforcement: 'required',
      };

      const res = await request(app)
        .put('/admin/settings/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.session_timeout_minutes).toBe(720);
      expect(res.body.data.password_min_length).toBe(10);
      expect(res.body.data.mfa_enforcement).toBe('required');
    });

    it('should update integrations settings with encryption', async () => {
      const updates = {
        stripe_api_key: 'sk_test_123456',
        openai_api_key: 'sk-openai-789',
        anthropic_api_key: 'sk-ant-456',
      };

      const res = await request(app)
        .put('/admin/settings/integrations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);

      // All API keys should be encrypted in DB
      const dbSettings = await prisma.appSetting.findMany({
        where: {
          category: 'integrations',
          key: {
            in: ['stripe_api_key', 'openai_api_key', 'anthropic_api_key'],
          },
        },
      });

      expect(dbSettings).toHaveLength(3);
      dbSettings.forEach((setting) => {
        expect(setting.isEncrypted).toBe(true);
        expect(setting.value).not.toBe(updates[setting.key as keyof typeof updates]);
      });
    });

    it('should update feature flags successfully', async () => {
      const updates = {
        enable_perpetual_licenses: false,
        enable_coupons: true,
        maintenance_mode: true,
      };

      const res = await request(app)
        .put('/admin/settings/feature_flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.enable_perpetual_licenses).toBe(false);
      expect(res.body.data.maintenance_mode).toBe(true);
    });

    it('should update system settings successfully', async () => {
      const updates = {
        log_level: 'debug',
        log_retention_days: 30,
        backup_frequency: 'weekly',
      };

      const res = await request(app)
        .put('/admin/settings/system')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.log_level).toBe('debug');
      expect(res.body.data.backup_frequency).toBe('weekly');
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .put('/admin/settings/invalid_category')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ some_key: 'value' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CATEGORY');
    });

    it('should return 400 for validation errors (invalid date_format)', async () => {
      const res = await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date_format: 'INVALID' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('date_format');
    });

    it('should return 400 for validation errors (invalid smtp_port)', async () => {
      const res = await request(app)
        .put('/admin/settings/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ smtp_port: 99999 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for validation errors (invalid mfa_enforcement)', async () => {
      const res = await request(app)
        .put('/admin/settings/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mfa_enforcement: 'invalid' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .put('/admin/settings/general')
        .send({ platform_name: 'Test' })
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ platform_name: 'Test' })
        .expect(403);
    });
  });

  describe('POST /admin/settings/test-email', () => {
    it('should test email configuration successfully', async () => {
      const emailConfig = {
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user',
        smtp_password: 'pass',
        from_email: 'test@example.com',
      };

      const res = await request(app)
        .post('/admin/settings/test-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailConfig)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('valid');
    });

    it('should return error for invalid email configuration', async () => {
      const emailConfig = {
        smtp_port: 99999, // Invalid port
      };

      const res = await request(app)
        .post('/admin/settings/test-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailConfig)
        .expect(200); // Service returns 200 but with success: false

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .post('/admin/settings/test-email')
        .send({})
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .post('/admin/settings/test-email')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(403);
    });
  });

  describe('POST /admin/settings/clear-cache', () => {
    it('should clear cache successfully', async () => {
      const res = await request(app)
        .post('/admin/settings/clear-cache')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .post('/admin/settings/clear-cache')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .post('/admin/settings/clear-cache')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /admin/settings/run-backup', () => {
    it('should create backup successfully', async () => {
      const res = await request(app)
        .post('/admin/settings/run-backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');
      expect(res.body.timestamp).toBeDefined();

      // Verify last_backup was updated in system settings
      const systemSettings = await prisma.appSetting.findUnique({
        where: {
          category_key: {
            category: 'system',
            key: 'last_backup',
          },
        },
      });

      expect(systemSettings).toBeDefined();
      expect(systemSettings!.value).toBe(res.body.timestamp);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .post('/admin/settings/run-backup')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .post('/admin/settings/run-backup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Settings Persistence', () => {
    it('should persist settings across requests', async () => {
      // Update settings
      await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ platform_name: 'Persistent Platform' })
        .expect(200);

      // Retrieve settings
      const res = await request(app)
        .get('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.platform_name).toBe('Persistent Platform');
    });

    it('should handle multiple updates to same setting', async () => {
      // First update
      await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ platform_name: 'First Update' })
        .expect(200);

      // Second update
      await request(app)
        .put('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ platform_name: 'Second Update' })
        .expect(200);

      // Verify final value
      const res = await request(app)
        .get('/admin/settings/general')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.platform_name).toBe('Second Update');

      // Verify only one record exists in database
      const count = await prisma.appSetting.count({
        where: {
          category: 'general',
          key: 'platform_name',
        },
      });

      expect(count).toBe(1);
    });
  });
});
