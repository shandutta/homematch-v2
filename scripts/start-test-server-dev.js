#!/usr/bin/env node

/**
 * Start Next.js dev server with test environment for E2E tests
 * This ensures we use the test database instead of production
 */

const { spawn, execSync } = require('child_process')
const path = require('path')

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
const dotenv = require('dotenv')

// First, load the .env.test.local file
const testEnvConfig = dotenv.config({
  path: path.join(__dirname, '..', '.env.test.local'),
})

// Ensure we're in test mode
process.env.NODE_ENV = 'test'

// Force test environment variables to override any existing ones
// This is critical because .env.local might contain production values
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  'REDACTED_SUPABASE_ANON_KEY'
process.env.SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.SUPABASE_ANON_KEY =
  'REDACTED_SUPABASE_ANON_KEY'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'

// Override any production environment variables
delete process.env.POSTGRES_URL
delete process.env.POSTGRES_DATABASE
delete process.env.POSTGRES_HOST
delete process.env.POSTGRES_PASSWORD
delete process.env.POSTGRES_PRISMA_URL

// Clear any cached modules to ensure fresh environment
delete require.cache[require.resolve('dotenv')]

console.log('🧪 Starting Next.js in test mode...')
console.log(`📦 Using Supabase at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

// Build a clean environment object with only what we need
const testEnv = {
  ...process.env,
  // Force test environment
  NODE_ENV: 'test',
  // Supabase test configuration
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'REDACTED_SUPABASE_ANON_KEY',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'REDACTED_SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_ROLE_KEY: 'REDACTED_SUPABASE_SERVICE_ROLE_KEY',
}

// Remove production environment variables from the test environment
delete testEnv.POSTGRES_URL
delete testEnv.POSTGRES_DATABASE
delete testEnv.POSTGRES_HOST
delete testEnv.POSTGRES_PASSWORD
delete testEnv.POSTGRES_PRISMA_URL

// Start Next.js dev server with test environment on port 3000
// Use pnpm to avoid bash path issues
const nextProcess = spawn('pnpm', ['run', 'dev'], {
  stdio: 'inherit',
  env: testEnv,
  shell: true,
  cwd: path.join(__dirname, '..'),
})

process.on('SIGINT', () => {
  nextProcess.kill('SIGINT')
  process.exit(0)
})

nextProcess.on('error', (err) => {
  console.error('❌ Failed to start Next.js:', err)
  process.exit(1)
})
