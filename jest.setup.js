require('@testing-library/jest-dom')

// Import and setup our comprehensive typed Supabase mock
require('./__tests__/setupSupabaseMock')

// Polyfill Request/Response/fetch for route handler tests (NextRequest compatibility)
try {
  const { Request, Response, fetch, Headers } = require('undici')
  if (typeof global.Request === 'undefined') {
    global.Request = Request
  }
  if (typeof global.Response === 'undefined') {
    global.Response = Response
  }
  if (typeof global.fetch === 'undefined') {
    global.fetch = fetch
  }
  if (typeof global.Headers === 'undefined') {
    global.Headers = Headers
  }
} catch {
  // undici not available; tests that rely on Request/Response may fail
}
