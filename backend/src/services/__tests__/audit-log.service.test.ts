/**
 * Unit Tests for AuditLogService - P0 Critical Fix
 *
 * Tests the audit logging functionality:
 * 1. log() - Create audit log entries (non-blocking, never throws)
 * 2. getLogs() - Retrieve audit logs with filtering
 * 3. getLogsForResource() - Get audit trail for specific resources
 * 4. getLogsForAdmin() - Get activity for specific admin users
 *
 * Focus: SOC 2 Type II and GDPR Article 30 compliance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuditLogService } from '../audit-log.service';
import { cleanDatabase, getTestDatabase } from '../../../tests/setup/database';

const prisma = getTestDatabase();
const auditService = new AuditLogService(prisma);

describe('AuditLogService - Audit Logging', () => {
  let testAdminId: string;
  let testAdmin2Id: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create test admin users
    const admin1 = await prisma.user.create({
      data: {
        email: 'admin1@example.com',
        emailVerified: true,
        username: 'admin1',
        firstName: 'Admin',
        lastName: 'One',
        passwordHash: 'hashed_password',
        isAdmin: true
      }
    });
    testAdminId = admin1.id;

    const admin2 = await prisma.user.create({
      data: {
        email: 'admin2@example.com',
        emailVerified: true,
        username: 'admin2',
        firstName: 'Admin',
        lastName: 'Two',
        passwordHash: 'hashed_password',
        isAdmin: true
      }
    });
    testAdmin2Id = admin2.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.adminAuditLog.deleteMany({
      where: {
        admin_user_id: { in: [testAdminId, testAdmin2Id] }
      }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testAdminId, testAdmin2Id] } }
    });
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].admin_user_id).toBe(testAdminId);
      expect(logs[0].action).toBe('create');
      expect(logs[0].resource_type).toBe('subscription');
      expect(logs[0].resource_id).toBe('sub-123');
      expect(logs[0].endpoint).toBe('/admin/subscriptions');
      expect(logs[0].method).toBe('POST');
      expect(logs[0].status_code).toBe(201);
    });

    it('should capture request body when provided', async () => {
      const requestBody = {
        userId: 'user-123',
        tier: 'pro',
        billingCycle: 'monthly'
      };

      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201,
        requestBody
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs[0].request_body).toEqual(requestBody);
    });

    it('should capture previous and new values for updates', async () => {
      const previousValue = { status: 'active', tier: 'pro' };
      const newValue = { status: 'cancelled', tier: 'pro' };

      await auditService.log({
        adminUserId: testAdminId,
        action: 'update',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions/sub-123',
        method: 'PATCH',
        statusCode: 200,
        previousValue,
        newValue
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs[0].previous_value).toEqual(previousValue);
      expect(logs[0].new_value).toEqual(newValue);
    });

    it('should capture IP address and user agent', async () => {
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs[0].ip_address).toBe('192.168.1.1');
      expect(logs[0].user_agent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should capture error messages for failed operations', async () => {
      await auditService.log({
        adminUserId: testAdminId,
        action: 'delete',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions/sub-123',
        method: 'DELETE',
        statusCode: 404,
        errorMessage: 'Subscription not found'
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs[0].status_code).toBe(404);
      expect(logs[0].error_message).toBe('Subscription not found');
    });

    it('should NOT throw on database error (non-blocking)', async () => {
      // Mock Prisma to throw an error
      const originalCreate = prisma.adminAuditLog.create;
      prisma.adminAuditLog.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // Should NOT throw - audit logging must never break the app
      await expect(auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      })).resolves.not.toThrow();

      // Restore original method
      prisma.adminAuditLog.create = originalCreate;
    });

    it('should set timestamp automatically', async () => {
      const before = new Date();
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });
      const after = new Date();

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId }
      });

      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should log all CRUD operations', async () => {
      // Create
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });

      // Read
      await auditService.log({
        adminUserId: testAdminId,
        action: 'read',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'GET',
        statusCode: 200
      });

      // Update
      await auditService.log({
        adminUserId: testAdminId,
        action: 'update',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions/123',
        method: 'PATCH',
        statusCode: 200
      });

      // Delete
      await auditService.log({
        adminUserId: testAdminId,
        action: 'delete',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions/123',
        method: 'DELETE',
        statusCode: 200
      });

      const logs = await prisma.adminAuditLog.findMany({
        where: { admin_user_id: testAdminId },
        orderBy: { timestamp: 'asc' }
      });

      expect(logs).toHaveLength(4);
      expect(logs[0].action).toBe('create');
      expect(logs[1].action).toBe('read');
      expect(logs[2].action).toBe('update');
      expect(logs[3].action).toBe('delete');
    });
  });

  describe('getLogs', () => {
    beforeEach(async () => {
      // Create test audit logs
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'update',
        resourceType: 'subscription',
        endpoint: '/admin/subscriptions/123',
        method: 'PATCH',
        statusCode: 200
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'delete',
        resourceType: 'coupon',
        endpoint: '/admin/coupons/456',
        method: 'DELETE',
        statusCode: 200
      });

      await auditService.log({
        adminUserId: testAdmin2Id,
        action: 'create',
        resourceType: 'license',
        endpoint: '/admin/licenses',
        method: 'POST',
        statusCode: 201
      });
    });

    it('should filter by admin user ID', async () => {
      const logs = await auditService.getLogs({ adminUserId: testAdminId });

      expect(logs).toHaveLength(3);
      logs.forEach(log => {
        expect(log.admin_user_id).toBe(testAdminId);
      });
    });

    it('should filter by resource type', async () => {
      const logs = await auditService.getLogs({ resourceType: 'subscription' });

      expect(logs).toHaveLength(2);
      logs.forEach(log => {
        expect(log.resource_type).toBe('subscription');
      });
    });

    it('should filter by action', async () => {
      const logs = await auditService.getLogs({ action: 'create' });

      expect(logs).toHaveLength(2);
      logs.forEach(log => {
        expect(log.action).toBe('create');
      });
    });

    it('should filter by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      const logs = await auditService.getLogs({
        startDate: yesterday,
        endDate: tomorrow
      });

      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('should combine multiple filters', async () => {
      const logs = await auditService.getLogs({
        adminUserId: testAdminId,
        resourceType: 'subscription',
        action: 'create'
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].admin_user_id).toBe(testAdminId);
      expect(logs[0].resource_type).toBe('subscription');
      expect(logs[0].action).toBe('create');
    });

    it('should respect limit parameter', async () => {
      const logs = await auditService.getLogs({ limit: 2 });

      expect(logs).toHaveLength(2);
    });

    it('should respect offset parameter', async () => {
      const allLogs = await auditService.getLogs({});
      const offsetLogs = await auditService.getLogs({ offset: 1 });

      expect(offsetLogs.length).toBe(allLogs.length - 1);
    });

    it('should default to 100 records limit', async () => {
      // Create more than 100 logs
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(auditService.log({
          adminUserId: testAdminId,
          action: 'read',
          resourceType: 'test',
          endpoint: '/admin/test',
          method: 'GET',
          statusCode: 200
        }));
      }
      await Promise.all(promises);

      const logs = await auditService.getLogs({});

      expect(logs).toHaveLength(100);
    });

    it('should order by timestamp descending (newest first)', async () => {
      const logs = await auditService.getLogs({});

      // Verify descending order
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i].timestamp.getTime()
        );
      }
    });

    it('should include admin user details', async () => {
      const logs = await auditService.getLogs({ adminUserId: testAdminId });

      expect(logs[0].admin_user).toBeDefined();
      expect(logs[0].admin_user.id).toBe(testAdminId);
      expect(logs[0].admin_user.email).toBe('admin1@example.com');
      expect(logs[0].admin_user.firstName).toBe('Admin');
      expect(logs[0].admin_user.lastName).toBe('One');
    });
  });

  describe('getLogsForResource', () => {
    beforeEach(async () => {
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'update',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions/sub-123',
        method: 'PATCH',
        statusCode: 200
      });

      await auditService.log({
        adminUserId: testAdmin2Id,
        action: 'delete',
        resourceType: 'subscription',
        resourceId: 'sub-123',
        endpoint: '/admin/subscriptions/sub-123',
        method: 'DELETE',
        statusCode: 200
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'subscription',
        resourceId: 'sub-456',
        endpoint: '/admin/subscriptions',
        method: 'POST',
        statusCode: 201
      });
    });

    it('should retrieve all logs for a specific resource', async () => {
      const logs = await auditService.getLogsForResource('subscription', 'sub-123');

      expect(logs).toHaveLength(3);
      logs.forEach(log => {
        expect(log.resource_type).toBe('subscription');
        expect(log.resource_id).toBe('sub-123');
      });
    });

    it('should show complete audit trail for a resource', async () => {
      const logs = await auditService.getLogsForResource('subscription', 'sub-123');

      expect(logs[0].action).toBe('delete'); // Most recent
      expect(logs[1].action).toBe('update');
      expect(logs[2].action).toBe('create'); // Oldest
    });

    it('should respect limit parameter', async () => {
      const logs = await auditService.getLogsForResource('subscription', 'sub-123', 2);

      expect(logs).toHaveLength(2);
    });

    it('should include admin user details', async () => {
      const logs = await auditService.getLogsForResource('subscription', 'sub-123');

      logs.forEach(log => {
        expect(log.admin_user).toBeDefined();
        expect(log.admin_user.id).toBeDefined();
        expect(log.admin_user.email).toBeDefined();
      });
    });
  });

  describe('getLogsForAdmin', () => {
    beforeEach(async () => {
      // Admin 1 creates 3 logs
      for (let i = 0; i < 3; i++) {
        await auditService.log({
          adminUserId: testAdminId,
          action: 'create',
          resourceType: 'subscription',
          endpoint: '/admin/subscriptions',
          method: 'POST',
          statusCode: 201
        });
      }

      // Admin 2 creates 2 logs
      for (let i = 0; i < 2; i++) {
        await auditService.log({
          adminUserId: testAdmin2Id,
          action: 'delete',
          resourceType: 'coupon',
          endpoint: '/admin/coupons/123',
          method: 'DELETE',
          statusCode: 200
        });
      }
    });

    it('should retrieve all logs for a specific admin', async () => {
      const logs = await auditService.getLogsForAdmin(testAdminId);

      expect(logs).toHaveLength(3);
      logs.forEach(log => {
        expect(log.admin_user_id).toBe(testAdminId);
      });
    });

    it('should respect limit parameter', async () => {
      const logs = await auditService.getLogsForAdmin(testAdminId, 2);

      expect(logs).toHaveLength(2);
    });

    it('should default to 100 records limit', async () => {
      const logs = await auditService.getLogsForAdmin(testAdminId);

      // Default limit is 100, should not exceed that
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should order by timestamp descending', async () => {
      const logs = await auditService.getLogsForAdmin(testAdminId);

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i].timestamp.getTime()
        );
      }
    });
  });

  describe('getLogCount', () => {
    beforeEach(async () => {
      // Create multiple logs
      for (let i = 0; i < 5; i++) {
        await auditService.log({
          adminUserId: testAdminId,
          action: 'create',
          resourceType: 'subscription',
          endpoint: '/admin/subscriptions',
          method: 'POST',
          statusCode: 201
        });
      }

      for (let i = 0; i < 3; i++) {
        await auditService.log({
          adminUserId: testAdmin2Id,
          action: 'delete',
          resourceType: 'coupon',
          endpoint: '/admin/coupons/123',
          method: 'DELETE',
          statusCode: 200
        });
      }
    });

    it('should count all logs when no filters', async () => {
      const count = await auditService.getLogCount({});

      expect(count).toBeGreaterThanOrEqual(8);
    });

    it('should count logs filtered by admin user', async () => {
      const count = await auditService.getLogCount({ adminUserId: testAdminId });

      expect(count).toBe(5);
    });

    it('should count logs filtered by resource type', async () => {
      const count = await auditService.getLogCount({ resourceType: 'subscription' });

      expect(count).toBe(5);
    });

    it('should count logs filtered by action', async () => {
      const count = await auditService.getLogCount({ action: 'delete' });

      expect(count).toBe(3);
    });

    it('should count logs with combined filters', async () => {
      const count = await auditService.getLogCount({
        adminUserId: testAdminId,
        resourceType: 'subscription',
        action: 'create'
      });

      expect(count).toBe(5);
    });
  });

  describe('Compliance Requirements', () => {
    it('should support SOC 2 Type II audit trail requirements', async () => {
      // Create, update, delete sequence
      await auditService.log({
        adminUserId: testAdminId,
        action: 'create',
        resourceType: 'user',
        resourceId: 'user-123',
        endpoint: '/admin/users',
        method: 'POST',
        statusCode: 201,
        newValue: { email: 'test@example.com', role: 'user' }
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'update',
        resourceType: 'user',
        resourceId: 'user-123',
        endpoint: '/admin/users/user-123',
        method: 'PATCH',
        statusCode: 200,
        previousValue: { email: 'test@example.com', role: 'user' },
        newValue: { email: 'test@example.com', role: 'admin' }
      });

      await auditService.log({
        adminUserId: testAdminId,
        action: 'delete',
        resourceType: 'user',
        resourceId: 'user-123',
        endpoint: '/admin/users/user-123',
        method: 'DELETE',
        statusCode: 200,
        previousValue: { email: 'test@example.com', role: 'admin' }
      });

      const logs = await auditService.getLogsForResource('user', 'user-123');

      // Verify complete audit trail
      expect(logs).toHaveLength(3);
      expect(logs[0].action).toBe('delete');
      expect(logs[1].action).toBe('update');
      expect(logs[2].action).toBe('create');

      // Verify before/after states
      expect(logs[1].previous_value).toEqual({ email: 'test@example.com', role: 'user' });
      expect(logs[1].new_value).toEqual({ email: 'test@example.com', role: 'admin' });
    });

    it('should support GDPR Article 30 record-keeping requirements', async () => {
      // GDPR requires who, what, when, why for data processing
      await auditService.log({
        adminUserId: testAdminId, // WHO
        action: 'update', // WHAT (action)
        resourceType: 'user', // WHAT (resource)
        resourceId: 'user-123',
        endpoint: '/admin/users/user-123', // WHERE (endpoint)
        method: 'PATCH',
        statusCode: 200,
        requestBody: { gdprConsent: true }, // WHY (intent)
        ipAddress: '192.168.1.1', // SOURCE
        timestamp: new Date() // WHEN
      });

      const logs = await auditService.getLogs({ adminUserId: testAdminId });

      expect(logs[0].admin_user_id).toBeDefined(); // WHO
      expect(logs[0].action).toBeDefined(); // WHAT
      expect(logs[0].resource_type).toBeDefined(); // WHAT
      expect(logs[0].endpoint).toBeDefined(); // WHERE
      expect(logs[0].request_body).toBeDefined(); // WHY
      expect(logs[0].ip_address).toBeDefined(); // SOURCE
      expect(logs[0].timestamp).toBeDefined(); // WHEN
    });
  });
});
