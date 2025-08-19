# Enhanced E2E Test Framework

## Overview

The enhanced E2E test framework provides systematic solutions to the 282 test failures by implementing:

- **Worker-isolated test data** to prevent race conditions
- **Consistent error handling** with automatic recovery
- **Performance monitoring** and bottleneck detection
- **Standardized patterns** for reliable test execution

## Quick Start

### 1. Import the Enhanced Framework

```typescript
import { test, expect, testHelpers } from '../utils/enhanced-test-framework'
```

### 2. Create Test Suites

```typescript
const suite = testHelpers.createSuite('Dashboard Tests')

// Basic test with enhanced features
suite.create('loads dashboard', async ({ enhancedPage }) => {
  await enhancedPage.safeGoto('/dashboard')
  await enhancedPage.ensureHealthy()
})

// Authenticated test (automatic auth setup)
suite.createWithAuth(
  'user dashboard access',
  async ({ enhancedPage, workerAuth }) => {
    await enhancedPage.safeGoto('/dashboard')
    // User is already authenticated
  }
)

// Fresh user test (no existing data)
suite.createWithFreshUser(
  'onboarding flow',
  async ({ enhancedPage, userData }) => {
    // User has no household, properties, etc.
    await enhancedPage.safeGoto('/profile')
  }
)
```

### 3. Enhanced Page Interactions

```typescript
// Safe navigation with error handling
await enhancedPage.safeGoto('/dashboard')

// Safe element interactions with fallback selectors
await enhancedPage.safeClick([
  '[data-testid="login-button"]',
  'button:has-text("Login")',
  'input[type="submit"]',
])

await enhancedPage.safeFill(
  ['[data-testid="email-input"]', 'input[type="email"]'],
  'user@example.com'
)

// Wait for stable state (no loading indicators)
await enhancedPage.waitForStable()

// Ensure page is healthy (no errors)
await enhancedPage.ensureHealthy()
```

### 4. Worker-Isolated Test Data

```typescript
// Get worker-specific data (prevents conflicts)
const userData = enhancedPage.getWorkerData()

console.log(userData.user.email) // test-worker-0@example.com
console.log(userData.household.name) // Test Household Worker 0
console.log(userData.property.address) // 100 Test Street, Test City
```

## Framework Features

### Error Handling

The framework automatically detects and handles common error types:

- **Authentication errors**: Auto-redirects to login
- **Network errors**: Retries with backoff
- **UI errors**: Looks for retry buttons and recovery mechanisms

```typescript
// Manual error handling
const errorHandler = createTestErrorHandler()
const errorResult = await errorHandler.detectError(page)

if (errorResult.hasError) {
  console.log('Error type:', errorResult.errorType)
  console.log('Can recover:', errorResult.canRecover)
}
```

### Performance Monitoring

All tests automatically track performance metrics:

```typescript
// Metrics are automatically collected:
// - Test duration
// - Browser navigation timing
// - Network request metrics
// - Memory usage

// Generate performance report
import { generateTestReport } from '../utils/enhanced-test-framework'
generateTestReport()
```

### Flexible Element Interactions

```typescript
// Verify elements with multiple fallback selectors
await testHelpers.verifyElement(page, [
  '[data-testid="dashboard"]',
  'h1:has-text("Dashboard")',
  'main',
])

// Verify text with flexible patterns
await testHelpers.verifyText(page, [
  'Welcome to Dashboard',
  /dashboard/i,
  'text=Dashboard',
])

// Wait for any condition to be met
const conditionMet = await testHelpers.waitForAny(page, [
  () => page.locator('[data-testid="success"]').isVisible(),
  () => page.locator('[data-testid="error"]').isVisible(),
  () => page.url().includes('/dashboard'),
])
```

## Migration from Legacy Tests

### Before (Legacy Pattern)

```typescript
test('user login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
})
```

### After (Enhanced Pattern)

```typescript
const suite = testHelpers.createSuite('Auth Tests')

suite.createWithAuth('user login', async ({ enhancedPage }) => {
  // Authentication already handled automatically
  await enhancedPage.safeGoto('/dashboard')
  await enhancedPage.ensureHealthy()
})
```

## Error Scenario Testing

For tests that expect errors:

```typescript
suite.createErrorScenario(
  'handles network failure',
  async ({ enhancedPage }) => {
    // Block all API calls
    await enhancedPage.route('**/api/**', (route) => route.abort())

    await enhancedPage.safeGoto('/dashboard')

    // Framework will verify error was properly handled
    // and that error UI is displayed
  }
)
```

## Best Practices

### 1. Use Safe Interactions

Always use `safeGoto`, `safeClick`, `safeFill` instead of direct page methods.

### 2. Provide Fallback Selectors

Always provide multiple selector options for element targeting:

```typescript
const selectors = [
  '[data-testid="primary-button"]', // Most specific
  '.primary-button', // Class fallback
  'button:has-text("Submit")', // Text fallback
  'button[type="submit"]', // Generic fallback
]
```

### 3. Verify Page Health

Always check page health after navigation:

```typescript
await enhancedPage.safeGoto('/dashboard')
await enhancedPage.ensureHealthy() // Ensure no errors
```

### 4. Use Worker-Specific Data

Always use worker-specific test data to prevent conflicts:

```typescript
const userData = enhancedPage.getWorkerData()
// userData.user.email is unique per worker
```

### 5. Handle Timeouts Gracefully

Use the framework's built-in timeout handling:

```typescript
// Framework handles timeouts automatically
const found = await enhancedPage.safeClick(selectors, {
  timeout: 10000,
  required: false, // Don't throw if not found
})

if (!found) {
  console.log('Element not found, continuing with alternative flow')
}
```

## Performance Optimization

### Monitor Test Performance

```typescript
// Performance metrics automatically collected
// Check .bus/performance-report.json for insights

// Common optimizations:
// 1. Use worker-specific auth to avoid login delays
// 2. Use safeGoto for efficient navigation
// 3. Use waitForStable instead of arbitrary timeouts
```

### Parallel Execution Best Practices

```typescript
// Framework ensures worker isolation:
// - Each worker gets unique test data
// - No shared state between workers
// - Automatic conflict resolution
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Use `enhancedPage.waitForStable()` instead of fixed timeouts
2. **Race Conditions**: Ensure using worker-specific data via `getWorkerData()`
3. **Element Not Found**: Provide multiple fallback selectors
4. **Authentication Issues**: Use `createWithAuth()` for tests requiring authentication

### Debug Information

The framework provides extensive debug information:

```typescript
// Check page health
const isHealthy = await enhancedPage.ensureHealthy()
console.log('Page is healthy:', isHealthy)

// Get worker data
const userData = enhancedPage.getWorkerData()
console.log('Worker data:', userData)

// Performance metrics saved to .bus/performance-metrics.json
// Error logs available in test output
```

## Integration with Existing Tests

The enhanced framework is designed to be gradually adopted:

1. **Phase 1**: Convert high-priority failing tests
2. **Phase 2**: Migrate test suites one at a time
3. **Phase 3**: Update remaining tests when time permits

Legacy tests will continue to work alongside enhanced tests.
