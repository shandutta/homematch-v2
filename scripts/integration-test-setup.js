/**
 * Integration test setup - ensures database is ready with migrations applied
 * Similar to E2E global setup but for integration tests
 */

const { spawn } = require('child_process')
const path = require('path')

// Helper to run commands
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [command, ...args], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with code ${code}`))
    })

    child.on('error', reject)
  })
}

async function setupIntegrationTests() {
  console.log('🔧 Setting up integration test environment...\n')

  try {
    // Step 1: Start local Supabase if not running
    console.log('1️⃣  Starting local Supabase...')
    await runCommand('scripts/infrastructure-working.js', ['start'])

    // Wait for Supabase to be ready
    console.log('\n⏳ Waiting for Supabase to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Step 2: Reset database to apply migrations
    console.log('\n2️⃣  Applying database migrations...')
    await runCommand('scripts/infrastructure-working.js', ['reset-db'])
    
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Step 3: Create test users
    console.log('\n3️⃣  Creating test users...')
    await runCommand('scripts/setup-test-users-admin.js')

    console.log('\n✅ Integration test environment ready!')
    console.log('📦 Using local Supabase at: http://127.0.0.1:54321')
    console.log('👤 Test users: test1@example.com, test2@example.com')
  } catch (error) {
    console.error('\n❌ Failed to setup integration tests:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  setupIntegrationTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = setupIntegrationTests