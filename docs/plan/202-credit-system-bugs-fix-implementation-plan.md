# Implementation Plan: Credit System Critical Bugs Fix

**Plan ID**: 202
**Created**: 2025-11-17
**Target Launch**: March 2026
**Phase**: Development & Local Testing
**Priority**: 🔴 URGENT (Revenue Protection)

---

## Executive Summary

This plan addresses three critical bugs discovered in the credit management system that allow free LLM API usage and prevent proper subscription functionality. Implementation must be completed before production launch.

**Related Documents**:
- Analysis: `docs/troubleshooting/001-credit-system-critical-bugs.md`
- Original Bug Report: User session 2025-11-17

---

## Implementation Timeline

### Phase 1: URGENT - Revenue Protection (Day 1)
**Bug #3**: Pre-validate credits before LLM calls

### Phase 2: HIGH - Subscription Functionality (Day 2)
**Bug #2**: Fix subscription balance creation

### Phase 3: MEDIUM - Developer Experience (Day 3)
**Bug #1**: Fix seed script

### Phase 4: Testing & Verification (Day 4)
Integration testing and documentation

---

## Bug #3: Credit Pre-Validation (URGENT)

### Problem Statement
Credit validation occurs AFTER LLM API calls complete, allowing users with insufficient credits to receive responses for free.

### Files to Modify
- `backend/src/services/llm.service.ts`
- `backend/src/services/credit-deduction.service.ts` (add estimation method)

### Implementation Strategy

#### Step 1: Add Credit Estimation Method

File: `backend/src/services/credit-deduction.service.ts`

```typescript
/**
 * Estimate credit cost for a request (pre-flight check)
 * Uses conservative estimation to prevent undercharging
 * Formula: credits = ceil(estimatedTokens × maxPricePerToken × marginMultiplier × 100)
 */
async estimateCreditsForRequest(
  userId: string,
  modelId: string,
  providerName: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): Promise<number> {
  try {
    // Get provider ID
    const provider = await this.prisma.providers.findUnique({
      where: { name: providerName },
      select: { id: true },
    });

    if (!provider) {
      // Conservative fallback: assume high cost
      return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
    }

    // Get pricing config for this model
    const pricing = await this.prisma.pricing_configs.findFirst({
      where: {
        provider_id: provider.id,
        model_id: modelId,
      },
    });

    if (!pricing) {
      // Conservative fallback
      return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
    }

    // Calculate with max token pricing
    const inputCost = (estimatedInputTokens / 1_000_000) * Number(pricing.input_price_per_million);
    const outputCost = (estimatedOutputTokens / 1_000_000) * Number(pricing.output_price_per_million);
    const vendorCost = inputCost + outputCost;

    // Get margin multiplier
    const marginMultiplier = await this.pricingConfigService.getApplicableMultiplier(
      userId,
      provider.id,
      modelId
    );

    // Apply formula with 10% safety margin
    const estimatedCredits = Math.ceil(vendorCost * marginMultiplier * 100 * 1.1);

    logger.debug('CreditDeductionService: Estimated credits', {
      userId,
      modelId,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCredits,
    });

    return estimatedCredits;
  } catch (error) {
    logger.error('CreditDeductionService: Error estimating credits', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      modelId,
    });
    // Conservative fallback on error
    return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
  }
}
```

#### Step 2: Update Chat Completion Flow

File: `backend/src/services/llm.service.ts` (chatCompletion method)

