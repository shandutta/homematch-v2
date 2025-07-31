/**
 * Base Playwright fixtures for HomeMatch V2 E2E tests
 * Provides foundation for all other fixtures
 */

import { test as base } from '@playwright/test'

// Base fixture interface - other fixtures will extend this
export interface BaseFixtures {
  // Future base fixtures will be added here
}

// Export the base test extended with our fixtures
export const test = base.extend<BaseFixtures>({
  // Base fixture implementations will go here
})

export { expect } from '@playwright/test'