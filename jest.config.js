module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
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
  },
  // Improved stability and performance
  testTimeout: 10000,
  maxWorkers: process.platform === 'win32' ? 1 : '50%',
  workerIdleMemoryLimit: '1GB',
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  testMatch: ['**/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)'],
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
