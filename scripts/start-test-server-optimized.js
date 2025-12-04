#!/usr/bin/env node

/**
 * Start Next.js dev server with test environment for E2E tests - OPTIMIZED
 * This skips the heavy DB reset and seeding, assuming it's done once or manually.
 */

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

const shouldResetForE2E =
  process.env.E2E_RESET_DB === 'true' ||
  process.env.PLAYWRIGHT_RESET_DB === 'true'

async function main() {
  // First, kill any process on port 3000
  console.log('🔪 Killing any process on port 3000...')
  try {
    execSync('node scripts/kill-port.js 3000', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
  } catch {
    // Ignore errors - port might already be free
  }

  // Load test environment variables BEFORE starting Next.js
  // Load env files in priority order: test -> local -> prod
  // Use override for .env.test.local to ensure test config takes precedence over shell env vars
  const envCandidates = ['.env.test.local', '.env.prod', '.env.local']
  const loadedEnvFiles = []

  for (const file of envCandidates) {
    const envPath = path.join(__dirname, '..', file)
    if (fs.existsSync(envPath)) {
      // Use override for .env.test.local to ensure test config takes precedence
      const override = file === '.env.test.local'
      dotenv.config({ path: envPath, override })
      loadedEnvFiles.push(file)
    }
  }

  if (!loadedEnvFiles.length) {
    console.warn(
      '⚠️  No env file found (.env.test.local/.env.local/.env.prod); relying on process environment variables.'
    )
  }

  // Ensure we're in test mode
  process.env.NODE_ENV = 'test'

  // Optional: reset/seed Supabase for E2E when requested
  if (shouldResetForE2E) {
    console.log('🔄 E2E_RESET_DB enabled: resetting Supabase for E2E tests...')
    const setupIntegrationTests = require('./integration-test-setup')
    await setupIntegrationTests()
  } else {
    console.log(
      '⏭️  Skipping Supabase reset for E2E (default). Set E2E_RESET_DB=true to reset before tests.'
    )
  }

  // Server-side Supabase URL (for admin operations)
  const supabaseServerUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'

  // Client-side Supabase URL - preserve proxy URL if configured
  const supabaseClientUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseServerUrl

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase keys for test server. Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see .env.prod)'
    )
  }

  // Set environment variables - don't override NEXT_PUBLIC_SUPABASE_URL if it's already set
  // (it may be configured to use a proxy like http://localhost:3000/supabase)
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseClientUrl
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
  process.env.SUPABASE_URL = supabaseServerUrl
  process.env.SUPABASE_ANON_KEY = supabaseAnonKey
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey

  // Override any production environment variables
  delete process.env.POSTGRES_URL
  delete process.env.POSTGRES_DATABASE
  delete process.env.POSTGRES_HOST
  delete process.env.POSTGRES_PASSWORD
  delete process.env.POSTGRES_PRISMA_URL

  // Clear any cached modules to ensure fresh environment
  delete require.cache[require.resolve('dotenv')]

  console.log('🧪 Starting Next.js in test mode (OPTIMIZED - No DB Reset)...')
  console.log(`📦 Using Supabase at: ${supabaseServerUrl}`)
  console.log(`📱 Client URL: ${supabaseClientUrl}`)

  // Build a clean environment object with only what we need
  const testEnv = {
    ...process.env,
    // Force test environment
    NODE_ENV: 'test',
    NEXT_PUBLIC_TEST_MODE: 'true',
    // Supabase test configuration
    NEXT_PUBLIC_SUPABASE_URL: supabaseClientUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_URL: supabaseServerUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  }

  // Remove production environment variables from the test environment
  delete testEnv.POSTGRES_URL
  delete testEnv.POSTGRES_DATABASE
  delete testEnv.POSTGRES_HOST
  delete testEnv.POSTGRES_PASSWORD
  delete testEnv.POSTGRES_PRISMA_URL

  // Start Next.js dev server with test environment on port 3000
  // DIRECTLY calling next dev, skipping the heavy npm scripts
  const nextProcess = spawn(
    'npx',
    ['next', 'dev', '--turbopack', '--hostname', '0.0.0.0', '--port', '3000'],
    {
      stdio: 'inherit',
      env: testEnv,
      shell: true,
      cwd: path.join(__dirname, '..'),
    }
  )

  process.on('SIGINT', () => {
    nextProcess.kill('SIGINT')
    process.exit(0)
  })

  nextProcess.on('error', (err) => {
    console.error('❌ Failed to start Next.js:', err)
    process.exit(1)
  })
}

main().catch((err) => {
  console.error('❌ start-test-server-optimized failed:', err?.message || err)
  process.exit(1)
})
