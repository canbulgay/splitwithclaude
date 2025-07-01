module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/scripts/**',
    '!src/server.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@splitwise/shared$': '<rootDir>/src/__tests__/__mocks__/@splitwise/shared.ts',
    '^../lib/db$': '<rootDir>/src/__tests__/__mocks__/prisma.ts',
    '^../../lib/db$': '<rootDir>/src/__tests__/__mocks__/prisma.ts',
  },
};