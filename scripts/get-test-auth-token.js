/**
 * Generate authentication token for integration tests
 * This creates a valid Supabase session for test users
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test.local') })

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const testUser = {
  email: process.env.TEST_USER_1_EMAIL || 'test1@example.com',
  password: process.env.TEST_USER_1_PASSWORD || 'testpassword123',
}

async function getAuthToken() {
  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found')
    process.exit(1)
  }

  // Create client with anon key (like the frontend would)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Sign in the test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })

    if (error) {
      console.error('❌ Failed to sign in test user:', error.message)
      console.log(
        'Make sure test users are created first: pnpm run test:setup-users'
      )
      process.exit(1)
    }

    if (!data.session?.access_token) {
      console.error('❌ No access token received')
      process.exit(1)
    }

    console.log('✅ Test auth token generated')
    console.log('TEST_AUTH_TOKEN=' + data.session.access_token)

    return data.session.access_token
  } catch (error) {
    console.error('❌ Error generating auth token:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  getAuthToken()
}

module.exports = getAuthToken
