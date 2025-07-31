/**
 * Playwright global setup - ISOLATED VERSION
 * Runs setup in isolated child processes to avoid module cache contamination
 */

const { spawn } = require('child_process')
const path = require('path')

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

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment (isolated)...\n')

  try {
    // Step 1: Start local Supabase if not running
    console.log('1️⃣  Starting local Supabase...')
    await runIsolated('scripts/infrastructure-working.js', ['start'])

    // Wait for Supabase to be ready
    console.log('\n⏳ Waiting for Supabase to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Step 1.5: Reset database to apply CASCADE constraints
    console.log('\n🔄 Applying database migrations with CASCADE constraints...')
    try {
      await runIsolated('scripts/infrastructure-working.js', ['reset-db'])
      console.log('✅ Database reset completed with CASCADE constraints')
    } catch {
      console.log('⚠️  Database reset failed, continuing anyway...')
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Step 2: Create test users
    console.log('\n2️⃣  Creating test users...')
    await runIsolated('scripts/setup-test-users-admin.js')

    console.log('\n✅ E2E test environment ready!')
    console.log('📦 Using local Supabase at: http://127.0.0.1:54321')
    console.log('👤 Test users: test1@example.com, test2@example.com')

    // Final stability wait
    console.log('\n⏳ Final stability wait...')
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } catch (error) {
    console.error('\n❌ Failed to setup E2E tests:', error)
    throw error
  }
}

module.exports = globalSetup
