/**
 * Global Jest test setup
 *
 * This file is executed once before all tests.
 * Use it for global configuration, mocks, and environment setup.
 */

import 'reflect-metadata';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Global test timeout
jest.setTimeout(10000);

// Global setup
beforeAll(() => {
  // Any global setup code
});

// Global teardown
afterAll(() => {
  // Any global cleanup code
});

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
