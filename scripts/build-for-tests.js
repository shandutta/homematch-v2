#!/usr/bin/env node

/**
 * Build Next.js app with test environment variables
 * This ensures NEXT_PUBLIC_ variables are correctly embedded for E2E tests
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🏗️  Building Next.js app for E2E tests...')

// Load test environment variables
const dotenv = require('dotenv')
const testEnvPath = path.join(__dirname, '..', '.env.test.local')

if (!fs.existsSync(testEnvPath)) {
  console.error('❌ .env.test.local file not found!')
  process.exit(1)
}

// Load test environment
dotenv.config({ path: testEnvPath })

// Force test environment variables
process.env.NODE_ENV = 'production' // Build in production mode for realistic testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  'REDACTED_SUPABASE_ANON_KEY'
process.env.SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.SUPABASE_ANON_KEY =
  'REDACTED_SUPABASE_ANON_KEY'

// Clean previous test build
const testBuildDir = path.join(__dirname, '..', '.next-test')
if (fs.existsSync(testBuildDir)) {
  console.log('🧹 Cleaning previous test build...')
  fs.rmSync(testBuildDir, { recursive: true, force: true })
}

async function buildForTests() {
  try {
    console.log('📦 Building with test environment variables...')
    console.log(
      `   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
    )

    // Build Next.js
    // Unfortunately Next.js doesn't support custom output directory via env var,
    // so we'll build normally and then move it
    execSync('npx next build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        SKIP_LINTING: 'true',
        SKIP_TYPE_CHECK: 'true',
      },
      cwd: path.join(__dirname, '..'),
    })

    // Move build to test directory
    console.log('📁 Moving build to .next-test directory...')

    // Handle potential file locks on Windows
    let retries = 3
    while (retries > 0) {
      try {
        fs.renameSync(path.join(__dirname, '..', '.next'), testBuildDir)
        break
      } catch (error) {
        if (retries > 1 && error.code === 'EBUSY') {
          console.log(
            `⚠️  Build directory busy, retrying... (${retries} attempts left)`
          )
          // Wait a bit and try again (cross-platform)
          await new Promise((resolve) => setTimeout(resolve, 2000))
          retries--
        } else {
          // If rename fails, try copying instead
          console.log('⚠️  Rename failed, trying copy instead...')
          const copyRecursive = (src, dest) => {
            fs.mkdirSync(dest, { recursive: true })
            const entries = fs.readdirSync(src, { withFileTypes: true })

            for (const entry of entries) {
              const srcPath = path.join(src, entry.name)
              const destPath = path.join(dest, entry.name)

              if (entry.isDirectory()) {
                copyRecursive(srcPath, destPath)
              } else {
                fs.copyFileSync(srcPath, destPath)
              }
            }
          }

          copyRecursive(path.join(__dirname, '..', '.next'), testBuildDir)

          // Clean up original after successful copy
          fs.rmSync(path.join(__dirname, '..', '.next'), {
            recursive: true,
            force: true,
          })
          break
        }
      }
    }

    console.log('✅ Test build completed successfully!')
    console.log(`📍 Build location: ${testBuildDir}`)
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }
}

// Run the build
buildForTests().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
