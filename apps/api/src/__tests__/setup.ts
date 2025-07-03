// Test setup file
// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-tests-minimum-32-characters-required'
process.env.JWT_EXPIRES_IN = '1h'
process.env.BCRYPT_ROUNDS = '4' // Lower rounds for faster tests

// Mock DATABASE_URL to prevent connection attempts
process.env.DATABASE_URL = 'postgresql://mockuser:mockpass@localhost:5432/mockdb'

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
  
  // Clear cache between tests
  try {
    const { cache } = require('../lib/cache')
    cache.clear()
  } catch (error) {
    // Cache module might not be available in all tests
  }
})