```typescript
async chatCompletion(
  request: ChatCompletionRequest,
  modelProvider: string,
  userId: string
): Promise<ChatCompletionResponse> {
  logger.debug('LLMService: Chat completion request', {
    model: request.model,
    provider: modelProvider,
    userId,
    messagesCount: request.messages.length,
  });

  const provider = this.getProvider(modelProvider);
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ============================================================================
    // NEW: PRE-FLIGHT CREDIT VALIDATION
    // ============================================================================

    // Step 1: Estimate tokens from messages
    const estimatedInputTokens = this.estimateInputTokens(request.messages);
    const estimatedOutputTokens = request.max_tokens || 1000; // Use max_tokens or default

    // Step 2: Estimate credit cost
    const estimatedCredits = await this.creditDeductionService.estimateCreditsForRequest(
      userId,
      request.model,
      modelProvider,
      estimatedInputTokens,
      estimatedOutputTokens
    );

    // Step 3: Validate sufficient balance BEFORE calling LLM
    const validation = await this.creditDeductionService.validateSufficientCredits(
      userId,
      estimatedCredits
    );

    if (!validation.sufficient) {
      logger.warn('LLMService: Insufficient credits for request', {
        userId,
        model: request.model,
        estimatedCredits,
        currentBalance: validation.currentBalance,
        shortfall: validation.shortfall,
      });

      throw new InsufficientCreditsError(
        `Insufficient credits. Balance: ${validation.currentBalance}, ` +
        `Estimated cost: ${estimatedCredits}, ` +
        `Shortfall: ${validation.shortfall}. ` +
        `Suggestions: ${validation.suggestions.join(', ')}`
      );
    }

    logger.debug('LLMService: Pre-flight validation passed', {
      userId,
      estimatedCredits,
      currentBalance: validation.currentBalance,
    });

    // ============================================================================
    // EXISTING: LLM API CALL (only executes if credits sufficient)
    // ============================================================================

    // 1. Delegate to provider (Strategy Pattern)
    const { response, usage } = await provider.chatCompletion(request);

    // 2. Business logic (credit calculation using Plan 161 provider pricing)
    const duration = Date.now() - startTime;
    const pricingData = await this.calculateCreditsFromVendorCost(
      userId,
      request.model,
      modelProvider,
      usage.promptTokens,
      usage.completionTokens,
      usage.cachedTokens
    );

    // 3. Deduct ACTUAL credits atomically with token usage record
    const requestStartedAt = new Date(startTime);
    const requestCompletedAt = new Date();

    const tokenUsageRecord = {
      requestId,
      userId,
      modelId: request.model,
      providerId: pricingData.providerId,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      cachedInputTokens: usage.cachedTokens || 0,
      totalTokens: usage.totalTokens,
      vendorCost: pricingData.vendorCost,
      creditDeducted: pricingData.credits,
      marginMultiplier: pricingData.marginMultiplier,
      grossMargin: pricingData.grossMargin,
      requestType: 'completion' as const,
      requestStartedAt,
      requestCompletedAt,
      processingTime: duration,
      status: 'success' as const,
      createdAt: requestCompletedAt,
    };

    await this.creditDeductionService.deductCreditsAtomically(
      userId,
      pricingData.credits,
      requestId,
      tokenUsageRecord
    );

    const finalResponse: ChatCompletionResponse = {
      ...response,
      usage: {
        ...usage,
        creditsUsed: pricingData.credits,
      },
    };

    logger.info('LLMService: Chat completion successful', {
      model: request.model,
      provider: modelProvider,
      userId,
      duration,
      tokens: usage.totalTokens,
      estimatedCredits, // NEW: Log estimation
      actualCredits: pricingData.credits, // NEW: Log actual
      vendorCost: pricingData.vendorCost,
      grossMargin: pricingData.grossMargin,
    });

    return finalResponse;
  } catch (error) {
    logger.error('LLMService: Chat completion failed', {
      model: request.model,
      provider: modelProvider,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw this.handleProviderError(error, modelProvider);
  }
}

/**
 * Estimate input tokens from messages (rough approximation)
 * GPT tokenization: ~4 characters per token on average
 */
private estimateInputTokens(messages: any[]): number {
  const totalChars = messages.reduce((sum, msg) => {
    return sum + (msg.content?.length || 0);
  }, 0);

  // Conservative estimate: 3 chars per token (slightly higher than average)
  return Math.ceil(totalChars / 3);
}
```

#### Step 3: Update Streaming Completion Flow

Similar changes for `streamChatCompletion()` and `textCompletion()` methods.

### Testing Requirements

**Test Case 1: Insufficient Credits**
```typescript
// Setup: User has 10 credits
// Request: Chat completion estimated at 100 credits
// Expected: HTTP 402, no LLM call made, balance still 10
```

