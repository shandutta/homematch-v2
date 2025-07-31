#!/usr/bin/env node

/**
 * Deployment Validation Script
 *
 * Validates that all deployment-critical components are properly configured
 * and ready for production deployment.
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 HomeMatch V2 - Deployment Validation')
console.log('=====================================\n')

let passed = 0
let failed = 0

function check(description, condition, details = '') {
  if (condition) {
    console.log(`✅ ${description}`)
    if (details) console.log(`   ${details}`)
    passed++
  } else {
    console.log(`❌ ${description}`)
    if (details) console.log(`   ${details}`)
    failed++
  }
}

// Check critical files exist
console.log('📁 File System Checks')
console.log('---------------------')

const criticalFiles = [
  { path: 'package.json', desc: 'Package configuration' },
  { path: 'next.config.ts', desc: 'Next.js configuration' },
  { path: 'middleware.ts', desc: 'Authentication middleware' },
  { path: 'vercel.json', desc: 'Vercel deployment config' },
  { path: 'playwright.config.ts', desc: 'Playwright test config' },
  { path: 'src/app/validation/page.tsx', desc: 'Validation dashboard' },
  { path: 'src/app/api/health/route.ts', desc: 'Health check endpoint' },
  { path: '__tests__/e2e/validation-dashboard.spec.ts', desc: 'E2E tests' },
  { path: '.github/workflows/test.yml', desc: 'GitHub Actions CI/CD' },
]

criticalFiles.forEach(({ path: filePath, desc }) => {
  const exists = fs.existsSync(filePath)
  check(desc, exists, exists ? `Found: ${filePath}` : `Missing: ${filePath}`)
})

console.log()

// Check package.json scripts
console.log('📜 Package Scripts')
console.log('------------------')

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredScripts = [
    'dev',
    'build',
    'start',
    'lint',
    'type-check',
    'test',
    'test:unit',
    'test:integration',
    'test:e2e',
  ]

  requiredScripts.forEach((script) => {
    const exists = packageJson.scripts && packageJson.scripts[script]
    check(
      `Script: ${script}`,
      exists,
      exists ? packageJson.scripts[script] : 'Missing'
    )
  })
} catch (error) {
  check('Package.json parsing', false, error.message)
}

console.log()

// Check test directories
console.log('🧪 Test Structure')
console.log('-----------------')

const testDirs = ['__tests__/unit', '__tests__/integration', '__tests__/e2e']

testDirs.forEach((dir) => {
  const exists = fs.existsSync(dir)
  let fileCount = 0
  if (exists) {
    try {
      const files = fs.readdirSync(dir, { recursive: true })
      fileCount = files.filter(
        (f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts')
      ).length
    } catch (e) {
      fileCount = 0
    }
  }
  check(`Test directory: ${dir}`, exists, `${fileCount} test files`)
})

console.log()

// Check Vercel configuration
console.log('⚡ Vercel Configuration')
console.log('----------------------')

try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))

  check(
    'Environment variables configured',
    vercelConfig.env && vercelConfig.env.NEXT_PUBLIC_SUPABASE_URL,
    'Supabase environment variables present'
  )

  check(
    'Security headers configured',
    vercelConfig.headers && vercelConfig.headers.length > 0,
    `${vercelConfig.headers?.[0]?.headers?.length || 0} security headers`
  )

  check(
    'Function timeouts configured',
    vercelConfig.functions,
    'API and app function timeouts set'
  )
} catch (error) {
  check('Vercel config parsing', false, error.message)
}

console.log()

// Check middleware configuration
console.log('🔐 Middleware Configuration')
console.log('---------------------------')

try {
  const middlewareContent = fs.readFileSync('middleware.ts', 'utf8')

  check(
    'Protected routes defined',
    middlewareContent.includes('protectedPaths'),
    'Protected paths array found'
  )

  check(
    'Auth redirect to validation',
    middlewareContent.includes('/validation'),
    'Redirect to validation dashboard configured'
  )

  check(
    'Supabase auth integration',
    middlewareContent.includes('supabase.auth.getUser'),
    'Supabase authentication check present'
  )
} catch (error) {
  check('Middleware parsing', false, error.message)
}

console.log()

// Check E2E test coverage
console.log('🎭 E2E Test Coverage')
console.log('--------------------')

try {
  const e2eContent = fs.readFileSync(
    '__tests__/e2e/validation-dashboard.spec.ts',
    'utf8'
  )

  const testCases = [
    'home page for unauthenticated users',
    'redirect to login when accessing protected route',
    'complete full authentication and validation dashboard flow',
    'handle authentication errors gracefully',
    'redirect authenticated users from auth pages',
    'display validation dashboard data correctly',
    'responsive on mobile devices',
  ]

  testCases.forEach((testCase) => {
    const exists = e2eContent.includes(testCase)
    check(`Test: ${testCase}`, exists)
  })
} catch (error) {
  check('E2E test parsing', false, error.message)
}

console.log()

// Summary
console.log('📊 Validation Summary')
console.log('=====================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(
  `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
)

if (failed === 0) {
  console.log('\n🎉 All checks passed! Ready for deployment.')
  process.exit(0)
} else {
  console.log(`\n⚠️  ${failed} issues found. Please resolve before deployment.`)
  process.exit(1)
}
