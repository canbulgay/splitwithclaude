// Test setup file
// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.JWT_EXPIRES_IN = '1h'
process.env.BCRYPT_ROUNDS = '4' // Lower rounds for faster tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/splitwise_test'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Setup global test helpers
global.beforeEach(() => {
  jest.clearAllMocks()
})