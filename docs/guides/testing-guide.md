# Authentication Testing Guide

**Created**: 2025-11-06
**Purpose**: Guide for running and maintaining authentication system tests
**Coverage Goal**: 80%+ on auth modules

## Overview

This guide covers the comprehensive test suite for the authentication system, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
backend/
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── password-strength.test.ts
│   │   │   └── token-generator.test.ts
│   │   └── controllers/
│   │       ├── auth-management.controller.test.ts
│   │       └── social-auth.controller.test.ts
│   ├── integration/
│   │   └── auth.integration.test.ts
│   ├── helpers/
│   │   └── auth-fixtures.ts
│   └── setup/
│       ├── database.ts
│       └── jest.setup.ts
└── jest.config.js
```

## Prerequisites

### 1. Environment Setup

Ensure you have a test database configured:

```bash
# .env.test or set environment variables
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/rephlo_test
TEST_REDIS_URL=redis://localhost:6379/1
```

### 2. Database Setup

Create the test database:

```sql
CREATE DATABASE rephlo_test;
```

Run migrations:

```bash
cd backend
npx prisma migrate deploy
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

**Unit Tests Only:**
```bash
npm run test:unit
```

**Integration Tests Only:**
```bash
npm run test:integration
```

**Auth Tests Only:**
```bash
npm test -- tests/unit/utils tests/unit/controllers tests/integration/auth
```

### Run with Coverage

```bash
npm run test:coverage
```

This generates a coverage report in `backend/coverage/`.

### Watch Mode

For development:
```bash
npm run test:watch
```

## Test Coverage Breakdown

### Unit Tests

#### 1. Password Strength Utility (`password-strength.test.ts`)
**Coverage**: 50 test cases

Tests:
- Password validation rules (length, character requirements)
- Password strength scoring algorithm
- Common pattern detection
- Edge cases (empty strings, Unicode, special characters)

**Run:**
```bash
npm test -- tests/unit/utils/password-strength.test.ts
```

#### 2. Token Generator Utility (`token-generator.test.ts`)
**Coverage**: 58 test cases

Tests:
- Secure token generation
- Token hashing with SHA-256
- Email verification token generation
- Password reset token generation
- Token verification and expiration
- UUID, numeric, and alphanumeric code generation

**Run:**
```bash
npm test -- tests/unit/utils/token-generator.test.ts
```

#### 3. Auth Management Controller (`auth-management.controller.test.ts`)
**Coverage**: 40+ test cases

Tests:
- User registration endpoint
- Email verification endpoint
- Forgot password endpoint
- Reset password endpoint
- Input validation
- Error handling
- Database integration (mocked)

**Run:**
```bash
npm test -- tests/unit/controllers/auth-management.controller.test.ts
```

#### 4. Social Auth Controller (`social-auth.controller.test.ts`)
**Coverage**: 30+ test cases

Tests:
- Google OAuth authorization flow
- Google OAuth callback handling
- User creation and linking
- Error handling
- State parameter CSRF protection

**Run:**
```bash
npm test -- tests/unit/controllers/social-auth.controller.test.ts
```

### Integration Tests

#### Auth Routes Integration (`auth.integration.test.ts`)
**Coverage**: 25+ test cases

Tests:
- POST /auth/register (full flow)
- POST /auth/verify-email (full flow)
- POST /auth/forgot-password (full flow)
- POST /auth/reset-password (full flow)
- Complete registration → verification workflow
- Complete forgot password → reset workflow
- Real database transactions
- Rate limiting (TODO)

**Run:**
```bash
npm test -- tests/integration/auth.integration.test.ts
```

## Test Helpers and Fixtures

### Auth Fixtures (`auth-fixtures.ts`)

Provides reusable test data and factory functions:

**Functions:**
- `createUserWithVerificationToken()` - Create user with pending email verification
- `createUserWithResetToken()` - Create user with password reset token
- `createVerifiedUser()` - Create fully verified user
- `createGoogleUser()` - Create Google OAuth user
- `createUserWithExpiredVerificationToken()` - Create user with expired verification token
- `createUserWithExpiredResetToken()` - Create user with expired reset token
- `cleanupTestUsers()` - Clean up test data

**Data:**
- `validRegistrationData` - Valid registration payload
- `invalidRegistrationScenarios` - Various invalid registration scenarios
- `mockGoogleProfile` - Mock Google OAuth profile data
- `mockGoogleTokens` - Mock Google OAuth tokens

