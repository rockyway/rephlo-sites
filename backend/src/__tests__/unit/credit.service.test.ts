import 'reflect-metadata';
import { Credit } from '@prisma/client';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockCreditService } from '../mocks/credit.service.mock';
import { DependencyContainer } from 'tsyringe';

describe('CreditService', () => {
  let testContainer: DependencyContainer;
  let creditService: MockCreditService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    creditService = mocks.creditService;
  });

  afterEach(() => {
    creditService.clear();
    resetTestContainer(testContainer);
  });

  describe('getCurrentCredits', () => {
    it('should return current credits for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([credit as Credit]);

      // Act
      const result = await creditService.getCurrentCredits(userId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.totalCredits).toBe(1000);
      expect(result?.usedCredits).toBe(0);
    });

    it('should return null if user has no credits', async () => {
      // Act
      const result = await creditService.getCurrentCredits('non-existent-user');

      // Assert
      expect(result).toBeNull();
    });

    it('should only return current credits (isCurrent=true)', async () => {
      // Arrange
      const userId = 'user-123';
      const oldCredit: Partial<Credit> = {
        id: 'credit-old',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 500,
        usedCredits: 500,
        billingPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        isCurrent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const currentCredit: Partial<Credit> = {
        id: 'credit-current',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 100,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([oldCredit as Credit, currentCredit as Credit]);

      // Act
      const result = await creditService.getCurrentCredits(userId);

      // Assert
      expect(result?.id).toBe('credit-current');
      expect(result?.isCurrent).toBe(true);
    });
  });

  describe('allocateCredits', () => {
    it('should allocate new credits to a user', async () => {
      // Arrange
      const input = {
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Act
      const result = await creditService.allocateCredits(input);

      // Assert
      expect(result.userId).toBe(input.userId);
      expect(result.totalCredits).toBe(1000);
      expect(result.usedCredits).toBe(0);
      expect(result.isCurrent).toBe(true);
    });

    it('should mark existing credits as not current when allocating new credits', async () => {
      // Arrange
      const userId = 'user-123';
      const existingCredit: Partial<Credit> = {
        id: 'credit-old',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 500,
        usedCredits: 300,
        billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([existingCredit as Credit]);

      const input = {
        userId,
        subscriptionId: 'sub-2',
        totalCredits: 1000,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Act
      const result = await creditService.allocateCredits(input);

      // Assert
      const allCredits = creditService.getAll();
      const oldCredit = allCredits.find((c) => c.id === 'credit-old');
      expect(oldCredit?.isCurrent).toBe(false);
      expect(result.isCurrent).toBe(true);
    });
  });

  describe('hasAvailableCredits', () => {
    it('should return true if user has sufficient credits', async () => {
      // Arrange
      const userId = 'user-123';
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 500,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([credit as Credit]);

      // Act
      const result = await creditService.hasAvailableCredits(userId, 100);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user has insufficient credits', async () => {
      // Arrange
      const userId = 'user-123';
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 950,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([credit as Credit]);

      // Act
      const result = await creditService.hasAvailableCredits(userId, 100);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if user has no credits', async () => {
      // Act
      const result = await creditService.hasAvailableCredits('non-existent-user', 100);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits from user balance', async () => {
      // Arrange
      const userId = 'user-123';
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 100,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([credit as Credit]);

      const input = {
        userId,
        creditsToDeduct: 50,
        modelId: 'gpt-4',
        operation: 'chat',
      };

      // Act
      const result = await creditService.deductCredits(input);

      // Assert
      expect(result.usedCredits).toBe(150);
      expect(result.totalCredits).toBe(1000);
    });

    it('should throw error if user has no credits', async () => {
      // Arrange
      const input = {
        userId: 'non-existent-user',
        creditsToDeduct: 50,
        modelId: 'gpt-4',
        operation: 'chat',
      };

      // Act & Assert
      await expect(creditService.deductCredits(input)).rejects.toThrow(
        'No active credit record found'
      );
    });

    it('should throw error if user has insufficient credits', async () => {
      // Arrange
      const userId = 'user-123';
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 990,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      creditService.seed([credit as Credit]);

      const input = {
        userId,
        creditsToDeduct: 50,
        modelId: 'gpt-4',
        operation: 'chat',
      };

      // Act & Assert
      await expect(creditService.deductCredits(input)).rejects.toThrow('Insufficient credits');
    });
  });

  describe('getCreditHistory', () => {
    it('should return credit history for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const credits: Partial<Credit>[] = [
        {
          id: 'credit-1',
          userId,
          subscriptionId: 'sub-1',
          totalCredits: 1000,
          usedCredits: 1000,
          billingPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          billingPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          isCurrent: false,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
        {
          id: 'credit-2',
          userId,
          subscriptionId: 'sub-1',
          totalCredits: 1000,
          usedCredits: 500,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      creditService.seed(credits as Credit[]);

      // Act
      const result = await creditService.getCreditHistory(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('credit-2'); // Most recent first
      expect(result[1].id).toBe('credit-1');
    });

    it('should limit credit history results', async () => {
      // Arrange
      const userId = 'user-123';
      const credits: Partial<Credit>[] = Array.from({ length: 20 }, (_, i) => ({
        id: `credit-${i}`,
        userId,
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 0,
        billingPeriodStart: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(Date.now() - (i - 1) * 30 * 24 * 60 * 60 * 1000),
        isCurrent: i === 0,
        createdAt: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }));
      creditService.seed(credits as Credit[]);

      // Act
      const result = await creditService.getCreditHistory(userId, 5);

      // Assert
      expect(result).toHaveLength(5);
    });
  });

  describe('calculateRemainingCredits', () => {
    it('should calculate remaining credits correctly', () => {
      // Arrange
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 300,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const remaining = creditService.calculateRemainingCredits(credit as Credit);

      // Assert
      expect(remaining).toBe(700);
    });
  });

  describe('calculateUsagePercentage', () => {
    it('should calculate usage percentage correctly', () => {
      // Arrange
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 250,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const percentage = creditService.calculateUsagePercentage(credit as Credit);

      // Assert
      expect(percentage).toBe(25);
    });

    it('should handle zero credits', () => {
      // Arrange
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 0,
        usedCredits: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const percentage = creditService.calculateUsagePercentage(credit as Credit);

      // Assert
      expect(percentage).toBe(0);
    });
  });

  describe('isCreditsLow', () => {
    it('should return true if credits are below threshold', () => {
      // Arrange
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 950, // 95% used, 5% remaining
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const isLow = creditService.isCreditsLow(credit as Credit, 10);

      // Assert
      expect(isLow).toBe(true);
    });

    it('should return false if credits are above threshold', () => {
      // Arrange
      const credit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-123',
        subscriptionId: 'sub-1',
        totalCredits: 1000,
        usedCredits: 500, // 50% used, 50% remaining
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const isLow = creditService.isCreditsLow(credit as Credit, 10);

      // Assert
      expect(isLow).toBe(false);
    });
  });
});
