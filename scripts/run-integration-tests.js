/**
 * Integration Test Runner
 * 1) Resets/seeds local Supabase and provisions test users
 * 2) Runs Vitest integration suite with the prepared environment
 */

const { spawnSync } = require('child_process')
const path = require('path')

const setupIntegrationTests = require('./integration-test-setup')

async function run() {
  await setupIntegrationTests()

  const result = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run'],
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    }
  )

  if (result.error) {
    throw result.error
  }

  process.exit(result.status ?? 0)
}

run().catch((error) => {
  console.error('❌ Integration test runner failed:', error?.message || error)
  process.exit(1)
})
