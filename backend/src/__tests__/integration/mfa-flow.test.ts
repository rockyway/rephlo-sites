/**
 * MFA Integration Tests
 *
 * End-to-end tests for Multi-Factor Authentication flows including:
 * - Complete MFA setup flow
 * - MFA-protected login
 * - Backup code usage
 * - MFA disable flow
 * - Role-based access control
 *
 * Reference: Plan 127, Task 4.5
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app';
import { MFAService } from '../../../identity-provider/src/services/mfa.service';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';
import { Application } from 'express';

const prisma = new PrismaClient();
const mfaService = new MFAService();

describe('MFA Integration Tests', () => {
  let app: Application;
  let testUserId: string;
  let adminToken: string;
  let testUserEmail: string;

  beforeAll(async () => {
    app = await createApp();

    // Create test admin user
    testUserEmail = `admin-mfa-test-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('SecurePassword123!', 12);

    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        emailVerified: true,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Test',
        role: 'admin',
        isActive: true,
      },
    });

    testUserId = user.id;

    // Mock admin token (in real scenario, get from identity provider)
    adminToken = 'mock-admin-token'; // Replace with actual token generation
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => {
        // Ignore if already deleted
      });
    }

    await prisma.$disconnect();
  });

  // ===========================================================================
  // MFA Setup Flow Tests
  // ===========================================================================

  describe('POST /auth/mfa/setup', () => {
    it('should generate MFA secret and QR code for admin user', async () => {
      const response = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body).toHaveProperty('secret');

      // QR code should be data URL
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);

      // Should have 10 backup codes
      expect(response.body.backupCodes).toHaveLength(10);

      // Verify secret is stored in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaSecret: true, mfaEnabled: true },
      });

      expect(user?.mfaSecret).toBeTruthy();
      expect(user?.mfaEnabled).toBe(false); // Not yet enabled
    });

    it('should reject MFA setup if already enabled', async () => {
      // Enable MFA for user
      await prisma.user.update({
        where: { id: testUserId },
        data: { mfaEnabled: true },
      });

      const response = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('MFA_ALREADY_ENABLED');

      // Reset for next tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { mfaEnabled: false },
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/auth/mfa/setup')
        .expect(401);
    });

    it('should require admin role', async () => {
      // Mock regular user token
      const regularUserToken = 'mock-regular-user-token';

      await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  // ===========================================================================
  // MFA Verification and Enable Tests
  // ===========================================================================

  describe('POST /auth/mfa/verify-setup', () => {
    let mfaSecret: string;
    let backupCodes: string[];

    beforeEach(async () => {
      // Setup MFA for user
      const setupResponse = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      mfaSecret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;
    });

    it('should enable MFA with valid TOTP token', async () => {
      // Generate current TOTP token
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          token,
          backupCodes,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify MFA is enabled in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaEnabled: true, mfaBackupCodes: true },
      });

      expect(user?.mfaEnabled).toBe(true);
      expect(user?.mfaBackupCodes).toHaveLength(10);
    });

    it('should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          token: '000000',
          backupCodes,
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_MFA_TOKEN');

      // Verify MFA is not enabled
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaEnabled: true },
      });

      expect(user?.mfaEnabled).toBe(false);
    });

    it('should require backup codes', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          token,
          // Missing backupCodes
        })
        .expect(400);
    });

    it('should reject if MFA setup not initiated', async () => {
      // Clear MFA secret
      await prisma.user.update({
        where: { id: testUserId },
        data: { mfaSecret: null },
      });

      const response = await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          token: '123456',
          backupCodes: ['CODE1111'],
        })
        .expect(400);

      expect(response.body.error.code).toBe('MFA_NOT_SETUP');
    });
  });

  // ===========================================================================
  // MFA Login Verification Tests
  // ===========================================================================

  describe('POST /auth/mfa/verify-login', () => {
    let mfaSecret: string;

    beforeEach(async () => {
      // Setup and enable MFA
      const { secret, qrCode, backupCodes } = await mfaService.generateMFASecret(testUserId);
      mfaSecret = secret;

      const hashedBackupCodes = await mfaService.hashBackupCodes(backupCodes);

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaSecret: secret,
          mfaEnabled: true,
          mfaBackupCodes: hashedBackupCodes,
        },
      });
    });

    it('should verify valid TOTP token during login', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUserId,
          token,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should reject invalid TOTP token', async () => {
      await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUserId,
          token: '000000',
        })
        .expect(401);
    });

    it('should reject if MFA not enabled', async () => {
      // Disable MFA
      await prisma.user.update({
        where: { id: testUserId },
        data: { mfaEnabled: false },
      });

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUserId,
          token,
        })
        .expect(400);

      expect(response.body.error.code).toBe('MFA_NOT_ENABLED');

      // Re-enable for other tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { mfaEnabled: true },
      });
    });

    it('should reject for inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: false },
      });

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUserId,
          token,
        })
        .expect(403);

      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');

      // Re-activate for other tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: true },
      });
    });
  });

  // ===========================================================================
  // Backup Code Login Tests
  // ===========================================================================

  describe('POST /auth/mfa/backup-code-login', () => {
    let backupCodes: string[];
    let hashedBackupCodes: string[];

    beforeEach(async () => {
      // Generate backup codes
      backupCodes = mfaService.generateBackupCodes(10);
      hashedBackupCodes = await mfaService.hashBackupCodes(backupCodes);

      // Setup MFA with backup codes
      const { secret } = await mfaService.generateMFASecret(testUserId);

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaSecret: secret,
          mfaEnabled: true,
          mfaBackupCodes: hashedBackupCodes,
        },
      });
    });

    it('should verify valid backup code', async () => {
      const backupCode = backupCodes[0];

      const response = await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testUserId,
          backupCode,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.remainingBackupCodes).toBe(9);

      // Verify backup code was removed
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaBackupCodes: true },
      });

      expect(user?.mfaBackupCodes).toHaveLength(9);
    });

    it('should reject invalid backup code', async () => {
      await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testUserId,
          backupCode: 'INVALIDCODE',
        })
        .expect(401);
    });

    it('should reject used backup code', async () => {
      const backupCode = backupCodes[0];

      // Use backup code first time
      await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testUserId,
          backupCode,
        })
        .expect(200);

      // Try to use same code again
      await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testUserId,
          backupCode,
        })
        .expect(401);
    });
  });

  // ===========================================================================
  // MFA Disable Tests
  // ===========================================================================

  describe('POST /auth/mfa/disable', () => {
    let mfaSecret: string;

    beforeEach(async () => {
      // Setup and enable MFA
      const { secret, backupCodes } = await mfaService.generateMFASecret(testUserId);
      mfaSecret = secret;

      const hashedBackupCodes = await mfaService.hashBackupCodes(backupCodes);

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaSecret: secret,
          mfaEnabled: true,
          mfaBackupCodes: hashedBackupCodes,
        },
      });
    });

    it('should disable MFA with valid password and MFA token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'SecurePassword123!',
          token,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify MFA is disabled
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaEnabled: true, mfaSecret: true, mfaBackupCodes: true },
      });

      expect(user?.mfaEnabled).toBe(false);
      expect(user?.mfaSecret).toBeNull();
      expect(user?.mfaBackupCodes).toHaveLength(0);
    });

    it('should reject with invalid password', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      await request(app)
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'WrongPassword',
          token,
        })
        .expect(401);

      // Verify MFA is still enabled
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaEnabled: true },
      });

      expect(user?.mfaEnabled).toBe(true);
    });

    it('should reject with invalid MFA token', async () => {
      await request(app)
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'SecurePassword123!',
          token: '000000',
        })
        .expect(401);

      // Verify MFA is still enabled
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mfaEnabled: true },
      });

      expect(user?.mfaEnabled).toBe(true);
    });
  });

  // ===========================================================================
  // MFA Status Tests
  // ===========================================================================

  describe('GET /auth/mfa/status', () => {
    it('should return MFA status for user with MFA enabled', async () => {
      // Enable MFA
      const { secret, backupCodes } = await mfaService.generateMFASecret(testUserId);
      const hashedBackupCodes = await mfaService.hashBackupCodes(backupCodes);

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaSecret: secret,
          mfaEnabled: true,
          mfaBackupCodes: hashedBackupCodes,
        },
      });

      const response = await request(app)
        .get('/auth/mfa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.mfaEnabled).toBe(true);
      expect(response.body.backupCodesRemaining).toBe(10);
    });

    it('should return MFA status for user with MFA disabled', async () => {
      // Disable MFA
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });

      const response = await request(app)
        .get('/auth/mfa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.mfaEnabled).toBe(false);
      expect(response.body.backupCodesRemaining).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/auth/mfa/status')
        .expect(401);
    });
  });
});
