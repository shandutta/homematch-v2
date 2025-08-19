/**
 * Health Check Script
 * Validates that the project is in a good state for testing
 */

const fs = require('fs')

function healthCheck() {
  console.log('🏥 Running health check...')

  const issues = []

  // Check package.json
  if (!fs.existsSync('package.json')) {
    issues.push('package.json not found')
  }

  // Check key configuration files
  const requiredFiles = [
    'tsconfig.json',
    'next.config.ts',
    'jest.config.js',
    'vitest.config.ts',
    'supabase/config.toml',
  ]

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      issues.push(`${file} not found`)
    }
  }

  // Check test directories
  const testDirs = [
    '__tests__/integration',
    '__tests__/unit',
    '__tests__/utils',
  ]

  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      issues.push(`${dir} directory not found`)
    }
  }

  if (issues.length === 0) {
    console.log('✅ Health check passed')
    return true
  } else {
    console.log('❌ Health check failed:')
    issues.forEach((issue) => console.log(`  - ${issue}`))
    return false
  }
}

if (require.main === module) {
  const healthy = healthCheck()
  process.exit(healthy ? 0 : 1)
}

module.exports = healthCheck
