#!/usr/bin/env node

/**
 * Run the narrow local-only seeded auth lifecycle smoke.
 *
 * This wrapper intentionally refuses remote Supabase URLs before seeding test
 * users or launching Playwright. It keeps the run single-worker and delegates
 * user creation to scripts/setup-test-users-admin.js.
 */

const { spawnSync } = require('child_process')
const path = require('path')

const repoRoot = path.join(__dirname, '..')

const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54200'

const isLocalSupabaseUrl = (rawUrl) => {
  try {
    const hostname = new URL(rawUrl).hostname
    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === 'supabase.local' ||
      hostname.startsWith('local-')
    )
  } catch {
    return false
  }
}

const localSupabaseUrl =
  process.env.LOCAL_SUPABASE_URL ||
  process.env.SUPABASE_LOCAL_PROXY_TARGET ||
  DEFAULT_LOCAL_SUPABASE_URL

if (!isLocalSupabaseUrl(localSupabaseUrl)) {
  console.error(
    `Refusing to run local seeded auth lifecycle against non-local Supabase URL: ${localSupabaseUrl}`
  )
  process.exit(1)
}

const env = {
  ...process.env,
  LOCAL_SEEDED_AUTH_LIFECYCLE: 'true',
  PLAYWRIGHT_WORKERS: '1',
  NEXT_PUBLIC_TEST_MODE: 'true',
  SUPABASE_URL: localSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_URL: localSupabaseUrl,
  SUPABASE_LOCAL_PROXY_TARGET:
    process.env.SUPABASE_LOCAL_PROXY_TARGET || localSupabaseUrl,
  ALLOW_REMOTE_SUPABASE: 'false',
  SUPABASE_ALLOW_REMOTE: 'false',
}

const run = (label, command, args) => {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

run('seed local Supabase test users', 'node', [
  'scripts/setup-test-users-admin.js',
])

run('run local seeded auth lifecycle smoke with one Playwright worker', 'node', [
  'scripts/playwright-wrapper.js',
  'test',
  '__tests__/e2e/auth-lifecycle-local-seeded.spec.ts',
  '--project=chromium',
])
