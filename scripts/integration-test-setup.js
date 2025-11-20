/**
 * Simplified Integration Test Setup
 * - Automatically starts Docker Desktop if not running (Windows/macOS/Linux)
 * - Ensures Supabase is running and creates test users with proper JWT tokens
 * - Generates authentication tokens for test execution
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables from .env.local (primary) and optionally override with .env.test.local if present (CI)
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
const testEnvPath = path.join(process.cwd(), '.env.test.local')
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath })
}

let supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let isLocalSupabase =
  supabaseUrl.includes('127.0.0.1') ||
  supabaseUrl.includes('localhost') ||
  supabaseUrl.includes('supabase.local') ||
  supabaseUrl.startsWith('http://local-')
const allowRemoteSupabase =
  process.env.ALLOW_REMOTE_SUPABASE === 'true' ||
  process.env.SUPABASE_ALLOW_REMOTE === 'true'

if (!isLocalSupabase && !allowRemoteSupabase) {
  console.error(
    '❌ Integration tests expect a local Supabase instance (e.g. http://127.0.0.1:54321).'
  )
  console.error('   Detected SUPABASE_URL =', supabaseUrl || '(not set)')
  console.error(
    '   If you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost), set ALLOW_REMOTE_SUPABASE=true.'
  )
  console.error(
    '   Otherwise run `supabase start -x studio` and set local keys in .env.local or export ALLOW_REMOTE_SUPABASE=true.'
  )
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error(
    'Missing Supabase configuration. Set SUPABASE_URL, SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY in your environment (.env.local).'
  )
  process.exit(1)
}

async function setupIntegrationTests() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up integration test environment...\n')
  }

  try {
    // Step 1 + 2: Only manage Docker/local Supabase if pointing to a local instance
    let supabaseHealthy = !isLocalSupabase
    if (isLocalSupabase) {
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('1️⃣  Checking Supabase status...')
      }

      try {
        // Simple check for running containers
        const containers = execSync(
          'docker ps --filter name=supabase --format "{{.Names}}"',
          { encoding: 'utf8', stdio: 'pipe' }
        ).trim()

        const containerCount = containers.split('\n').filter((n) => n).length

        if (containerCount >= 10) {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(`✅ ${containerCount} Supabase containers running`)
          }

          // Quick health check using Node's fetch
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/`, {
              headers: {
                apikey: supabaseAnonKey,
              },
            })

            if (response.ok || response.status === 401) {
              supabaseHealthy = true
              if (process.env.DEBUG_TEST_SETUP) {
                console.debug('✅ Supabase API is responding')
              }
            }
          } catch (error) {
            if (process.env.DEBUG_TEST_SETUP) {
              console.debug('⚠️  Supabase API not responding:', error.message)
            }
          }
        } else if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Only ${containerCount} containers running, need to start Supabase`
          )
        }
      } catch (error) {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('⚠️  Docker check failed:', error.message)
          console.debug('   Attempting to start Docker Desktop...')
        }

        // Try to start Docker Desktop if it's not running
        try {
          const platform = process.platform

          if (platform === 'win32') {
            execSync(
              'powershell -Command "Start-Process \\"Docker Desktop\\" -WindowStyle Hidden"',
              {
                stdio: 'pipe',
              }
            )
          } else if (platform === 'darwin') {
            execSync('open -a Docker', { stdio: 'pipe' })
          } else {
            try {
              const wslCheck = execSync('cat /proc/version', {
                encoding: 'utf8',
              })
              if (wslCheck.includes('microsoft') || wslCheck.includes('WSL')) {
                if (process.env.DEBUG_TEST_SETUP) {
                  console.debug(
                    '🐧 WSL2 detected - Docker Desktop integration required'
                  )
                  console.debug(
                    '   Please start Docker Desktop on Windows and enable WSL2 integration'
                  )
                }
              } else {
                console.debug(
                  '🐧 Linux detected - Please ensure Docker daemon is running'
                )
                console.debug(
                  '   Run: sudo systemctl start docker (if applicable)'
                )
              }
            } catch {
              console.debug(
                '🐧 Linux detected - Please ensure Docker daemon is running'
              )
            }
          }

          if (process.env.DEBUG_TEST_SETUP) {
            console.debug('⏳ Docker starting... waiting 30 seconds...')
          }

          await new Promise((resolve) => setTimeout(resolve, 30000))

          execSync('docker ps --filter name=supabase --format "{{.Names}}"', {
            encoding: 'utf8',
            stdio: 'pipe',
          }).trim()

          if (process.env.DEBUG_TEST_SETUP) {
            console.debug('✅ Docker Desktop started successfully')
          }
        } catch (dockerStartError) {
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug(
              '⚠️  Could not auto-start Docker Desktop:',
              dockerStartError.message
            )
            console.debug(
              '   Please start Docker Desktop manually and try again'
            )
          }
        }
      }

      // Step 2: Start Supabase if not healthy
      if (!supabaseHealthy) {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('\n2️⃣  Starting Supabase...')
          console.debug('   This may take a minute...')
        }

        try {
          try {
            execSync('docker version', { stdio: 'pipe' })
          } catch {
            console.error('❌ Docker is not available or not running')

            try {
              const wslCheck = execSync('cat /proc/version', {
                encoding: 'utf8',
              })
              if (wslCheck.includes('microsoft') || wslCheck.includes('WSL')) {
                console.error('\n🐧 WSL2 Environment Detected:')
                console.error('   1. Start Docker Desktop on Windows')
                console.error(
                  '   2. Go to Settings → Resources → WSL Integration'
                )
                console.error('   3. Enable integration with your WSL2 distro')
                console.error('   4. Run: wsl --shutdown && wsl')
                console.error('   5. Try again: pnpm run test:integration')
              } else {
                console.error(
                  '   Please ensure Docker Desktop is installed and running'
                )
                console.error(
                  '   Then try again with: pnpm run test:integration'
                )
              }
            } catch {
              console.error(
                '   Please ensure Docker Desktop is installed and running'
              )
              console.error('   Then try again with: pnpm run test:integration')
            }

            process.exit(1)
          }

          try {
            execSync('pnpm dlx supabase@latest stop', {
              stdio: 'pipe',
              cwd: path.join(__dirname, '..'),
            })
          } catch {
            // Ignore stop errors - may not be running
          }

          execSync('pnpm dlx supabase@latest start -x studio', {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'),
          })

          supabaseHealthy = true
          if (process.env.DEBUG_TEST_SETUP) {
            console.debug('✅ Supabase started successfully')
          }
        } catch (error) {
          console.error('❌ Failed to start Supabase:', error.message)

          if (
            error.message.includes('docker') ||
            error.message.includes('Docker')
          ) {
            console.error('\n💡 Docker Desktop may not be running. Try:')
            console.error('   1. Start Docker Desktop manually')
            console.error('   2. Wait for it to fully load')
            console.error('   3. Run: pnpm run test:integration')
          } else {
            console.error(
              '   Please run manually: pnpm dlx supabase@latest start -x studio'
            )
          }
          process.exit(1)
        }
      }
    } else if (process.env.DEBUG_TEST_SETUP) {
      console.debug('ℹ️  Skipping Docker/Supabase start because URL is remote')
    }

    // Step 3: Create test users
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n3️⃣  Setting up test users...')
    }

    try {
      // Run the setup-test-users-admin script
      execSync('node scripts/setup-test-users-admin.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      })
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('✅ Test users created')
      }
    } catch (error) {
      console.error('❌ Failed to create test users:', error.message)
      console.error(
        '   Please run manually: node scripts/setup-test-users-admin.js'
      )
      process.exit(1)
    }

    // Step 4: Generate proper auth token by signing in as test user
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n4️⃣  Generating authentication token...')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Sign in as test user to get JWT token
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: 'test1@example.com',
        password: 'testpassword123',
      })

    if (authError || !authData.session) {
      console.error('❌ Failed to authenticate test user:', authError?.message)
      console.error('   Make sure test users are created first')
      process.exit(1)
    }

    const testAuthToken = authData.session.access_token
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('✅ Generated JWT token for test user')
    }

    // Write JWT token to file for tests to use
    const tokenFile = path.join(__dirname, '..', '.test-auth-token')
    fs.writeFileSync(tokenFile, testAuthToken)

    // Set environment variables
    process.env.TEST_AUTH_TOKEN = testAuthToken
    process.env.SUPABASE_URL = supabaseUrl
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey

    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('\n✅ Integration test environment ready!')
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.debug('📦 Supabase: http://127.0.0.1:54321')
      console.debug('👤 Test user: test1@example.com')
      console.debug('🔐 JWT token saved to .test-auth-token')
      console.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupIntegrationTests()
    .then(() => {
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('\n🚀 Ready to run tests!')
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('Setup error:', error)
      process.exit(1)
    })
}

module.exports = setupIntegrationTests
