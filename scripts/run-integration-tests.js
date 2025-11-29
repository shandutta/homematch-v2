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
async function waitForDevServer(maxAttempts = 60, intervalMs = 2000) {
  console.log('⏳ Waiting for dev server to be ready...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch('http://localhost:3000/api/health', {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        console.log('✅ Dev server is ready')
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
 * Start the Next.js dev server in the background
 */
async function startDevServer() {
  console.log('🚀 Starting dev server for integration tests...')

  // Kill any existing process on port 3000
  await killProcessOnPort(3000)

  // Load env files in priority order
  const envCandidates = ['.env.test.local', '.env.prod', '.env.local']
  for (const file of envCandidates) {
    const envPath = path.join(__dirname, '..', file)
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
    }
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54321'

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
  }

  // Remove production DB vars
  delete testEnv.POSTGRES_URL
  delete testEnv.POSTGRES_DATABASE
  delete testEnv.POSTGRES_HOST
  delete testEnv.POSTGRES_PASSWORD
  delete testEnv.POSTGRES_PRISMA_URL

  devServerProcess = spawn('pnpm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: testEnv,
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
