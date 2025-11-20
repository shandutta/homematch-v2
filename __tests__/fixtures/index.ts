/**
 * Combined fixtures for HomeMatch E2E tests
 * Exports a single test object with all fixtures available
 */

import { test as base } from '@playwright/test'
import { configFixtures } from './config'
import { utilsFixtures } from './utils'
import { loggerFixtures } from './logger'
import { retryFixtures } from './retry'
import { authFixtures } from './auth'

// Combine all fixtures into a single test object
// Note: Order matters - authFixtures depends on utilsFixtures
export const test = base
  .extend(configFixtures)
  .extend(loggerFixtures)
  .extend(retryFixtures)
  .extend(utilsFixtures)
  .extend(authFixtures)

// Re-export expect for convenience
export { expect } from '@playwright/test'

// Export individual fixtures for selective use
export { configFixtures } from './config'
export { utilsFixtures } from './utils'
export { loggerFixtures } from './logger'
export { retryFixtures } from './retry'
export { authFixtures } from './auth'

// Export types
export type {
  TestUser,
  TestLogger,
  UtilsFixture,
  AuthFixture,
  RetryFixture,
  ConfigFixture,
  HomematchFixtures,
} from '../types/fixtures'
