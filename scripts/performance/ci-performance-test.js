#!/usr/bin/env node

/**
 * CI/CD Performance Test Runner
 * Runs performance tests and enforces budgets in CI/CD pipeline
 */

const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  baseUrl: process.env.CI_BASE_URL || 'http://localhost:3000',
  lighthouseCI:
    process.env.LHCI_BUILD_CONTEXT__CURRENT_URL || 'http://localhost:3000',
  outputDir: '.performance-ci',
  artifactsDir: process.env.CI_ARTIFACTS_DIR || '.artifacts',
  isCI: process.env.CI === 'true',
  isPR: !!process.env.GITHUB_PR_NUMBER || !!process.env.CI_PULL_REQUEST,
  branch: process.env.GITHUB_REF_NAME || process.env.CI_BRANCH || 'main',
}

// Performance thresholds for CI
const CI_THRESHOLDS = {
  lighthouse: {
    performance: 75, // Minimum performance score
    accessibility: 90, // Minimum accessibility score
    'best-practices': 85,
    seo: 85,
  },
  webVitals: {
    LCP: 3000, // 3s max
    FID: 150, // 150ms max
    CLS: 0.15, // 0.15 max
    TTFB: 1000, // 1s max
    FCP: 2500, // 2.5s max
  },
  bundle: {
    totalSize: 5 * 1024 * 1024, // 5MB total
    jsSize: 2 * 1024 * 1024, // 2MB JS
    cssSize: 500 * 1024, // 500KB CSS
    initialBundle: 1 * 1024 * 1024, // 1MB initial
  },
}[
  // Ensure output directories exist
  (CONFIG.outputDir, CONFIG.artifactsDir)
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

/**
 * Start the development server
 */
async function startServer() {
  console.log('🚀 Starting development server...')

  return new Promise((resolve, reject) => {
    const server = spawn('pnpm', ['run', 'build'], {
      stdio: 'pipe',
      shell: true,
    })

    server.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(output)
      if (output.includes('✓ Ready')) {
        // Then start the server
        const prodServer = spawn('pnpm', ['run', 'start'], {
          stdio: 'pipe',
          shell: true,
          detached: false,
        })

        prodServer.stdout.on('data', (data) => {
          const output = data.toString()
          if (
            output.includes('ready on') ||
            output.includes('started server')
          ) {
            console.log('✅ Server is ready')
            resolve(prodServer)
          }
        })

        prodServer.stderr.on('data', (data) => {
          console.error('Server error:', data.toString())
        })
      }
    })

    server.on('error', reject)

    // Timeout after 3 minutes
    setTimeout(() => {
      reject(new Error('Server failed to start within 3 minutes'))
    }, 180000)
  })
}

/**
 * Run Lighthouse CI
 */
