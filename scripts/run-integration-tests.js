/**
 * Integration Test Runner
 * 1) Resets/seeds local Supabase and provisions test users
 * 2) Runs Vitest integration suite with the prepared environment
 */

const { spawnSync } = require('child_process')
const path = require('path')

const setupIntegrationTests = require('./integration-test-setup')

// Suppress Node.js experimental warnings (e.g., --localstorage-file)
process.env.NODE_NO_WARNINGS = '1'

const maskKey = (value = '') =>
  value ? `${value.slice(0, 4)}…${value.slice(-4)}` : '(empty)'

async function run() {
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🔍 Integration runner env snapshot:', {
      SUPABASE_URL:
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_LOCAL_PROXY_TARGET: process.env.SUPABASE_LOCAL_PROXY_TARGET,
      SUPABASE_LOCAL_PROXY: process.env.SUPABASE_LOCAL_PROXY,
      SUPABASE_ANON_KEY: maskKey(
        process.env.SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      SUPABASE_SERVICE_ROLE_KEY: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ALLOW_REMOTE_SUPABASE: process.env.ALLOW_REMOTE_SUPABASE,
      RUN_SUPABASE_INTEGRATION: process.env.RUN_SUPABASE_INTEGRATION,
    })
  }

  await setupIntegrationTests()

  const vitestArgs = ['exec', 'vitest', 'run', ...process.argv.slice(2)]
  if (process.env.DEBUG_TEST_SETUP) {
    console.debug('🎯 Spawning Vitest with args:', vitestArgs)
  }

  const result = spawnSync('pnpm', vitestArgs, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
  })

  if (result.error) {
    throw result.error
  }

  process.exit(result.status ?? 0)
}

run().catch((error) => {
  console.error('❌ Integration test runner failed:', error?.message || error)
  process.exit(1)
})
