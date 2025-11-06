import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rephlo_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.OIDC_ISSUER = 'http://localhost:3000';
process.env.OIDC_COOKIE_KEYS = '["test-cookie-key-1", "test-cookie-key-2"]';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.OPENAI_API_KEY = 'sk-test-mock-openai';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-mock';
process.env.GOOGLE_API_KEY = 'test-mock-google';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Increase timeout for all tests
jest.setTimeout(10000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
