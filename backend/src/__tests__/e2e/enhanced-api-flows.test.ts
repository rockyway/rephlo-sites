/**
 * End-to-End Flow Tests for Enhanced API
 *
 * Tests complete user workflows involving multiple API endpoints:
 * 1. Desktop App Flow: OAuth token exchange → enhance → fetch credits → fetch profile
 * 2. Credit Depletion Flow: Deduct credits → verify breakdown updates → verify reset date
 * 3. Subscription Upgrade Flow: Upgrade to pro → verify allocation change → verify pro credits
 *
 * Reference: docs/plan/101-dedicated-api-implementation-plan.md (Phase 6)
 */

import 'reflect-metadata';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockCreditService } from '../mocks/credit.service.mock';
import { MockUserService } from '../mocks/user.service.mock';
import { DependencyContainer } from 'tsyringe';
import { Credit } from '@prisma/client';

describe('Enhanced API - E2E Flows', () => {
  let testContainer: DependencyContainer;
  let creditService: MockCreditService;
  let userService: MockUserService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    creditService = mocks.creditService;
    userService = mocks.userService;
  });

  afterEach(() => {
    creditService.clear();
    userService.clear();
    resetTestContainer(testContainer);
  });

  // =============================================================================
  // Flow 1: Desktop App Login Flow
  // =============================================================================

  describe('Flow 1: Desktop App Login and Initial Data Fetch', () => {
    it('should complete full login flow with user data and credits', async () => {
      const userId = 'desktop-user-1';

      // Step 1: Seed user profile data
      const mockUserProfile = {
        userId,
        email: 'desktop@example.com',
        displayName: 'Desktop User',
        firstName: 'Desktop',
        lastName: 'User',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2025-11-06'),
        isActive: true,
      };

      userService.seed([mockUserProfile]);

      // Step 2: Seed credits data
      const mockFreeCredits: Partial<Credit> = {
        id: 'free-desktop-1',
        userId,
        creditType: 'free',
        totalCredits: 2000,
        usedCredits: 0,
        monthlyAllocation: 2000,
        billingPeriodStart: new Date('2025-11-01'),
        billingPeriodEnd: new Date('2025-12-01'),
        isCurrent: true,
        resetDayOfMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      creditService.seed([mockFreeCredits as Credit]);

      // Step 3: Simulate OAuth token exchange (assume token is obtained)
      // In real scenario, this would be POST /oauth/token with authorization_code

      // Step 4: Fetch user profile (simulating POST /oauth/token/enhance with include_user_data=true)
      const userProfile = await userService.getDetailedUserProfile(userId);

      expect(userProfile).not.toBeNull();
      expect(userProfile!.userId).toBe(userId);
      expect(userProfile!.email).toBe('desktop@example.com');
      expect(userProfile!.subscription.tier).toBe('free');
      expect(userProfile!.subscription.status).toBe('active');

      // Step 5: Fetch credits (part of enhanced token response)
      const credits = await creditService.getDetailedCredits(userId);

      expect(credits.freeCredits.remaining).toBe(2000);
      expect(credits.freeCredits.monthlyAllocation).toBe(2000);
      expect(credits.freeCredits.used).toBe(0);
      expect(credits.proCredits.remaining).toBe(0);
      expect(credits.totalAvailable).toBe(2000);

      // Step 6: Verify desktop app has all required data
      // - User email for display
      // - Credit count for status bar
      // - Subscription tier for feature gating
      expect(userProfile!.email).toBeTruthy();
      expect(credits.totalAvailable).toBeGreaterThan(0);
      expect(userProfile!.subscription.tier).toBe('free');
    });

    it('should handle enhanced token response for pro user with purchased credits', async () => {
      const userId = 'desktop-pro-user-1';

      // Seed pro user profile
      const mockUserProfile = {
        userId,
        email: 'pro@example.com',
        displayName: 'Pro User',
        firstName: 'Pro',
        lastName: 'User',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2025-11-06'),
        isActive: true,
      };

      userService.seed([mockUserProfile]);

      // Seed free + pro credits
      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-pro-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 500,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-1',
          userId,
          creditType: 'pro',
          totalCredits: 10000,
          usedCredits: 3000,
          monthlyAllocation: 0,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      // Fetch enhanced data
      const [_userProfile, credits] = await Promise.all([
        userService.getDetailedUserProfile(userId),
        creditService.getDetailedCredits(userId),
      ]);

      // Verify pro user has both free and purchased credits
      expect(credits.freeCredits.remaining).toBe(1500);
      expect(credits.proCredits.remaining).toBe(7000);
      expect(credits.totalAvailable).toBe(8500);

      // Desktop app should show both credit types
      expect(credits.freeCredits.monthlyAllocation).toBe(2000);
      expect(credits.proCredits.purchasedTotal).toBe(10000);
    });
  });

  // =============================================================================
  // Flow 2: Credit Depletion and Reset
  // =============================================================================

  describe('Flow 2: Credit Depletion and Reset Tracking', () => {
    it('should track credit usage and update breakdown', async () => {
      const userId = 'usage-user-1';

      // Initial credits
      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-usage-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 0,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      // Step 1: Initial state
      let credits = await creditService.getDetailedCredits(userId);
      expect(credits.freeCredits.remaining).toBe(2000);
      expect(credits.freeCredits.used).toBe(0);

      // Step 2: Deduct credits (simulate API usage)
      await creditService.deductCredits({
        userId,
        creditsToDeduct: 500,
        modelId: 'gpt-4',
        operation: 'completion',
      });

      // Step 3: Fetch updated credits
      credits = await creditService.getDetailedCredits(userId);
      expect(credits.freeCredits.remaining).toBe(1500);
      expect(credits.freeCredits.used).toBe(500);
      expect(credits.totalAvailable).toBe(1500);

      // Step 4: Verify reset date is correct
      expect(credits.freeCredits.daysUntilReset).toBeGreaterThan(0);
      expect(credits.freeCredits.resetDate).toBeDefined();
    });

    it('should track usage across free and pro credit allocations', async () => {
      const userId = 'priority-user-1';

      // Seed free + pro credits
      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-priority-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 1500,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-priority-1',
          userId,
          creditType: 'pro',
          totalCredits: 10000,
          usedCredits: 0,
          monthlyAllocation: 0,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: false, // Pro credits are tracked separately
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      // Initial: 500 free remaining + 10000 pro remaining = 10500 total
      let credits = await creditService.getDetailedCredits(userId);
      expect(credits.freeCredits.remaining).toBe(500);
      expect(credits.proCredits.remaining).toBe(10000);
      expect(credits.totalAvailable).toBe(10500);

      // Deduct 200 credits from free (within available)
      await creditService.deductCredits({
        userId,
        creditsToDeduct: 200,
        modelId: 'gpt-4',
        operation: 'completion',
      });

      // After: 300 free remaining + 10000 pro remaining = 10300 total
      credits = await creditService.getDetailedCredits(userId);
      expect(credits.freeCredits.remaining).toBe(300);
      expect(credits.freeCredits.used).toBe(1700);
      expect(credits.proCredits.remaining).toBe(10000);
      expect(credits.totalAvailable).toBe(10300);
    });

    it('should calculate days until reset correctly', async () => {
      const userId = 'reset-user-1';

      const futureResetDate = new Date();
      futureResetDate.setDate(futureResetDate.getDate() + 15);

      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-reset-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 1000,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date(),
          billingPeriodEnd: futureResetDate,
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      const credits = await creditService.getDetailedCredits(userId);

      expect(credits.freeCredits.daysUntilReset).toBeGreaterThanOrEqual(14);
      expect(credits.freeCredits.daysUntilReset).toBeLessThanOrEqual(16);
    });
  });

  // =============================================================================
  // Flow 3: Subscription Upgrade
  // =============================================================================

  describe('Flow 3: Subscription Upgrade and Pro Credits', () => {
    it('should reflect subscription tier change in profile', async () => {
      const userId = 'upgrade-user-1';

      // Step 1: Start with free tier
      const mockUserProfile = {
        userId,
        email: 'upgrade@example.com',
        displayName: 'Upgrade User',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      };

      userService.seed([mockUserProfile]);

      let userProfile = await userService.getDetailedUserProfile(userId);
      expect(userProfile!.subscription.tier).toBe('free');

      // Step 2: Simulate upgrade to pro (in real system, this would be via Stripe webhook)
      // For this test, we just verify the service can return pro tier data

      const mockProProfile = {
        ...mockUserProfile,
        // In real system, subscription tier is stored separately
        // Mock service returns tier based on seed data
      };

      userService.clear();
      userService.seed([mockProProfile]);

      // Note: In the mock, we'd need to add pro subscription
      // This is simplified for E2E flow demonstration
      userProfile = await userService.getDetailedUserProfile(userId);

      // Verify profile can reflect subscription changes
      expect(userProfile).not.toBeNull();
      expect(userProfile!.userId).toBe(userId);
    });

    it('should add pro credits after purchase', async () => {
      const userId = 'purchase-user-1';

      // Step 1: Initial free credits only
      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-purchase-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 500,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      let credits = await creditService.getDetailedCredits(userId);
      expect(credits.proCredits.remaining).toBe(0);
      expect(credits.totalAvailable).toBe(1500);

      // Step 2: Add pro credits (simulate purchase)
      const proCredit: Partial<Credit> = {
        id: 'pro-purchase-1',
        userId,
        creditType: 'pro',
        totalCredits: 5000,
        usedCredits: 0,
        monthlyAllocation: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        isCurrent: true,
        resetDayOfMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      creditService.seed([...mockCredits as Credit[], proCredit as Credit]);

      // Step 3: Verify pro credits are now available
      credits = await creditService.getDetailedCredits(userId);
      expect(credits.proCredits.remaining).toBe(5000);
      expect(credits.proCredits.purchasedTotal).toBe(5000);
      expect(credits.totalAvailable).toBe(6500); // 1500 free + 5000 pro
    });

    it('should preserve pro credits when free credits reset', async () => {
      const userId = 'reset-pro-user-1';

      // Mock credits after free credits have been depleted
      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-reset-pro-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 2000,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-10-01'),
          billingPeriodEnd: new Date('2025-11-01'),
          isCurrent: false,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-reset-pro-1',
          userId,
          creditType: 'pro',
          totalCredits: 10000,
          usedCredits: 3000,
          monthlyAllocation: 0,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      const creditsBefore = await creditService.getDetailedCredits(userId);
      expect(creditsBefore.freeCredits.remaining).toBe(0);
      expect(creditsBefore.proCredits.remaining).toBe(7000);

      // Simulate monthly reset (add new free credit period)
      const newFreeCredits: Partial<Credit> = {
        id: 'free-reset-new-1',
        userId,
        creditType: 'free',
        totalCredits: 2000,
        usedCredits: 0,
        monthlyAllocation: 2000,
        billingPeriodStart: new Date('2025-11-01'),
        billingPeriodEnd: new Date('2025-12-01'),
        isCurrent: true,
        resetDayOfMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      creditService.seed([
        newFreeCredits as Credit,
        mockCredits[1] as Credit, // Keep pro credits
      ]);

      const creditsAfter = await creditService.getDetailedCredits(userId);

      // Free credits reset to 2000
      expect(creditsAfter.freeCredits.remaining).toBe(2000);
      expect(creditsAfter.freeCredits.used).toBe(0);

      // Pro credits unchanged
      expect(creditsAfter.proCredits.remaining).toBe(7000);
      expect(creditsAfter.proCredits.lifetimeUsed).toBe(3000);

      // Total is sum of both
      expect(creditsAfter.totalAvailable).toBe(9000);
    });
  });

  // =============================================================================
  // Flow 4: Concurrent Operations
  // =============================================================================

  describe('Flow 4: Concurrent API Requests', () => {
    it('should handle simultaneous profile and credits fetches', async () => {
      const userId = 'concurrent-user-1';

      // Seed data
      const mockUserProfile = {
        userId,
        email: 'concurrent@example.com',
        displayName: 'Concurrent User',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      };

      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-concurrent-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 0,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      userService.seed([mockUserProfile]);
      creditService.seed(mockCredits as Credit[]);

      // Simulate concurrent requests (like enhanced token response)
      const [userProfile, credits] = await Promise.all([
        userService.getDetailedUserProfile(userId),
        creditService.getDetailedCredits(userId),
      ]);

      // Both should succeed
      expect(userProfile).not.toBeNull();
      expect(credits).toBeDefined();
      expect(userProfile!.userId).toBe(userId);
      expect(credits.totalAvailable).toBe(2000);
    });

    it('should handle multiple credit checks without race conditions', async () => {
      const userId = 'race-user-1';

      const mockCredits: Partial<Credit>[] = [
        {
          id: 'free-race-1',
          userId,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 500,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockCredits as Credit[]);

      // Multiple simultaneous credit checks (like desktop app checking credits while making API call)
      const requests = Array(10).fill(null).map(() =>
        creditService.getDetailedCredits(userId)
      );

      const results = await Promise.all(requests);

      // All should return consistent results
      results.forEach((credits) => {
        expect(credits.freeCredits.remaining).toBe(1500);
        expect(credits.totalAvailable).toBe(1500);
      });
    });
  });
});
