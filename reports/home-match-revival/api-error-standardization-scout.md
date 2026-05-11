# API Error Standardization Scout (M6)

Scope: Phase 0/1 read-only scout of `src/app/api/**/route.ts` plus shared API error helpers. No tests/builds/external calls run.

## Current standard

`src/lib/api/errors.ts` defines `ApiErrorHandler` with standardized shapes:

- Error: `{ error, code, details? }` for 400; `{ error, code }` for 401/403/404/500.
- Success: `{ data, success: true }`.
- Existing helpers: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`, `fromZodError`, `success`.

`src/lib/api/auth.ts` already centralizes auth via `requireUserFromRequest()` and returns `ApiErrorHandler.unauthorized()`.

## Summary counts

- Raw `NextResponse.json({ error: ... })` responses in API route files: **85** across **23** route files.
- Route files already using `ApiErrorHandler`: **3**.
- Mixed standardized/raw route: **1** (`src/app/api/interactions/route.ts`).
- Shared helpers still returning raw error shapes:
  - `src/lib/api/admin-rate-limit.ts`: raw 429 `{ error }`.
  - `src/lib/middleware/rateLimiter.ts`: raw 429 `{ error, message, retryAfter }`, raw 401 `{ error }`, raw 500 `{ error }`.

## Existing ApiErrorHandler usage

- `src/app/api/interactions/reset/route.ts`
  - Uses: `unauthorized`, `badRequest`, `serverError`, `success`.
  - No raw route-local error responses found.
- `src/app/api/users/avatar/route.ts`
  - Uses: `badRequest`, `notFound`, `serverError`, `success`.
  - No raw route-local error responses found.
- `src/app/api/interactions/route.ts`
  - Uses: `unauthorized`, `badRequest`, `fromZodError`, `serverError`, `success`.
  - Still has 8 raw error responses listed below.

## Highest-priority gaps

1. **Inconsistent error shape:** all raw route errors omit `code`; several include extra fields directly on the top-level object (`details`, `status`, `updated`, `requests`, `skipped`, `processed`) instead of using the helper shape.
2. **Incorrect/ambiguous status semantics:** `src/app/api/zillow/random-image/route.ts` returns an error body with HTTP **204** twice. 204 responses should not carry bodies and will not fit the standard error contract.
3. **Mixed migration:** `src/app/api/interactions/route.ts` uses `ApiErrorHandler` for POST/DELETE paths but keeps raw errors in GET/summary/list paths.
4. **Rate-limit inconsistency:** route-local 429 errors usually use `{ error: 'Too many requests...' }`; middleware rate limiter uses `{ error: 'Too Many Requests', message, retryAfter }`; admin rate limiter uses raw `{ error }`.
5. **Unsupported method responses:** several routes explicitly return raw 405 `{ error: 'Method not allowed' }`. `ApiErrorHandler` has no method-not-allowed helper.
6. **Service-unavailable responses:** many 503 cases use raw `{ error }`. `ApiErrorHandler` has no service-unavailable helper.
7. **Gateway/timeout responses:** raw 502/504 are present. `ApiErrorHandler` has no bad-gateway/gateway-timeout helper.

## Raw error response inventory by route

### Admin routes

- `src/app/api/admin/generate-vibes/route.ts`
  - L377: 401 `{ error: 'Unauthorized' }`.
- `src/app/api/admin/ingest/zillow/route.ts`
  - L114: 401 `{ error: 'unauthorized cron' }`.
  - L128: 503 `{ error: 'RAPIDAPI_KEY missing' }`.
  - L169: 500 `{ error: message }`.
- `src/app/api/admin/status-refresh/route.ts`
  - L101: 500 `{ error: 'CRON secret not set' }`.
  - L107: 503 `{ error: 'RAPIDAPI_KEY missing' }`.
  - L153: 401 `{ error: 'unauthorized cron' }`.
  - L177: 500 `{ error: error?.message || 'failed to load properties' }`.
  - L306: 500 `{ error: nextError.message, updated, requests, skipped, processed }`.
  - L333: 500 `{ error: upErr.message, updated, requests, skipped }`.
  - L364: 500 `{ error: 'internal error' }`.

### Couples routes

- `src/app/api/couples/activity/route.ts`
  - L10/L14/L18/L22: 405 `{ error: 'Method not allowed' }`.
  - L90: 500 `{ error: 'Failed to fetch household activity' }`.
- `src/app/api/couples/check-mutual/route.ts`
  - L18: 401 `{ error: 'Unauthorized' }`.
  - L25: 400 `{ error: 'Property ID is required' }`.
  - L81: 500 `{ error: 'Failed to check mutual like' }`.
  - L90/L93/L96/L99: 405 `{ error: 'Method not allowed' }`.
- `src/app/api/couples/disputed/route.ts`
  - L107/L411: 404 `{ error: 'No household found' }`.
  - L124: 500 `{ error: 'Failed to fetch household members' }`.
  - L190: 500 `{ error: 'Failed to fetch property interactions' }`.
  - L355: 500 `{ error: 'Failed to fetch disputed properties' }`.
  - L374: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L384: 400 `{ error: 'Property ID and resolution type are required' }`.
  - L398: 400 `{ error: 'Invalid resolution type' }`.
  - L435: 500 `{ error: 'Failed to save resolution' }`.
  - L449: 500 `{ error: 'Failed to update resolution' }`.
- `src/app/api/couples/mutual-likes/route.ts`
  - L78: 401 `{ error: 'Unauthorized' }`.
  - L160: 500 `{ error: 'Failed to fetch mutual likes' }`.
- `src/app/api/couples/notify/route.ts`
  - L25: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L96: 400 `{ error: 'Invalid request data', details: error.errors }`.
  - L102: 500 `{ error: 'Failed to process notification' }`.
- `src/app/api/couples/stats/route.ts`
  - L18: 401 `{ error: 'Unauthorized' }`.
  - L25: 404 `{ error: 'Household not found or no statistics available' }`.
  - L34: 500 `{ error: 'Failed to fetch household statistics' }`.

### Interactions routes

- `src/app/api/interactions/route.ts` (mixed with `ApiErrorHandler`)
  - L167: 500 `{ error: 'Failed to record interaction' }`.
  - L223: 400 `{ error: 'Missing type query parameter' }`.
  - L254: 504 `{ error: 'Failed to fetch summary' }`.
  - L264: 500 `{ error: 'Failed to fetch summary' }`.
  - L304: 400 `{ error: 'Invalid type parameter' }`.
  - L381: 500 `{ error: `Failed to fetch ${type} properties` }`.
  - L403: 500 `{ error: 'Internal server error' }`.
  - L423: 429 `{ error: 'Too many requests. Please try again later.' }`.

### Maps routes

- `src/app/api/maps/geocode/route.ts`
  - L57: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L66: 503 `{ error: 'Geocoding service unavailable' }`.
  - L76: 400 `{ error: 'Invalid request parameters', details: parsed.error.issues }`.
  - L118: 400 `{ error: 'Geocoding failed', status }`.
  - L151: 500 `{ error: 'Internal server error' }`.
- `src/app/api/maps/metro-boundaries/route.ts`
  - L14: 400 `{ error: 'Missing metro parameter' }`.
  - L36: 500 `{ error: `Failed to load neighborhoods: ${error.message}` }`.
- `src/app/api/maps/places/autocomplete/route.ts`
  - L68: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L77: 503 `{ error: 'Places service unavailable' }`.
  - L87: 400 `{ error: 'Invalid request parameters', details: parsed.error.issues }`.
  - L130: 400 `{ error: 'Places autocomplete failed', status: data?.status }`.
  - L163: 500 `{ error: 'Internal server error' }`.
- `src/app/api/maps/script/route.ts`
  - L13: 503 `{ error: 'Maps service unavailable' }`.
  - L29: 500 `{ error: 'Maps service unavailable' }`.

### Other API routes

- `src/app/api/health/route.ts`
  - L19/L23/L27/L31: 405 `{ error: 'Method not allowed' }`.
- `src/app/api/neighborhoods/vibes/route.ts`
  - L57: 503 `{ error: 'Neighborhood vibes not initialized. Run the neighborhood_vibes migration first.' }`.
  - L67: 500 `{ error: 'Failed to fetch neighborhood vibes' }`.
- `src/app/api/performance/metrics/route.ts`
  - L87: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L147: 400 `{ error: 'Invalid metrics payload' }`.
- `src/app/api/properties/marketing/route.ts`
  - L6/L9/L12/L15: 405 `{ error: 'Method not allowed' }`.
- `src/app/api/properties/vibes/route.ts`
  - L62: 500 `{ error: 'Failed to fetch vibes' }`.
- `src/app/api/users/search/route.ts`
  - L19: 429 `{ error: 'Too many requests. Please try again later.' }`.
  - L30: 400 `{ error: 'Search query must be at least 3 characters' }`.
  - L52/L70: 500 `{ error: 'Failed to search users' }`.
- `src/app/api/zillow/random-image/route.ts`
  - L70: 404 `{ error: 'Not found' }`.
  - L78: 503 `{ error: 'Application is not configured for Zillow API access.' }`.
  - L97: 502 `{ error: `Zillow search failed: ${searchRes.status} ${searchRes.statusText}` }`.
  - L119: 204 `{ error: 'No properties found from search query' }`.
  - L161: 204 `{ error: 'No images returned for selected properties' }`.

## Suggested Phase 1 closure targets

- Add missing helper coverage before broad route churn: 405, 429, 502, 503, 504, and optional generic `error(status, code, message, details?)` if allowed by M6.
- Convert shared rate-limit/admin-rate-limit helpers first to prevent repeated route-level raw 429 variants.
- Finish `src/app/api/interactions/route.ts` because it is already partially standardized.
- Fix the two 204-with-error-body cases in `zillow/random-image` during remediation; choose either a bodyless 204 success/no-content response or a standard non-2xx error response.
- Keep diagnostic fields (`details`, upstream `status`, admin batch counters) inside `details` or a documented extension to avoid drifting top-level error schema.
