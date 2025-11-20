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

// Load environment variables from .env.local (primary) and optionally override with .env.test.local if present (CI)
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
const testEnvPath = path.join(process.cwd(), '.env.test.local')
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath })
}

let supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdminUrl =
  process.env.SUPABASE_LOCAL_PROXY_TARGET || supabaseUrl || ''
let isLocalSupabase =
  supabaseUrl.includes('127.0.0.1') ||
  supabaseUrl.includes('localhost') ||
  supabaseUrl.includes('supabase.local') ||
  supabaseUrl.startsWith('http://local-')
const isLocalProxy = process.env.SUPABASE_LOCAL_PROXY === 'true'
const allowRemoteSupabase =
  process.env.ALLOW_REMOTE_SUPABASE === 'true' ||
  process.env.SUPABASE_ALLOW_REMOTE === 'true'

if (!isLocalSupabase && !allowRemoteSupabase) {
  console.error(
    '❌ Integration tests expect a local Supabase instance (e.g. http://127.0.0.1:54321).'
  )
  console.error('   Detected SUPABASE_URL =', supabaseUrl || '(not set)')
  console.error(
    '   If you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost), set ALLOW_REMOTE_SUPABASE=true.'
  )
  console.error(
    '   Otherwise run `supabase start -x studio` and set local keys in .env.local or export ALLOW_REMOTE_SUPABASE=true.'
  )
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error(
    'Missing Supabase configuration. Set SUPABASE_URL, SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY in your environment (.env.local).'
  )
  process.exit(1)
}

async function setupIntegrationTests() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up integration test environment...\n')
  }

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

        execSync('pnpm dlx supabase@latest start -x studio', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })

        // Ensure DB is reset/migrations applied for integration determinism
        execSync('pnpm dlx supabase@latest db reset --force', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })

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

    // Step 3: Create test users
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n3️⃣  Setting up test users...')
    }

    try {
      // Run the setup-test-users-admin script
      execSync('node scripts/setup-test-users-admin.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
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

    // Step 4: Generate proper auth token by signing in as test user
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n4️⃣  Generating authentication token...')
    }

    // Point env to the reachable admin URL for downstream Vitest steps
    process.env.SUPABASE_URL = supabaseAdminUrl
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseAdminUrl

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
    process.env.SUPABASE_URL = supabaseUrl
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey

    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n✅ Integration test environment ready!')
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.debug('📦 Supabase: http://127.0.0.1:54321')
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
