/**
 * Setup test users using Supabase Admin API
 * This properly creates auth users that work with the database trigger
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')
const {
  config: resilienceConfig,
  isTransientError,
  sleep,
} = require('./test-resilience-config')

// Load environment variables from .env.local (primary) and optionally override with .env.test.local if present (CI)
const envLocalPath = path.join(__dirname, '..', '.env.local')
const envTestPath = path.join(__dirname, '..', '.env.test.local')
dotenv.config({ path: envLocalPath })
// Let .env.test.local override .env.local for local/proxy test runs
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true })
}

let supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAdminUrl = process.env.SUPABASE_LOCAL_PROXY_TARGET || supabaseUrl
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let isLocalSupabase =
  supabaseAdminUrl.includes('127.0.0.1') ||
  supabaseAdminUrl.includes('localhost') ||
  supabaseAdminUrl.includes('supabase.local') ||
  supabaseAdminUrl.startsWith('http://local-')
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
  console.error('   Detected SUPABASE_URL =', supabaseAdminUrl)
  console.error(
    '   If you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost), set ALLOW_REMOTE_SUPABASE=true.'
  )
  console.error(
    '   Otherwise run `supabase start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime` and set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  )
  process.exit(1)
}

// Create admin client with service role key and RLS bypass
const supabase = createClient(supabaseAdminUrl, supabaseServiceKey, {
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

async function ensureProfilesExist() {
  // Avoid relying solely on triggers; upsert profiles for our test users explicitly
  const { data: userList, error: listError } =
    await supabase.auth.admin.listUsers()
  if (listError || !userList?.users) {
    throw new Error(
      `Could not list users to upsert profiles: ${
        listError?.message || 'unknown error'
      }`
    )
  }

  const usersByEmail = new Map(userList.users.map((user) => [user.email, user]))

  const profilesToUpsert = testUsers
    .map((user) => usersByEmail.get(user.email))
    .filter(Boolean)
    .map((user) => ({
      id: user.id,
      onboarding_completed: true, // Set true so test users appear in partner search
      preferences: user.user_metadata?.preferences || {},
      updated_at: new Date().toISOString(),
    }))

  if (profilesToUpsert.length === 0) {
    throw new Error('No test users found when ensuring profiles exist.')
  }

  const { error: upsertError } = await supabase
    .from('user_profiles')
    .upsert(profilesToUpsert, { onConflict: 'id' })

  if (upsertError) {
    throw new Error(
      `Failed to upsert user_profiles for test users: ${upsertError.message}`
    )
  }

  if (process.env.DEBUG_TEST_SETUP) {
    console.debug(
      `✅ Ensured user_profiles for ${profilesToUpsert.length} test users`
    )
  }
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

/**
 * Wait for Supabase auth service to be ready after database reset.
 * This prevents race conditions where user creation fails with
 * "Database error checking email" due to auth service not being ready.
 *
 * Uses exponential backoff with configurable max attempts and delays.
 * Can be tuned via environment variables:
 *   - AUTH_READY_ATTEMPTS: Max attempts (default: 30)
 *   - AUTH_READY_DELAY_MS: Base delay between attempts (default: 3000ms)
 */
