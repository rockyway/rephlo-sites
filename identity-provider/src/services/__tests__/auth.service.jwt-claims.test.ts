/**
 * Auth Service Integration Tests - JWT License Claims (Plan 203)
 *
 * Tests the JWT token enhancement with perpetual license claims:
 * - findAccount() includes perpetual license data
 * - JWT tokens contain license claims for users with active licenses
 * - maskLicenseKey() helper function
 * - Auto-activation flow preparation
 *
 * Reference: Plan 203 - Perpetual License Auto-Activation
 */

import { AuthService } from '../auth.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService - JWT License Claims (Plan 203)', () => {
  let authService: AuthService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rephlo-test',
        },
      },
    });

    authService = new AuthService(prisma);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.perpetual_license.deleteMany({
      where: {
        users: {
          email: {
            in: [
              'jwt-test-with-license@example.com',
              'jwt-test-no-license@example.com',
              'jwt-test-suspended@example.com',
              'jwt-test-multiple@example.com',
              'jwt-mask-test@example.com',
            ],
          },
        },
      },
    });

    await prisma.users.deleteMany({
      where: {
        email: {
          in: [
            'jwt-test-with-license@example.com',
            'jwt-test-no-license@example.com',
            'jwt-test-suspended@example.com',
            'jwt-test-multiple@example.com',
            'jwt-mask-test@example.com',
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ===========================================================================
  // findAccount() Tests
  // ===========================================================================

  describe('findAccount() with Perpetual License', () => {
    it('should include perpetual license data for user with active license', async () => {
      // Create test user
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'jwt-test-with-license@example.com',
          password_hash: passwordHash,
          first_name: 'JWT',
          last_name: 'Test',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create active perpetual license
      await prisma.perpetual_license.create({
        data: {
          id: '22222222-2222-2222-2222-222222222222',
          user_id: user.id,
          license_key: 'REPHLO-V1-ABCD-EFGH-1234',
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

      // Call findAccount
      const account = await authService.findAccount(undefined, user.id);

      // Verify account includes license data
      expect(account).toBeDefined();
      expect(account?.accountId).toBe(user.id);
      expect(account?.claims).toBeDefined();

      // Verify claims include license information
      const claims = await account?.claims();
      expect(claims).toMatchObject({
        sub: user.id,
        email: 'jwt-test-with-license@example.com',
        licenseStatus: 'active',
        licenseKey: expect.stringMatching(/^REPHLO-V1-\*{4}-\*{4}-1234$/), // Masked
        licenseTier: 'perpetual',
        licenseVersion: '1.0.0',
      });
    });

    it('should not include license claims when user has no license', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'jwt-test-no-license@example.com',
          password_hash: passwordHash,
          first_name: 'No',
          last_name: 'License',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const account = await authService.findAccount(undefined, user.id);

      expect(account).toBeDefined();
      const claims = await account?.claims();

      // Should have basic claims but NO license claims
      expect(claims).toMatchObject({
        sub: user.id,
        email: 'jwt-test-no-license@example.com',
      });

      expect(claims).not.toHaveProperty('licenseStatus');
      expect(claims).not.toHaveProperty('licenseKey');
      expect(claims).not.toHaveProperty('licenseTier');
      expect(claims).not.toHaveProperty('licenseVersion');
    });

    it('should not include license claims when license is suspended', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '44444444-4444-4444-4444-444444444444',
          email: 'jwt-test-suspended@example.com',
          password_hash: passwordHash,
          first_name: 'Suspended',
          last_name: 'User',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create suspended license
      await prisma.perpetual_license.create({
        data: {
          id: '55555555-5555-5555-5555-555555555555',
          user_id: user.id,
          license_key: 'REPHLO-V1-SUSP-ENDE-D123',
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

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // Should not include license claims for suspended license
      expect(claims).not.toHaveProperty('licenseStatus');
      expect(claims).not.toHaveProperty('licenseKey');
    });

    it('should return most recent active license when user has multiple', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '66666666-6666-6666-6666-666666666666',
          email: 'jwt-test-multiple@example.com',
          password_hash: passwordHash,
          first_name: 'Multiple',
          last_name: 'Licenses',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create older license
      await prisma.perpetual_license.create({
        data: {
          id: '77777777-7777-7777-7777-777777777777',
          user_id: user.id,
          license_key: 'REPHLO-V1-OLD1-OLD2-OLD3',
          purchase_price_usd: 199.00,
          purchased_version: '1.0.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 0,
          status: 'active',
          purchased_at: new Date('2024-06-15T10:00:00.000Z'), // Older
          activated_at: new Date('2024-06-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      // Create newer license
      await prisma.perpetual_license.create({
        data: {
          id: '88888888-8888-8888-8888-888888888888',
          user_id: user.id,
          license_key: 'REPHLO-V1-NEW1-NEW2-NEW3',
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

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // Should include the newer license
      expect(claims?.licenseVersion).toBe('2.0.0');
      expect(claims?.licenseKey).toMatch(/NEW3$/); // Should end with NEW3 (unmasked portion)
    });
  });

  // ===========================================================================
  // maskLicenseKey() Tests
  // ===========================================================================

  describe('maskLicenseKey() Helper', () => {
    it('should mask middle segments of license key', () => {
      const result = authService['maskLicenseKey']('REPHLO-V1-ABCD-EFGH-1234');

      expect(result).toBe('REPHLO-V1-****-****-1234');
    });

    it('should preserve first 2 and last segments', () => {
      const result = authService['maskLicenseKey']('REPHLO-V1-TEST-AUTO-ACT1');

      expect(result).toBe('REPHLO-V1-****-****-ACT1');
      expect(result).toMatch(/^REPHLO-V1/);
      expect(result).toMatch(/ACT1$/);
    });

    it('should handle license keys with different formats', () => {
      // Standard 5-part format
      const standard = authService['maskLicenseKey']('REPHLO-V1-XXXX-YYYY-ZZZZ');
      expect(standard).toBe('REPHLO-V1-****-****-ZZZZ');

      // Edge case: Only 3 parts (should return original)
      const short = authService['maskLicenseKey']('REPHLO-V1-XXXX');
      expect(short).toBe('REPHLO-V1-XXXX');
    });

    it('should mask multiple middle segments', () => {
      const result = authService['maskLicenseKey']('REPHLO-V1-PART1-PART2-PART3-PART4-LAST');

      // Should mask all middle segments
      expect(result).toBe('REPHLO-V1-****-****-****-****-LAST');
    });
  });

  // ===========================================================================
  // JWT Claims Structure Tests
  // ===========================================================================

  describe('JWT Claims Structure', () => {
    it('should include all required license claims for active license', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '99999999-9999-9999-9999-999999999999',
          email: 'jwt-mask-test@example.com',
          password_hash: passwordHash,
          first_name: 'Claims',
          last_name: 'Test',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.perpetual_license.create({
        data: {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          user_id: user.id,
          license_key: 'REPHLO-V1-FULL-TEST-CLAIM',
          purchase_price_usd: 299.00,
          purchased_version: '1.5.0',
          eligible_until_version: '1.99.99',
          max_activations: 3,
          current_activations: 1,
          status: 'active',
          purchased_at: new Date('2025-01-15T10:00:00.000Z'),
          activated_at: new Date('2025-01-15T10:00:00.000Z'),
          updated_at: new Date(),
        },
      });

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // Verify all required license claims
      expect(claims).toHaveProperty('licenseStatus');
      expect(claims).toHaveProperty('licenseKey');
      expect(claims).toHaveProperty('licenseTier');
      expect(claims).toHaveProperty('licenseVersion');

      // Verify claim values
      expect(claims?.licenseStatus).toBe('active');
      expect(typeof claims?.licenseKey).toBe('string');
      expect(claims?.licenseTier).toBe('perpetual');
      expect(claims?.licenseVersion).toBe('1.5.0');
    });

    it('should maintain backward compatibility with existing claims', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          email: 'backward-compat@example.com',
          password_hash: passwordHash,
          first_name: 'Backward',
          last_name: 'Compat',
          email_verified: true,
          role: 'admin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.perpetual_license.create({
        data: {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          user_id: user.id,
          license_key: 'REPHLO-V1-BACK-WARD-COMP',
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

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // Verify existing claims still present
      expect(claims).toHaveProperty('sub');
      expect(claims).toHaveProperty('email');
      expect(claims).toHaveProperty('email_verified');
      expect(claims).toHaveProperty('name');

      // Verify role-based claims
      expect(claims?.role).toBe('admin');

      // AND new license claims
      expect(claims).toHaveProperty('licenseStatus');
      expect(claims).toHaveProperty('licenseKey');
    });
  });

  // ===========================================================================
  // Auto-Activation Flow Tests
  // ===========================================================================

  describe('Auto-Activation Flow Preparation', () => {
    it('should provide all data needed for desktop auto-activation', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          email: 'auto-activation@example.com',
          password_hash: passwordHash,
          first_name: 'Auto',
          last_name: 'Activation',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.perpetual_license.create({
        data: {
          id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          user_id: user.id,
          license_key: 'REPHLO-V1-AUTO-ACTV-FLOW',
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

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // Desktop app checks these claims to determine auto-activation
      expect(claims?.licenseStatus).toBe('active');
      expect(claims?.licenseKey).toBeDefined(); // Masked key hint
      expect(claims?.licenseTier).toBe('perpetual');
      expect(claims?.licenseVersion).toBeDefined(); // Version eligibility check

      // Desktop app workflow:
      // 1. Check licenseStatus === 'active' → auto-activation possible
      // 2. Call GET /api/licenses/me with access token → get full license details
      // 3. Check if device already activated
      // 4. If not, call POST /api/licenses/activate with device fingerprint
      // 5. Store encrypted license + JWT for offline validation
    });

    it('should signal no auto-activation when license absent', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          email: 'no-auto-activation@example.com',
          password_hash: passwordHash,
          first_name: 'No',
          last_name: 'AutoActivation',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // No license claims → desktop app should prompt for manual entry
      expect(claims?.licenseStatus).toBeUndefined();
      expect(claims?.licenseKey).toBeUndefined();
      expect(claims?.licenseTier).toBeUndefined();

      // Desktop app workflow:
      // 1. Check licenseStatus === undefined → show manual license key input
      // 2. User enters license key manually
      // 3. Call POST /api/licenses/activate directly with key + device fingerprint
    });
  });

  // ===========================================================================
  // Security & Privacy Tests
  // ===========================================================================

  describe('Security & Privacy', () => {
    it('should never expose full license key in JWT', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = await prisma.users.create({
        data: {
          id: '10101010-1010-1010-1010-101010101010',
          email: 'security-test@example.com',
          password_hash: passwordHash,
          first_name: 'Security',
          last_name: 'Test',
          email_verified: true,
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const fullKey = 'REPHLO-V1-SECRET-DATA-KEY1';

      await prisma.perpetual_license.create({
        data: {
          id: '20202020-2020-2020-2020-202020202020',
          user_id: user.id,
          license_key: fullKey,
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

      const account = await authService.findAccount(undefined, user.id);
      const claims = await account?.claims();

      // JWT should contain masked key, NOT full key
      expect(claims?.licenseKey).not.toBe(fullKey);
      expect(claims?.licenseKey).toContain('****');
      expect(claims?.licenseKey).toMatch(/^REPHLO-V1-\*{4}-\*{4}-KEY1$/);
    });

    it('should not leak license data in error scenarios', async () => {
      // Test with invalid user ID
      const account = await authService.findAccount(undefined, 'non-existent-user-id');

      expect(account).toBeNull();
      // Should not throw error or leak data
    });
  });
});
