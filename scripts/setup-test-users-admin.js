/**
 * Setup test users using Supabase Admin API
 * This properly creates auth users that work with the database trigger
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test.local') })

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'REDACTED_SUPABASE_SERVICE_ROLE_KEY'

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.test.local')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testUsers = [
  {
    email: process.env.TEST_USER_1_EMAIL || 'test1@example.com',
    password: process.env.TEST_USER_1_PASSWORD || 'testpassword123',
  },
  {
    email: process.env.TEST_USER_2_EMAIL || 'test2@example.com',
    password: process.env.TEST_USER_2_PASSWORD || 'testpassword456',
  },
]

async function deleteExistingUser(email, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, try to find the user
      const { data: users, error: listError } =
        await supabase.auth.admin.listUsers()

      if (listError) {
        // If listing users fails, skip deletion (might be fresh database)
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(`⚠️  Could not list users: ${listError.message}. Skipping deletion check.`)
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
        // Create new user
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
          console.debug(`✅ Created test user: ${user.email} (ID: ${data.user.id})`)
        }

        // Wait a bit for trigger to execute
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // The database trigger should automatically create a user_profile
        // Let's verify it was created
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(`   ✅ User profile automatically created by trigger`)
          }
        } else {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(`   ⚠️  User profile not found (trigger may have failed)`)
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
            `❌ Failed to create ${user.email} after ${attempt} attempts: ${error.message}`
          )
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug('   Full error:', JSON.stringify(error, null, 2))
          }
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
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