**Usage Example:**
```typescript
import { createVerifiedUser } from '../helpers/auth-fixtures';

it('should test something with a verified user', async () => {
  const user = await createVerifiedUser(prisma, {
    email: 'custom@example.com'
  });

  // Test with user...
});
```

## Writing New Tests

### Unit Test Template

```typescript
import { FunctionToTest } from '../../../src/utils/my-util';

describe('MyUtil', () => {
  describe('functionToTest', () => {
    it('should handle valid input', () => {
      const result = FunctionToTest('valid input');

      expect(result).toBe('expected output');
    });

    it('should handle invalid input', () => {
      expect(() => FunctionToTest('invalid')).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase, cleanDatabase } from '../setup/database';

let app: Express;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = getTestDatabase();
  // app = createApp();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('POST /my-endpoint', () => {
  it('should handle request successfully', async () => {
    const response = await request(app)
      .post('/my-endpoint')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true
    });
  });
});
```

## Debugging Tests

### View Detailed Output

```bash
npm test -- --verbose
```

### Run Single Test

```bash
npm test -- -t "should register new user successfully"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "${fileBasename}",
    "--config",
    "jest.config.js"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Check for Open Handles

If tests hang:

```bash
npm test -- --detectOpenHandles
```

## Coverage Goals

### Current Coverage (Target: 80%+)

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| password-strength.ts | 100% | 100% | 100% | 100% |
| token-generator.ts | 100% | 100% | 100% | 100% |
| auth-management.controller.ts | 85%+ | 80%+ | 90%+ | 85%+ |
| social-auth.controller.ts | 80%+ | 75%+ | 85%+ | 80%+ |

### Generate Coverage Report

```bash
npm run test:coverage
```

Open `backend/coverage/lcov-report/index.html` in your browser.

### Focus on Critical Paths

Priority areas for testing:
1. Password reset flow (security critical)
2. Email verification flow (user onboarding)
3. Google OAuth flow (third-party integration)
4. Input validation (security)
5. Token generation and validation (security)

## Common Issues

### Issue: Database Connection Errors

**Solution:**
```bash
# Ensure test database is running
psql -U postgres -c "CREATE DATABASE rephlo_test;"

# Run migrations
npx prisma migrate deploy
```

### Issue: Test Timeouts

**Solution:**
Increase timeout in test file:
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Flaky Tests

**Causes:**
- Time-dependent tests (token expiry)
- Database state not cleaned between tests
- External API mocks not properly set up

**Solution:**
- Use fixed dates for testing: `new Date('2025-01-01')`
- Ensure `cleanDatabase()` runs in `beforeEach`
- Verify all external APIs are mocked

### Issue: Coverage Below Threshold

**Solution:**
```bash
# Identify uncovered lines
npm run test:coverage

# View HTML report
open backend/coverage/lcov-report/index.html

# Add tests for uncovered lines
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Auth System

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/rephlo_test

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/rephlo_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean database between tests
- Don't rely on test execution order

### 2. Descriptive Test Names
```typescript
// Good
it('should reject registration with duplicate email')

// Bad
it('test registration')
```

### 3. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should verify email successfully', async () => {
  // Arrange
  const { user, token } = await createUserWithVerificationToken(prisma);

  // Act
  const response = await request(app)
    .post('/auth/verify-email')
    .send({ token, email: user.email });

  // Assert
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

### 4. Mock External Dependencies
- Mock SendGrid email service
- Mock Google OAuth APIs
- Mock Redis for rate limiting

### 5. Test Edge Cases
- Empty inputs
- Very long inputs
- Special characters
- Expired tokens
- Already-used tokens
- Concurrent requests

## Maintenance

### Adding New Auth Features

When adding new auth features:

1. Write unit tests first (TDD approach)
2. Add integration tests for the full flow
3. Update test fixtures if needed
4. Run full test suite: `npm test`
5. Verify coverage meets 80%+ threshold
6. Update this documentation

### Updating Tests

When refactoring code:

1. Run existing tests to ensure they still pass
2. Update test expectations if behavior changes
3. Add new tests for new code paths
4. Remove obsolete tests
5. Verify coverage hasn't decreased

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues or questions:
1. Check this documentation
2. Review existing test files for examples
3. Check test output for detailed error messages
4. Review Jest and Supertest documentation

---

**Last Updated**: 2025-11-06
**Maintained By**: Development Team
