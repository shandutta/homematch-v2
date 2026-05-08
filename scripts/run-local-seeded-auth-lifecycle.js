#!/usr/bin/env node

/**
 * Run the narrow local-only seeded auth lifecycle smoke.
 *
 * This wrapper intentionally refuses remote Supabase URLs before seeding test
 * users or launching Playwright. It keeps the run single-worker and delegates
 * user creation to scripts/setup-test-users-admin.js.
 *
 * Safe default: if the local app, local Supabase, or local test credentials are
 * not already present, print an explicit SKIP and exit 0 instead of starting
 * infrastructure, touching remote Supabase, or leaking secrets.
 */

const { spawnSync } = require('child_process')
const path = require('path')

const repoRoot = path.join(__dirname, '..')

const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54200'
const DEFAULT_LOCAL_APP_URL = 'http://127.0.0.1:3000'
const READINESS_TIMEOUT_MS = 1500
const SETUP_DOCS_HINT =
  'See docs/SETUP_GUIDE.md and run `pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime` then `pnpm test:setup-users` (scripts/setup-test-users-admin.js) before retrying.'

const normalizeLocalhostUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl)
    if (url.hostname === 'localhost') {
      url.hostname = '127.0.0.1'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return rawUrl
  }
}

const isLocalUrl = (rawUrl) => {
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

const failOrSkip = (message) => {
  const prefix = '[local-seeded-auth-lifecycle]'
  const fullMessage = `${message}. ${SETUP_DOCS_HINT}`
  if (process.env.LOCAL_SEEDED_AUTH_LIFECYCLE_STRICT === 'true') {
    console.error(`${prefix} ERROR: ${fullMessage}`)
    process.exit(1)
  }

  console.log(`${prefix} SKIP: ${fullMessage}`)
  process.exit(0)
}

const probe = async (label, rawUrl) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), READINESS_TIMEOUT_MS)

  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })

    return {
      ok: response.status >= 200 && response.status < 500,
      detail: `${label} responded with HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      detail: `${label} did not respond at ${rawUrl}: ${error.message}`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

const localSupabaseUrl = normalizeLocalhostUrl(
  process.env.LOCAL_SUPABASE_URL ||
    process.env.SUPABASE_LOCAL_PROXY_TARGET ||
    DEFAULT_LOCAL_SUPABASE_URL
)

const localAppUrl = normalizeLocalhostUrl(
  process.env.BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.E2E_BASE_URL ||
    DEFAULT_LOCAL_APP_URL
)

const env = {
  ...process.env,
  LOCAL_SEEDED_AUTH_LIFECYCLE: 'true',
  PLAYWRIGHT_WORKERS: '1',
  NEXT_PUBLIC_TEST_MODE: 'true',
  BASE_URL: localAppUrl,
  PLAYWRIGHT_BASE_URL: localAppUrl,
  E2E_BASE_URL: localAppUrl,
  APP_URL: localAppUrl,
  NEXT_PUBLIC_APP_URL: localAppUrl,
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

const main = async () => {
  if (!isLocalUrl(localSupabaseUrl)) {
    failOrSkip(
      `refusing non-local Supabase URL for seeded auth lifecycle (${localSupabaseUrl})`
    )
  }

  if (!isLocalUrl(localAppUrl)) {
    failOrSkip(
      `refusing non-local app URL for seeded auth lifecycle (${localAppUrl})`
    )
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    failOrSkip(
      'SUPABASE_SERVICE_ROLE_KEY is absent; start/configure a local test Supabase session before running this smoke'
    )
  }

  const appHealthUrl = `${localAppUrl}/api/health?expectTest=true`
  const appProbe = await probe('local app health endpoint', appHealthUrl)
  if (!appProbe.ok) {
    failOrSkip(
      `${appProbe.detail}; start the local app/test server before running this smoke`
    )
  }
  console.log(`[local-seeded-auth-lifecycle] READY: ${appProbe.detail}`)

  const supabaseHealthUrl = `${localSupabaseUrl}/auth/v1/health`
  const supabaseProbe = await probe('local Supabase auth health endpoint', supabaseHealthUrl)
  if (!supabaseProbe.ok) {
    failOrSkip(
      `${supabaseProbe.detail}; start local Supabase before seeding test users`
    )
  }
  console.log(`[local-seeded-auth-lifecycle] READY: ${supabaseProbe.detail}`)

  run('seed local Supabase test users', 'node', [
    'scripts/setup-test-users-admin.js',
  ])

  run('run local seeded auth lifecycle smoke with one Playwright worker', 'node', [
    'scripts/playwright-wrapper.js',
    'test',
    '__tests__/e2e/auth-lifecycle-local-seeded.spec.ts',
    '--project=chromium',
  ])
}

main().catch((error) => {
  console.error('[local-seeded-auth-lifecycle] ERROR:', error)
  process.exit(1)
})