async function runLighthouseCI() {
  console.log('\n🔦 Running Lighthouse CI...')

  try {
    // Run Lighthouse CI
    execSync('npx lhci autorun', {
      stdio: 'inherit',
      env: {
        ...process.env,
        LHCI_BUILD_CONTEXT__CURRENT_URL: CONFIG.lighthouseCI,
      },
    })

    // Read Lighthouse results
    const manifestPath = path.join('.lighthouseci', 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const results = []

      for (const run of manifest) {
        const reportPath = path.join('.lighthouseci', run.jsonPath)
        if (fs.existsSync(reportPath)) {
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          results.push({
            url: run.url,
            scores: {
              performance: Math.round(
                report.categories.performance.score * 100
              ),
              accessibility: Math.round(
                report.categories.accessibility.score * 100
              ),
              'best-practices': Math.round(
                report.categories['best-practices'].score * 100
              ),
              seo: Math.round(report.categories.seo.score * 100),
            },
            metrics: {
              LCP: report.audits['largest-contentful-paint'].numericValue,
              FCP: report.audits['first-contentful-paint'].numericValue,
              CLS: report.audits['cumulative-layout-shift'].numericValue,
              TBT: report.audits['total-blocking-time'].numericValue,
              TTI: report.audits['interactive'].numericValue,
              SI: report.audits['speed-index'].numericValue,
            },
          })
        }
      }

      return results
    }

    return []
  } catch (error) {
    console.error('Lighthouse CI failed:', error.message)
    return []
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log('\n🧪 Running performance tests...')

  try {
    const output = execSync('pnpm test __tests__/performance --run', {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    // Parse test results
    const results = {
      passed: 0,
      failed: 0,
      duration: 0,
    }

    const lines = output.split('\n')
    lines.forEach((line) => {
      if (line.includes('passed')) {
        const match = line.match(/(\d+) passed/)
        if (match) results.passed = parseInt(match[1])
      }
      if (line.includes('failed')) {
        const match = line.match(/(\d+) failed/)
        if (match) results.failed = parseInt(match[1])
      }
      if (line.includes('Duration')) {
        const match = line.match(/Duration\s+(\d+\.?\d*)/)
        if (match) results.duration = parseFloat(match[1])
      }
    })

    return results
  } catch (error) {
    console.error('Performance tests failed:', error.message)
    return { passed: 0, failed: 1, duration: 0 }
  }
}

/**
 * Analyze bundle size
 */
async function analyzeBundleSize() {
  console.log('\n📦 Analyzing bundle size...')

  const nextDir = path.join(process.cwd(), '.next')
  const staticDir = path.join(nextDir, 'static')

  if (!fs.existsSync(nextDir)) {
    console.error('Build directory not found. Please build the project first.')
    return null
  }

  const stats = {
    total: 0,
    js: 0,
    css: 0,
    chunks: [],
  }

  // Analyze chunks
  function analyzeDir(dir, type = '') {
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir)
    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        analyzeDir(filePath, type)
      } else if (stat.isFile()) {
        const ext = path.extname(file)
        const size = stat.size

        stats.total += size

        if (['.js', '.mjs'].includes(ext)) {
          stats.js += size
          stats.chunks.push({ name: file, size, type: 'js' })
        } else if (ext === '.css') {
          stats.css += size
          stats.chunks.push({ name: file, size, type: 'css' })
        }
      }
    })
  }

  analyzeDir(staticDir)

  // Sort chunks by size
  stats.chunks.sort((a, b) => b.size - a.size)

  // Get top 10 largest chunks
  stats.topChunks = stats.chunks.slice(0, 10)

  return stats
}

/**
 * Check thresholds and generate report
 */
function checkThresholds(lighthouseResults, testResults, bundleStats) {
  const violations = []
  const warnings = []
  const passes = []

  // Check Lighthouse scores
  lighthouseResults.forEach((result) => {
    Object.entries(CI_THRESHOLDS.lighthouse).forEach(
      ([category, threshold]) => {
        const score = result.scores[category]
        if (score < threshold) {
          violations.push({
            type: 'lighthouse',
            category,
            url: result.url,
            actual: score,
            threshold,
            severity: score < threshold * 0.8 ? 'error' : 'warning',
          })
        } else {
          passes.push(`${category} score for ${result.url}: ${score}`)
        }
      }
    )

    // Check Web Vitals
    Object.entries(CI_THRESHOLDS.webVitals).forEach(([metric, threshold]) => {
      const value = result.metrics[metric]
      if (value && value > threshold) {
        violations.push({
          type: 'webvital',
          metric,
          url: result.url,
          actual: value,
          threshold,
          severity: value > threshold * 1.5 ? 'error' : 'warning',
        })
      }
    })
  })

  // Check bundle size
  if (bundleStats) {
    if (bundleStats.total > CI_THRESHOLDS.bundle.totalSize) {
      violations.push({
        type: 'bundle',
        metric: 'total',
        actual: bundleStats.total,
        threshold: CI_THRESHOLDS.bundle.totalSize,
        severity: 'warning',
      })
    }

    if (bundleStats.js > CI_THRESHOLDS.bundle.jsSize) {
      violations.push({
        type: 'bundle',
        metric: 'js',
        actual: bundleStats.js,
        threshold: CI_THRESHOLDS.bundle.jsSize,
        severity: 'warning',
      })
    }
  }

  // Check test results
  if (testResults.failed > 0) {
    violations.push({
      type: 'test',
      metric: 'failed tests',
      actual: testResults.failed,
      threshold: 0,
      severity: 'error',
    })
  }

  return { violations, warnings, passes }
}

