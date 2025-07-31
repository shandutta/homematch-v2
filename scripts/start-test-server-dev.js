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
} catch (error) {
  // Ignore errors - port might already be free
}

// Load test environment variables BEFORE starting Next.js
const dotenv = require('dotenv')
const testEnv = dotenv.config({
  path: path.join(__dirname, '..', '.env.test.local'),
})

// Ensure we're in test mode
process.env.NODE_ENV = 'test'

// Force test environment variables to override any existing ones
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'
process.env.SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'

// Clear any cached modules to ensure fresh environment
delete require.cache[require.resolve('dotenv')]

console.log('🧪 Starting Next.js in test mode...')
console.log(`📦 Using Supabase at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

// Start Next.js dev server with test environment on port 3000
// Use pnpm to avoid bash path issues
const nextProcess = spawn('pnpm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd: path.join(__dirname, '..'),
})

nextProcess.on('error', (err) => {
  console.error('❌ Failed to start Next.js:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  nextProcess.kill('SIGINT')
  process.exit(0)
})
