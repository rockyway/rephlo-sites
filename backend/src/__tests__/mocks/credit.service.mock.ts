import { Credit } from '@prisma/client';
import { ICreditService } from '../../interfaces';

export interface AllocateCreditsInput {
  userId: string;
  subscriptionId: string;
  totalCredits: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

export interface DeductCreditsInput {
  userId: string;
  creditsToDeduct: number;
  modelId: string;
  operation: string;
}

export class MockCreditService implements ICreditService {
  private credits: Map<string, Credit> = new Map();

  async getCurrentCredits(userId: string): Promise<Credit | null> {
    const userCredits = Array.from(this.credits.values()).filter(
      (c) => c.userId === userId && c.isCurrent
    );

    return userCredits[0] || null;
  }

  async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
    // Mark existing credits as not current
    Array.from(this.credits.values())
      .filter((c) => c.userId === input.userId && c.isCurrent)
      .forEach((c) => (c.isCurrent = false));

    const credit: Credit = {
      id: `mock-credit-${Date.now()}-${Math.random()}`,
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      totalCredits: input.totalCredits,
      usedCredits: 0,
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.credits.set(credit.id, credit);
    return credit;
  }

  async hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const credit = await this.getCurrentCredits(userId);
    if (!credit) return false;

    const remaining = credit.totalCredits - credit.usedCredits;
    return remaining >= requiredCredits;
  }

  async deductCredits(input: DeductCreditsInput): Promise<Credit> {
    const credit = await this.getCurrentCredits(input.userId);
    if (!credit) {
      throw new Error('No active credit record found');
    }

    const remaining = credit.totalCredits - credit.usedCredits;
    if (remaining < input.creditsToDeduct) {
      throw new Error('Insufficient credits');
    }

    credit.usedCredits += input.creditsToDeduct;
    credit.updatedAt = new Date();

    return credit;
  }

  async getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Credit | null> {
    return (
      Array.from(this.credits.values()).find(
        (c) =>
          c.userId === userId &&
          c.billingPeriodStart >= billingPeriodStart &&
          c.billingPeriodEnd <= billingPeriodEnd
      ) || null
    );
  }

  async getCreditHistory(userId: string, limit = 12): Promise<Credit[]> {
    return Array.from(this.credits.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  calculateRemainingCredits(credit: Credit): number {
    return credit.totalCredits - credit.usedCredits;
  }

  calculateUsagePercentage(credit: Credit): number {
    if (credit.totalCredits === 0) return 0;
    return (credit.usedCredits / credit.totalCredits) * 100;
  }

  isCreditsLow(credit: Credit, thresholdPercentage = 10): boolean {
    const usagePercentage = this.calculateUsagePercentage(credit);
    const remainingPercentage = 100 - usagePercentage;
    return remainingPercentage <= thresholdPercentage;
  }

  // Test helpers
  clear() {
    this.credits.clear();
  }

  seed(credits: Credit[]) {
    credits.forEach((credit) => this.credits.set(credit.id, credit));
  }

  getAll(): Credit[] {
    return Array.from(this.credits.values());
  }
}