async function waitForAuthService(
  maxAttempts = resilienceConfig.authReadiness.maxAttempts,
  baseDelayMs = resilienceConfig.authReadiness.retryDelayMs
) {
  const startTime = Date.now()
  const maxWaitMs = resilienceConfig.authReadiness.maxWaitMs
  const maxDelayMs = resilienceConfig.authReadiness.maxDelayMs
  const backoffMultiplier = resilienceConfig.authReadiness.backoffMultiplier

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if we've exceeded max wait time
    if (Date.now() - startTime > maxWaitMs) {
      console.error(
        `❌ Auth service did not become ready within ${maxWaitMs / 1000}s`
      )
      return false
    }

    try {
      const { data, error } = await supabase.auth.admin.listUsers({
        perPage: 1,
      })
      if (!error && data) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(
          `✅ Auth service ready after ${attempt} attempts (${elapsed}s)`
        )
        return true
      }

      // Log the error for debugging
      if (process.env.DEBUG_TEST_SETUP && error) {
        console.debug(`   Auth check error: ${error.message}`)
      }
    } catch (err) {
      const message = err?.message || String(err)

      // Fail fast for non-transient errors after initial grace period
      if (!isTransientError(err) && attempt > 5) {
        console.error(`❌ Non-transient auth error: ${message}`)
        console.error('   This may indicate a configuration problem.')
        return false
      }

      if (process.env.DEBUG_TEST_SETUP) {
        console.debug(`   Auth exception: ${message}`)
      }
    }

    console.log(`⏳ Waiting for auth service... (${attempt}/${maxAttempts})`)

    // Exponential backoff with cap
    const delay = Math.min(
      baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
      maxDelayMs
    )
    await sleep(delay)
  }

  console.error('❌ Auth service did not become ready in time')
  console.error(
    '   The auth service may still be initializing after database reset.'
  )
  console.error('   Try waiting a few seconds and running again.')
  return false
}

async function setupTestUsers() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up test users with Admin API...')

    // Check if Supabase is accessible (skip listUsers check as it may fail on fresh setup)
    console.debug('   Supabase URL:', supabaseUrl)
    console.debug('   Attempting to create test users...')
  }

  // Wait for auth service to be ready before creating users
  const authReady = await waitForAuthService()
  if (!authReady) {
    process.exit(1)
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

        // Ensure user profile exists (triggers can be flaky in local setups)
        await new Promise((resolve) => setTimeout(resolve, 500))
        const { data: profile, error: profileLookupError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (profileLookupError && process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Profile lookup failed for ${user.email}: ${profileLookupError.message}`
          )
        }
        if (!profile) {
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: true, // Set true so test users appear in partner search
            })
          if (upsertError) {
            throw new Error(
              `Failed to upsert profile for ${user.email}: ${upsertError.message}`
            )
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

          // If remote/auth endpoint is unreachable, bail early to avoid spam
          if (error?.status === 502 || error?.status === 503) {
            console.error(
              '   Supabase auth endpoint unreachable (502/503). Check SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY and network/proxy.'
            )
            process.exit(1)
          }
        }
      }
    }

    if (!success) {
      console.error(`❌ Could not create test user ${user.email}`)
    }
  }

  await ensureProfilesExist()

  // Final verification to avoid silently missing profiles
  const { data: latestUsers, error: latestUsersError } =
    await supabase.auth.admin.listUsers()
  if (latestUsersError || !latestUsers?.users) {
    console.error(
      '❌ Could not list users for final profile verification:',
      latestUsersError?.message || 'unknown error'
    )
    process.exit(1)
  }
  const targetIds = latestUsers.users
    .filter((u) => testUsers.some((t) => t.email === u.email))
    .map((u) => u.id)

  const { data: profiles, error: verifyError } = await supabase
    .from('user_profiles')
    .select('id')
    .in('id', targetIds)

  if (verifyError) {
    console.error('❌ Could not verify user_profiles:', verifyError.message)
    process.exit(1)
  }

  if ((profiles || []).length !== targetIds.length) {
    const missingIds = targetIds.filter(
      (id) => !(profiles || []).some((p) => p.id === id)
    )
    console.error(
      '❌ Missing user_profiles for test user ids:',
      missingIds.join(', ')
    )
    process.exit(1)
  }

  // Debug: Check household_id for test users
  const { data: debugProfiles } = await supabase
    .from('user_profiles')
    .select('id, email, household_id, onboarding_completed')
    .in('id', targetIds)
  console.log('\n📊 Test user profiles after setup:')
  debugProfiles?.forEach((p) => {
    console.log(
      `   ${p.email}: household_id=${p.household_id || 'null'}, onboarding=${p.onboarding_completed}`
    )
  })

  // Friendly reminder for developers running pnpm dev
  const primaryUser = testUsers[0]
  const secondaryUser = testUsers[1]
  console.log('\n🔑 Test users ready for dev login:')
  console.log(`   ${primaryUser.email} / ${primaryUser.password}`)
  console.log(`   ${secondaryUser.email} / ${secondaryUser.password}\n`)

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
