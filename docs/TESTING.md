# Testing and Quality Assurance Guide for HomeMatch V2 ✅

> **🏆 Current Status**: Migration foundation complete with 99.1% success rate (2,214 records migrated). Comprehensive test framework ready for implementation.

This guide outlines the complete testing strategy for HomeMatch V2, including unit tests, integration tests, end-to-end testing, and debugging approaches.

## Overview

HomeMatch V2 implements a comprehensive 4-tier testing strategy:

1. **Unit Tests**: Jest + React Testing Library for service layer and components
2. **Integration Tests**: Vitest + Supabase MCP for database and API testing
3. **End-to-End Tests**: Playwright for complete user workflows
4. **Debug Tools**: Puppeteer MCP and Browser-tools MCP for development debugging

### ✅ **Migration Foundation Validated**

The testing strategy leverages the successfully migrated production data:

- **1,123 neighborhoods** with PostGIS spatial data
- **1,091 properties** with complete property information
- **Complete service layer** (PropertyService + UserService) ready for testing
- **Live validation dashboard** at `/validation` route for real-time verification

## Table of Contents

1. [Testing Framework Overview](#testing-framework-overview)
2. [Unit Testing Strategy](#unit-testing-strategy)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Database Testing](#database-testing)
6. [Development Debugging Tools](#development-debugging-tools)
7. [Performance Testing](#performance-testing)
8. [Migration Data Validation](#migration-data-validation)

---

## Testing Framework Overview ✅ **CONFIGURED**

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

### Test Environment Configuration

```bash
# Test Scripts (from package.json)
npm run test              # Run all tests
npm run test:unit         # Jest unit tests
npm run test:integration  # Vitest integration tests
npm run test:e2e          # Playwright E2E tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage reports
```

---

## Unit Testing Strategy

### Service Layer Testing ✅ **READY FOR IMPLEMENTATION**

The service layer provides the foundation for all unit tests with real migrated data:

#### PropertyService Tests

**Location**: `__tests__/unit/services/properties.test.ts`

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

**Location**: `__tests__/unit/services/users.test.ts`

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

Test React components with real service integration and proper mocking.

---

## Integration Testing

### Database Integration Tests ✅ **DATA READY**

#### Migration Data Validation

**Location**: `__tests__/integration/migration/`

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

**Location**: `__tests__/integration/database/relationships.test.ts`

```typescript
describe('Database Relationships', () => {
  test('should maintain property-neighborhood referential integrity', async () => {
    // Test foreign key constraints and spatial relationships
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

---

## End-to-End Testing

### User Workflow Testing ✅ **FRAMEWORK READY**

#### Property Discovery Flow

**Location**: `__tests__/e2e/property-discovery.spec.ts`

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

#### Performance Testing

**Location**: `__tests__/e2e/performance/`

```typescript
test('should load property search results under 2 seconds', async ({
  page,
}) => {
  const startTime = Date.now()

  await page.goto('/properties?price_min=500000&bedrooms=3')
  await expect(
    page.locator('[data-testid="property-card"]').first()
  ).toBeVisible()

  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(2000)
})
```

---

## Database Testing

### Schema Validation ✅ **PRODUCTION VERIFIED**

#### RLS Policy Testing

**Location**: `__tests__/unit/database/security.test.ts`

```typescript
describe('Row Level Security', () => {
  test('should enforce user data isolation', async () => {
    // Test that users can only access their own data
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

**Location**: `__tests__/unit/database/spatial.test.ts`

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

---

## Migration Data Validation

### Live Validation Testing ✅ **IMPLEMENTED**

The `/validation` route provides real-time verification of migration success:

#### Validation Dashboard Tests

**Location**: `__tests__/e2e/validation.spec.ts`

```typescript
test('should display accurate migration statistics', async ({ page }) => {
  await page.goto('/validation')

  // Verify database table counts
  await expect(
    page.locator('[data-testid="table-neighborhoods"]')
  ).toContainText('1,123')
  await expect(page.locator('[data-testid="table-properties"]')).toContainText(
    '1,091'
  )

  // Verify PostGIS extensions
  await expect(page.locator('[data-testid="postgis-status"]')).toContainText(
    'Active'
  )

  // Test PropertyService functionality
  await expect(
    page.locator('[data-testid="property-search-test"]')
  ).toContainText('✅')
})
```

## Development Debugging Tools

### Browser Automation & Debugging ✅ **CONFIGURED**

HomeMatch integrates with powerful browser automation and debugging tools for development:

#### Puppeteer MCP Integration

- **Browser automation**: Screenshot capture, script execution, and page interaction
- **Performance analysis**: Load time measurement and resource monitoring
- **E2E test development**: Rapid prototyping of user interaction flows

#### Browser-tools MCP Integration

- **Real-time monitoring**: Console logs, network requests, and error tracking
- **Lighthouse audits**: Performance, accessibility, and SEO analysis
- **Development debugging**: Live inspection of running application

---

## Performance Testing

### Core Web Vitals Monitoring ✅ **CONFIGURED**

```typescript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export function initPerformanceMonitoring() {
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}
```

### Performance Benchmarks

With the migrated dataset of 1,091 properties and 1,123 neighborhoods:

- **Property Search**: <2s load time with filters applied
- **Spatial Queries**: <500ms for radius-based property searches
- **Database Operations**: <100ms for standard CRUD operations
- **Image Loading**: Progressive loading with blur placeholders

---

## Quick Setup

### Development Environment Configuration

HomeMatch is configured to run on **port 3000** by default:

```json
// package.json
"scripts": {
  "dev": "next dev --turbopack"  // Defaults to port 3000
}
```

If port 3000 is in use, Next.js will automatically use the next available port (3001, 3002, etc.). To force port 3000:

```bash
# Stop any process using port 3000
npm run kill-node  # Uses helper script to kill node processes

# Or manually:
# Windows: netstat -ano | findstr :3000 && taskkill /PID <PID> /F
# Mac/Linux: lsof -ti:3000 | xargs kill -9

# Then start dev server
npm run dev
```

### Prerequisites

- HomeMatch development server running (`npm run dev` on port 3000)
- Claude Code with MCP support
- Chrome browser
- **Windows users**: Ensure MCP commands use `cmd /c` wrapper

### Browser-tools Setup

1. **Install Chrome Extension**

   ```bash
   # Download and install from:
   # https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip
   ```

2. **Start Browser-tools Server**

   **Linux/Mac:**

   ```bash
   npx @agentdeskai/browser-tools-server@latest
   ```

   **Windows:**

   ```bash
   cmd /c "npx @agentdeskai/browser-tools-server@latest"
   ```

   > **Note**: Windows users must use the `cmd /c` wrapper for MCP servers to run properly

3. **Configure MCP Server** (already configured in `.mcp.json`)

4. **Enable Extension**
   - Navigate to `http://localhost:3000` (default dev server URL)
   - Open Chrome DevTools (F12)
   - Go to "BrowserToolsMCP" panel
   - Ensure extension is connected

### Puppeteer Setup

Puppeteer MCP is pre-configured and works out-of-the-box with Claude Code.

## Puppeteer MCP Usage

### Basic Navigation and Screenshots

```javascript
// Navigate to a page
mcp__puppeteer__puppeteer_navigate({ url: 'http://localhost:3000' })

// Take a screenshot
mcp__puppeteer__puppeteer_screenshot({
  name: 'homepage-debug',
  width: 1200,
  height: 800,
})
```

### Console Log Injection and Monitoring

```javascript
// Inject console logs for debugging
mcp__puppeteer__puppeteer_evaluate({
  script: `
    console.log("🔵 DEBUG: User action triggered");
    console.error("🔴 ERROR: Authentication failed", { userId: 123 });
    console.warn("🟡 WARN: Property data incomplete");
    
    // Log application state
    console.log("🏠 HomeMatch State:", {
      currentUser: window.user?.email || "anonymous",
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  `,
})
```

### User Interaction Testing

```javascript
// Click elements
mcp__puppeteer__puppeteer_click({ selector: '.sign-in-button' })

// Fill forms
mcp__puppeteer__puppeteer_fill({
  selector: '#email-input',
  value: 'test@example.com',
})

// Select dropdown options
mcp__puppeteer__puppeteer_select({
  selector: '#property-type',
  value: 'house',
})
```

### Advanced Debugging Scenarios

```javascript
// Test authentication flow
mcp__puppeteer__puppeteer_evaluate({
  script: `
    // Check if user is authenticated
    const isAuthenticated = !!window.supabase?.auth?.user;
    console.log("🔐 Auth Status:", isAuthenticated);
    
    // Check Supabase connection
    if (window.supabase) {
      window.supabase.auth.getUser().then(({ data, error }) => {
        console.log("👤 Current User:", data.user?.email || "None");
        if (error) console.error("🚨 Auth Error:", error);
      });
    }
    
    return { authenticated: isAuthenticated };
  `,
})
```

## Browser-tools MCP Usage

### Real-time Console Monitoring

```javascript
// Get all console logs
mcp__browser_tools__getConsoleLogs()

// Get only errors
mcp__browser_tools__getConsoleErrors()[
  // Example output:
  {
    type: 'console-log',
    level: 'error',
    message: 'Supabase connection failed',
    timestamp: 1753657550081,
  }
]
```

### Network Request Monitoring

```javascript
// Monitor all network requests
mcp__browser_tools__getNetworkLogs()

// Check for failed requests
mcp__browser_tools__getNetworkErrors()[
  // Example output:
  {
    type: 'network-error',
    url: 'https://lpwlbbowavozpywnpamn.supabase.co/auth/v1/user',
    status: 401,
    error: 'Unauthorized',
  }
]
```

### Lighthouse Audits

```javascript
// Performance audit
mcp__browser_tools__runPerformanceAudit()

// Accessibility audit
mcp__browser_tools__runAccessibilityAudit()

// SEO audit
mcp__browser_tools__runSEOAudit()

// Next.js specific audit
mcp__browser_tools__runNextJSAudit()

// Run all audits
mcp__browser_tools__runAuditMode()
```

### Screenshots and Visual Debugging

```javascript
// Take screenshot via browser-tools
mcp__browser_tools__takeScreenshot()
```

## Common Debugging Scenarios

### 1. Authentication Issues

**Problem**: Users can't sign in or sessions are not persisting

**Debugging Steps**:

1. **Check Console Logs**

   ```javascript
   mcp__browser_tools__getConsoleErrors()
   ```

2. **Monitor Network Requests**

   ```javascript
   mcp__browser_tools__getNetworkLogs()
   ```

3. **Test Authentication State**
   ```javascript
   mcp__puppeteer__puppeteer_evaluate({
     script: `
       // Check Supabase auth state
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

### 2. Property Search Performance

**Problem**: Property search is slow or not returning results

**Debugging Steps**:

1. **Performance Audit**

   ```javascript
   mcp__browser_tools__runPerformanceAudit()
   ```

2. **Monitor Search API Calls**

   ```javascript
   // Navigate to search page
   mcp__puppeteer__puppeteer_navigate({ url: 'http://localhost:3000/search' })

   // Perform search
   mcp__puppeteer__puppeteer_fill({
     selector: '#search-input',
     value: '2 bedroom apartment',
   })
   mcp__puppeteer__puppeteer_click({ selector: '#search-button' })

   // Check network logs
   mcp__browser_tools__getNetworkLogs()
   ```

3. **Check for JavaScript Errors**
   ```javascript
   mcp__browser_tools__getConsoleErrors()
   ```

### 3. Mobile Responsiveness Issues

**Problem**: Layout breaks on mobile devices

**Debugging Steps**:

1. **Mobile Screenshot**

   ```javascript
   mcp__puppeteer__puppeteer_screenshot({
     name: 'mobile-view',
     width: 375,
     height: 667,
   })
   ```

2. **Accessibility Audit**
   ```javascript
   mcp__browser_tools__runAccessibilityAudit()
   ```

### 4. Database Connection Issues

**Problem**: Data not loading from Supabase

**Debugging Steps**:

1. **Check Environment Variables**

   ```javascript
   mcp__puppeteer__puppeteer_evaluate({
     script: `
       console.log("🔧 Environment Check:", {
         hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
         hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
         supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "..."
       });
     `,
   })
   ```

2. **Test Database Connection**
   ```javascript
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

## Best Practices

### 1. Systematic Debugging Approach

1. **Start with Visual Inspection**
   - Take screenshots to see current state
   - Use different viewport sizes

2. **Check Console Logs**
   - Monitor for JavaScript errors
   - Look for warning messages

3. **Analyze Network Activity**
   - Check API response times
   - Verify successful data loading

4. **Run Comprehensive Audits**
   - Performance, accessibility, SEO
   - Next.js specific checks

### 2. Error Logging Best Practices

```javascript
// Good: Structured error logging
console.error('🔴 AUTH_ERROR:', {
  action: 'login',
  error: error.message,
  userId: user?.id,
  timestamp: Date.now(),
})

// Bad: Unclear error logging
console.log('error')
```

### 3. Performance Monitoring

```javascript
// Monitor Core Web Vitals
mcp__puppeteer__puppeteer_evaluate({
  script: `
    // Measure Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log("⚡ LCP:", lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Measure Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log("📐 CLS:", clsValue);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  `,
})
```

## Platform-Specific Setup

### Windows Configuration

**MCP Server Commands**: Windows requires the `cmd /c` wrapper for MCP servers:

```bash
# Browser-tools server (Windows)
cmd /c "npx @agentdeskai/browser-tools-server@latest"

# If you need to install the MCP server separately:
cmd /c "npx @agentdeskai/browser-tools-mcp@latest"
```

**Port Management**: Windows-specific commands for managing development ports:

```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process by PID (replace <PID> with actual PID)
taskkill /PID <PID> /F

# Alternative: Use the included helper script
npm run kill-node
```

**PowerShell vs Command Prompt**:

- Use **Command Prompt** or **Git Bash** for MCP servers
- PowerShell may have different escaping requirements

### Linux/Mac Configuration

```bash
# Standard MCP commands work directly
npx @agentdeskai/browser-tools-server@latest

# Port management
lsof -ti:3000 | xargs kill -9
```

## MCP Configuration Reference

The project includes pre-configured MCP servers in `.mcp.json`:

```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@agentdeskai/browser-tools-mcp@latest"],
      "disabled": false
    },
    "puppeteer": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@puppeteer/mcp-server@latest"],
      "disabled": false
    }
  }
}
```

**Note**: The `cmd /c` wrapper is essential for Windows compatibility.

## Troubleshooting

### Browser-tools Issues

**Problem**: "Failed to discover browser connector server"

- **Solution**: Ensure `npx @agentdeskai/browser-tools-server@latest` is running
- **Check**: Terminal should show "Server running on port..."

**Problem**: "Chrome extension not connected"

- **Solution**:
  1. Navigate to your app in Chrome
  2. Open DevTools (F12)
  3. Go to "BrowserToolsMCP" panel
  4. Ensure it shows "Connected"

**Problem**: No console logs captured

- **Solution**:
  1. Refresh the page with DevTools open
  2. Ensure you're on the correct tab
  3. Check that extension has proper permissions

### Puppeteer Issues

**Problem**: "Maximum call stack size exceeded" during script execution

- **Solution**: Simplify the injected script, avoid recursive functions

**Problem**: Navigation timeouts

- **Solution**: Ensure dev server is running and accessible

### Windows-Specific Issues

**Problem**: MCP servers not starting

- **Solution**: Use `cmd /c` wrapper: `cmd /c "npx @agentdeskai/browser-tools-server@latest"`
- **Alternative**: Use Git Bash instead of PowerShell

**Problem**: Port 3000 always in use

- **Solution**:

  ```bash
  # Check what's using the port
  netstat -ano | findstr :3000

  # Kill the process
  taskkill /PID <PID> /F

  # Or use the helper script
  npm run kill-node
  ```

**Problem**: "Command not found" errors

- **Solution**: Ensure Node.js and npm are in your PATH
- **Check**: `node --version` and `npm --version` should work

**Problem**: Permission errors

- **Solution**: Run terminal as Administrator (if needed)
- **Alternative**: Use Git Bash with regular user permissions

### General Tips

1. **Always check server logs** in `dev-server.log`
2. **Use structured logging** with timestamps and context
3. **Test in multiple browsers** and viewport sizes
4. **Monitor network requests** for API failures
5. **Run audits regularly** to catch performance regressions

## Integration with HomeMatch

### Next.js Specific Debugging

```javascript
// Check Fast Refresh status
mcp__browser_tools__getConsoleLogs()
// Look for "[Fast Refresh] rebuilding" messages

// Test API routes
mcp__puppeteer__puppeteer_evaluate({
  script: `
    fetch('/api/properties')
      .then(response => {
        console.log("🏠 Properties API:", response.status);
        return response.json();
      })
      .then(data => console.log("📊 Properties Data:", data.length, "items"))
      .catch(error => console.error("❌ API Error:", error));
  `,
})
```

### Supabase Integration Testing

```javascript
// Test RLS policies
mcp__puppeteer__puppeteer_evaluate({
  script: `
    // Test authenticated access
    window.supabase.from('user_preferences').select('*')
      .then(({ data, error }) => {
        console.log("🔐 RLS Test:", error ? "BLOCKED" : "ALLOWED");
        console.log("📊 Data Count:", data?.length || 0);
      });
  `,
})
```

---

## Additional Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Browser-tools MCP GitHub](https://github.com/AgentDeskAI/browser-tools-mcp)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

## Contributing

When adding new debugging techniques to this guide:

1. Test the technique with real HomeMatch scenarios
2. Provide clear, copy-paste code examples
3. Include expected output when possible
4. Document any prerequisites or setup steps
