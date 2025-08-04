# Testing Guide for HomeMatch V2

> **Current Status**: Complete test infrastructure implemented with 100% unit/integration test pass rates and E2E testing. Migration foundation complete with 99.1% success rate (2,214 records migrated).

This comprehensive guide covers all testing approaches for HomeMatch V2, including unit tests, integration tests, end-to-end testing, fixtures, debugging tools, and complete development workflows.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Quick Start](#quick-start)
3. [Test Infrastructure](#test-infrastructure)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Playwright Fixtures](#playwright-fixtures)
8. [Database Testing](#database-testing)
9. [Development Debugging](#development-debugging)
10. [Test Coverage](#test-coverage)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting](#troubleshooting)
13. [Development Workflows](#development-workflows)

## Testing Overview

HomeMatch V2 implements a comprehensive 4-tier testing strategy:

1. **Unit Tests**: Jest + React Testing Library for service layer and components
2. **Integration Tests**: Vitest + Supabase MCP for database and API testing
3. **End-to-End Tests**: Playwright for complete user workflows
4. **Debug Tools**: Puppeteer MCP and Browser-tools MCP for development debugging

### Test Results Summary

- **Unit Tests**: 82/82 passing (100% success rate)
- **Integration Tests**: 36/36 passing (100% success rate)
- **E2E Tests**: 18/30 passing (60%), 12 skipped pending auth setup
- **PostGIS Migration**: Safe conversion preserving 2,176 spatial data points

## Quick Start

### Running All Tests

```bash
# Run complete test suite
pnpm test

# Individual test suites
pnpm test:unit        # Jest unit tests
pnpm test:integration # Vitest integration tests
pnpm test:e2e        # Playwright E2E tests

# Coverage and analysis
pnpm test:coverage   # Generate coverage reports
pnpm test:watch      # Watch mode for development
```

### E2E Testing Quick Setup

```bash
# 1. Start Supabase (if not already running)
pnpm dlx supabase@latest start

# 2. Apply migrations
pnpm dlx supabase@latest db push

# 3. Build for tests
node scripts/build-for-tests.js

# 4. Create test users
node scripts/setup-test-users-admin.js

# 5. Run E2E tests
pnpm test:e2e
```

## Test Infrastructure

### Framework Stack

```typescript
// Unit Testing
Jest 30.0.5 + React Testing Library 16.3.0

// Integration Testing
Vitest 3.2.4 + Supabase MCP integration

// End-to-End Testing
Playwright 1.54.1 (Chrome, Firefox, Safari support)

// Performance Testing
Lighthouse CI + Web Vitals + PostHog analytics
```

### Project Configuration

HomeMatch is configured to run on **port 3000** by default. E2E tests include automatic port management and cleanup.

```json
// package.json
"scripts": {
  "dev": "next dev --turbopack",  // Defaults to port 3000
  "test": "npm run test:unit && npm run test:integration",
  "test:unit": "jest",
  "test:integration": "vitest run",
  "test:e2e": "playwright test",
  "test:coverage": "jest --coverage",
  "test:watch": "jest --watch"
}
```

## Unit Testing

### Service Layer Testing

**Location**: `__tests__/unit/services/`

The service layer provides the foundation for all unit tests with real migrated data:

#### PropertyService Tests

```typescript
describe('PropertyService', () => {
  // Test with real migrated data (1,091 properties)
  test('should search properties with filters', async () => {
    const result = await propertyService.searchProperties({
      filters: { price_min: 500000, price_max: 1000000 },
    })
    expect(result.properties.length).toBeGreaterThan(0)
  })

  test('should handle PostGIS spatial queries', async () => {
    const properties = await propertyService.getPropertiesWithinRadius(
      37.7749,
      -122.4194,
      10 // San Francisco center, 10km radius
    )
    expect(properties).toBeDefined()
  })
})
```

#### UserService Tests

```typescript
describe('UserService', () => {
  test('should record property interactions with ML scores', async () => {
    const interaction = await userService.recordInteraction({
      user_id: 'test-user',
      property_id: 'test-property',
      interaction_type: 'like',
      score_data: { ml_score: 0.85 },
    })
    expect(interaction).toBeDefined()
  })
})
```

### Component Testing

**Location**: `__tests__/unit/components/`

Test React components with real service integration and proper mocking patterns.

### Mock Configuration

**Location**: `__tests__/__mocks__/supabaseClient.ts`

Comprehensive mock setup with chainable query builder support for unit tests.

## Integration Testing

### Database Integration Tests

**Key Implementations**:

- Created `scripts/infrastructure-working.js` for Docker/Supabase automation
- Implemented dynamic user ID fetching instead of hardcoded values
- Fixed interaction_type from 'favorite' to 'like' per schema constraints
- Created comprehensive test user setup scripts

#### Migration Data Validation

```typescript
describe('Migration Data Integrity', () => {
  test('should validate all 1,123 neighborhoods migrated', async () => {
    const { data: neighborhoods } = await supabase
      .from('neighborhoods')
      .select('count(*)')

    expect(neighborhoods[0].count).toBe(1123)
  })

  test('should validate all 1,091 properties migrated', async () => {
    const { data: properties } = await supabase
      .from('properties')
      .select('count(*)')
      .eq('is_active', true)

    expect(properties[0].count).toBe(1091)
  })
})
```

#### Relationship Testing

```typescript
describe('Database Relationships', () => {
  test('should maintain property-neighborhood referential integrity', async () => {
    const propertiesWithNeighborhoods = await propertyService.searchProperties({
      includeNeighborhood: true,
    })

    propertiesWithNeighborhoods.properties.forEach((property) => {
      if (property.neighborhood_id) {
        expect(property.neighborhood).toBeDefined()
      }
    })
  })
})
```

## End-to-End Testing

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Playwright    │────▶│  Next.js Server  │────▶│ Supabase Local  │
│     Tests       │     │  (Port 3000)     │     │  (Port 54321)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        │                        ▼                         │
        │                 ┌──────────────┐                │
        └────────────────▶│ .next-test/  │◀───────────────┘
                          │ (Test Build) │
                          └──────────────┘
```

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase CLI
- Git Bash (Windows) or Terminal (Mac/Linux)

### Local Development Setup

Our E2E tests use Playwright to test the full application stack with a real Supabase database. Tests run against a production build with test environment variables to ensure realistic testing conditions.

1. **Start Supabase** (if not already running):

   ```bash
   pnpm dlx supabase@latest start
   ```

2. **Apply migrations**:

   ```bash
   pnpm dlx supabase@latest db push
   ```

3. **Build for tests**:

   ```bash
   node scripts/build-for-tests.js
   ```

4. **Create test users**:

   ```bash
   node scripts/setup-test-users-admin.js
   ```

5. **Run E2E tests**:
   ```bash
   pnpm test:e2e
   ```

### E2E Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests in headed mode (see browser)
pnpm test:e2e -- --headed

# Run E2E tests in UI mode (interactive)
pnpm test:e2e -- --ui

# Run E2E tests in debug mode
pnpm test:e2e -- --debug

# Run specific test file
pnpm test:e2e auth.spec.ts
```

### Test Environment Configuration

E2E tests use `.env.test.local` for configuration:

```env
# Supabase Configuration (Local)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Client-side environment variables (required for Next.js)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test User Credentials
TEST_USER_1_EMAIL=test1@example.com
TEST_USER_1_PASSWORD=testpassword123
TEST_USER_2_EMAIL=test2@example.com
TEST_USER_2_PASSWORD=testpassword456
```

### Test Infrastructure Scripts

1. **`scripts/build-for-tests.js`**
   - Builds Next.js with test environment variables
   - Creates `.next-test/` directory
   - Skips linting/type checking for speed

2. **`scripts/start-test-server-dev.js`**
   - Starts Next.js development server for E2E tests
   - Sets test environment variables
   - Ensures port 3000 is available

3. **`scripts/setup-test-users-admin.js`**
   - Creates test users via Supabase Admin API
   - Includes retry logic for reliability
   - Verifies user profile creation

4. **`scripts/kill-port.js`**
   - Cross-platform port management
   - Retry logic with exponential backoff
   - Port availability verification

### Test Organization

```
__tests__/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── session-persistence.spec.ts
│   ├── properties/
│   │   ├── property-search.spec.ts
│   │   └── property-details.spec.ts
│   └── setup/
│       └── global-setup.ts
└── helpers/
    ├── auth-helpers.ts
    ├── constants.ts
    └── test-utils.ts
```

### Writing E2E Tests

#### Best Practices

1. **Use standardized timeouts**:

   ```typescript
   import { TEST_TIMEOUTS } from '../helpers/constants'

   await page.waitForSelector('.property-card', {
     timeout: TEST_TIMEOUTS.ELEMENT_VISIBLE,
   })
   ```

2. **Clean up auth state between tests**:

   ```typescript
   import { clearAuthState } from '../helpers/test-utils'

   test.beforeEach(async ({ page }) => {
     await clearAuthState(page)
   })
   ```

3. **Use proper wait conditions**:

   ```typescript
   // Good: Wait for specific conditions
   await page.waitForLoadState('networkidle')
   await page.waitForSelector('[data-testid="dashboard-loaded"]')

   // Bad: Arbitrary timeouts
   await page.waitForTimeout(5000)
   ```

4. **Add data-testid attributes**:
   ```tsx
   <button data-testid="submit-property-search">Search</button>
   ```

#### Example E2E Test

```typescript
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth-helpers'
import { TEST_TIMEOUTS } from '../helpers/constants'

test.describe('Property Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test1@example.com', 'testpassword123')
  })

  test('should search properties by price range', async ({ page }) => {
    await page.goto('/search')

    // Fill search form
    await page.fill('[data-testid="min-price"]', '500000')
    await page.fill('[data-testid="max-price"]', '1000000')

    // Submit search
    await page.click('[data-testid="search-button"]')

    // Wait for results
    await page.waitForSelector('[data-testid="property-card"]', {
      timeout: TEST_TIMEOUTS.ELEMENT_VISIBLE,
    })

    // Verify results
    const propertyCards = await page
      .locator('[data-testid="property-card"]')
      .count()
    expect(propertyCards).toBeGreaterThan(0)
  })
})
```

### Live Data Validation

```typescript
test('should complete property browsing workflow', async ({ page }) => {
  // Login and navigate to validation dashboard
  await page.goto('/login')
  await authenticateUser(page)
  await page.goto('/validation')

  // Verify live data validation
  await expect(
    page.locator('[data-testid="neighborhood-count"]')
  ).toContainText('1,123')
  await expect(page.locator('[data-testid="property-count"]')).toContainText(
    '1,091'
  )

  // Test property browsing with real data
  await page.goto('/dashboard')
  await expect(page.locator('[data-testid="property-card"]')).toBeVisible()
})
```

## Playwright Fixtures

### Fixtures Architecture

HomeMatch V2 uses a comprehensive fixtures system that eliminates circular dependency issues while maintaining full functionality.

### Benefits Over Helper Files

- ✅ **Zero circular dependencies** - Fixtures are dependency-injected by Playwright
- ✅ **Better organization** - Logical grouping of related functionality
- ✅ **TypeScript integration** - Full type safety with fixture interfaces
- ✅ **Automatic cleanup** - Fixtures handle their own teardown
- ✅ **Better debugging** - Integrated logging with test lifecycle

### Fixtures Structure

- **`config.ts`** - Test constants, timeouts, and user data
- **`utils.ts`** - Page utilities and common wait functions
- **`logger.ts`** - Debug logging and test visibility
- **`retry.ts`** - Retry logic and error handling
- **`auth.ts`** - Authentication flows and user management
- **`index.ts`** - Combined fixtures export

### Usage Example

```typescript
import { test, expect } from '../fixtures'

test('should authenticate user', async ({ page, auth, logger }) => {
  logger.step('Starting authentication test')

  await auth.login()
  await auth.verifyAuthenticated()

  logger.step('Authentication test completed')
})
```

### Available Fixtures

#### Config Fixture

```typescript
config: {
  timeouts: { PAGE_LOAD: 30000, ... }
  users: { user1: { email: '...', password: '...' }, ... }
  storageKeys: { SUPABASE_AUTH_TOKEN: '...', ... }
}
```

#### Utils Fixture

```typescript
utils: {
  clearAuthState(): Promise<void>
  waitForReactToSettle(): Promise<void>
  waitForFormValidation(): Promise<void>
  navigateWithRetry(url: string): Promise<void>
  isAuthenticated(): Promise<boolean>
  waitForAuthRedirect(url: RegExp): Promise<void>
}
```

#### Auth Fixture

```typescript
auth: {
  login(user?: TestUser): Promise<void>
  logout(): Promise<void>
  fillLoginForm(user?: TestUser): Promise<void>
  verifyAuthenticated(user?: TestUser): Promise<void>
  verifyNotAuthenticated(): Promise<void>
  clearAuthState(): Promise<void>
}
```

#### Logger Fixture

```typescript
logger: {
  step(description: string, data?: any): void
  info(category: string, message: string, data?: any): void
  warn(category: string, message: string, data?: any): void
  error(category: string, message: string, data?: any): void
}
```

#### Retry Fixture

```typescript
retry: {
  retry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>
  network<T>(operation: () => Promise<T>): Promise<T>
  element<T>(operation: () => Promise<T>): Promise<T>
  auth<T>(operation: () => Promise<T>): Promise<T>
}
```

## Database Testing

### Schema Validation

#### PostGIS Safe Migration

PostGIS safe migration implemented preserving all spatial data:

- Created `20250730114410_fix_postgis_geometry_type.sql` for neighborhoods
- Created `20250730114539_fix_point_geometry_type.sql` for properties
- Used backup column strategy to prevent data loss
- Preserved 1,123 neighborhood boundaries and 1,053 property coordinates

#### RLS Policy Testing

```typescript
describe('Row Level Security', () => {
  test('should enforce user data isolation', async () => {
    const user1Data = await getUserData(user1.id)
    const user2Data = await getUserData(user2.id)

    expect(user1Data).not.toEqual(user2Data)
  })

  test('should allow public read access to properties', async () => {
    const properties = await supabase.from('properties').select('*').limit(10)

    expect(properties.data).toBeDefined()
    expect(properties.error).toBeNull()
  })
})
```

#### PostGIS Spatial Testing

```typescript
describe('PostGIS Spatial Operations', () => {
  test('should perform radius queries correctly', async () => {
    const properties = await supabase.rpc('get_properties_within_radius', {
      lat: 37.7749,
      lng: -122.4194,
      radius_km: 10,
    })

    expect(properties.data).toBeDefined()
    expect(properties.data.length).toBeGreaterThan(0)
  })
})
```

## Development Debugging

### Browser Automation & Debugging

HomeMatch integrates with powerful browser automation and debugging tools:

#### Puppeteer MCP Integration

```javascript
// Navigate to a page
mcp__puppeteer__puppeteer_navigate({ url: 'http://localhost:3000' })

// Take a screenshot
mcp__puppeteer__puppeteer_screenshot({
  name: 'homepage-debug',
  width: 1200,
  height: 800,
})

// Inject debug logs
mcp__puppeteer__puppeteer_evaluate({
  script: `
    console.log("🔵 DEBUG: User action triggered");
    console.log("🏠 HomeMatch State:", {
      currentUser: window.user?.email || "anonymous",
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  `,
})
```

#### Browser-tools MCP Integration

```javascript
// Get all console logs
mcp__browser_tools__getConsoleLogs()

// Monitor network requests
mcp__browser_tools__getNetworkLogs()

// Run performance audits
mcp__browser_tools__runPerformanceAudit()
mcp__browser_tools__runAccessibilityAudit()
mcp__browser_tools__runSEOAudit()
```

### Common Debugging Scenarios

#### 1. Authentication Issues

```javascript
// Check authentication state
mcp__puppeteer__puppeteer_evaluate({
  script: `
    if (window.supabase) {
      window.supabase.auth.getSession().then(({ data, error }) => {
        console.log("🔑 Session:", data.session ? "Active" : "None");
        console.log("👤 User:", data.session?.user?.email || "Anonymous");
        if (error) console.error("❌ Session Error:", error);
      });
    }
  `,
})
```

#### 2. Database Connection Issues

```javascript
// Test database connection
mcp__puppeteer__puppeteer_evaluate({
  script: `
    if (window.supabase) {
      window.supabase.from('properties').select('count', { count: 'exact' })
        .then(({ data, error, count }) => {
          console.log("📊 Database Test:", { count, error });
        });
    }
  `,
})
```

## Test Coverage

### Current Coverage Status

**Unit Test Coverage**: ~50-60% (up from initial 6.7%)

- **Test Files**: 39 unit test files (increased from 18)
- **Components Tested**: Authentication, Dashboard, Property, Marketing, Settings, Utilities
- **Infrastructure**: Complete mock factories and test utilities implemented

### Recent Coverage Improvements

The team successfully implemented a comprehensive unit test coverage plan that included:

1. **Infrastructure Enhancement**
   - Enhanced mock factory architecture (`test-data-factory.ts`)
   - Type-safe test utilities (`test-helpers.ts`)
   - Comprehensive Jest configuration

2. **Component Coverage**
   - Authentication components (LoginForm, SignupForm)
   - Property components (SwipeContainer, EnhancedPropertyCard)
   - Dashboard components (DashboardErrorBoundary)
   - Marketing components (HeroSection, FeatureGrid, HowItWorks)
   - Settings components (NotificationsSection, SavedSearchesSection)
   - Utility functions (utils, image-blur)

### Coverage Workflow

1. **Analyze current coverage** percentages for each function and method
2. **Add unit tests** to functions and methods without 100% coverage
3. **Include edge cases** and negative test scenarios
4. **Use mocks** for external functionality (web services, databases)
5. **Re-run coverage analysis** and repeat as necessary

### Coverage Commands

```bash
pnpm test:coverage        # Generate coverage report
pnpm test:watch          # Watch mode with coverage
npx jest --coverage      # Direct Jest coverage
```

### Coverage Configuration

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

### Performance Benchmarks

With the migrated dataset of 1,091 properties and 1,123 neighborhoods:

- **Property Search**: <2s load time with filters applied
- **Spatial Queries**: <500ms for radius-based property searches
- **Database Operations**: <100ms for standard CRUD operations
- **Image Loading**: Progressive loading with blur placeholders

## CI/CD Integration

### GitHub Actions Workflow

E2E tests run automatically on:

- Push to `main` branch
- Pull requests to `main` branch

The workflow includes:

- Dependency caching for speed
- Supabase local setup
- Test user creation
- Artifact upload for test reports

### Workflow Features

1. **Parallel execution**: E2E tests run in a separate workflow
2. **Caching**: Dependencies and Playwright browsers are cached
3. **Test reports**: HTML reports uploaded as artifacts
4. **Retry logic**: Tests retry on failure (2 retries in CI)

## Troubleshooting

### Common Issues

1. **Port 3000 in use**

   ```bash
   # Kill process on port 3000
   node scripts/kill-port.js 3000

   # Or manually (Windows)
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Or manually (Mac/Linux)
   lsof -ti:3000 | xargs kill -9
   ```

2. **Test users already exist**

   ```bash
   # The setup script handles this automatically with retries
   # But you can manually reset the database:
   pnpm dlx supabase@latest db reset
   ```

3. **Build directory issues**

   ```bash
   # Clean test build
   rm -rf .next-test/

   # Rebuild
   node scripts/build-for-tests.js
   ```

4. **Environment variable issues**
   - Ensure `.env.test.local` exists
   - Check `NEXT_PUBLIC_` prefixes for client-side vars
   - Rebuild after changing environment variables

### Debug Mode

Run tests with debug output:

```bash
# Playwright debug mode
pnpm test:e2e -- --debug

# Show browser (headed mode)
pnpm test:e2e -- --headed

# Slow down execution
pnpm test:e2e -- --slow-mo=1000
```

### Viewing Test Reports

After test runs, view the HTML report:

```bash
# Local
npx playwright show-report

# CI: Download artifacts from GitHub Actions
```

### Platform-Specific Configuration

#### Windows Configuration

```bash
# Browser-tools server (Windows)
cmd /c "npx @agentdeskai/browser-tools-server@latest"

# Port management (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Linux/Mac Configuration

```bash
# Standard MCP commands work directly
npx @agentdeskai/browser-tools-server@latest

# Port management
lsof -ti:3000 | xargs kill -9
```

## Best Practices

### Test Writing Guidelines

1. **Use standardized timeouts** from fixtures
2. **Clean auth state** between tests
3. **Use proper wait conditions** instead of arbitrary timeouts
4. **Add data-testid attributes** for reliable element selection
5. **Leverage fixtures** for common operations

### Advanced Testing Patterns

#### Multi-Level Testing Strategy

For complex features like clipboard functionality, use a layered approach:

- **Unit Tests**: Component logic and behavior (fast feedback)
- **Integration Tests**: UI integration with dependencies (realistic behavior)
- **E2E Tests**: Real browser APIs and user workflows (user confidence)

#### Test Fixtures (`__tests__/fixtures/test-data.ts`)

Use shared fixtures for consistent data across all test levels:

```typescript
import {
  TEST_USERS,
  TEST_MESSAGES,
  TEST_SELECTORS,
} from '@/__tests__/fixtures/test-data'

// Consistent test data across unit, integration, and e2e tests
expect(toast.success).toHaveBeenCalledWith(TEST_MESSAGES.clipboard.success)
```

#### Accessibility Testing (`__tests__/accessibility/`)

Ensure features are accessible by testing:

- Keyboard navigation (Tab, Enter, Space)
- Screen reader support (ARIA attributes)
- Focus management and visual indicators
- Touch targets for mobile devices

#### Error Scenario Testing (`__tests__/*/error-scenarios/`)

Test error handling comprehensively:

- **Integration Level**: API failures, network errors, permission denials
- **E2E Level**: Offline scenarios, server errors, cross-browser issues

#### Browser Clipboard Testing Best Practices

**Unit Tests**: Mock clipboard API, test component logic only

```typescript
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
})
```

**E2E Tests**: Use real clipboard API with proper permissions

```typescript
test.beforeEach(async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
})

const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
```

**Key Lesson**: Never test browser APIs in jsdom—use E2E tests for real browser functionality.

### Test Organization

```
__tests__/
├── fixtures/       # Shared test data and utilities
├── unit/          # Fast, isolated component tests
├── integration/   # Component + dependency tests
│   ├── ui/       # UI integration tests
│   └── error-scenarios/  # Error handling tests
├── accessibility/ # Accessibility compliance tests
├── e2e/          # Full user workflow tests
│   ├── auth/
│   ├── properties/
│   ├── fixtures/
│   ├── helpers/
│   └── error-scenarios/  # Real browser error tests
└── helpers/
    ├── test-utils.ts
    ├── constants.ts
    └── auth-helpers.ts
```

### Performance Considerations

1. **Build caching**: Test builds are reused between runs
2. **Parallel execution**: Tests run in parallel by default
3. **Resource cleanup**: Proper cleanup prevents resource leaks
4. **Retry logic**: Smart retries prevent flaky failures

### Security

- Test users are isolated to test environment
- CASCADE delete ensures complete cleanup
- Service role key only used in test environment
- No production data in tests

---

## Development Workflows

### Git Workflows

#### Commit and Push Workflow

For commits that involve multiple modified files:

1. **Stage all modified files** to git (unless there are files that should not be in version control)
2. **Bundle related changes** into logical commits if needed
3. **Create semantic commits** with clear, concise one-line messages
4. **Push commits** to origin

**Semantic Commit Format:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

#### Code Coverage Workflow

To improve test coverage:

1. **Analyze current coverage** percentages for each function and method
2. **Add unit tests** to functions and methods without 100% coverage
3. **Include edge cases** and negative test scenarios
4. **Use mocks** for external functionality (web services, databases)
5. **Re-run coverage analysis** and repeat as necessary

**Coverage Commands:**

```bash
pnpm test:coverage        # Generate coverage report
pnpm test:watch          # Watch mode with coverage
```

### Code Quality Checklist

Before committing code:

- [ ] Run `pnpm run lint` - ESLint validation
- [ ] Run `pnpm run type-check` - TypeScript validation
- [ ] Run `pnpm test` - All test suites pass
- [ ] Check test coverage meets standards
- [ ] Verify no `any` types introduced
- [ ] Follow Prettier formatting (automatic)

### Branch Management

- **Main branch**: `main` - Production-ready code
- **Feature branches**: `feature/descriptive-name`
- **Hotfix branches**: `hotfix/issue-description`
- **Documentation branches**: `docs/topic`

### Environment Management

- **Development**: `pnpm run dev` (port 3000)
- **Testing**: Isolated environment with test database
- **Production**: Built and deployed via CI/CD

### Automation Scripts

#### Test Infrastructure

```bash
# Start local test infrastructure
pnpm run test:infra:start

# Setup test users and data
node scripts/setup-test-users-admin.js

# Clean test environment
pnpm run test:infra:clean
```

#### Database Operations

```bash
# Apply migrations
pnpm run db:migrate

# Reset database (development only)
pnpm dlx supabase@latest db reset

# Generate TypeScript types
pnpm dlx supabase@latest gen types typescript --local > src/types/database.ts
```

#### Build and Deployment

```bash
# Production build
pnpm run build

# Test build for E2E testing
node scripts/build-for-tests.js

# Validate deployment
node scripts/validate-deployment.js
```

### UI Design Workflows

#### Design Iteration Process

For creating design variations and UI iterations:

1. **Read style guide** (`/docs/STYLE_GUIDE.md`) for design consistency
2. **Analyze existing mockups** for reference patterns
3. **Create variations** - Build 3 parallel variations of UI components
4. **Output to iterations folder** as `ui_1.html`, `ui_2.html`, etc.
5. **Review and decide** which variation works best

**UI Iteration Goals:**

- Create multiple design options for user review
- Maintain consistency with established style guide
- Enable rapid prototyping and comparison

### Code Review Process

#### Pre-Review Checklist

- [ ] All tests pass
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Security considerations addressed
- [ ] Performance impact assessed

#### Review Guidelines

1. **Functional correctness**: Does the code work as intended?
2. **Code quality**: Is it readable, maintainable, and well-structured?
3. **Test coverage**: Are new features adequately tested?
4. **Documentation**: Are changes properly documented?
5. **Security**: Are there any security implications?
6. **Performance**: Any performance impacts?

### Deployment Workflows

#### Staging Deployment

1. **Feature branch** merged to `staging`
2. **Automated tests** run in staging environment
3. **Manual QA testing** on staging environment
4. **Performance validation** with realistic data
5. **Security scanning** for vulnerabilities

#### Production Deployment

1. **Staging approval** from QA team
2. **Production build** with optimizations
3. **Database migrations** (if needed)
4. **Blue-green deployment** for zero downtime
5. **Post-deployment validation** and monitoring
6. **Rollback procedures** ready if needed

### Monitoring and Maintenance

#### Regular Maintenance Tasks

- **Weekly**: Dependency updates and security patches
- **Monthly**: Performance analysis and optimization
- **Quarterly**: Architecture review and technical debt assessment

#### Monitoring Dashboards

- **Application Performance**: Response times, error rates
- **Database Performance**: Query performance, connection pools
- **Infrastructure**: Server resources, network performance
- **User Experience**: Core Web Vitals, user feedback

### Emergency Procedures

#### Incident Response

1. **Immediate assessment**: Severity and impact
2. **Communication**: Notify stakeholders
3. **Mitigation**: Quick fixes or rollback
4. **Investigation**: Root cause analysis
5. **Resolution**: Permanent fix and prevention
6. **Post-mortem**: Document lessons learned

#### Rollback Procedures

- **Database rollback**: Migration rollback scripts
- **Application rollback**: Previous version deployment
- **Configuration rollback**: Revert environment changes
- **Cache invalidation**: Clear relevant caches

---

_This guide covers all testing strategies, tools, and procedures for HomeMatch V2 development._
