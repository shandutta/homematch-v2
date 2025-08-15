module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/__tests__/test-env.ts',
    '<rootDir>/__tests__/setupSentry.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  // Automatically use mocks from __mocks__ directory
  automock: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Improved stability and performance
  testTimeout: 30000, // Increased timeout for complex integration tests
  maxWorkers: process.platform === 'win32' ? 2 : '50%', // Allow 2 workers on Windows for better performance
  workerIdleMemoryLimit: '1GB',
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  testMatch: [
    '**/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/integration/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/homematch-original-analysis/',
    '<rootDir>/v1-reference/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/error.tsx',
    '!src/app/not-found.tsx',
    '!src/app/global-error.tsx',
    '!src/middleware.ts',
    '!src/pages/_error.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}
