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

// Helper to check if Supabase is already running
async function checkSupabaseStatus() {
  try {
    const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
      timeout: 2000
    })
    return response.ok
  } catch {
    return false
  }
}

// Helper to check if test users already exist
async function checkTestUsersExist() {
  try {
    const response = await fetch('http://127.0.0.1:54321/auth/v1/admin/users', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      },
      timeout: 2000
    })
    
    if (!response.ok) return false
    
    const data = await response.json()
    return data.users && data.users.some(user => user.email === 'test1@example.com')
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
      const response = await fetch('http://127.0.0.1:54321/rest/v1/user_profiles?limit=1', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'
        },
        timeout: 2000
      })
      
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
    console.log('📦 Using local Supabase at: http://127.0.0.1:54321')
    console.log('👤 Test users: test1@example.com, test2@example.com')

    // Minimal stability wait
    await new Promise((resolve) => setTimeout(resolve, 500))
  } catch (error) {
    console.error('\n❌ Failed to setup E2E tests:', error)
    throw error
  }
}

module.exports = globalSetup
