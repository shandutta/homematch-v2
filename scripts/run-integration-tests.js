/**
 * Integration Test Runner
 * 1) Resets/seeds local Supabase and provisions test users
 * 2) Starts the Next.js dev server for E2E HTTP tests
 * 3) Runs Vitest integration suite with the prepared environment
 * 4) Shuts down the dev server on completion
 */

const { spawn, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

const setupIntegrationTests = require('./integration-test-setup')
const { killProcessOnPort } = require('./kill-port')

// Suppress Node.js experimental warnings (e.g., --localstorage-file)
process.env.NODE_NO_WARNINGS = '1'

const maskKey = (value = '') =>
  value ? `${value.slice(0, 4)}…${value.slice(-4)}` : '(empty)'

let devServerProcess = null

/**
 * Wait for the dev server to be ready by polling the health endpoint
 */
async function waitForDevServer(
  maxAttempts = parseInt(process.env.DEV_SERVER_MAX_ATTEMPTS ?? '90', 10),
  intervalMs = 2000
) {
  console.log('⏳ Waiting for dev server to be ready...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch('http://localhost:3000/api/health', {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const isReady = res.ok || res.status >= 400
      if (isReady) {
        if (res.status >= 400 && process.env.DEBUG_TEST_SETUP) {
          console.log(
            `ℹ️  Dev server responded with status ${res.status} (treating as ready for tests)`
          )
        } else {
          console.log('✅ Dev server is ready')
        }
        return true
      }
    } catch {
      // Server not ready yet
    }

    if ((i + 1) % 5 === 0) {
      console.log(`   Still waiting... (${i + 1}/${maxAttempts})`)
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  console.error('❌ Dev server did not become ready in time')
  return false
}

/**
 * Verify Supabase API is accessible before starting tests.
 * This catches cases where Kong gateway becomes unavailable after dev server starts.
 */
async function verifySupabaseReady(maxAttempts = 15, delayMs = 2000) {
  const supabaseUrl =
    process.env.SUPABASE_LOCAL_PROXY_TARGET ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54321'
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔒 Verifying Supabase connectivity before tests...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: anonKey },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      // 401 means Kong is working (auth required but reachable)
      if (res.ok || res.status === 401) {
        console.log('✅ Supabase API is accessible')
        return true
      }
    } catch {
      // Continue retrying on connection errors
    }

    if ((i + 1) % 3 === 0) {
      console.log(`   Still waiting for Supabase... (${i + 1}/${maxAttempts})`)
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }

  console.error('❌ Supabase API did not become accessible')
  return false
}

/**
 * Start the Next.js dev server in the background
 */
