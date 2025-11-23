# Fractional Credit System Test Suite

## Overview

Comprehensive test suite for Plan 208: Fractional Credit System Migration with configurable minimum increment.

**Test Files:**
- `fractional-credits.test.ts` - Integration tests for credit deduction (32 tests)
- `credit-increment-config.test.ts` - Configuration system tests (36 tests)

**Documentation:**
- `docs/analysis/208-fractional-credit-test-report.md` - Complete test coverage report

---

## Quick Start

### Run All Fractional Credit Tests

```bash
cd backend
npm test -- fractional-credits.test.ts
npm test -- credit-increment-config.test.ts
```

### Run Specific Test Suite

```bash
# Configurable rounding logic tests
npm test -- fractional-credits.test.ts -t "Configurable Rounding Logic"

# Configuration system tests
npm test -- credit-increment-config.test.ts -t "PUT /admin/settings/credit-increment"
```

### Run with Coverage

```bash
npm test -- fractional-credits.test.ts --coverage
npm test -- credit-increment-config.test.ts --coverage
```

### Watch Mode (Development)

```bash
npm test -- fractional-credits.test.ts --watch
```

---

## Test Structure

### fractional-credits.test.ts

```
Fractional Credit System Integration Tests
├── Configurable Rounding Logic (18 tests)
│   ├── Increment = 0.1 (Default) - 7 tests
│   ├── Increment = 0.01 (Fine-grained) - 5 tests
│   └── Increment = 1.0 (Legacy) - 5 tests
├── Credit Deduction Integration (3 tests)
├── Decimal Precision Validation (3 tests)
├── Switching Increments Mid-Operation (1 test)
├── Decimal Aggregation Queries (2 tests)
├── Edge Cases (5 tests)
└── Validation: Original 40x Markup Issue Fixed (1 test)
```

### credit-increment-config.test.ts

```
Credit Increment Configuration System Tests
├── GET /admin/settings/credit-increment (4 tests)
├── PUT /admin/settings/credit-increment (12 tests)
├── Cache Refresh Mechanism (3 tests)
├── Database Persistence (3 tests)
├── API Integration (1 test)
├── Error Handling (3 tests)
├── Boundary Tests (6 tests)
├── Audit Trail (2 tests)
└── Documentation Tests (2 tests)
```

---

## Key Test Scenarios

### Scenario 1: Default Increment (0.1)

**What it tests:** Small API calls charge 0.1 credits instead of 1.0 (fixes 40x markup)

**Test:**
```typescript
it('should charge 0.1 credits instead of 1.0 for small API calls (Plan 208)', ...)
```

**Input:**
- Vendor cost: $0.00004
- Margin multiplier: 1.5x
- Cost with multiplier: $0.00006

**Expected:**
- Credits deducted: 0.1 (NOT 1.0)
- Effective markup: 25x (acceptable)

### Scenario 2: Fine-grained Increment (0.01)

**What it tests:** Even more precise credit deductions for power users

**Test:**
```typescript
it('should deduct 0.01 credits with fine-grained increment (0.01)', ...)
```

**Input:** Same as above
**Expected:**
- Credits deducted: 0.01
- Effective markup: 2.5x (very fair)

### Scenario 3: Legacy Increment (1.0)

**What it tests:** Backward compatibility with whole-credit behavior

**Test:**
```typescript
it('should deduct 1.0 credit with legacy increment (1.0)', ...)
```

**Input:** Same as above
**Expected:**
- Credits deducted: 1.0 (old behavior)
- Effective markup: 250x (unfair, but available if needed)

### Scenario 4: Configuration System

**What it tests:** Admin can change increment without code changes

**Tests:**
```typescript
it('should update credit increment to 0.01', ...)
it('should reject invalid increment: 0.05', ...)
it('should refresh cache immediately after update', ...)
```

**Validation:**
- Only 0.01, 0.1, 1.0 allowed
- Invalid values rejected with clear error messages
- Cache refreshes immediately after update

---

## Test Data Setup

### Providers Created

```typescript
const provider = await prisma.providers.create({
  data: {
    name: 'openai',
    display_name: 'OpenAI',
    is_active: true,
  },
});
```

### Model Pricing Created

```typescript
await prisma.model_provider_pricing.create({
  data: {
    provider_id: providerId,
    model_name: 'gpt-4o-mini',
    input_price_per_1k: 0.00015,
    output_price_per_1k: 0.0006,
    is_active: true,
  },
});
```

### User Credit Balance

```typescript
await prisma.$executeRaw`
  INSERT INTO user_credit_balance (user_id, amount)
  VALUES (${userId}::uuid, 1000.0)
`;
```

---

## Debugging Tests

### View Test Output

```bash
# Verbose output
npm test -- fractional-credits.test.ts --verbose

# Show only failures
npm test -- fractional-credits.test.ts --onlyFailures
```

### Debug Specific Test

```bash
# Run single test
npm test -- fractional-credits.test.ts -t "should round \$0.00006"

# Add console.log statements in test
# Then run with --verbose
```

### Check Database State

