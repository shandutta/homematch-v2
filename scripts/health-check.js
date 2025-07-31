#!/usr/bin/env node

/**
 * Health Check & Validation Script
 * Comprehensive project health monitoring for development and CI/CD
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🏥 HomeMatch V2 Health Check\n')

// Utility functions
const runCommand = (command, options = {}) => {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd(),
      ...options,
    })
    return { success: true, output: result.trim() }
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' }
  }
}

const checkFileExists = (filepath) => {
  return fs.existsSync(path.join(process.cwd(), filepath))
}

// Health Check Categories
const healthChecks = {
  // 1. Build System Health
  buildSystem: [
    {
      name: 'TypeScript Compilation',
      test: () => {
        const result = runCommand('npx tsc --noEmit')
        return {
          pass: result.success,
          message: result.success
            ? 'Clean compilation'
            : 'TypeScript errors found',
          details: result.success ? null : result.output,
        }
      },
      critical: true,
    },
    {
      name: 'Next.js Configuration',
      test: () => {
        const configExists = checkFileExists('next.config.ts')
        const hasValidConfig =
          configExists &&
          fs.readFileSync('next.config.ts', 'utf8').includes('NextConfig')
        return {
          pass: hasValidConfig,
          message: hasValidConfig
            ? 'Valid Next.js config'
            : 'Invalid or missing Next.js config',
          details: configExists
            ? 'Config file exists'
            : 'next.config.ts not found',
        }
      },
      critical: true,
    },
  ],

  // 2. Dependencies & Security
  dependencies: [
    {
      name: 'Package Dependencies',
      test: () => {
        const result = runCommand('pnpm audit --audit-level moderate')
        const hasVulnerabilities =
          !result.success && result.output.includes('vulnerabilities')
        return {
          pass: result.success || !hasVulnerabilities,
          message: result.success
            ? 'No security vulnerabilities'
            : 'Security vulnerabilities found',
          details: result.output,
        }
      },
      critical: false,
    },
    {
      name: 'Core Dependencies Present',
      test: () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        const required = [
          'next',
          'react',
          'typescript',
          '@supabase/supabase-js',
        ]
        const missing = required.filter(
          (dep) =>
            !packageJson.dependencies?.[dep] &&
            !packageJson.devDependencies?.[dep]
        )
        return {
          pass: missing.length === 0,
          message:
            missing.length === 0
              ? 'All core dependencies present'
              : `Missing: ${missing.join(', ')}`,
          details: `Checked: ${required.join(', ')}`,
        }
      },
      critical: true,
    },
  ],

  // 3. Testing Infrastructure
  testing: [
    {
      name: 'Jest Configuration',
      test: () => {
        const configExists = checkFileExists('jest.config.js')
        if (!configExists)
          return { pass: false, message: 'Jest config missing' }

        const result = runCommand('npx jest --listTests')
        const testsFound = result.success && result.output.includes('.test.')
        return {
          pass: testsFound,
          message: testsFound
            ? 'Jest configured with tests'
            : 'Jest config issues',
          details: result.output.split('\\n').length + ' test files found',
        }
      },
      critical: false,
    },
    {
      name: 'Vitest Configuration',
      test: () => {
        const configExists = checkFileExists('vitest.config.ts')
        return {
          pass: configExists,
          message: configExists ? 'Vitest configured' : 'Vitest config missing',
          details: configExists ? 'vitest.config.ts found' : null,
        }
      },
      critical: false,
    },
  ],

  // 4. Code Quality
  quality: [
    {
      name: 'ESLint Rules',
      test: () => {
        const configExists = checkFileExists('eslint.config.mjs')
        return {
          pass: configExists,
          message: configExists ? 'ESLint configured' : 'ESLint config missing',
          details: configExists ? 'eslint.config.mjs found' : null,
        }
      },
      critical: false,
    },
    {
      name: 'Type Safety Level',
      test: () => {
        const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
        const isStrict = tsConfig.compilerOptions?.strict === true
        return {
          pass: isStrict,
          message: isStrict
            ? 'TypeScript strict mode enabled'
            : 'Strict mode disabled',
          details: `Strict: ${isStrict}, NoEmit: ${tsConfig.compilerOptions?.noEmit}`,
        }
      },
      critical: true,
    },
  ],

  // 5. Project Structure
  structure: [
    {
      name: 'Required Directories',
      test: () => {
        const required = ['src/app', 'src/lib', 'src/components', '__tests__']
        const existing = required.filter((dir) => fs.existsSync(dir))
        return {
          pass: existing.length === required.length,
          message: `${existing.length}/${required.length} required directories`,
          details: `Present: ${existing.join(', ')}`,
        }
      },
      critical: true,
    },
    {
      name: 'Environment Template',
      test: () => {
        const envExample =
          checkFileExists('.env.example') ||
          checkFileExists('.env.local.example')
        return {
          pass: envExample,
          message: envExample
            ? 'Environment template exists'
            : 'No environment template',
          details: 'For onboarding new developers',
        }
      },
      critical: false,
    },
  ],
}

// Run Health Checks
let totalTests = 0
let passedTests = 0
let criticalFailures = 0

console.log('Running comprehensive health checks...\n')

for (const [category, tests] of Object.entries(healthChecks)) {
  console.log(`📂 ${category.toUpperCase()}`)

  for (const test of tests) {
    totalTests++
    const result = test.test()

    const status = result.pass ? '✅' : test.critical ? '🚨' : '⚠️'
    console.log(`  ${status} ${test.name}: ${result.message}`)

    if (result.details) {
      console.log(`     ${result.details}`)
    }

    if (result.pass) {
      passedTests++
    } else if (test.critical) {
      criticalFailures++
    }
  }
  console.log()
}

// Health Summary
const successRate = Math.round((passedTests / totalTests) * 100)
console.log('='.repeat(60))
console.log('📊 HEALTH SUMMARY')
console.log(`✅ Passed: ${passedTests}/${totalTests} (${successRate}%)`)
console.log(`🚨 Critical Failures: ${criticalFailures}`)
console.log(`⚠️  Warnings: ${totalTests - passedTests - criticalFailures}`)

// Health Grade
let grade, status
if (criticalFailures === 0 && successRate >= 90) {
  grade = 'A'
  status = 'EXCELLENT'
} else if (criticalFailures === 0 && successRate >= 80) {
  grade = 'B'
  status = 'GOOD'
} else if (criticalFailures <= 1 && successRate >= 70) {
  grade = 'C'
  status = 'FAIR'
} else {
  grade = 'D'
  status = 'NEEDS ATTENTION'
}

console.log(`🎯 Overall Health: ${grade} (${status})`)

// Recommendations
if (criticalFailures > 0) {
  console.log('\\n🔧 CRITICAL ACTIONS REQUIRED:')
  console.log('- Fix critical failures before deployment')
  console.log('- Run health check again after fixes')
}

if (successRate < 85) {
  console.log('\\n💡 RECOMMENDATIONS:')
  console.log('- Address warnings to improve project stability')
  console.log('- Consider automating health checks in CI/CD')
}

// Exit code for CI/CD
process.exit(criticalFailures > 0 ? 1 : 0)
