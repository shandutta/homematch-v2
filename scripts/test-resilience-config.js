/**
 * Central configuration for test infrastructure resilience settings.
 *
 * All timeout and retry values can be tuned via environment variables
 * to handle slow CI environments or local development variations.
 *
 * @example
 * # Run with longer auth readiness timeout
 * AUTH_READY_ATTEMPTS=50 pnpm run test:integration
 *
 * # Run with more fetch retries
 * SUPABASE_FETCH_RETRIES=10 pnpm run test:integration
 */

const config = {
  // Auth service readiness settings
  authReadiness: {
    // Maximum number of attempts to check if auth service is ready
    maxAttempts: parseInt(process.env.AUTH_READY_ATTEMPTS ?? '30', 10), // Up from 10
    // Initial delay between retry attempts (ms)
    retryDelayMs: parseInt(process.env.AUTH_READY_DELAY_MS ?? '3000', 10), // Up from 2000
    // Maximum total wait time (ms) - fail fast if exceeded
    maxWaitMs: 90000, // 90 seconds
    // Maximum delay between attempts after backoff (ms)
    maxDelayMs: 10000,
    // Backoff multiplier (e.g., 1.5 = 50% increase each attempt)
    backoffMultiplier: 1.5,
  },

  // Fetch retry settings for Supabase API calls
  fetch: {
    // Maximum number of retry attempts
    maxRetries: parseInt(process.env.SUPABASE_FETCH_RETRIES ?? '5', 10), // Up from 2
    // Base delay for exponential backoff (ms)
    baseDelayMs: parseInt(
      process.env.SUPABASE_FETCH_RETRY_DELAY_MS ?? '500',
      10
    ), // Up from 150
    // Maximum delay between retries (ms)
    maxDelayMs: 10000,
    // Jitter percentage (0.25 = 0-25% random addition to delay)
    jitterPercent: 0.25,
    // HTTP status codes that trigger a retry
    retryableStatusCodes: [502, 503, 504],
    // Request timeout (ms)
    requestTimeoutMs: parseInt(
      process.env.SUPABASE_FETCH_TIMEOUT_MS ?? '15000',
      10
    ),
  },

  // Health check settings
  healthCheck: {
    // Timeout for individual health check requests (ms)
    timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS ?? '15000', 10), // Up from 5000
    // Maximum attempts for health checks
    maxAttempts: 3,
    // Delay between health check attempts (ms)
    retryDelayMs: 2000,
  },

  // Shell command execution settings
  shell: {
    // Default timeout for shell commands (ms)
    defaultTimeoutMs: 120000, // 2 minutes
    // Timeout for database reset operations (ms)
    dbResetTimeoutMs: 180000, // 3 minutes
    // Timeout for Docker operations (ms)
    dockerTimeoutMs: 60000, // 1 minute
  },

  // Kong gateway settings
  kong: {
    // Maximum attempts to wait for Kong after restart
    maxReadinessAttempts: 20,
    // Delay between readiness checks (ms)
    readinessDelayMs: 1000,
    // Timeout for Kong health check requests (ms)
    healthCheckTimeoutMs: 5000,
  },

  // Transient error patterns that should trigger retries
  transientErrorPatterns: [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'socket hang up',
    'network timeout',
  ],
}

/**
 * Calculate exponential backoff delay with optional jitter.
 *
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay cap in milliseconds
 * @param {number} jitterPercent - Jitter as percentage (0-1)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(
  attempt,
  baseDelayMs = 500,
  maxDelayMs = 10000,
  jitterPercent = 0.25
) {
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, attempt),
    maxDelayMs
  )
  const jitter = exponentialDelay * Math.random() * jitterPercent
  return Math.round(exponentialDelay + jitter)
}

/**
 * Check if an error is transient and should be retried.
 *
 * @param {Error|string} error - The error to check
 * @returns {boolean} True if the error is transient
 */
function isTransientError(error) {
  const message = error?.message || String(error)
  return config.transientErrorPatterns.some((pattern) =>
    message.includes(pattern)
  )
}

/**
 * Sleep for a specified duration.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  config,
  calculateBackoffDelay,
  isTransientError,
  sleep,
}