```bash
# After test failure, inspect database
cd backend
npx prisma studio

# Check tables:
# - user_credit_balance
# - token_usage_ledger
# - credit_deduction_ledger
# - system_settings
```

---

## Common Issues

### Issue: Tests fail with "InsufficientCreditsError"

**Cause:** Test balance not reset between tests

**Fix:**
```typescript
beforeEach(async () => {
  await prisma.$executeRaw`
    UPDATE user_credit_balance
    SET amount = 1000.0
    WHERE user_id = ${userId}::uuid
  `;
});
```

### Issue: Tests fail with "Provider not found"

**Cause:** Test provider not created in beforeAll

**Fix:** Check that `beforeAll` creates provider:
```typescript
const provider = await prisma.providers.create({
  data: { name: 'openai', ... }
});
providerId = provider.id;
```

### Issue: Tests fail with "Configuration not found"

**Cause:** system_settings table missing credit_minimum_increment

**Fix:**
```typescript
await creditDeductionService.updateCreditIncrement(0.1);
```

### Issue: Tests timeout

**Cause:** Database transaction not committed or async operation not awaited

**Fix:**
- Ensure all async operations use `await`
- Check `afterAll` calls `cleanDatabase()`

---

## Expected Output

### Success

```
PASS  tests/integration/fractional-credits.test.ts (15.2s)
  Fractional Credit System Integration Tests
    Configurable Rounding Logic
      Increment = 0.1 (Default)
        ✓ should round $0.00006 (0.006 credits) to 0.1 credits (45ms)
        ✓ should round $0.00009 (0.009 credits) to 0.1 credits (38ms)
        ✓ should round $0.00011 (0.011 credits) to 0.2 credits (42ms)
        ✓ should apply 1.5x margin multiplier correctly (36ms)
      Increment = 0.01 (Fine-grained)
        ✓ should round $0.00006 (0.006 credits) to 0.01 credits (41ms)
        ✓ should apply 1.5x margin multiplier correctly (39ms)
      Increment = 1.0 (Legacy whole-credit behavior)
        ✓ should round $0.00006 (0.006 credits) to 1.0 credit (44ms)
    Credit Deduction Integration
      ✓ should deduct 0.1 credits with default increment (0.1) (128ms)
      ✓ should deduct 0.01 credits with fine-grained increment (0.01) (115ms)
      ✓ should deduct 1.0 credit with legacy increment (1.0) (121ms)
    Decimal Precision Validation
      ✓ should preserve decimal precision in balance calculations (587ms)
      ✓ should handle very small credit amounts without floating point drift (2.1s)
      ✓ should handle large balances with decimal precision (95ms)
    Switching Increments Mid-Operation
      ✓ should use new increment after cache refresh (67ms)
    Decimal Aggregation Queries
      ✓ should aggregate decimal credits correctly (412ms)
      ✓ should return correct decimal sum for date range (398ms)
    Edge Cases
      ✓ should handle very small vendor costs ($0.00001) (32ms)
      ✓ should handle zero vendor cost (28ms)
      ✓ should reject insufficient credits with decimal balance (89ms)
      ✓ should handle exact balance deduction (92ms)
    Validation: Original 40x Markup Issue Fixed
      ✓ should charge 0.1 credits instead of 1.0 for small API calls (Plan 208) (38ms)

Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        15.234s
```

---

## Coverage Report

### View Coverage

```bash
cd backend
npm test -- fractional-credits.test.ts credit-increment-config.test.ts --coverage

# Open HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
xdg-open coverage/lcov-report/index.html # Linux
```

### Expected Coverage

| File | Coverage |
|------|----------|
| credit-deduction.service.ts | 95%+ |
| admin-settings.controller.ts | 100% |

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Fractional Credit Tests
  run: |
    cd backend
    npm test -- fractional-credits.test.ts credit-increment-config.test.ts --coverage
```

### Pre-commit Hook

```bash
# .husky/pre-commit
cd backend
npm test -- fractional-credits.test.ts credit-increment-config.test.ts
```

---

## Manual Testing Checklist

After automated tests pass, perform these manual tests:

- [ ] Update increment via admin endpoint: `PUT /admin/settings/credit-increment`
- [ ] Verify increment persists after server restart
- [ ] Test actual API call `/v1/chat/completions` with small prompt
- [ ] Verify credit deduction matches expected increment
- [ ] Check database: `SELECT * FROM system_settings WHERE key = 'credit_minimum_increment'`
- [ ] Monitor logs for increment update events
- [ ] Test with all three increments (0.01, 0.1, 1.0)

---

## References

- [Plan 208: Fractional Credit System Migration](../../docs/plan/208-fractional-credit-system-migration.md)
- [Test Report](../../docs/analysis/208-fractional-credit-test-report.md)
- [Service Migration Guide](../../docs/reference/208-service-decimal-migration-guide.md)
- [Database Schema Changes](../../docs/reference/208-decimal-credit-schema.md)

---

## Support

For issues or questions:
1. Check test report: `docs/analysis/208-fractional-credit-test-report.md`
2. Review service implementation: `src/services/credit-deduction.service.ts`
3. Check admin controller: `src/controllers/admin-settings.controller.ts`

---

**Last Updated:** 2025-01-21
