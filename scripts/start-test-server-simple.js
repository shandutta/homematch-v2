#!/usr/bin/env node

/**
 * Simplified test server starter
 * Uses NEXT_DISTDIR environment variable instead of directory swapping
 */

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { killProcessOnPort, isPortAvailable } = require('./kill-port')

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test.local') })

// Async function to ensure port is available
async function ensurePortAvailable() {
  console.log('🔪 Ensuring port 3000 is available...')
  const success = await killProcessOnPort(3000, { maxRetries: 5, retryDelay: 2000 })
  if (!success) {
    console.error('❌ Failed to free port 3000 after multiple attempts')
    process.exit(1)
  }
  
  // Double-check the port is available
  const available = await isPortAvailable(3000)
  if (!available) {
    console.error('❌ Port 3000 is still in use after kill attempts')
    process.exit(1)
  }
  
  console.log('✅ Port 3000 is available')
}

// Main async function
async function startTestServer() {
  // Ensure port is available first
  await ensurePortAvailable()

  // Check if test build exists
  const testBuildDir = path.join(__dirname, '..', '.next-test')

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

  // Set up environment for test
  process.env.NODE_ENV = 'production'
  process.env.NEXT_DISTDIR = '.next-test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'

  console.log('🚀 Starting Next.js production server for tests...')
  console.log(`📦 Using test build from: ${process.env.NEXT_DISTDIR}`)
  console.log(`🔗 Using Supabase at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

  // Start Next.js production server
  const nextProcess = spawn('npx', ['next', 'start', '-p', '3000'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
    cwd: path.join(__dirname, '..')
  })

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping test server...')
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill('SIGTERM')
    }
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping test server...')
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill('SIGTERM')
    }
    process.exit(0)
  })

  nextProcess.on('error', (err) => {
    console.error('❌ Failed to start Next.js:', err)
    process.exit(1)
  })

  nextProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Next.js exited with code ${code}`)
    }
    process.exit(code || 0)
  })
}

// Start the server
startTestServer().catch(error => {
  console.error('❌ Failed to start test server:', error)
  process.exit(1)
})