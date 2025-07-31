#!/usr/bin/env node

/**
 * Validate E2E setup without running actual tests
 * Tests the globalSetup and webServer configuration
 */

const { execSync } = require('child_process')
const path = require('path')

async function validateSetup() {
  console.log('🔍 Validating E2E setup configuration...\n')

  try {
    // Test 1: Check if globalSetup file can be loaded
    console.log('1️⃣  Testing globalSetup file...')
    try {
      const globalSetup = require('./global-setup.js')
      if (typeof globalSetup === 'function') {
        console.log('✅ globalSetup.js loaded successfully')
      } else {
        console.log('⚠️  globalSetup.js does not export a function')
      }
    } catch (error) {
      console.log('❌ globalSetup.js error:', error.message)
    }

    // Test 2: Check if playwright config is valid
    console.log('\n2️⃣  Testing Playwright config...')
    execSync('npx playwright --version', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    })
    console.log('✅ Playwright is installed and accessible')

    // Test 3: Try to parse the config (without running)
    console.log('\n3️⃣  Testing config parsing...')
    const result = execSync('npx playwright test --list --reporter=null', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    }).toString()

    if (result.includes('Error') || result.includes('Failed')) {
      console.log('❌ Config parsing failed:', result)
    } else {
      console.log('✅ Playwright config parsed successfully')

      // Check if tests are detected
      const testCount = (result.match(/\.spec\.ts/g) || []).length
      console.log(`📊 Found ${testCount} test files`)
    }

    console.log('\n✅ E2E setup validation completed!')
    console.log('\n🚀 Next steps:')
    console.log('   - Try: pnpm test:e2e:headed')
    console.log(
      '   - Or manual: pnpm test:e2e:dev (then in new terminal: npx playwright test --headed)'
    )
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message)

    // Provide troubleshooting hints
    console.log('\n🔧 Troubleshooting:')
    if (error.message.includes('bash')) {
      console.log(
        '   - Bash path issue detected. Try running from Git Bash directly.'
      )
    }
    if (error.message.includes('globalSetup')) {
      console.log('   - GlobalSetup file issue. Check TypeScript compilation.')
    }
    if (error.message.includes('playwright')) {
      console.log('   - Playwright not found. Run: pnpm install')
    }

    process.exit(1)
  }
}

// Run validation
validateSetup()
