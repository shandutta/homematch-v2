#!/usr/bin/env node
/**
 * E2E Auth State Generator — programmatic Supabase auth bypass
 *
 * Signs in as each test user via the Supabase SDK (no form, no cookie race),
 * then writes Playwright-compatible storage state JSON files so the E2E setup
 * never touches the login page.
 *
 * Usage: node scripts/generate-e2e-auth-states.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const AUTH_DIR = path.join(__dirname, '..', 'playwright', '.auth')
const WORKER_COUNT = 8
const FRESH_INDEX = 99

// Test users — must match setup-test-users-admin.js and __tests__/fixtures/test-data.ts
const WORKER_USERS = Array.from({ length: WORKER_COUNT }, (_, i) => ({
  email: `test-worker-${i}@example.com`,
  password: 'testpassword123',
}))

const FRESH_USER = {
  email: 'test1@example.com',
  password: 'testpassword123',
}

const loadEnv = () => {
  // Load .env.test.local first, then fallbacks
  const dotenv = require('dotenv')
  const candidates = ['.env.test.local', '.env.prod', '.env.local']
  for (const file of candidates) {
    const envPath = path.join(__dirname, '..', file)
    if (fs.existsSync(envPath)) {
      Object.assign(process.env, dotenv.parse(fs.readFileSync(envPath)))
    }
  }
}

const getStorageKey = () => {
  const hostname = 'localhost'
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  const slugify = (val, fallback) => {
    if (!val) return fallback
    return (
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || fallback
    )
  }

  let projectSlug = 'supabase'
  try {
    const parsed = new URL(supabaseUrl)
    const hostSlug = slugify(parsed.hostname, 'supabase')
    const pathSlug = slugify(parsed.pathname === '/' ? '' : parsed.pathname, '')
    projectSlug = pathSlug ? `${hostSlug}-${pathSlug}` : hostSlug
  } catch {}

  const anonFingerprint = anonKey ? slugify(anonKey.slice(0, 8), 'anon') : 'anon'
  const hostSlug = slugify(hostname, 'localhost')

  return `sb-${hostSlug}-${projectSlug}-${anonFingerprint}-auth-token`
}

async function generateAuthState(user, outputFile) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })

  if (error || !data?.session) {
    throw new Error(`Auth failed for ${user.email}: ${error?.message || 'no session'}`)
  }

  const storageKey = getStorageKey()
  const storageValue = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: 'bearer',
    user: data.user,
  })

  // Write Playwright storage state JSON
  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://127.0.0.1:3000',
        localStorage: [
          {
            name: storageKey,
            value: storageValue,
          },
        ],
      },
    ],
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true })
  fs.writeFileSync(outputFile, JSON.stringify(state, null, 2))
  console.log(`  ✅ ${outputFile} (${user.email})`)
}

async function main() {
  loadEnv()
  console.log(`🔑 Generating E2E auth states (${WORKER_COUNT} workers + fresh user)...\n`)

  // Worker users
  for (let i = 0; i < WORKER_COUNT; i++) {
    const outFile = path.join(AUTH_DIR, `user-worker-${i}.json`)
    await generateAuthState(WORKER_USERS[i], outFile)
  }

  // Fresh user (index 99)
  const freshFile = path.join(AUTH_DIR, `user-worker-${FRESH_INDEX}.json`)
  await generateAuthState(FRESH_USER, freshFile)

  console.log(`\n✅ All ${WORKER_COUNT + 1} auth states generated in ${AUTH_DIR}`)
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
