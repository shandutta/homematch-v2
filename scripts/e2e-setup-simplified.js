/**
 * Simplified E2E Test Setup
 * Similar to integration test setup - just ensures Supabase is running
 * and test users exist without complex resets or retries
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

async function setupE2ETests() {
  console.log('🔧 Setting up E2E test environment...\n')

  try {
    // Step 1: Check if Supabase is running
    console.log('1️⃣  Checking Supabase status...')
    
    let supabaseHealthy = false
    try {
      // Simple check for running containers
      const containers = execSync(
        'docker ps --filter name=supabase --format "{{.Names}}"',
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim()
      
      const containerCount = containers.split('\n').filter(n => n).length
      
      if (containerCount >= 10) {
        console.log(`✅ ${containerCount} Supabase containers running`)
        
        // Quick health check using Node's fetch
        try {
          const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'
            }
          })
          
          if (response.ok || response.status === 401) {
            supabaseHealthy = true
            console.log('✅ Supabase API is responding')
          }
        } catch (error) {
          console.log('⚠️  Supabase API not responding:', error.message)
        }
      } else {
        console.log(`⚠️  Only ${containerCount} containers running, need to start Supabase`)
      }
    } catch (error) {
      console.log('⚠️  Docker check failed:', error.message)
    }

    // Step 2: Start Supabase if not healthy
    if (!supabaseHealthy) {
      console.log('\n2️⃣  Starting Supabase...')
      console.log('   This may take a minute...')
      
      try {
        // Stop first to clean up any partial state
        execSync('pnpm dlx supabase@latest stop', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        })
        
        // Start fresh
        execSync('pnpm dlx supabase@latest start -x studio', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        })
        
        console.log('✅ Supabase started successfully')
      } catch (error) {
        console.error('❌ Failed to start Supabase:', error.message)
        console.error('   Please run manually: pnpm dlx supabase@latest start -x studio')
        process.exit(1)
      }
    }

    // Step 3: Create test users using shared script
    console.log('\n3️⃣  Setting up test users...')
    
    try {
      // Run the shared setup-test-users-admin script
      execSync('node scripts/setup-test-users-admin.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      })
      console.log('✅ Test users created')
    } catch (error) {
      console.error('❌ Failed to create test users:', error.message)
      console.error('   Please run manually: node scripts/setup-test-users-admin.js')
      process.exit(1)
    }

    // Step 4: Generate proper auth token by signing in as test user
    console.log('\n4️⃣  Generating authentication token...')
    
    const supabaseUrl = 'http://127.0.0.1:54321'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Sign in as test user to get JWT token
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test1@example.com',
      password: 'testpassword123',
    })
    
    if (authError || !authData.session) {
      console.error('❌ Failed to authenticate test user:', authError?.message)
      console.error('   Make sure test users are created first')
      process.exit(1)
    }
    
    const testAuthToken = authData.session.access_token
    console.log('✅ Generated JWT token for test user')
    
    // Write JWT token to file for tests to use
    const tokenFile = path.join(__dirname, '..', '.test-auth-token')
    fs.writeFileSync(tokenFile, testAuthToken)
    
    // Set environment variables
    process.env.TEST_AUTH_TOKEN = testAuthToken
    process.env.SUPABASE_URL = supabaseUrl
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey

    console.log('\n✅ E2E test environment ready!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Supabase: http://127.0.0.1:54321')
    console.log('👤 Test user: test1@example.com')
    console.log('🔐 JWT token saved to .test-auth-token')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Export for use as Playwright global setup
module.exports = setupE2ETests

// Run if called directly
if (require.main === module) {
  setupE2ETests().catch(error => {
    console.error(error)
    process.exit(1)
  })
}