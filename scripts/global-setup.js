/**
 * Playwright global setup - ISOLATED VERSION
 * Runs setup in isolated child processes to avoid module cache contamination
 */

const { spawn } = require('child_process')
const path = require('path')

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error(
    'Missing Supabase configuration for global setup. Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are set (check .env.prod/.env.test.local).'
  )
  process.exit(1)
}

// Helper to run isolated commands without contaminating module cache
function runIsolated(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [command, ...args], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ISOLATED_PROCESS: 'true' },
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with code ${code}`))
    })

    child.on('error', reject)
  })
}

// Helper to check if Supabase is already running
async function checkSupabaseStatus() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      timeout: 2000,
    })
    return response.ok
  } catch {
    return false
  }
}

// Helper to check if test users already exist
async function checkTestUsersExist() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
      timeout: 2000,
    })

    if (!response.ok) return false

    const data = await response.json()
    return (
      data.users &&
      data.users.some((user) => user.email === 'test1@example.com')
    )
  } catch {
    return false
  }
}

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment (optimized)...\n')

  try {
    // Step 1: Check if Supabase is already running
    console.log('1️⃣  Checking Supabase status...')
    const isRunning = await checkSupabaseStatus()

    if (!isRunning) {
      console.log('   Starting local Supabase...')
      await runIsolated('scripts/infrastructure-working.js', ['start'])

      // Wait for Supabase to be ready
      console.log('   ⏳ Waiting for Supabase to be ready...')
      await new Promise((resolve) => setTimeout(resolve, 3000))
    } else {
      console.log('   ✅ Supabase already running')
    }

    // Step 2: Check if test users exist
    console.log('\n2️⃣  Checking test users...')
    const usersExist = await checkTestUsersExist()

    if (!usersExist) {
      console.log('   Creating test users...')
      await runIsolated('scripts/setup-test-users-admin.js')
    } else {
      console.log('   ✅ Test users already exist')
    }

    // Step 3: Minimal database migration check (only if schema changes detected)
    // This is much faster than a full reset
    console.log('\n3️⃣  Checking database schema...')
    try {
      // Quick validation that essential tables exist
      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
          },
          timeout: 2000,
        }
      )

      if (response.ok) {
        console.log('   ✅ Database schema looks good')
      } else {
        console.log('   🔄 Applying database migrations...')
        await runIsolated('scripts/infrastructure-working.js', ['reset-db'])
      }
    } catch {
      console.log('   🔄 Applying database migrations...')
      await runIsolated('scripts/infrastructure-working.js', ['reset-db'])
    }

    console.log('\n✅ E2E test environment ready!')
    console.log(`📦 Using Supabase at: ${supabaseUrl}`)
    console.log('👤 Test users: test1@example.com, test2@example.com')

    // ENHANCED STABILITY WAIT - Addresses Phase 1 infrastructure race conditions
    console.log('🔄 Verifying service stability...')

    // Comprehensive readiness check with multiple retries
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        // Check API endpoint
        const apiResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: supabaseAnonKey,
          },
          timeout: 3000,
        })

        // Check auth endpoint
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
          timeout: 3000,
        })

        if (apiResponse.ok && authResponse.ok) {
          console.log(`   ✅ All services ready (attempt ${attempt})`)
          break
        } else {
          throw new Error('Services not ready')
        }
      } catch {
        if (attempt === 10) {
          console.log(
            '   ⚠️  Services may not be fully ready, proceeding anyway'
          )
          break
        }
        console.log(
          `   ⏳ Services not ready, waiting... (attempt ${attempt}/10)`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Final stability wait to prevent race conditions
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } catch (error) {
    console.error('\n❌ Failed to setup E2E tests:', error)
    throw error
  }
}

module.exports = globalSetup