**Test Case 2: Sufficient Credits**
```typescript
// Setup: User has 1000 credits
// Request: Chat completion estimated at 50 credits
// Expected: HTTP 200, LLM call succeeds, credits deducted (actual amount)
```

**Test Case 3: Estimation vs Actual**
```typescript
// Setup: User has 100 credits
// Estimated: 80 credits
// Actual: 75 credits
// Expected: Request succeeds, 75 credits deducted
```

---

## Bug #2: Subscription Balance Creation (HIGH)

### Problem Statement
New subscription creation doesn't create `user_credit_balance` records because the code is commented out.

### Files to Modify
- `backend/src/services/subscription-management.service.ts`

### Implementation

File: `backend/src/services/subscription-management.service.ts:947-948`

```typescript
/**
 * Allocate monthly credits to a user based on their subscription
 * @param userId - User ID
 * @param subscriptionId - Optional subscription ID (if not provided, uses active subscription)
 * @returns Credit allocation record
 */
async allocateMonthlyCredits(
  userId: string,
  subscriptionId?: string
): Promise<CreditAllocation> {
  logger.info('SubscriptionManagementService.allocateMonthlyCredits', {
    userId,
    subscriptionId,
  });

  try {
    // Get subscription (always fetch from Prisma for consistent types)
    let subscription;
    if (subscriptionId) {
      subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
      });
    } else {
      subscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          status: { in: ['trial', 'active'] },
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (!subscription) {
      throw notFoundError('Active subscription');
    }

    // Create credit allocation record
    const allocation = await this.prisma.credit_allocation.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        subscription_id: subscription.id,
        amount: subscription.monthly_credit_allocation,
        allocation_period_start: subscription.current_period_start,
        allocation_period_end: subscription.current_period_end,
        source: 'subscription',
        created_at: new Date(),
      },
    });

    // ============================================================================
    // FIXED: Integrate with user_credit_balance table (was commented out)
    // ============================================================================
    await this.prisma.user_credit_balance.upsert({
      where: { user_id: userId },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        amount: allocation.amount,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        amount: { increment: allocation.amount },
        updated_at: new Date(),
      },
    });

    logger.info('SubscriptionManagementService: Credits allocated and balance updated', {
      allocationId: allocation.id,
      amount: allocation.amount,
      userId,
    });

    return {
      id: allocation.id,
      userId: allocation.user_id,
      subscriptionId: allocation.subscription_id,
      amount: allocation.amount,
      allocationPeriodStart: allocation.allocation_period_start,
      allocationPeriodEnd: allocation.allocation_period_end,
      source: allocation.source as any,
      createdAt: allocation.created_at,
    };
  } catch (error) {
    logger.error('SubscriptionManagementService.allocateMonthlyCredits: Error', { error });
    throw error;
  }
}
```

### Testing Requirements

**Test Case: New Subscription Creation**
```typescript
// 1. Create new Pro subscription for user
// 2. Verify subscription_monetization record created
// 3. Verify credit_allocation record created
// 4. Verify user_credit_balance record created with correct amount
// 5. Verify user can make API calls successfully
```

---

## Bug #1: Seed Script Balance Creation (MEDIUM)

### Problem Statement
Seed script creates subscriptions but not credit balance records.

### Files to Modify
- `backend/prisma/seed.ts`

### Implementation

Add after each subscription creation:

```typescript
// After creating subscription and credit allocation
await prisma.user_credit_balance.upsert({
  where: { user_id: user.id },
  create: {
    id: randomUUID(),
    user_id: user.id,
    amount: monthlyAllocation,
    created_at: new Date(),
    updated_at: new Date(),
  },
  update: {
    amount: monthlyAllocation,
    updated_at: new Date(),
  },
});

logger.info('Seeded user credit balance', {
  email: user.email,
  amount: monthlyAllocation,
});
```

### Testing Requirements

