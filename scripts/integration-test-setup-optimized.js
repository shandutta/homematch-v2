/**
 * Optimized Integration Test Setup
 * 
 * Improvements over the original:
 * - Smart container detection to avoid unnecessary restarts
 * - Health check optimization
 * - Reduced user creation overhead
 * - Better error handling and recovery
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Cache for avoiding repeated operations
let cachedHealthCheck = null
let healthCheckTimestamp = 0
const HEALTH_CHECK_CACHE_MS = 30000 // 30 seconds

async function optimizedSupabaseHealthCheck() {
  const now = Date.now()
  
  // Return cached result if recent
  if (cachedHealthCheck && (now - healthCheckTimestamp) < HEALTH_CHECK_CACHE_MS) {
    return cachedHealthCheck
  }

  try {
    // Fast container count check
    const containers = execSync(
      'docker ps --filter name=supabase --format "{{.Names}}"',
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim()
    
    const containerCount = containers.split('\n').filter(n => n).length
    
    if (containerCount < 10) {
      cachedHealthCheck = { healthy: false, reason: `Only ${containerCount} containers running` }
      healthCheckTimestamp = now
      return cachedHealthCheck
    }

    // Quick API health check with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    try {
      const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok || response.status === 401) {
        cachedHealthCheck = { healthy: true }
        healthCheckTimestamp = now
        return cachedHealthCheck
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        cachedHealthCheck = { healthy: false, reason: 'API timeout' }
      } else {
        cachedHealthCheck = { healthy: false, reason: `API error: ${error.message}` }
      }
      healthCheckTimestamp = now
      return cachedHealthCheck
    }
  } catch (error) {
    cachedHealthCheck = { healthy: false, reason: `Docker check failed: ${error.message}` }
    healthCheckTimestamp = now
    return cachedHealthCheck
  }

  cachedHealthCheck = { healthy: false, reason: 'Unknown health check failure' }
  healthCheckTimestamp = now
  return cachedHealthCheck
}

async function verifyTestUsersExist() {
  console.log('🔍 Verifying test users exist...')
  
  const supabaseUrl = 'http://127.0.0.1:54321'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.pmctc3-i5D7PRVq4HOXcXDZ0Er3mrC8a2W7yIa5jePI'

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data: users, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.log('⚠️  Cannot verify users, will create them:', error.message)
      return false
    }

    const requiredEmails = ['test1@example.com', 'test2@example.com']
    const existingEmails = users.users.map(u => u.email)
    const missingUsers = requiredEmails.filter(email => !existingEmails.includes(email))

    if (missingUsers.length === 0) {
      console.log('✅ All test users already exist')
      return true
    } else {
      console.log(`⚠️  Missing test users: ${missingUsers.join(', ')}`)
      return false
    }
  } catch (error) {
    console.log('⚠️  Error checking users:', error.message)
    return false
  }
}

async function generateAuthToken() {
  console.log('🔐 Generating authentication token...')
  
  const supabaseUrl = 'http://127.0.0.1:54321'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'
  
  // Check if token already exists and is valid
  const tokenFile = path.join(__dirname, '..', '.test-auth-token')
  if (fs.existsSync(tokenFile)) {
    const existingToken = fs.readFileSync(tokenFile, 'utf8').trim()
    
    // Quick token validation
    try {
      const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${existingToken}`
        }
      })
      
      if (response.ok || response.status === 401) {
        console.log('✅ Existing JWT token is valid, reusing it')
        process.env.TEST_AUTH_TOKEN = existingToken
        return existingToken
      }
    } catch {
      console.log('⚠️  Existing token invalid, generating new one')
    }
  }

  // Generate new token
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test1@example.com',
    password: 'testpassword123',
  })
  
  if (authError || !authData.session) {
    throw new Error(`Failed to authenticate test user: ${authError?.message}`)
  }
  
  const testAuthToken = authData.session.access_token
  console.log('✅ Generated new JWT token')
  
  // Cache token for future use
  fs.writeFileSync(tokenFile, testAuthToken)
  process.env.TEST_AUTH_TOKEN = testAuthToken
  
  return testAuthToken
}

async function setupOptimizedIntegrationTests() {
  console.log('🚀 Setting up optimized integration test environment...\n')

  try {
    // Step 1: Smart Supabase health check
    console.log('1️⃣  Checking Supabase status...')
    const healthCheck = await optimizedSupabaseHealthCheck()
    
    if (healthCheck.healthy) {
      console.log('✅ Supabase is healthy, skipping restart')
    } else {
      console.log(`⚠️  Supabase not healthy: ${healthCheck.reason}`)
      console.log('\n2️⃣  Starting Supabase...')
      console.log('   This may take a minute...')
      
      try {
        // Clean restart
        execSync('pnpm dlx supabase@latest stop', { 
          stdio: 'pipe', // Suppress output unless error
          cwd: path.join(__dirname, '..')
        })
        
        execSync('pnpm dlx supabase@latest start -x studio', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        })
        
        console.log('✅ Supabase started successfully')
        
        // Clear health check cache after restart
        cachedHealthCheck = null
        healthCheckTimestamp = 0
      } catch (error) {
        console.error('❌ Failed to start Supabase:', error.message)
        console.error('   Please run manually: pnpm dlx supabase@latest start -x studio')
        process.exit(1)
      }
    }

    // Step 2: Smart user setup
    console.log('\n3️⃣  Setting up test users...')
    const usersExist = await verifyTestUsersExist()
    
    if (!usersExist) {
      try {
        execSync('node scripts/setup-test-users-admin.js', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })
        console.log('✅ Test users created')
      } catch (error) {
        console.error('❌ Failed to create test users:', error.message)
        process.exit(1)
      }
    }

    // Step 3: Optimized auth token generation
    console.log('\n4️⃣  Setting up authentication...')
    await generateAuthToken()

    console.log('\n✅ Optimized integration test environment ready!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Supabase: http://127.0.0.1:54321')
    console.log('👤 Test user: test1@example.com')
    console.log('🔐 JWT token cached in .test-auth-token')
    console.log('⚡ Optimizations: health caching, smart restarts, token reuse')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupOptimizedIntegrationTests()
    .then(() => {
      console.log('\n🚀 Ready to run tests with optimized setup!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Setup error:', error)
      process.exit(1)
    })
}

module.exports = setupOptimizedIntegrationTests