/**
 * Generate markdown report for PR comments
 */
function generateMarkdownReport(
  lighthouseResults,
  testResults,
  bundleStats,
  thresholdResults
) {
  let markdown = '## 📊 Performance Report\n\n'

  // Summary
  const errorCount = thresholdResults.violations.filter(
    (v) => v.severity === 'error'
  ).length
  const warningCount = thresholdResults.violations.filter(
    (v) => v.severity === 'warning'
  ).length

  if (errorCount === 0 && warningCount === 0) {
    markdown += '✅ **All performance checks passed!**\n\n'
  } else {
    markdown += `⚠️ **Performance issues detected:** ${errorCount} errors, ${warningCount} warnings\n\n`
  }

  // Lighthouse scores
  if (lighthouseResults.length > 0) {
    markdown += '### 🔦 Lighthouse Scores\n\n'
    markdown +=
      '| Page | Performance | Accessibility | Best Practices | SEO |\n'
    markdown +=
      '|------|-------------|---------------|----------------|-----|\n'

    lighthouseResults.forEach((result) => {
      const url = result.url.replace(CONFIG.baseUrl, '')
      markdown += `| ${url} | ${getScoreEmoji(result.scores.performance)} ${result.scores.performance} | `
      markdown += `${getScoreEmoji(result.scores.accessibility)} ${result.scores.accessibility} | `
      markdown += `${getScoreEmoji(result.scores['best-practices'])} ${result.scores['best-practices']} | `
      markdown += `${getScoreEmoji(result.scores.seo)} ${result.scores.seo} |\n`
    })

    markdown += '\n'
  }

  // Web Vitals
  if (lighthouseResults.length > 0) {
    markdown += '### 🚀 Core Web Vitals\n\n'
    markdown += '| Metric | Value | Target | Status |\n'
    markdown += '|--------|-------|--------|--------|\n'

    const avgMetrics = calculateAverageMetrics(lighthouseResults)
    Object.entries(avgMetrics).forEach(([metric, value]) => {
      const threshold = CI_THRESHOLDS.webVitals[metric]
      if (threshold) {
        const status = value <= threshold ? '✅' : '❌'
        const formattedValue =
          metric === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`
        const formattedThreshold =
          metric === 'CLS' ? threshold.toFixed(2) : `${threshold}ms`
        markdown += `| ${metric} | ${formattedValue} | <${formattedThreshold} | ${status} |\n`
      }
    })

    markdown += '\n'
  }

  // Bundle size
  if (bundleStats) {
    markdown += '### 📦 Bundle Size\n\n'
    markdown += `- **Total:** ${formatBytes(bundleStats.total)} (limit: ${formatBytes(CI_THRESHOLDS.bundle.totalSize)})\n`
    markdown += `- **JavaScript:** ${formatBytes(bundleStats.js)} (limit: ${formatBytes(CI_THRESHOLDS.bundle.jsSize)})\n`
    markdown += `- **CSS:** ${formatBytes(bundleStats.css)} (limit: ${formatBytes(CI_THRESHOLDS.bundle.cssSize)})\n\n`

    if (bundleStats.topChunks.length > 0) {
      markdown += '**Largest chunks:**\n'
      bundleStats.topChunks.slice(0, 5).forEach((chunk) => {
        markdown += `- ${chunk.name}: ${formatBytes(chunk.size)}\n`
      })
      markdown += '\n'
    }
  }

  // Test results
  if (testResults) {
    markdown += '### 🧪 Performance Tests\n\n'
    markdown += `- **Passed:** ${testResults.passed}\n`
    markdown += `- **Failed:** ${testResults.failed}\n`
    markdown += `- **Duration:** ${testResults.duration}s\n\n`
  }

  // Violations
  if (thresholdResults.violations.length > 0) {
    markdown += '### ⚠️ Threshold Violations\n\n'
    thresholdResults.violations.forEach((violation) => {
      const emoji = violation.severity === 'error' ? '❌' : '⚠️'
      markdown += `${emoji} **${violation.type}:** ${violation.metric || violation.category}`
      if (violation.url) markdown += ` (${violation.url})`
      markdown += `\n  - Actual: ${formatValue(violation.actual, violation.type)}`
      markdown += `\n  - Threshold: ${formatValue(violation.threshold, violation.type)}\n\n`
    })
  }

  return markdown
}

// Helper functions
function getScoreEmoji(score) {
  if (score >= 90) return '🟢'
  if (score >= 50) return '🟡'
  return '🔴'
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function formatValue(value, type) {
  if (type === 'bundle') return formatBytes(value)
  if (type === 'webvital') {
    if (typeof value === 'number' && value < 10) return value.toFixed(3)
    return `${Math.round(value)}ms`
  }
  return value
}

function calculateAverageMetrics(results) {
  const metrics = {}
  const counts = {}

  results.forEach((result) => {
    Object.entries(result.metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        metrics[key] = (metrics[key] || 0) + value
        counts[key] = (counts[key] || 0) + 1
      }
    })
  })

  Object.keys(metrics).forEach((key) => {
    metrics[key] = metrics[key] / counts[key]
  })

  return metrics
}

/**
 * Main CI performance test runner
 */
async function runCIPerformanceTests() {
  console.log('🚀 Starting CI Performance Tests')
  console.log(`📍 Branch: ${CONFIG.branch}`)
  console.log(`📍 Is PR: ${CONFIG.isPR}`)
  console.log(`📍 Base URL: ${CONFIG.baseUrl}\n`)

  let server = null
  let exitCode = 0

  try {
    // Start server if not in CI (CI should already have server running)
    if (!CONFIG.isCI) {
      server = await startServer()
    }

    // Wait a bit for server to stabilize
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Run tests in parallel
    const [lighthouseResults, testResults, bundleStats] = await Promise.all([
      runLighthouseCI(),
      runPerformanceTests(),
      analyzeBundleSize(),
    ])

    // Check thresholds
    const thresholdResults = checkThresholds(
      lighthouseResults,
      testResults,
      bundleStats
    )

    // Generate report
    const markdownReport = generateMarkdownReport(
      lighthouseResults,
      testResults,
      bundleStats,
      thresholdResults
    )

    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportPath = path.join(
      CONFIG.artifactsDir,
      `performance-report-${timestamp}.md`
    )
    fs.writeFileSync(reportPath, markdownReport)

    const jsonReportPath = path.join(
      CONFIG.artifactsDir,
      `performance-report-${timestamp}.json`
    )
    fs.writeFileSync(
      jsonReportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          branch: CONFIG.branch,
          isPR: CONFIG.isPR,
          lighthouse: lighthouseResults,
          tests: testResults,
          bundle: bundleStats,
          violations: thresholdResults.violations,
        },
        null,
        2
      )
    )

    // Print report
    console.log('\n' + '='.repeat(70))
    console.log(markdownReport)
    console.log('='.repeat(70))

    // Output for CI systems
    if (CONFIG.isCI && CONFIG.isPR) {
      // GitHub Actions
      if (process.env.GITHUB_ACTIONS) {
        console.log(
          `::set-output name=report::${Buffer.from(markdownReport).toString('base64')}`
        )
      }

      // Save summary for GitHub Actions
      const summaryPath = process.env.GITHUB_STEP_SUMMARY
      if (summaryPath) {
        fs.appendFileSync(summaryPath, markdownReport)
      }
    }

    // Determine exit code
    const errors = thresholdResults.violations.filter(
      (v) => v.severity === 'error'
    )
    if (errors.length > 0) {
      console.error(`\n❌ Performance CI failed with ${errors.length} errors`)
      exitCode = 1
    } else if (thresholdResults.violations.length > 0) {
      console.warn(
        `\n⚠️ Performance CI passed with ${thresholdResults.violations.length} warnings`
      )
    } else {
      console.log('\n✅ All performance checks passed!')
    }
  } catch (error) {
    console.error('❌ CI Performance test failed:', error)
    exitCode = 1
  } finally {
    // Clean up server
    if (server) {
      console.log('\n🛑 Stopping server...')
      server.kill()
    }
  }

  process.exit(exitCode)
}

// Run if called directly
if (require.main === module) {
  runCIPerformanceTests()
}

module.exports = {
  runCIPerformanceTests,
  checkThresholds,
  generateMarkdownReport,
}
