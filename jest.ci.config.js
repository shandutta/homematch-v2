const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  // CI-specific overrides
  maxWorkers: '50%',
  testTimeout: 30000,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
      },
    ],
  ],
  // Disable watch mode in CI
  watchman: false,
  // Use all available cores but leave some for system
  maxConcurrency: 4,
}
