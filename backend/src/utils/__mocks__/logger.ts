/**
 * Mock logger for tests
 */
const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),

  // Custom methods
  api: jest.fn(),
  db: jest.fn(),
  auth: jest.fn(),
  llm: jest.fn(),
  webhook: jest.fn(),
  system: jest.fn(),
};

export default logger;