**Test Case: Database Reset & Seed**
```bash
# 1. Reset database
cd backend && npm run db:reset

# 2. Verify all test users have credit balances
psql -d rephlo-dev -c "
  SELECT u.email, sm.tier, ucb.amount
  FROM users u
  LEFT JOIN subscription_monetization sm ON u.id = sm.user_id AND sm.status = 'active'
  LEFT JOIN user_credit_balance ucb ON u.id = ucb.user_id
  ORDER BY u.email;
"

# Expected: All users with active subscriptions have matching balance amounts
```

---

## Integration Testing Strategy

### Test Suite 1: End-to-End Credit Flow
1. Create new user via registration
2. Subscribe to Pro tier
3. Verify balance created (20,000 credits)
4. Make chat completion request
5. Verify credits deducted
6. Reduce balance to 10 credits
7. Attempt request requiring 100 credits
8. Verify HTTP 402 error
9. Verify no LLM call made
10. Verify balance still 10 credits

### Test Suite 2: Edge Cases
- User with exactly required credits
- User with 1 credit less than required
- Request with max_tokens unspecified
- Streaming vs non-streaming parity
- Multiple concurrent requests (race conditions)

### Test Suite 3: Backward Compatibility
- Existing users with balances work correctly
- Existing allocations still apply
- No data loss during migration

---

## Rollout Strategy

### Pre-Deployment Checklist
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Seed script tested with fresh database
- [ ] Credit estimation accuracy validated (±10%)
- [ ] Performance impact measured (< 50ms overhead)
- [ ] Error messages user-friendly
- [ ] Logging comprehensive for debugging

### Deployment Steps
1. Apply database migrations (if any)
2. Deploy backend code changes
3. Restart backend services
4. Monitor logs for credit validation errors
5. Verify metrics: API success rate, revenue tracking

### Rollback Plan
If critical issues discovered:
1. Revert to previous backend version
2. Re-run old seed script if needed
3. Manual balance correction scripts available

---

## Success Metrics

### Immediate (Post-Deployment)
- ✅ Zero "Insufficient credits" errors for paid users with balances
- ✅ Zero successful API calls from users with insufficient credits
- ✅ All new subscriptions have balance records

### Long-Term (30 Days)
- 📊 Revenue leakage prevented: Track LLM API costs vs credits charged
- 📊 Customer satisfaction: Reduced support tickets about credits
- 📊 System integrity: Balance = Allocations - Deductions (within 1%)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Estimation inaccuracy charges users more | Medium | Low | 10% safety margin, refund policy |
| Performance degradation from pre-flight checks | Low | Medium | Cache pricing configs, optimize queries |
| Race condition in concurrent requests | Low | High | Serializable isolation level maintained |
| Breaking changes for existing integrations | Low | Low | Backward compatible, same API contract |

---

## Documentation Updates Required

1. **API Documentation**: Document HTTP 402 error for insufficient credits
2. **Developer Guides**: Update local setup to include balance verification
3. **Architecture Docs**: Document pre-flight validation pattern
4. **Runbooks**: Add troubleshooting guide for credit discrepancies

---

## Team Assignments

**Master Agent**: Orchestrate implementation, track progress
**Backend Implementation**: Fix services and add validation
**Testing QA**: Write and execute test suite
**Documentation**: Update all related docs

---

## Timeline

| Phase | Tasks | Duration | Completion |
|-------|-------|----------|------------|
| Phase 1 | Bug #3 fix + tests | 4 hours | Day 1 |
| Phase 2 | Bug #2 fix + tests | 2 hours | Day 2 |
| Phase 3 | Bug #1 fix + tests | 1 hour | Day 2 |
| Phase 4 | Integration tests | 3 hours | Day 3 |
| Phase 5 | Documentation | 2 hours | Day 3 |
| **Total** | | **12 hours** | **3 Days** |

---

## Next Steps

1. Create todos for all implementation tasks
2. Begin Bug #3 implementation (highest priority)
3. Run tests after each bug fix
4. Integration test all three fixes together
5. Update documentation
6. Final build verification

---

## Approval

**Plan Status**: ✅ APPROVED by User
**Implementation**: AUTHORIZED to proceed
**Launch Target**: March 2026 (Testing phase)
