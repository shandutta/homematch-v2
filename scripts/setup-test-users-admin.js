/**
 * Setup test users using Supabase Admin API
 * This properly creates auth users that work with the database trigger
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

// Load environment variables from .env.local (primary) and optionally override with .env.test.local if present (CI)
const envLocalPath = path.join(__dirname, '..', '.env.local')
const envTestPath = path.join(__dirname, '..', '.env.test.local')
dotenv.config({ path: envLocalPath })
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath })
}

let supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let isLocalSupabase =
  supabaseUrl.includes('127.0.0.1') ||
  supabaseUrl.includes('localhost') ||
  supabaseUrl.includes('supabase.local') ||
  supabaseUrl.startsWith('http://local-')
const allowRemoteSupabase =
  process.env.ALLOW_REMOTE_SUPABASE === 'true' ||
  process.env.SUPABASE_ALLOW_REMOTE === 'true'

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found. Add it to .env.local.')
  process.exit(1)
}

if (!isLocalSupabase && !allowRemoteSupabase) {
  console.error(
    '❌ Test user setup expects a local Supabase instance (e.g. http://127.0.0.1:54321).'
  )
  console.error('   Detected SUPABASE_URL =', supabaseUrl)
  console.error(
    '   If you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost), set ALLOW_REMOTE_SUPABASE=true.'
  )
  console.error(
    '   Otherwise run `supabase start -x studio` and set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  )
  process.exit(1)
}

// Create admin client with service role key and RLS bypass
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  // Service role bypasses RLS by default, but we ensure it's explicit
  realtime: {
    params: {
      apikey: supabaseServiceKey,
    },
  },
})

// Create worker-specific test users for parallel execution (0-7 workers)
const testUsers = []

// Add original test users for backward compatibility
testUsers.push(
  {
    email: process.env.TEST_USER_1_EMAIL || 'test1@example.com',
    password: process.env.TEST_USER_1_PASSWORD || 'testpassword123',
  },
  {
    email: process.env.TEST_USER_2_EMAIL || 'test2@example.com',
    password: process.env.TEST_USER_2_PASSWORD || 'testpassword456',
  }
)

// Add worker-specific test users for parallel execution
for (let workerIndex = 0; workerIndex < 8; workerIndex++) {
  testUsers.push({
    email: `test-worker-${workerIndex}@example.com`,
    password: 'testpassword123',
  })
}

async function deleteExistingUser(email, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, try to find the user
      const { data: users, error: listError } =
        await supabase.auth.admin.listUsers()

      if (listError) {
        // If listing users fails, skip deletion (might be fresh database)
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Could not list users: ${listError.message}. Skipping deletion check.`
          )
        }
        return true
      }

      const existingUser = users?.users?.find((u) => u.email === email)

      if (existingUser) {
        // Delete the user
        const { error } = await supabase.auth.admin.deleteUser(existingUser.id)
        if (error) {
          if (attempt < maxRetries) {
            if (process.env.DEBUG_TEST_SETUP) {
              console.debug(
                `⚠️  Delete attempt ${attempt} failed for ${email}: ${error.message}. Retrying...`
              )
            }
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
            continue
          }
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(
              `❌ Could not delete existing user ${email} after ${maxRetries} attempts: ${error.message}`
            )
          }
          return false
        } else {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(`🗑️  Deleted existing user ${email}`)
          }
          return true
        }
      }
      return true // No user to delete
    } catch (error) {
      if (attempt < maxRetries) {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Attempt ${attempt} failed: ${error.message}. Retrying...`
          )
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        continue
      }
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug(
          `❌ Error checking for existing user ${email} after ${maxRetries} attempts: ${error.message}`
        )
      }
      return false
    }
  }
  return false
}

async function setupTestUsers() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up test users with Admin API...')

    // Check if Supabase is accessible (skip listUsers check as it may fail on fresh setup)
    console.debug('   Supabase URL:', supabaseUrl)
    console.debug('   Attempting to create test users...')
  }

  // Note: We'll handle profile creation manually instead of relying on the trigger
  // The trigger has RLS issues that prevent it from working during testing

  for (const user of testUsers) {
    let success = false

    // First, try to delete existing user
    const deleted = await deleteExistingUser(user.email)
    if (!deleted) {
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug(
          `⚠️  Continuing with user creation despite deletion issues for ${user.email}`
        )
      }
    }

    // Try to create user with retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Create new user - temporarily disable trigger by using bypass method
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm for testing
          user_metadata: {
            test_user: true,
          },
        })

        if (error) {
          if (
            error.message?.includes('already been registered') &&
            attempt < 3
          ) {
            if (process.env.DEBUG_TEST_SETUP) {
              console.debug(
                `⚠️  User ${user.email} still exists, retrying delete...`
              )
            }
            await deleteExistingUser(user.email)
            await new Promise((resolve) => setTimeout(resolve, 2000))
            continue
          }
          throw error
        }

        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `✅ Created test user: ${user.email} (ID: ${data.user.id})`
          )
        }

        // Wait for trigger to create user profile automatically
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Verify the trigger created the user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(`   ✅ User profile created automatically by trigger`)
          }
        } else {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(
              `   ⚠️  User profile not found: ${profileError?.message || 'Unknown error'}`
            )
            console.debug(`   This is unexpected but not critical for testing`)
          }
        }

        success = true
        break
      } catch (error) {
        if (attempt < 3) {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(
              `⚠️  Attempt ${attempt} failed for ${user.email}: ${error.message}. Retrying...`
            )
            console.debug('   Full error:', JSON.stringify(error, null, 2))
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
        } else {
          console.error(
            `❌ Failed to create ${user.email} after ${attempt} attempts: ${String(error?.message || error)}`
          )
          console.error('   Raw error object:', JSON.stringify(error, null, 2))
        }
      }
    }

    if (!success) {
      console.error(`❌ Could not create test user ${user.email}`)
    }
  }

  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('\n✨ Test user setup complete!')
    console.debug('\n📝 Test credentials for E2E tests:')
    console.debug(`   Email: ${testUsers[0].email}`)
    console.debug(`   Password: ${testUsers[0].password}`)
    console.debug(`\n   Email: ${testUsers[1].email}`)
    console.debug(`   Password: ${testUsers[1].password}`)
  }
}

// Run the setup
setupTestUsers().catch((error) => {
  console.error('❌ Setup failed:', error?.message || error)
  console.error('   Raw error object:', JSON.stringify(error, null, 2))
  process.exit(1)
})
