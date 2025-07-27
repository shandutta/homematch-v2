# Testing and Debugging Guide for HomeMatch

This guide outlines how developers can use **Puppeteer MCP** and **Browser-tools MCP** to debug issues in the HomeMatch application.

## Overview

HomeMatch integrates with two powerful browser automation and debugging tools:

- **Puppeteer MCP**: Browser automation, screenshot capture, and script execution
- **Browser-tools MCP**: Real-time console monitoring, network analysis, and Lighthouse audits

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Puppeteer MCP Usage](#puppeteer-mcp-usage)
3. [Browser-tools MCP Usage](#browser-tools-mcp-usage)
4. [Common Debugging Scenarios](#common-debugging-scenarios)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Quick Setup

### Development Server Port Configuration

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
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000" })

// Take a screenshot
mcp__puppeteer__puppeteer_screenshot({ 
  name: "homepage-debug",
  width: 1200,
  height: 800 
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
  `
})
```

### User Interaction Testing

```javascript
// Click elements
mcp__puppeteer__puppeteer_click({ selector: ".sign-in-button" })

// Fill forms
mcp__puppeteer__puppeteer_fill({ 
  selector: "#email-input", 
  value: "test@example.com" 
})

// Select dropdown options
mcp__puppeteer__puppeteer_select({ 
  selector: "#property-type", 
  value: "house" 
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
  `
})
```

## Browser-tools MCP Usage

### Real-time Console Monitoring

```javascript
// Get all console logs
mcp__browser_tools__getConsoleLogs()

// Get only errors
mcp__browser_tools__getConsoleErrors()

// Example output:
[
  {
    "type": "console-log",
    "level": "error",
    "message": "Supabase connection failed",
    "timestamp": 1753657550081
  }
]
```

### Network Request Monitoring

```javascript
// Monitor all network requests
mcp__browser_tools__getNetworkLogs()

// Check for failed requests
mcp__browser_tools__getNetworkErrors()

// Example output:
[
  {
    "type": "network-error",
    "url": "https://lpwlbbowavozpywnpamn.supabase.co/auth/v1/user",
    "status": 401,
    "error": "Unauthorized"
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
     `
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
   mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000/search" })
   
   // Perform search
   mcp__puppeteer__puppeteer_fill({ selector: "#search-input", value: "2 bedroom apartment" })
   mcp__puppeteer__puppeteer_click({ selector: "#search-button" })
   
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
     name: "mobile-view",
     width: 375,
     height: 667
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
     `
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
     `
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
console.error("🔴 AUTH_ERROR:", {
  action: "login",
  error: error.message,
  userId: user?.id,
  timestamp: Date.now()
});

// Bad: Unclear error logging
console.log("error");
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
  `
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
  `
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
  `
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