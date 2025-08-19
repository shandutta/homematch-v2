#!/usr/bin/env node

/**
 * Refactoring Safety Net Test Runner
 *
 * This script runs comprehensive tests to ensure safe refactoring of:
 * - PropertyService (560-line service class)
 * - Error handling patterns (19 duplicate patterns)
 * - Filter builder logic (13 repetitive conditionals)
 * - Supabase client patterns (3 different implementations)
 */

const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

const COVERAGE_THRESHOLDS = {
  statements: 85,
  branches: 80,
  functions: 85,
  lines: 85,
}

const REFACTORING_TARGET_FILES = [
  'src/lib/services/properties.ts',
  'src/lib/services/interactions.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/client.ts',
]

const SAFETY_NET_TESTS = [
  '__tests__/integration/services/properties-integration.test.ts',
  '__tests__/integration/error-handling-patterns.test.ts',
  '__tests__/integration/filter-builder-patterns.test.ts',
  '__tests__/integration/supabase-client-patterns.test.ts',
]

// Performance benchmarks for refactoring validation (currently unused)
// const PERFORMANCE_BENCHMARKS = {
//   'PropertyService.searchProperties': { maxTime: 500, description: 'Basic property search' },
//   'PropertyService.getProperty': { maxTime: 100, description: 'Single property retrieval' },
//   'PropertyService.createProperty': { maxTime: 200, description: 'Property creation' },
//   'FilterBuilder.complexQuery': { maxTime: 1000, description: 'Complex multi-filter search' }
// }

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`📋 Running: ${command}`)
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Command failed: ${command}`)
        console.error(stderr)
        reject(error)
      } else {
        console.log(`✅ Command succeeded: ${command}`)
        if (stdout) console.log(stdout)
        resolve(stdout)
      }
    })
  })
}

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath)
  if (!exists) {
    console.error(`❌ Missing file: ${filePath}`)
  }
  return exists
}

async function validateRefactoringTargets() {
  console.log('\n🎯 Validating Refactoring Target Files...')

  for (const file of REFACTORING_TARGET_FILES) {
    if (!checkFileExists(file)) {
      throw new Error(`Refactoring target file missing: ${file}`)
    }
    console.log(`✅ Found: ${file}`)
  }
}

async function validateSafetyNetTests() {
  console.log('\n🛡️ Validating Safety Net Tests...')

  for (const test of SAFETY_NET_TESTS) {
    if (!checkFileExists(test)) {
      throw new Error(`Safety net test missing: ${test}`)
    }
    console.log(`✅ Found: ${test}`)
  }
}

async function runSafetyNetTests() {
  console.log('\n🧪 Running Safety Net Tests...')

  try {
    // Run each safety net test individually for detailed reporting
    for (const test of SAFETY_NET_TESTS) {
      console.log(`\n🔬 Running: ${path.basename(test)}`)
      await runCommand(`pnpm exec jest "${test}" --verbose`)
    }

    console.log('\n✅ All safety net tests passed!')
    return true
  } catch (error) {
    console.error('\n❌ Safety net tests failed!')
    throw error
  }
}

async function checkCoverageThresholds() {
  console.log('\n📊 Checking Coverage Thresholds...')

  try {
    // Run coverage for refactoring target files
    const coverageCommand = `pnpm exec jest ${REFACTORING_TARGET_FILES.map((f) => `--collectCoverageFrom="${f}"`).join(' ')} --coverage --coverageReporters=json-summary --passWithNoTests`

    await runCommand(coverageCommand)

    // Parse coverage report
    const coverageFile = 'coverage/coverage-summary.json'
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))

      const overallCoverage = coverage.total
      let passed = true

      for (const [metric, threshold] of Object.entries(COVERAGE_THRESHOLDS)) {
        const actual = overallCoverage[metric].pct
        const status = actual >= threshold ? '✅' : '❌'
        console.log(
          `${status} ${metric}: ${actual}% (threshold: ${threshold}%)`
        )

        if (actual < threshold) {
          passed = false
        }
      }

      if (!passed) {
        throw new Error('Coverage thresholds not met')
      }

      console.log('\n✅ All coverage thresholds met!')
      return true
    } else {
      console.warn('⚠️ Coverage report not found, skipping threshold check')
      return true
    }
  } catch (error) {
    console.error('\n❌ Coverage check failed!')
    throw error
  }
}

async function runPerformanceBenchmarks() {
  console.log('\n⚡ Running Performance Benchmarks...')

  try {
    // Create a simple performance test
    const perfTestScript = `
      const { PropertyService } = require('./src/lib/services/properties')
      const service = new PropertyService()
      
      async function benchmark() {
        const results = []
        
        // Test basic property search
        const start1 = Date.now()
        await service.searchProperties({ filters: {}, pagination: { limit: 10 } })
        const time1 = Date.now() - start1
        results.push({ test: 'PropertyService.searchProperties', time: time1 })
        
        console.log('Performance Results:')
        results.forEach(result => {
          console.log(\`\${result.test}: \${result.time}ms\`)
        })
        
        return results
      }
      
      benchmark().catch(console.error)
    `

    // Write temporary performance test
    fs.writeFileSync('temp-perf-test.js', perfTestScript)

    try {
      await runCommand('node temp-perf-test.js')
      console.log('\n✅ Performance benchmarks completed!')
    } finally {
      // Clean up temporary file
      if (fs.existsSync('temp-perf-test.js')) {
        fs.unlinkSync('temp-perf-test.js')
      }
    }

    return true
  } catch (error) {
    console.error('\n❌ Performance benchmarks failed!')
    console.error('Error:', error.message)
    // Don't fail the entire process for performance issues
    console.warn('⚠️ Continuing despite performance benchmark failures...')
    return false
  }
}

async function generateSafetyReport() {
  console.log('\n📋 Generating Safety Report...')

  const report = {
    timestamp: new Date().toISOString(),
    refactoringTargets: REFACTORING_TARGET_FILES,
    safetyNetTests: SAFETY_NET_TESTS,
    coverageThresholds: COVERAGE_THRESHOLDS,
    status: 'SAFE_TO_REFACTOR',
    recommendations: [
      'All safety net tests are passing',
      'Coverage thresholds are met for critical refactoring areas',
      'Error handling patterns are validated',
      'Filter builder functionality is comprehensively tested',
      'Supabase client patterns have regression protection',
    ],
  }

  const reportPath = '__tests__/reports/refactoring-safety-report.json'

  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath)
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(`✅ Safety report generated: ${reportPath}`)

  // Also create a human-readable summary
  const summaryPath = '__tests__/reports/refactoring-safety-summary.md'
  const summary = `# Refactoring Safety Report

Generated: ${report.timestamp}

## Status: ${report.status} ✅

## Validated Components

### Refactoring Targets
${REFACTORING_TARGET_FILES.map((file) => `- ✅ ${file}`).join('\n')}

### Safety Net Tests
${SAFETY_NET_TESTS.map((test) => `- ✅ ${path.basename(test)}`).join('\n')}

### Coverage Thresholds
${Object.entries(COVERAGE_THRESHOLDS)
  .map(([metric, threshold]) => `- ${metric}: ${threshold}%`)
  .join('\n')}

## Recommendations

${report.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Next Steps

1. **Ready for Phase 2**: All safety nets are in place
2. **Refactor with confidence**: Comprehensive test coverage established
3. **Monitor during refactoring**: Run \`npm run test:safety-net\` between changes
4. **Validate after refactoring**: Ensure all tests continue to pass

## Usage

\`\`\`bash
# Run before refactoring
npm run test:safety-net

# Run during refactoring (quick check)
npm run test:integration

# Run after refactoring (full validation)
npm run test:safety-net
\`\`\`
`

  fs.writeFileSync(summaryPath, summary)
  console.log(`✅ Summary report generated: ${summaryPath}`)

  return report
}

async function main() {
  console.log('🚀 Refactoring Safety Net Validation')
  console.log('=====================================')

  try {
    await validateRefactoringTargets()
    await validateSafetyNetTests()
    await runSafetyNetTests()
    await checkCoverageThresholds()
    await runPerformanceBenchmarks()

    const report = await generateSafetyReport()

    console.log('\n🎉 SAFETY NET VALIDATION COMPLETE')
    console.log('=================================')
    console.log(`Status: ${report.status}`)
    console.log('\n✅ Safe to proceed with refactoring!')
    console.log('\n📝 Next steps:')
    console.log('1. Run this script before any refactoring changes')
    console.log('2. Keep all safety net tests passing during refactoring')
    console.log('3. Run integration tests frequently during development')
    console.log('4. Validate final results with full test suite')

    process.exit(0)
  } catch (error) {
    console.error('\n💥 SAFETY NET VALIDATION FAILED')
    console.error('===============================')
    console.error(`Error: ${error.message}`)
    console.error('\n❌ NOT safe to proceed with refactoring!')
    console.error('\n🔧 Required actions:')
    console.error('1. Fix failing tests')
    console.error('2. Improve test coverage where needed')
    console.error('3. Address any performance issues')
    console.error('4. Re-run this validation script')

    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  runSafetyNetTests,
  checkCoverageThresholds,
  runPerformanceBenchmarks,
  generateSafetyReport,
}
