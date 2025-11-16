import { credits } from '@prisma/client';
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
  private credits: Map<string, credits> = new Map();

  async getCurrentCredits(userId: string): Promise<credits | null> {
    const userCredits = Array.from(this.credits.values()).filter(
      (c) => c.user_id === userId && c.is_current
    );

    return userCredits[0] || null;
  }

  async allocateCredits(input: AllocateCreditsInput): Promise<credits> {
    // Mark existing credits as not current
    Array.from(this.credits.values())
      .filter((c) => c.user_id === input.userId && c.is_current)
      .forEach((c) => (c.is_current = false));

    const credit: credits = {
      id: `mock-credit-${Date.now()}-${Math.random()}`,
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      total_credits: input.totalCredits,
      used_credits: 0,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      is_current: true,
      credit_type: 'free',
      monthly_allocation: 2000,
      reset_day_of_month: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.credits.set(credit.id, credit);
    return credit;
  }

  async hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const credit = await this.getCurrentCredits(userId);
    if (!credit) return false;

    const remaining = credit.total_credits - credit.used_credits;
    return remaining >= requiredCredits;
  }

  async deductCredits(input: DeductCreditsInput): Promise<credits> {
    const credit = await this.getCurrentCredits(input.userId);
    if (!credit) {
      throw new Error('No active credit record found');
    }

    const remaining = credit.total_credits - credit.used_credits;
    if (remaining < input.creditsToDeduct) {
      throw new Error('Insufficient credits');
    }

    credit.used_credits += input.creditsToDeduct;
    credit.updated_at = new Date();

    return credit;
  }

  async getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<credits | null> {
    return (
      Array.from(this.credits.values()).find(
        (c) =>
          c.user_id === userId &&
          c.billing_period_start >= billingPeriodStart &&
          c.billing_period_end <= billingPeriodEnd
      ) || null
    );
  }

  async getCreditHistory(userId: string, limit = 12): Promise<credits[]> {
    return Array.from(this.credits.values())
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  calculateRemainingCredits(credit: credits): number {
    return credit.total_credits - credit.used_credits;
  }

  calculateUsagePercentage(credit: credits): number {
    if (credit.total_credits === 0) return 0;
    return (credit.used_credits / credit.total_credits) * 100;
  }

  isCreditsLow(credit: credits, thresholdPercentage = 10): boolean {
    const usagePercentage = this.calculateUsagePercentage(credit);
    const remainingPercentage = 100 - usagePercentage;
    return remainingPercentage <= thresholdPercentage;
  }

  // Phase 2 enhanced methods
  async getFreeCreditsBreakdown(userId: string): Promise<any> {
    const freeCredit = Array.from(this.credits.values()).find(
      (c) => c.user_id === userId && c.credit_type === 'free' && c.is_current
    );

    if (!freeCredit) {
      return {
        remaining: 0,
        monthlyAllocation: 2000,
        used: 0,
        resetDate: new Date(),
        daysUntilReset: 30,
      };
    }

    return {
      remaining: freeCredit.total_credits - freeCredit.used_credits,
      monthlyAllocation: freeCredit.monthly_allocation,
      used: freeCredit.used_credits,
      resetDate: freeCredit.billing_period_end,
      daysUntilReset: this.calculateDaysUntilReset(freeCredit.billing_period_end),
    };
  }

  async getProCreditsBreakdown(userId: string): Promise<any> {
    const proCredits = Array.from(this.credits.values()).filter(
      (c) => c.user_id === userId && c.credit_type === 'pro'
    );

    if (proCredits.length === 0) {
      return {
        remaining: 0,
        purchasedTotal: 0,
        lifetimeUsed: 0,
      };
    }

    const purchasedTotal = proCredits.reduce((sum, c) => sum + c.total_credits, 0);
    const lifetimeUsed = proCredits.reduce((sum, c) => sum + c.used_credits, 0);

    return {
      remaining: purchasedTotal - lifetimeUsed,
      purchasedTotal,
      lifetimeUsed,
    };
  }

  async getDetailedCredits(userId: string): Promise<any> {
    const [freeCredits, proCredits] = await Promise.all([
      this.getFreeCreditsBreakdown(userId),
      this.getProCreditsBreakdown(userId),
    ]);

    return {
      freeCredits,
      proCredits,
      totalAvailable: freeCredits.remaining + proCredits.remaining,
      lastUpdated: new Date(),
    };
  }

  calculateResetDate(billingPeriodEnd: Date, _resetDayOfMonth: number): Date {
    return billingPeriodEnd;
  }

  calculateDaysUntilReset(resetDate: Date): number {
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }

  // Test helpers
  clear() {
    this.credits.clear();
  }

  seed(credits: credits[]) {
    credits.forEach((credit) => this.credits.set(credit.id, credit));
  }

  getAll(): credits[] {
    return Array.from(this.credits.values());
  }
}