async function startDevServer() {
  console.log('🚀 Starting dev server for integration tests...')

  // Kill any existing process on port 3000
  await killProcessOnPort(3000)

  // Use warmup script so we wait for readiness; underlying command defaults to dev:integration to avoid redundant resets
  const devScript = process.env.INTEGRATION_DEV_SCRIPT || 'dev:warmup'
  const warmupDevCommand =
    process.env.WARMUP_DEV_COMMAND || 'pnpm run dev:integration'
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug(
      `🛠️ Using dev script: ${devScript} (warmup command: ${warmupDevCommand})`
    )
  }

  // Load env files; prefer .env.test.local when present so .env.local can't override test keys
  const hasTestEnv = fs.existsSync(
    path.join(__dirname, '..', '.env.test.local')
  )
  const envCandidates = hasTestEnv
    ? ['.env.test.local', '.env.prod', '.env.local']
    : ['.env.prod', '.env.local']
  for (const file of envCandidates) {
    const envPath = path.join(__dirname, '..', file)
    if (fs.existsSync(envPath)) {
      dotenv.config({
        path: envPath,
        // Ensure .env.test.local wins over any pre-existing vars (.env.local/host env)
        override: file === '.env.test.local',
      })
    }
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54321'

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Force Next to load only the test env file when present to avoid .env.local overrides
  if (hasTestEnv) {
    process.env.NEXT_PRIVATE_ENV_FILES = '.env.test.local'
  }

  // Build environment for dev server
  const testEnv = {
    ...process.env,
    NODE_ENV: 'test',
    NEXT_PUBLIC_TEST_MODE: 'true',
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
    // Skip Zillow API fallback in tests - use seed data instead
    // This prevents 3 sequential 503 failures per marketing request
    MARKETING_USE_SEED: 'true',
  }

  // Remove production DB vars
  delete testEnv.POSTGRES_URL
  delete testEnv.POSTGRES_DATABASE
  delete testEnv.POSTGRES_HOST
  delete testEnv.POSTGRES_PASSWORD
  delete testEnv.POSTGRES_PRISMA_URL

  const warmupEnv = { ...testEnv }
  if (!warmupEnv.WARMUP_DEV_COMMAND) {
    warmupEnv.WARMUP_DEV_COMMAND = warmupDevCommand
  }

  devServerProcess = spawn('pnpm', ['run', devScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: warmupEnv,
    shell: true,
    cwd: path.join(__dirname, '..'),
    detached: false,
  })

  // Log server output for debugging
  devServerProcess.stdout?.on('data', (data) => {
    if (process.env.DEBUG_TEST_SETUP) {
      process.stdout.write(`[dev] ${data}`)
    }
  })

  devServerProcess.stderr?.on('data', (data) => {
    if (process.env.DEBUG_TEST_SETUP) {
      process.stderr.write(`[dev] ${data}`)
    }
  })

  devServerProcess.on('error', (err) => {
    console.error('❌ Dev server process error:', err)
  })

  // Wait for server to be ready
  const serverReady = await waitForDevServer()
  if (!serverReady) {
    await stopDevServer()
    throw new Error('Dev server failed to start')
  }

  return devServerProcess
}

/**
 * Stop the dev server and clean up
 */
async function stopDevServer() {
  if (devServerProcess) {
    console.log('🛑 Stopping dev server...')
    devServerProcess.kill('SIGTERM')
    devServerProcess = null

    // Give it a moment to clean up
    await new Promise((r) => setTimeout(r, 1000))

    // Force kill any remaining process on port 3000
    await killProcessOnPort(3000)
  }
}

async function run() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔍 Integration runner env snapshot:', {
      SUPABASE_URL:
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_LOCAL_PROXY_TARGET: process.env.SUPABASE_LOCAL_PROXY_TARGET,
      SUPABASE_LOCAL_PROXY: process.env.SUPABASE_LOCAL_PROXY,
      SUPABASE_ANON_KEY: maskKey(
        process.env.SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      SUPABASE_SERVICE_ROLE_KEY: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ALLOW_REMOTE_SUPABASE: process.env.ALLOW_REMOTE_SUPABASE,
      RUN_SUPABASE_INTEGRATION: process.env.RUN_SUPABASE_INTEGRATION,
    })
  }

  // Setup database and test users
  await setupIntegrationTests()

  // Start dev server for E2E HTTP tests
  await startDevServer()

  // Verify Supabase is accessible before starting tests
  // This catches race conditions where Kong gateway isn't fully ready
  const supabaseReady = await verifySupabaseReady()
  if (!supabaseReady) {
    await stopDevServer()
    throw new Error(
      'Supabase API not accessible - cannot run integration tests'
    )
  }

  // Handle cleanup on process termination
  const cleanup = async () => {
    await stopDevServer()
  }

  process.on('SIGINT', async () => {
    await cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', async () => {
    await cleanup()
    process.exit(143)
  })

  const vitestArgs = ['exec', 'vitest', 'run', ...process.argv.slice(2)]
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🎯 Spawning Vitest with args:', vitestArgs)
  }

  let exitCode = 0
  try {
    const result = spawnSync('pnpm', vitestArgs, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    })

    if (result.error) {
      throw result.error
    }

    exitCode = result.status ?? 0
  } finally {
    // Always stop dev server
    await stopDevServer()
  }

  process.exit(exitCode)
}

run().catch(async (error) => {
  console.error('❌ Integration test runner failed:', error?.message || error)
  await stopDevServer()
  process.exit(1)
})
