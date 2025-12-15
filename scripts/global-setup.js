/**
 * Playwright global setup - ISOLATED VERSION
 * Runs setup in isolated child processes to avoid module cache contamination
 */

const { spawn, execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PLAYWRIGHT_PROCESS_REGEX =
  /(playwright|headless_shell|chrome-linux|ms-playwright)/i
const PLAYWRIGHT_BASELINE_FILE = path.join(
  os.tmpdir(),
  'homematch-v2-playwright-baseline.json'
)
const REQUIRED_TEST_EMAILS = [
  'test1@example.com',
  'test2@example.com',
  'test3@example.com',
  ...Array.from({ length: 8 }, (_, i) => `test-worker-${i}@example.com`),
]

function listPlaywrightLikeProcesses() {
  try {
    const output = execSync('ps -eo pid,comm,args', { encoding: 'utf8' })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('PID'))
      .map((line) => {
        const [pidStr, ...rest] = line.split(/\s+/)
        const pid = Number.parseInt(pidStr, 10)
        const cmd = rest.join(' ')
        return { pid, cmd }
      })
      .filter(
        (proc) =>
          Number.isFinite(proc.pid) &&
          PLAYWRIGHT_PROCESS_REGEX.test(proc.cmd || '')
      )
      .map((proc) => proc.pid)
  } catch {
    return []
  }
}

function recordPlaywrightBaseline() {
  const pids = listPlaywrightLikeProcesses()
  try {
    fs.writeFileSync(
      PLAYWRIGHT_BASELINE_FILE,
      JSON.stringify({ recordedAt: new Date().toISOString(), pids }, null, 2)
    )
  } catch (error) {
    console.warn('⚠️  Failed to record Playwright baseline:', error?.message)
  }
  return pids
}

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
      headers: supabaseAnonKey ? { apikey: supabaseAnonKey } : undefined,
      signal: AbortSignal.timeout(2000),
    })
    return response.ok || response.status === 401
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
      signal: AbortSignal.timeout(2000),
    })

    if (!response.ok) return false

    const data = await response.json()
    const users = data.users || []
    const missingUsers = REQUIRED_TEST_EMAILS.filter(
      (email) => !users.some((user) => user.email === email)
    )

    if (missingUsers.length) {
      console.log(
        `   ⚠️  Missing ${missingUsers.length} test user(s): ${missingUsers.join(', ')}`
      )
      return false
    }

    return true
  } catch (error) {
    console.warn(
      '   ⚠️  Could not verify existing test users:',
      error?.message || error
    )
    return false
  }
}

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment (optimized)...\n')

  const baselinePids = recordPlaywrightBaseline()
  if (baselinePids.length) {
    console.log(
      `🧹 Captured ${baselinePids.length} existing Playwright/Chromium processes for teardown safety`
    )
  } else {
    console.log('🧹 No existing Playwright/Chromium processes detected pre-run')
  }

  try {
    // Step 1: Check Supabase and test users in PARALLEL for speed
    console.log('1️⃣  Checking Supabase & test users (parallel)...')
    const [isRunning, usersExist] = await Promise.all([
      checkSupabaseStatus(),
      checkTestUsersExist().catch(() => false), // Don't fail if Supabase isn't up yet
    ])

    if (!isRunning) {
      console.log('   Starting local Supabase...')
      await runIsolated('scripts/infrastructure-working.js', ['start'])
      // Smart polling instead of hardcoded wait
      for (let i = 0; i < 6; i++) {
        if (await checkSupabaseStatus()) break
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } else {
      console.log('   ✅ Supabase already running')
    }

    // Step 2: Create test users if needed (re-check if Supabase just started)
    const finalUsersExist = isRunning ? usersExist : await checkTestUsersExist()
    if (!finalUsersExist) {
      console.log('   Creating test users...')
      await runIsolated('scripts/setup-test-users-admin.js')
    } else {
      console.log('   ✅ Test users already exist')
    }

    // Step 3: Quick schema validation (skip full reset unless broken)
    console.log('\n2️⃣  Validating database schema...')
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?limit=1`,
        {
          headers: { apikey: supabaseAnonKey },
          signal: AbortSignal.timeout(2000),
        }
      )
      if (response.ok) {
        console.log('   ✅ Database schema valid')
      } else {
        throw new Error('Schema check failed')
      }
    } catch {
      console.log('   🔄 Applying database migrations...')
      await runIsolated('scripts/infrastructure-working.js', ['reset-db'])
    }

    // Step 4: Quick service readiness check (3 attempts max, parallel checks)
    console.log('\n3️⃣  Verifying services ready...')
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const [apiResponse, authResponse] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { apikey: supabaseAnonKey },
            signal: AbortSignal.timeout(2000),
          }),
          fetch(`${supabaseUrl}/auth/v1/health`, {
            signal: AbortSignal.timeout(2000),
          }),
        ])

        if (apiResponse.ok && authResponse.ok) {
          console.log(`   ✅ All services ready`)
          break
        }
        throw new Error('Services not ready')
      } catch {
        if (attempt === 3) {
          console.log('   ⚠️  Proceeding (services may still be warming up)')
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    console.log('\n✅ E2E test environment ready!')
    console.log(`📦 Using Supabase at: ${supabaseUrl}`)
    console.log('👤 Test users: test1@example.com, test2@example.com\n')
  } catch (error) {
    console.error('\n❌ Failed to setup E2E tests:', error)
    throw error
  }
}

module.exports = globalSetup
