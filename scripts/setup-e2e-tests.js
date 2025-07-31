#!/usr/bin/env node

/**
 * Setup E2E test environment
 * 1. Ensures local Supabase is running
 * 2. Creates test users
 * 3. Prepares test database
 */

const { execSync } = require('child_process')
const path = require('path')

async function setupE2ETests() {
  console.log('🔧 Setting up E2E test environment...\n')
  
  try {
    // Step 1: Start local Supabase if not running
    console.log('1️⃣  Starting local Supabase...')
    execSync('node scripts/infrastructure-working.js start', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    
    // Wait for Supabase to be ready
    console.log('\n⏳ Waiting for Supabase to be ready...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 1.5: Reset database to apply CASCADE constraints
    console.log('\n🔄 Applying database migrations with CASCADE constraints...')
    try {
      execSync('pnpm test:db:reset', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      console.log('✅ Database reset completed with CASCADE constraints')
    } catch (error) {
      console.log('⚠️  Database reset failed, continuing anyway...')
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Step 2: Create test users
    console.log('\n2️⃣  Creating test users...')
    execSync('node scripts/setup-test-users-admin.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    
    console.log('\n✅ E2E test environment ready!')
    console.log('📦 Using local Supabase at: http://127.0.0.1:54321')
    console.log('👤 Test users: test1@example.com, test2@example.com')
    
  } catch (error) {
    console.error('\n❌ Failed to setup E2E tests:', error.message)
    process.exit(1)
  }
}

// Run setup
setupE2ETests()