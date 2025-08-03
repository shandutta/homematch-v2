/**
 * Config fixture for HomeMatch V2 E2E tests
 * Provides test constants, timeouts, and test user data
 */

import { ConfigFixture } from '../types/fixtures'

// Export just the fixtures object, not a test object
export const configFixtures = {
  // eslint-disable-next-line no-empty-pattern
  config: async ({}: any, use: any) => {
    const config: ConfigFixture = {
      timeouts: {
        PAGE_LOAD: 30000, // 30 seconds for initial page load
        NAVIGATION: 15000, // 15 seconds for navigation between pages
        AUTH_REDIRECT: 10000, // 10 seconds for auth redirect after login
        AUTH_LOGOUT: 5000, // 5 seconds for logout to complete
        BUTTON_ENABLED: 5000, // 5 seconds for button to become enabled
        ELEMENT_VISIBLE: 5000, // 5 seconds for element to become visible
        FORM_VALIDATION: 1000, // 1 second for form validation to complete
        NETWORK_IDLE: 5000, // 5 seconds for network to become idle
      },

      users: {
        user1: {
          email: 'test1@example.com',
          password: 'testpassword123',
        },
        user2: {
          email: 'test2@example.com',
          password: 'testpassword456',
        },
      },

      storageKeys: {
        SUPABASE_AUTH_TOKEN: 'supabase.auth.token',
        SUPABASE_AUTH_REFRESH_TOKEN: 'supabase.auth.refresh_token',
      },
    }

    await use(config)
  },
}

// expect is exported from index.ts
