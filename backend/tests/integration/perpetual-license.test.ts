/**
 * Integration Tests for Perpetual License Routes (Plan 203)
 *
 * Tests the auto-activation flow and license retrieval:
 * - GET /api/licenses/me (authenticated)
 * - License retrieval service logic
 * - JWT-based auto-activation preparation
 */

import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import { createTestUser } from '../helpers/factories';

// Test fixtures
let app: Express;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = getTestDatabase();
  // app = createApp(); // Your Express app factory
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/licenses/me', () => {
  describe('Authentication', () => {
    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .get('/api/licenses/me')
        .expect(401);

      expect(response.body.error).toMatchObject({
        code: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('User with Active Perpetual License', () => {
    it('should return license details for authenticated user', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        email: 'perpetual-user@example.com',
      });

      // Create perpetual license
      const license = await prisma.perpetual_license.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-TEST-INTG-TEST1',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'active',
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          activated_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      // Generate authentication token for user
      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          id: license.id,
          licenseKey: 'REPHLO-V1-TEST-INTG-TEST1',
          status: 'active',
          purchasedVersion: '1.0.0',
          eligibleUntilVersion: '1.99.99',
          maxActivations: 3,
          activeDeviceCount: 0,
          purchasedAt: '2025-01-15T10:00:00.000Z',
        },
      });
    });

    it('should return license with correct device activation count', async () => {
      const user = await createTestUser(prisma, {
        email: 'user-with-devices@example.com',
      });

      const license = await prisma.perpetual_license.create({
        data: {
          id: '660e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-TEST-WITH-DEVICES',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 2,
          status: 'active',
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          activated_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      // Create 2 active device activations
      await prisma.license_activation.createMany({
        data: [
          {
            id: '770e8400-e29b-41d4-a716-446655440001',
            license_id: license.id,
            user_id: user.id,
            machine_fingerprint: 'device1-fingerprint-hash',
            device_name: 'Test Device 1',
            os_type: 'Windows',
            os_version: '11 Pro',
            activated_at: new Date('2025-01-15T11:00:00.000Z'),
            last_seen_at: new Date(),
            status: 'active',
            updated_at: new Date(),
          },
          {
            id: '770e8400-e29b-41d4-a716-446655440002',
            license_id: license.id,
            user_id: user.id,
            machine_fingerprint: 'device2-fingerprint-hash',
            device_name: 'Test Device 2',
            os_type: 'Windows',
            os_version: '10 Pro',
            activated_at: new Date('2025-01-16T09:00:00.000Z'),
            last_seen_at: new Date(),
            status: 'active',
            updated_at: new Date(),
          },
        ],
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        licenseKey: 'REPHLO-V1-TEST-WITH-DEVICES',
        maxActivations: 3,
        activeDeviceCount: 2, // Should count only active activations
      });
    });

    it('should return most recent license if user has multiple', async () => {
      const user = await createTestUser(prisma, {
        email: 'user-multiple-licenses@example.com',
      });

      // Create older license
      await prisma.perpetual_license.create({
        data: {
          id: '880e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-OLD-LICENSE',
          purchase_price_usd: 199.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'active',
          purchased_at: new Date('2024-01-15T10:00:00.000Z'), // Older
          activated_at: new Date('2024-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      // Create newer license
      const newerLicense = await prisma.perpetual_license.create({
        data: {
          id: '880e8400-e29b-41d4-a716-446655440001',
          user_id: user.id,
          license_key: 'REPHLO-V1-NEW-LICENSE',
          purchase_price_usd: 299.00,
          purchased_version: '2.0.0',
          eligible_until_version: '2.99.99',
          max_activations: 5,
          current_activations: 0,
          status: 'active',
          purchased_at: new Date('2025-01-15T10:00:00.000Z'), // Newer
          activated_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return the newer license
      expect(response.body.data).toMatchObject({
        id: newerLicense.id,
        licenseKey: 'REPHLO-V1-NEW-LICENSE',
        purchasedVersion: '2.0.0',
      });
    });
  });

  describe('User without Perpetual License', () => {
    it('should return null data when user has no license', async () => {
      const user = await createTestUser(prisma, {
        email: 'no-license-user@example.com',
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: null,
      });
    });

    it('should return null when user only has suspended license', async () => {
      const user = await createTestUser(prisma, {
        email: 'suspended-license@example.com',
      });

      await prisma.perpetual_license.create({
        data: {
          id: '990e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-SUSPENDED',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'suspended', // Not active
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: null, // Should not return suspended license
      });
    });

    it('should return null when user only has revoked license', async () => {
      const user = await createTestUser(prisma, {
        email: 'revoked-license@example.com',
      });

      await prisma.perpetual_license.create({
        data: {
          id: 'aa0e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-REVOKED',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'revoked', // Not active
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeNull();
    });
  });

  describe('Response Format & Field Transformation', () => {
    it('should transform snake_case database fields to camelCase API response', async () => {
      const user = await createTestUser(prisma, {
        email: 'field-transform@example.com',
      });

      await prisma.perpetual_license.create({
        data: {
          id: 'bb0e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-TRANSFORM-TEST',
          purchase_price_usd: 299.00,
          purchased_version: '1.5.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 1,
          status: 'active',
          purchased_at: new Date('2025-01-10T14:30:00.000Z'),
          activated_at: new Date('2025-01-10T14:30:00.000Z'),
          updated_at: new Date(),
        },
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify camelCase API response (not snake_case from DB)
      expect(response.body.data).toHaveProperty('licenseKey');
      expect(response.body.data).toHaveProperty('purchasedVersion');
      expect(response.body.data).toHaveProperty('eligibleUntilVersion');
      expect(response.body.data).toHaveProperty('maxActivations');
      expect(response.body.data).toHaveProperty('activeDeviceCount');
      expect(response.body.data).toHaveProperty('purchasedAt');

      // Verify snake_case fields NOT exposed
      expect(response.body.data).not.toHaveProperty('license_key');
      expect(response.body.data).not.toHaveProperty('purchased_version');
      expect(response.body.data).not.toHaveProperty('user_id');
    });

    it('should format dates as ISO 8601 strings', async () => {
      const user = await createTestUser(prisma, {
        email: 'date-format@example.com',
      });

      const purchaseDate = new Date('2025-01-15T10:00:00.000Z');

      await prisma.perpetual_license.create({
        data: {
          id: 'cc0e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-DATE-FORMAT',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'active',
          purchased_at: purchaseDate,
          activated_at: purchaseDate,
          updated_at: new Date(),
        },
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify ISO 8601 date format
      expect(response.body.data.purchasedAt).toBe('2025-01-15T10:00:00.000Z');
      expect(typeof response.body.data.purchasedAt).toBe('string');
    });
  });

  describe('Service Layer Testing', () => {
    it('should correctly count only active device activations', async () => {
      const user = await createTestUser(prisma, {
        email: 'active-count@example.com',
      });

      const license = await prisma.perpetual_license.create({
        data: {
          id: 'dd0e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          license_key: 'REPHLO-V1-COUNT-TEST',
          purchase_price_usd: 299.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 5,
          current_activations: 3,
          status: 'active',
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          activated_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      // Create mixed activation statuses
      await prisma.license_activation.createMany({
        data: [
          {
            id: 'ee0e8400-e29b-41d4-a716-446655440001',
            license_id: license.id,
            user_id: user.id,
            machine_fingerprint: 'active-device-1',
            device_name: 'Active Device 1',
            os_type: 'Windows',
            os_version: '11',
            activated_at: new Date(),
            last_seen_at: new Date(),
            status: 'active', // Active
            updated_at: new Date(),
          },
          {
            id: 'ee0e8400-e29b-41d4-a716-446655440002',
            license_id: license.id,
            user_id: user.id,
            machine_fingerprint: 'deactivated-device',
            device_name: 'Deactivated Device',
            os_type: 'Windows',
            os_version: '10',
            activated_at: new Date(),
            last_seen_at: new Date(),
            deactivated_at: new Date(), // Deactivated
            status: 'deactivated',
            updated_at: new Date(),
          },
          {
            id: 'ee0e8400-e29b-41d4-a716-446655440003',
            license_id: license.id,
            user_id: user.id,
            machine_fingerprint: 'active-device-2',
            device_name: 'Active Device 2',
            os_type: 'macOS',
            os_version: '14',
            activated_at: new Date(),
            last_seen_at: new Date(),
            status: 'active', // Active
            updated_at: new Date(),
          },
        ],
      });

      const authToken = generateTestAuthToken(user.id);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should count only active devices (2), not deactivated (1)
      expect(response.body.data.activeDeviceCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const user = await createTestUser(prisma, {
        email: 'db-error@example.com',
      });

      const authToken = generateTestAuthToken(user.id);

      // Simulate database error by disconnecting
      await prisma.$disconnect();

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'internal_server_error',
        message: expect.stringContaining('Failed to retrieve license'),
      });

      // Reconnect for cleanup
      prisma = getTestDatabase();
    });
  });
});

/**
 * Helper function to generate test authentication token
 * (Mocked for testing purposes)
 */
function generateTestAuthToken(userId: string): string {
  // In real implementation, this would generate a valid JWT
  // For tests, use a mock token or actual JWT generation
  return `test-token-for-user-${userId}`;
}
