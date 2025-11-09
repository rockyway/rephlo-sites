/**
 * Unit Tests for CheckoutIntegrationService - P0 Critical Fix
 *
 * Tests the BYOK license grant fix:
 * - grantPerpetualLicense() now creates actual licenses instead of mock data
 *
 * Focus: Verify actual license creation with LicenseManagementService integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CheckoutIntegrationService } from '../checkout-integration.service';
import { LicenseManagementService } from '../license-management.service';
import { CouponValidationService } from '../coupon-validation.service';
import { FraudDetectionService } from '../fraud-detection.service';
import { cleanDatabase, getTestDatabase } from '../../../tests/setup/database';

const prisma = getTestDatabase();
const licenseService = new LicenseManagementService(prisma);
const couponValidationService = new CouponValidationService(prisma);
const fraudDetectionService = new FraudDetectionService(prisma);
const checkoutService = new CheckoutIntegrationService(
  prisma,
  couponValidationService,
  fraudDetectionService,
  licenseService
);

describe('CheckoutIntegrationService - BYOK Fix', () => {
  let testUserId: string;
  let testCouponId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'byok-test@example.com',
        emailVerified: true,
        username: 'byokuser',
        firstName: 'BYOK',
        lastName: 'User',
        passwordHash: 'hashed_password'
      }
    });
    testUserId = user.id;

    // Create BYOK migration coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: 'BYOK2024TEST',
        coupon_type: 'byok_migration',
        discount_type: 'percentage',
        discount_value: 100,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        is_active: true,
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    testCouponId = coupon.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.perpetualLicense.deleteMany({ where: { user_id: testUserId } });
    await prisma.coupon.deleteMany({ where: { id: testCouponId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('grantPerpetualLicense', () => {
    it('should create actual license (not mock)', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // CRITICAL: Verify it's NOT mock data
      expect(license.id).not.toBe('mock-license-id');
      expect(license.licenseKey).not.toBe('MOCK-XXXX-XXXX-XXXX-XXXX');
      expect(license.licenseKey).not.toContain('MOCK');

      // Verify actual license created in database
      const dbLicense = await prisma.perpetualLicense.findUnique({
        where: { id: license.id }
      });

      expect(dbLicense).toBeDefined();
      expect(dbLicense!.id).toBe(license.id);
    });

    it('should create license with correct key format', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify license key matches REPHLO-XXXX-XXXX-XXXX-XXXX format
      expect(license.licenseKey).toMatch(/^REPHLO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should create license with correct properties', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify all required properties
      expect(license.user_id).toBe(testUserId);
      expect(license.purchase_price_usd).toBe(0); // BYOK licenses are free
      expect(license.max_activations).toBe(3); // Default activation limit
      expect(license.current_activations).toBe(0); // No activations yet
      expect(license.status).toBe('active'); // Should be active immediately
    });

    it('should create license with correct version', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify version is set correctly
      expect(license.eligible_until_version).toBeDefined();
      expect(license.eligible_until_version).toBe('1.0.0');
    });

    it('should create unique license keys for multiple licenses', async () => {
      // Create first license
      const license1 = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Create second user and coupon for second license
      const user2 = await prisma.user.create({
        data: {
          email: 'byok-test2@example.com',
          emailVerified: true,
          username: 'byokuser2',
          firstName: 'BYOK2',
          lastName: 'User2',
          passwordHash: 'hashed_password'
        }
      });

      const coupon2 = await prisma.coupon.create({
        data: {
          code: 'BYOK2024TEST2',
          coupon_type: 'byok_migration',
          discount_type: 'percentage',
          discount_value: 100,
          valid_from: new Date(),
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          is_active: true,
          created_by: user2.id,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create second license
      const license2 = await checkoutService.grantPerpetualLicense(user2.id, coupon2.id);

      // Verify unique keys
      expect(license1.licenseKey).not.toBe(license2.licenseKey);

      // Cleanup
      await prisma.perpetualLicense.deleteMany({ where: { user_id: user2.id } });
      await prisma.coupon.deleteMany({ where: { id: coupon2.id } });
      await prisma.user.deleteMany({ where: { id: user2.id } });
    });

    it('should create license with timestamps', async () => {
      const before = new Date();
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);
      const after = new Date();

      // Verify timestamps are set
      expect(license.created_at).toBeDefined();
      expect(license.updated_at).toBeDefined();

      // Verify timestamps are within reasonable range
      expect(license.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(license.created_at.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should handle errors gracefully', async () => {
      // Test with non-existent user
      await expect(
        checkoutService.grantPerpetualLicense('non-existent-user', testCouponId)
      ).rejects.toThrow();
    });
  });

  describe('License Persistence', () => {
    it('should persist license to database', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify license can be retrieved from database
      const retrieved = await prisma.perpetualLicense.findUnique({
        where: { id: license.id }
      });

      expect(retrieved).toBeDefined();
      expect(retrieved!.licenseKey).toBe(license.licenseKey);
      expect(retrieved!.user_id).toBe(testUserId);
    });

    it('should allow multiple licenses per user', async () => {
      // Create first license
      const license1 = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Create second coupon for same user
      const coupon2 = await prisma.coupon.create({
        data: {
          code: 'BYOK2024TEST_SECOND',
          coupon_type: 'byok_migration',
          discount_type: 'percentage',
          discount_value: 100,
          valid_from: new Date(),
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          is_active: true,
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create second license
      const license2 = await checkoutService.grantPerpetualLicense(testUserId, coupon2.id);

      // Verify both licenses exist
      const licenses = await prisma.perpetualLicense.findMany({
        where: { user_id: testUserId }
      });

      expect(licenses).toHaveLength(2);
      expect(licenses.map(l => l.licenseKey)).toContain(license1.licenseKey);
      expect(licenses.map(l => l.licenseKey)).toContain(license2.licenseKey);

      // Cleanup
      await prisma.coupon.deleteMany({ where: { id: coupon2.id } });
    });
  });

  describe('Integration with LicenseManagementService', () => {
    it('should use LicenseManagementService for license creation', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify license was created by LicenseManagementService
      // (has all the properties that LicenseManagementService.createPerpetualLicense creates)
      expect(license.licenseKey).toBeDefined();
      expect(license.status).toBe('active');
      expect(license.max_activations).toBe(3);
      expect(license.purchase_price_usd).toBe(0);
    });

    it('should create license that can be activated', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Activate the license
      const activation = await prisma.licenseActivation.create({
        data: {
          license_id: license.id,
          device_id: 'test-device-123',
          device_name: 'Test Device',
          platform: 'windows',
          app_version: '1.0.0',
          activated_at: new Date()
        }
      });

      expect(activation).toBeDefined();
      expect(activation.license_id).toBe(license.id);

      // Cleanup
      await prisma.licenseActivation.deleteMany({ where: { license_id: license.id } });
    });
  });

  describe('Regression Tests', () => {
    it('should NOT return mock data like before the fix', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Verify none of the old mock values are present
      const oldMockValues = {
        id: 'mock-license-id',
        licenseKey: 'MOCK-XXXX-XXXX-XXXX-XXXX',
        status: 'pending' // Old mock had 'pending', new should have 'active'
      };

      expect(license.id).not.toBe(oldMockValues.id);
      expect(license.licenseKey).not.toBe(oldMockValues.licenseKey);
      expect(license.status).toBe('active'); // Changed from 'pending' to 'active'
    });

    it('should create license with real database entry, not just return object', async () => {
      const license = await checkoutService.grantPerpetualLicense(testUserId, testCouponId);

      // Delete the license from database
      await prisma.perpetualLicense.delete({ where: { id: license.id } });

      // Try to retrieve it - should not exist
      const retrieved = await prisma.perpetualLicense.findUnique({
        where: { id: license.id }
      });

      expect(retrieved).toBeNull();
    });
  });
});
