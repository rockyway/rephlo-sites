# Backend Testing Suite

This directory contains the comprehensive testing suite for the Rephlo Dedicated API Backend.

## Structure

```
tests/
├── setup/                  # Test configuration and setup
│   ├── jest.setup.ts      # Global Jest setup
│   └── database.ts        # Database test utilities
├── helpers/               # Test helper functions
│   ├── factories.ts       # Test data factories
│   ├── tokens.ts          # JWT token utilities
│   ├── mocks.ts           # External API mocks
│   ├── api-client.ts      # HTTP test client
│   └── assertions.ts      # Custom assertions
├── unit/                  # Unit tests
│   └── services/         # Service layer tests
│       ├── auth.service.test.ts
│       ├── credit.service.test.ts
│       └── model.service.test.ts
├── integration/          # Integration tests
│   └── models.test.ts   # API endpoint tests
└── e2e/                  # End-to-end tests
    └── complete-flow.test.ts
```

## Running Tests

### Prerequisites

1. **PostgreSQL** test database:
   ```bash
   createdb rephlo_test
   ```

2. **Redis** test instance (default: localhost:6379/1)

3. **Environment variables** (automatically set in jest.setup.ts):
   ```bash
   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo_test
   TEST_REDIS_URL=redis://localhost:6379/1
   ```

### Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests only
npm run test:e2e

# Run with coverage report
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npx jest tests/unit/services/credit.service.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should deduct credits"
```

## Test Types

### Unit Tests

Test individual services in isolation with mocked dependencies.

**Example**:
```typescript
describe('CreditService', () => {
  it('should deduct credits successfully', async () => {
    // Arrange
    const user = await createTestUser(prisma);
    const credits = await createTestCredits(prisma, user.id, subscription.id);

    // Act
    await creditService.deductCredits(user.id, 5000);

    // Assert
    const updated = await prisma.credits.findUnique({ where: { id: credits.id } });
    expect(updated?.usedCredits).toBe(15000);
  });
});
```

### Integration Tests

Test API endpoints with full request/response cycle.

**Example**:
```typescript
describe('Models API', () => {
  it('should return list of models', async () => {
    const response = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.models).toBeInstanceOf(Array);
  });
});
```

### End-to-End Tests

Test complete user workflows from registration to API usage.

**Example**:
```typescript
it('Complete Flow: Registration → Subscription → Inference', async () => {
  // 17-step workflow testing the entire user journey
  // See: tests/e2e/complete-flow.test.ts
});
```

## Test Helpers

### Factories

Create realistic test data:

```typescript
// Create a test user
const user = await createTestUser(prisma, {
  email: 'test@example.com',
  firstName: 'John',
});

// Create user with complete setup
const { user, subscription, credits } = await createTestUserWithSubscription(
  prisma,
  SubscriptionTier.pro
);
```

### Mocks

Mock external API calls:

```typescript
// Mock OpenAI completion
mockOpenAICompletion({
  content: 'Test response',
  promptTokens: 25,
  completionTokens: 10,
});

// Mock Stripe customer creation
mockStripeCustomerCreate('cus_test_123');
```

### Tokens

Generate test authentication tokens:

```typescript
// Generate access token
const accessToken = await generateTestAccessToken(user);

// Use in API calls
const response = await request(app)
  .get('/v1/models')
  .set('Authorization', `Bearer ${accessToken}`);
```

## Code Coverage

### Coverage Thresholds

The project enforces 80% minimum coverage:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### Coverage Report Example

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   82.45 |    80.12 |   83.67 |   82.89 |
 services/             |   85.32 |    82.45 |   86.21 |   85.78 |
  credit.service.ts    |   91.23 |    88.89 |   92.31 |   91.67 |
  auth.service.ts      |   88.54 |    85.71 |   90.00 |   89.12 |
-----------------------|---------|----------|---------|---------|
```

## Writing New Tests

### Best Practices

1. **Follow AAA Pattern**:
   ```typescript
   it('should do something', async () => {
     // Arrange - Set up test data
     const user = await createTestUser(prisma);

     // Act - Execute the operation
     const result = await service.doSomething(user.id);

     // Assert - Verify the outcome
     expect(result).toBeDefined();
   });
   ```

2. **Use Descriptive Names**:
   ```typescript
   // Good ✓
   it('should return 401 when access token is missing', async () => {});

   // Bad ✗
   it('test auth', async () => {});
   ```

3. **Test Edge Cases**:
   ```typescript
   it('should handle empty input gracefully');
   it('should throw error for invalid data');
   it('should handle concurrent requests correctly');
   ```

4. **Clean Up After Tests**:
   ```typescript
   afterEach(async () => {
     await cleanDatabase();
     cleanMocks();
   });
   ```

5. **Mock External Dependencies**:
   ```typescript
   // Don't make real API calls
   mockOpenAICompletion({ content: 'test' });

   // Don't charge real credit cards
   mockStripeSubscriptionCreate();
   ```

## Debugging Tests

### Run Single Test File

```bash
npx jest tests/unit/services/credit.service.test.ts
```

### Run Specific Test

```bash
npx jest --testNamePattern="should deduct credits successfully"
```

### Enable Verbose Output

```bash
npx jest --verbose
```

### Run Tests Sequentially

```bash
npx jest --runInBand
```

### Use Node Debugger

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

## Continuous Integration

Tests run automatically on GitHub Actions for:

- Push to main/develop/feature branches
- Pull requests to main/develop

**Workflow**: `.github/workflows/backend-tests.yml`

**Jobs**:
- Unit tests
- Integration tests
- E2E tests
- Coverage report
- TypeScript compilation check
- Security audit

## Common Issues

### Database Connection Errors

```bash
# Ensure PostgreSQL is running
pg_isready

# Ensure test database exists
createdb rephlo_test

# Run migrations
DATABASE_URL=postgresql://localhost:5432/rephlo_test npx prisma migrate deploy
```

### Redis Connection Errors

```bash
# Ensure Redis is running
redis-cli ping

# Should return: PONG
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000
```

## Performance

### Test Execution Time

Target: < 5 minutes for full test suite

Current breakdown:
- Unit tests: ~15 seconds
- Integration tests: ~30 seconds
- E2E tests: ~20 seconds
- Total: ~1 minute 5 seconds

### Optimizations

- Parallel test execution (default)
- In-memory database for unit tests (recommended)
- Mock external API calls
- Database connection pooling

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Nock Documentation](https://github.com/nock/nock)
- [Testing Best Practices](https://testingjavascript.com/)
- [API Testing Guide](https://www.postman.com/api-testing/)
