/**
 * Shared test fixtures for consistent data across all test levels
 *
 * This module provides:
 * - Consistent user data for unit, integration, and e2e tests
 * - Realistic household data structures
 * - Predictable test IDs and values
 * - Easy maintenance of test data
 */

/**
 * Get worker-specific test user to prevent auth race conditions
 * Each Playwright worker gets its own isolated test user
 */
export const getWorkerTestUser = (workerIndex: number = 0) => ({
  id: `test-user-worker-${workerIndex}`,
  email: `test-worker-${workerIndex}@example.com`,
  password: 'testpassword123',
  profile: {
    id: `test-user-worker-${workerIndex}`,
    household_id: `household-worker-${workerIndex}`,
    onboarding_completed: true,
    preferences: {
      search_preferences: {
        price_min: 100000,
        price_max: 500000,
        bedrooms_min: 2,
        bedrooms_max: 4,
      },
      notification_settings: {
        email_enabled: true,
        push_enabled: true,
        frequency: 'daily' as const,
      },
    },
  },
})

export const TEST_USERS = {
  withHousehold: {
    id: 'test-user-1',
    email: 'test1@example.com',
    password: 'testpassword123',
    profile: {
      id: 'test-user-1',
      household_id: 'household-456',
      onboarding_completed: true,
      preferences: {
        search_preferences: {
          price_min: 100000,
          price_max: 500000,
          bedrooms_min: 2,
          bedrooms_max: 4,
        },
        notification_settings: {
          email_enabled: true,
          push_enabled: true,
          frequency: 'daily' as const,
        },
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      household: {
        id: 'household-456',
        name: 'Smith Family',
        collaboration_mode: 'shared',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    },
  },
  withoutHousehold: {
    id: 'test-user-2',
    email: 'test2@example.com',
    password: 'testpassword456',
    profile: {
      id: 'test-user-2',
      household_id: null,
      onboarding_completed: true,
      preferences: {
        search_preferences: {
          price_min: 150000,
          price_max: 400000,
        },
        notification_settings: {
          email_enabled: false,
          push_enabled: true,
          frequency: 'weekly' as const,
        },
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      household: null,
    },
  },
  freshUser: {
    id: 'test-user-3',
    email: 'test3@example.com',
    password: 'testpassword789',
    profile: {
      id: 'test-user-3',
      household_id: null,
      onboarding_completed: false,
      preferences: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      household: null,
    },
  },
} as const

export const TEST_HOUSEHOLDS = {
  primary: {
    id: 'household-456',
    name: 'Smith Family',
    collaboration_mode: 'shared',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  secondary: {
    id: 'household-789',
    name: 'Johnson Family',
    collaboration_mode: 'shared',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  test: {
    id: 'test-household-123',
    name: 'Test Family Household',
    collaboration_mode: 'shared',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
} as const

export const TEST_MESSAGES = {
  clipboard: {
    success: 'Household code copied to clipboard',
    error: 'Failed to copy household code',
    permissionDenied: 'Permission denied to access clipboard',
  },
  household: {
    created: 'Household created successfully',
    joined: 'Joined household successfully',
    left: 'Left household successfully',
    error: 'Failed to create household',
  },
  auth: {
    signInSuccess: 'Signed in successfully',
    signOutSuccess: 'Signed out successfully',
    signInError: 'Invalid email or password',
  },
} as const

export const TEST_SELECTORS = {
  // Household section
  householdSection: '[data-testid="household-section"]',
  householdId: '[data-testid="household-id"]',
  householdName: '[data-testid="household-name"]',
  copyButton: '[data-testid="copy-household-code"]',
  leaveButton: '[data-testid="leave-household-button"]',

  // Create household form
  createForm: '[data-testid="create-household-form"]',
  householdNameInput: '[data-testid="household-name-input"]',
  createButton: '[data-testid="create-household-button"]',

  // Auth forms
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',
  signInButton: '[data-testid="signin-button"]',
  signUpButton: '[data-testid="signup-button"]',

  // Toast notifications
  toastSuccess: '[data-testid="toast-success"]',
  toastError: '[data-testid="toast-error"]',
  toastContainer: '.sonner-toast',

  // Navigation
  dashboardLink: '[data-testid="nav-dashboard"]',
  profileLink: '[data-testid="nav-profile"]',
} as const

export const TEST_ROUTES = {
  auth: {
    signIn: '/login',
    signUp: '/signup',
    signOut: '/auth/signout',
  },
  app: {
    dashboard: '/dashboard',
    profile: '/profile',
    properties: '/properties',
    settings: '/settings',
  },
  api: {
    households: '/api/households',
    users: '/api/users',
    auth: '/api/auth',
  },
} as const

/**
 * Helper functions for test data generation
 */
export const createTestProfile = (overrides: any = {}) => ({
  ...TEST_USERS.withHousehold.profile,
  ...overrides,
})

export const createTestHousehold = (
  overrides: Partial<typeof TEST_HOUSEHOLDS.primary> = {}
) => ({
  ...TEST_HOUSEHOLDS.primary,
  ...overrides,
})

/**
 * Mock data generators for different test scenarios
 */
export const MOCK_SCENARIOS = {
  userWithHousehold: () => createTestProfile(),
  userWithoutHousehold: () => createTestProfile({ household: null }),
  emptyHousehold: () => createTestHousehold(),
  fullHousehold: () => createTestHousehold(),
} as const

/**
 * Timeout constants for different test operations
 */
export const TEST_TIMEOUTS = {
  default: 5000,
  element: 5000,
  navigation: 20000,
  api: 60000,
  clipboard: 3000,
  toast: 5000,
  authentication: 60000,
} as const
