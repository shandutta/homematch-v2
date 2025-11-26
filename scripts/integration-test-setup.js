/**
 * Simplified Integration Test Setup
 * - Automatically starts Docker Desktop if not running (Windows/macOS/Linux)
 * - Ensures Supabase is running and creates test users with proper JWT tokens
 * - Generates authentication tokens for test execution
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')
const { runCleanup } = require('./supabase-cleanup')

// Load environment variables from .env.local (primary) and optionally override with .env.test.local if present (CI)
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
const testEnvPath = path.join(process.cwd(), '.env.test.local')
const testEnv = fs.existsSync(testEnvPath)
  ? dotenv.parse(fs.readFileSync(testEnvPath))
  : null

let supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let isLocalSupabase =
  supabaseUrl.includes('127.0.0.1') ||
  supabaseUrl.includes('localhost') ||
  supabaseUrl.includes('supabase.local') ||
  supabaseUrl.startsWith('http://local-')
let isLocalProxy =
  process.env.SUPABASE_LOCAL_PROXY === 'true' ||
  testEnv?.SUPABASE_LOCAL_PROXY === 'true'
const allowRemoteSupabase =
  process.env.ALLOW_REMOTE_SUPABASE === 'true' ||
  process.env.SUPABASE_ALLOW_REMOTE === 'true'

// Prefer local test env values when local/proxy is available
if ((isLocalSupabase || isLocalProxy) && testEnv) {
  supabaseUrl =
    testEnv.SUPABASE_URL || testEnv.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl
  supabaseAnonKey =
    testEnv.SUPABASE_ANON_KEY ||
    testEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    supabaseAnonKey
  supabaseServiceRoleKey =
    testEnv.SUPABASE_SERVICE_ROLE_KEY || supabaseServiceRoleKey
}

// Recompute locals after potential overrides
isLocalSupabase =
  supabaseUrl.includes('127.0.0.1') ||
  supabaseUrl.includes('localhost') ||
  supabaseUrl.includes('supabase.local') ||
  supabaseUrl.startsWith('http://local-')
const supabaseAdminUrl =
  process.env.SUPABASE_LOCAL_PROXY_TARGET ||
  testEnv?.SUPABASE_LOCAL_PROXY_TARGET ||
  supabaseUrl ||
  ''

if (!isLocalSupabase && !allowRemoteSupabase) {
  console.error(
    '❌ Integration tests expect a local Supabase instance (e.g. http://127.0.0.1:54321).'
  )
  console.error('   Detected SUPABASE_URL =', supabaseUrl || '(not set)')
  console.error(
    '   If you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost), set ALLOW_REMOTE_SUPABASE=true.'
  )
  console.error(
    '   Otherwise run `supabase start -x studio,inbucket,imgproxy,storage` and set local keys in .env.local or export ALLOW_REMOTE_SUPABASE=true.'
  )
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error(
    'Missing Supabase configuration. Set SUPABASE_URL, SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY in your environment (.env.local).'
  )
  process.exit(1)
}

const sleepSync = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const findKongContainer = () => {
  try {
    const names = execSync(
      'docker ps --filter "name=supabase_kong" --format "{{.Names}}"',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    )
      .trim()
      .split('\n')
      .filter(Boolean)

    return names[0] || null
  } catch {
    return null
  }
}

const restartKong = () => {
  const kongContainer = findKongContainer()
  if (!kongContainer) return false

  try {
    execSync(`docker restart ${kongContainer}`, {
      stdio: process.env.DEBUG_TEST_SETUP ? 'inherit' : 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const isStorageHealthy = async () => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${supabaseAdminUrl}/storage/v1/bucket`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey || '' },
      signal: controller.signal,
    })
    return response.ok || response.status === 400 || response.status === 401
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

const waitForStorage = async (attempts = 5) => {
  for (let i = 0; i < attempts; i++) {
    if (await isStorageHealthy()) return true
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

const resetDatabase = async () => {
  const cmd = 'pnpm dlx supabase@latest db reset --local --yes'
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(cmd, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      })
      runCleanup()
      return true
    } catch (error) {
      const combinedMessage = [
        error?.message || '',
        error?.stdout?.toString?.() || '',
        error?.stderr?.toString?.() || '',
      ]
        .join('\n')
        .toLowerCase()

      const storageTimeout =
        combinedMessage.includes('storage/v1') &&
        (combinedMessage.includes('client.timeout') ||
          combinedMessage.includes('context deadline'))

      if (storageTimeout) {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Reset attempt ${attempt} hit storage timeout. Restarting Kong and retrying...`
          )
        }
        restartKong()
        await waitForStorage()
      }

      if (attempt < 3) {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Reset attempt ${attempt} failed. Retrying in 3s...`
          )
        }
        sleepSync(3000)
        continue
      }
      throw error
    }
  }
  return false
}

const applyLocalEnv = () => {
  process.env.SUPABASE_URL = supabaseAdminUrl
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseAdminUrl
  process.env.SUPABASE_ANON_KEY = supabaseAnonKey
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
}

const tryStartDocker = () => {
  const platform = process.platform
  const attempts = []

  if (platform === 'darwin') {
    attempts.push('open -ga Docker')
  } else if (platform === 'win32') {
    attempts.push(
      'powershell.exe -Command "Start-Process \\"Docker Desktop\\" -ErrorAction SilentlyContinue"'
    )
  } else {
    // Linux/WSL: try common service starters without sudo to avoid prompts
    attempts.push('systemctl start docker')
    attempts.push('service docker start')
    // If that fails, try non-interactive sudo (will fail fast if password needed)
    attempts.push('sudo -n systemctl start docker')
    attempts.push('sudo -n service docker start')
  }

  for (const cmd of attempts) {
    try {
      execSync(cmd, { stdio: 'ignore' })
      return true
    } catch {
      // try next
    }
  }
  return false
}

const ensureDockerRunning = () => {
  try {
    execSync('docker info', { stdio: 'pipe' })
    return
  } catch {
    // Fall through
  }

  const started = tryStartDocker()
  if (!started) {
    console.error('❌ Docker is not available or not running.')
    console.error(
      '   Please start Docker (Docker Desktop or system docker service) and rerun.'
    )
    process.exit(1)
  }

  const timeoutMs = 60_000
  const pollMs = 2_000
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      execSync('docker info', { stdio: 'pipe' })
      return
    } catch {
      sleepSync(pollMs)
    }
  }

  console.error(
    '❌ Docker did not become ready after 60s. Please start it manually and retry.'
  )
  process.exit(1)
}

async function setupIntegrationTests() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up integration test environment...\n')
  }

  let dbResetPerformed = false

  try {
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('1️⃣  Checking Supabase status...')
    }

    // Step 1: health check regardless of URL
    let supabaseHealthy = false
    try {
      const response = await fetch(`${supabaseAdminUrl}/rest/v1/`, {
        headers: { apikey: supabaseAnonKey || '' },
      })
      supabaseHealthy = response.ok || response.status === 401
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug(
          supabaseHealthy
            ? '✅ Supabase API responded'
            : `⚠️ Supabase API health returned status ${response.status}`
        )
      }
    } catch (error) {
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('⚠️ Supabase API not responding:', error.message)
      }
    }

    const canStartLocally = isLocalSupabase || isLocalProxy

    // Step 2: Start Supabase locally if unhealthy and allowed
    if (!supabaseHealthy && canStartLocally) {
      ensureDockerRunning()

      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('\n2️⃣  Starting Supabase (local/proxy)...')
        console.debug('   This may take a minute...')
      }

      try {
        try {
          execSync('docker version', { stdio: 'pipe' })
        } catch {
          console.error('❌ Docker is not available or not running')
          process.exit(1)
        }

        try {
          execSync('pnpm dlx supabase@latest stop', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..'),
          })
        } catch {
          // Ignore stop errors
        }

        execSync(
          'pnpm dlx supabase@latest start -x studio,inbucket,imgproxy,storage',
          {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'),
          }
        )

        // Give the services a moment to settle
        sleepSync(2000)

        // Ensure DB is reset/migrations applied for integration determinism
        await resetDatabase()

        dbResetPerformed = true
        supabaseHealthy = true
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('✅ Supabase started and database reset successfully')
        }
      } catch (error) {
        console.error('❌ Failed to start Supabase:', error.message)
        process.exit(1)
      }
    }

    // If still unhealthy and remote only, bail
    if (!supabaseHealthy && !canStartLocally && !allowRemoteSupabase) {
      console.error('❌ Supabase is unreachable and cannot be started locally.')
      process.exit(1)
    }

    // Step 2b: Always reset for deterministic state when using local/proxy
    if (canStartLocally && !dbResetPerformed) {
      ensureDockerRunning()

      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('\n2️⃣  Resetting database for a clean test state...')
      }
      try {
        await resetDatabase()
        dbResetPerformed = true
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('✅ Database reset complete')
        }
      } catch (error) {
        console.error('❌ Failed to reset database:', error.message)
        process.exit(1)
      }
    }

    // Step 3: Create test users
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n3️⃣  Setting up test users...')
    }

    applyLocalEnv()

    try {
      // Run the setup-test-users-admin script
      execSync('node scripts/setup-test-users-admin.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env },
      })
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('✅ Test users created')
      }
    } catch (error) {
      console.error('❌ Failed to create test users:', error.message)
      console.error(
        '   Please run manually: node scripts/setup-test-users-admin.js'
      )
      process.exit(1)
    }

    // Step 3b: Verify profiles exist so downstream tests don't skip
    try {
      const adminClient = createClient(supabaseAdminUrl, supabaseServiceRoleKey)
      const { count, error: profileError } = await adminClient
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })

      if (profileError || !count || count < 2) {
        console.error(
          `❌ User profiles not present after setup (count=${count || 0}).`
        )
        console.error(
          '   This prevents integration tests from running. Rerun with DEBUG_TEST_SETUP=1 node scripts/setup-test-users-admin.js.'
        )
        process.exit(1)
      }

      if (process.env.DEBUG_TEST_SETUP) {
        console.debug(`✅ Verified user_profiles count: ${count}`)
      }
    } catch (error) {
      console.error(
        '❌ Failed to verify user_profiles after setup:',
        error?.message || error
      )
      process.exit(1)
    }

    // Step 4: Generate proper auth token by signing in as test user
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n4️⃣  Generating authentication token...')
    }

    // Point env to the reachable admin URL for downstream Vitest steps
    applyLocalEnv()

    const supabase = createClient(supabaseAdminUrl, supabaseAnonKey)

    // Sign in as test user to get JWT token
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: 'test1@example.com',
        password: 'testpassword123',
      })

    if (authError || !authData.session) {
      console.error('❌ Failed to authenticate test user:', authError?.message)
      console.error('   Make sure test users are created first')
      process.exit(1)
    }

    const testAuthToken = authData.session.access_token
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('✅ Generated JWT token for test user')
    }

    // Write JWT token to file for tests to use
    const tokenFile = path.join(__dirname, '..', '.test-auth-token')
    fs.writeFileSync(tokenFile, testAuthToken)

    // Set environment variables
    process.env.TEST_AUTH_TOKEN = testAuthToken
    // Keep tests pointed at the local/proxy Supabase we just reset/seeded
    process.env.SUPABASE_URL = supabaseAdminUrl
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseAdminUrl
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey

    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n✅ Integration test environment ready!')
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.debug(`📦 Supabase: ${supabaseAdminUrl}`)
      console.debug('👤 Test user: test1@example.com')
      console.debug('🔐 JWT token saved to .test-auth-token')
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupIntegrationTests()
    .then(() => {
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('\n🚀 Ready to run tests!')
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('Setup error:', error)
      process.exit(1)
    })
}

module.exports = setupIntegrationTests
