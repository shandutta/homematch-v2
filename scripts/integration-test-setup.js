/**
 * Simplified Integration Test Setup
 * - Automatically starts Docker Desktop if not running (Windows/macOS/Linux)
 * - Ensures Supabase is running and creates test users with proper JWT tokens
 * - Generates authentication tokens for test execution
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

async function setupIntegrationTests() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔧 Setting up integration test environment...\n')
  }

  try {
    // Step 1: Check if Supabase is running
    if (process.env.DEBUG_TEST_SETUP) {
      console.debug('1️⃣  Checking Supabase status...')
    }

    let supabaseHealthy = false
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
          const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
            headers: {
              apikey:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ',
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
      } else {
        if (process.env.DEBUG_TEST_SETUP) {
          console.debug(
            `⚠️  Only ${containerCount} containers running, need to start Supabase`
          )
        }
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
          // Windows: Start Docker Desktop
          execSync(
            'powershell -Command "Start-Process \\"Docker Desktop\\" -WindowStyle Hidden"',
            {
              stdio: 'pipe',
            }
          )
        } else if (platform === 'darwin') {
          // macOS: Start Docker Desktop
          execSync('open -a Docker', { stdio: 'pipe' })
        } else {
          // Linux/WSL2: Try to start Docker service or provide WSL2 guidance
          try {
            // Check if we're in WSL2
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
              // Not WSL2, regular Linux
              console.debug(
                '🐧 Linux detected - Please ensure Docker daemon is running'
              )
            }
          } catch {
            // Ignore errors when checking the Linux environment
          }
        }

        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('⏳ Docker starting... waiting 30 seconds...')
        }

        // Wait for Docker to start
        await new Promise((resolve) => setTimeout(resolve, 30000))

        // Retry Docker check
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
          console.debug('   Please start Docker Desktop manually and try again')
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
        // Check Docker is available before attempting Supabase commands
        try {
          execSync('docker version', { stdio: 'pipe' })
        } catch {
          console.error('❌ Docker is not available or not running')

          // Check if we're in WSL2 to provide specific guidance
          try {
            const wslCheck = execSync('cat /proc/version', { encoding: 'utf8' })
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
              console.error('   Then try again with: pnpm run test:integration')
            }
          } catch {
            console.error(
              '   Please ensure Docker Desktop is installed and running'
            )
            console.error('   Then try again with: pnpm run test:integration')
          }

          process.exit(1)
        }

        // Stop first to clean up any partial state
        try {
          execSync('pnpm dlx supabase@latest stop', {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..'),
          })
        } catch {
          // Ignore stop errors - may not be running
        }

        // Start fresh
        execSync('pnpm dlx supabase@latest start -x studio', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })

        if (process.env.DEBUG_TEST_SETUP) {
          console.debug('✅ Supabase started successfully')
        }
      } catch (error) {
        console.error('❌ Failed to start Supabase:', error.message)

        // Check if it's a Docker-related error
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

    const supabaseUrl = 'http://127.0.0.1:54321'
    const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'

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
