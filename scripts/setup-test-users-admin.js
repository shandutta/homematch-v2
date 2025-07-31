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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
      // First, find the user
      const { data: users, error: listError } =
        await supabase.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      const existingUser = users?.users?.find((u) => u.email === email)

      if (existingUser) {
        // Delete the user
        const { error } = await supabase.auth.admin.deleteUser(existingUser.id)
        if (error) {
          if (attempt < maxRetries) {
            console.log(
              `⚠️  Delete attempt ${attempt} failed for ${email}: ${error.message}. Retrying...`
            )
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
            continue
          }
          console.log(
            `❌ Could not delete existing user ${email} after ${maxRetries} attempts: ${error.message}`
          )
          return false
        } else {
          console.log(`🗑️  Deleted existing user ${email}`)
          return true
        }
      }
      return true // No user to delete
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(
          `⚠️  Attempt ${attempt} failed: ${error.message}. Retrying...`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        continue
      }
      console.log(
        `❌ Error checking for existing user ${email} after ${maxRetries} attempts: ${error.message}`
      )
      return false
    }
  }
  return false
}

async function setupTestUsers() {
  console.log('🔧 Setting up test users with Admin API...')

  // Check if Supabase is accessible
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    console.log(
      `✅ Connected to Supabase (${data.users.length} existing users)`
    )
  } catch (error) {
    console.error('❌ Cannot connect to Supabase. Is it running?')
    console.error('   Run: ./supabase.exe start')
    process.exit(1)
  }

  for (const user of testUsers) {
    let success = false

    // First, try to delete existing user
    const deleted = await deleteExistingUser(user.email)
    if (!deleted) {
      console.log(
        `⚠️  Continuing with user creation despite deletion issues for ${user.email}`
      )
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
            console.log(
              `⚠️  User ${user.email} still exists, retrying delete...`
            )
            await deleteExistingUser(user.email)
            await new Promise((resolve) => setTimeout(resolve, 2000))
            continue
          }
          throw error
        }

        console.log(`✅ Created test user: ${user.email} (ID: ${data.user.id})`)

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
          console.log(`   ✅ User profile automatically created by trigger`)
        } else {
          console.log(`   ⚠️  User profile not found (trigger may have failed)`)
        }

        success = true
        break
      } catch (error) {
        if (attempt < 3) {
          console.log(
            `⚠️  Attempt ${attempt} failed for ${user.email}: ${error.message}. Retrying...`
          )
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
        } else {
          console.error(
            `❌ Failed to create ${user.email} after ${attempt} attempts: ${error.message}`
          )
        }
      }
    }

    if (!success) {
      console.error(`❌ Could not create test user ${user.email}`)
    }
  }

  console.log('\n✨ Test user setup complete!')
  console.log('\n📝 Test credentials for E2E tests:')
  console.log(`   Email: ${testUsers[0].email}`)
  console.log(`   Password: ${testUsers[0].password}`)
  console.log('\n   Email: ${testUsers[1].email}')
  console.log(`   Password: ${testUsers[1].password}`)
}

// Run the setup
setupTestUsers().catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
