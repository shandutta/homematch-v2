#!/usr/bin/env node

/**
 * Start Next.js server with test build for E2E tests
 * This ensures we use the test database and environment
 */

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// First, kill any process on port 3000
console.log('🔪 Killing any process on port 3000...')
try {
  execSync('node scripts/kill-port.js 3000', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  })
} catch (error) {
  // Ignore errors - port might already be free
}

// Check if test build exists
const testBuildDir = path.join(__dirname, '..', '.next-test')
const regularBuildDir = path.join(__dirname, '..', '.next')

if (!fs.existsSync(testBuildDir)) {
  console.log('❌ Test build not found! Building now...')
  
  // Build for tests
  try {
    execSync('node scripts/build-for-tests.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
  } catch (error) {
    console.error('❌ Failed to build for tests:', error.message)
    process.exit(1)
  }
}

// Temporarily swap build directories
console.log('🔄 Swapping to test build...')

// Backup current .next if it exists
let hasOriginalBuild = false
const backupDir = path.join(__dirname, '..', '.next-dev-backup')

if (fs.existsSync(regularBuildDir)) {
  hasOriginalBuild = true
  fs.renameSync(regularBuildDir, backupDir)
}

// Use test build as .next
fs.renameSync(testBuildDir, regularBuildDir)

// Load test environment variables
const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '..', '.env.test.local') })

// Force test environment variables
process.env.NODE_ENV = 'production'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'REDACTED_SUPABASE_ANON_KEY'

console.log('🚀 Starting Next.js production server for tests...')
console.log(`📦 Using Supabase at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

// Start Next.js production server
const nextProcess = spawn('npx', ['next', 'start', '-p', '3000'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd: path.join(__dirname, '..')
})

// Cleanup function
const cleanup = () => {
  console.log('\n🧹 Cleaning up...')
  
  // Kill the Next.js process
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM')
  }
  
  // Restore build directories
  if (fs.existsSync(regularBuildDir)) {
    fs.renameSync(regularBuildDir, testBuildDir)
  }
  
  if (hasOriginalBuild && fs.existsSync(backupDir)) {
    fs.renameSync(backupDir, regularBuildDir)
  }
  
  console.log('✅ Cleanup complete')
}

// Handle process termination
process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

nextProcess.on('error', (err) => {
  console.error('❌ Failed to start Next.js:', err)
  cleanup()
  process.exit(1)
})

nextProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Next.js exited with code ${code}`)
  }
  cleanup()
  process.exit(code || 0)
})