#!/usr/bin/env node

/**
 * Performance Benchmark Runner
 * Comprehensive performance testing for HomeMatch v2
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const { performance } = require('perf_hooks')

// Performance budget configuration
const PERFORMANCE_BUDGETS = {
  homepage: {
    LCP: 2500, // 2.5s
    FID: 100, // 100ms
    CLS: 0.1, // 0.1 score
    TTFB: 600, // 600ms
    FCP: 1800, // 1.8s
    TTI: 3800, // 3.8s
    TBT: 300, // 300ms
    SI: 3400, // 3.4s Speed Index
  },
  dashboard: {
    LCP: 3000, // 3s (more complex)
    FID: 100, // 100ms
    CLS: 0.1, // 0.1 score
    TTFB: 800, // 800ms
    FCP: 2000, // 2s
    TTI: 4500, // 4.5s
    TBT: 400, // 400ms
    SI: 4000, // 4s Speed Index
  },
  couples: {
    LCP: 2800, // 2.8s
    FID: 100, // 100ms
    CLS: 0.15, // 0.15 score (animations)
    TTFB: 700, // 700ms
    FCP: 1900, // 1.9s
    TTI: 4000, // 4s
    TBT: 350, // 350ms
    SI: 3600, // 3.6s Speed Index
  },
  api: {
    'auth/login': { p50: 200, p95: 500, p99: 1000 },
    'properties/list': { p50: 300, p95: 800, p99: 1500 },
    'couples/mutual-likes': { p50: 250, p95: 600, p99: 1200 },
    'interactions/swipe': { p50: 150, p95: 400, p99: 800 },
  },
}

// Test configuration
const TEST_CONFIG = {
  url: process.env.PERF_TEST_URL || 'http://localhost:3000',
  iterations: parseInt(process.env.PERF_ITERATIONS || '3'),
  device: process.env.PERF_DEVICE || 'desktop',
  network: process.env.PERF_NETWORK || '3g-slow',
  outputDir: path.join(process.cwd(), '.performance'),
  routes: ['/', '/dashboard', '/couples', '/login', '/profile', '/settings'],
}

// Ensure output directory exists
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true })
}

/**
 * Run Lighthouse test for a specific URL
 */
async function runLighthouseTest(url, options = {}) {
  const { device = 'desktop', network = '3g-slow' } = options

  console.log(`🔍 Testing ${url} (${device}, ${network})...`)

  const lighthouseCmd = `npx lighthouse ${url} \
    --output=json \
    --output-path=${path.join(TEST_CONFIG.outputDir, 'lighthouse-temp.json')} \
    --preset=${device === 'mobile' ? 'perf' : 'desktop'} \
    --throttling-method=devtools \
    --chrome-flags="--headless --no-sandbox" \
    --quiet`

  try {
    execSync(lighthouseCmd, { stdio: 'pipe' })

    const reportPath = path.join(TEST_CONFIG.outputDir, 'lighthouse-temp.json')
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))

    const metrics = {
      url,
      device,
      network,
      timestamp: new Date().toISOString(),
      scores: {
        performance: report.categories.performance.score * 100,
        accessibility: report.categories.accessibility.score * 100,
        'best-practices': report.categories['best-practices'].score * 100,
        seo: report.categories.seo.score * 100,
      },
      metrics: {
        LCP: report.audits['largest-contentful-paint'].numericValue,
        FID: report.audits['max-potential-fid'].numericValue,
        CLS: report.audits['cumulative-layout-shift'].numericValue,
        TTFB: report.audits['server-response-time'].numericValue,
        FCP: report.audits['first-contentful-paint'].numericValue,
        TTI: report.audits['interactive'].numericValue,
        TBT: report.audits['total-blocking-time'].numericValue,
        SI: report.audits['speed-index'].numericValue,
      },
    }

    // Clean up temp file
    fs.unlinkSync(reportPath)

    return metrics
  } catch (error) {
    console.error(`❌ Lighthouse test failed: ${error.message}`)
    return null
  }
}

/**
 * Test API endpoint performance
 */
async function testAPIPerformance(endpoint, method = 'GET', body = null) {
  const url = new URL(endpoint, TEST_CONFIG.url)
  const timings = []

  console.log(`🔍 Testing API: ${method} ${endpoint}...`)

  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    const startTime = performance.now()

    try {
      // Use http or https based on protocol
      const protocol = url.protocol === 'https:' ? https : require('http')

      await new Promise((resolve, reject) => {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }

        const req = protocol.request(url, options, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve(data))
        })

        req.on('error', reject)
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('Request timeout'))
        })

        if (body) {
          req.write(JSON.stringify(body))
        }

        req.end()
      })

      const endTime = performance.now()
      timings.push(endTime - startTime)
    } catch (error) {
      console.error(`API test failed: ${error.message}`)
      timings.push(5000) // Timeout value
    }
  }

  // Calculate percentiles
  timings.sort((a, b) => a - b)
  const p50 = timings[Math.floor(timings.length * 0.5)]
  const p95 = timings[Math.floor(timings.length * 0.95)]
  const p99 =
    timings[Math.floor(timings.length * 0.99)] || timings[timings.length - 1]

  return {
    endpoint,
    method,
    samples: timings.length,
    timings: {
      min: Math.min(...timings),
      max: Math.max(...timings),
      mean: timings.reduce((a, b) => a + b) / timings.length,
      p50,
      p95,
      p99,
    },
  }
}

/**
 * Test component render performance
 */
async function testComponentPerformance() {
  console.log('🔍 Testing component render performance...')

  const componentTestCmd = `pnpm exec jest __tests__/performance --coverage=false --silent`

  try {
    const output = execSync(componentTestCmd, {
      stdio: 'pipe',
      encoding: 'utf8',
    })

    // Parse test output for performance metrics
    const lines = output.split('\n')
    const metrics = {}

    lines.forEach((line) => {
      if (line.includes('render time:')) {
        const match = line.match(/(\w+) render time: (\d+)ms/)
        if (match) {
          metrics[match[1]] = parseInt(match[2])
        }
      }
    })

    return metrics
  } catch (error) {
    console.error('Component performance tests failed:', error.message)
    return {}
  }
}

/**
 * Test bundle size
 */
async function testBundleSize() {
  console.log('🔍 Analyzing bundle size...')

  const buildDir = path.join(process.cwd(), '.next')
  const stats = {
    js: { total: 0, files: [] },
    css: { total: 0, files: [] },
    images: { total: 0, files: [] },
    total: 0,
  }

  function walkDir(dir, type) {
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir)
    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        walkDir(filePath, type)
      } else if (stat.isFile()) {
        const size = stat.size
        const ext = path.extname(file)

        if (['.js', '.mjs'].includes(ext)) {
          stats.js.total += size
          stats.js.files.push({ name: file, size })
        } else if (['.css'].includes(ext)) {
          stats.css.total += size
          stats.css.files.push({ name: file, size })
        } else if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
          stats.images.total += size
          stats.images.files.push({ name: file, size })
        }

        stats.total += size
      }
    })
  }

  walkDir(buildDir)

  // Sort files by size
  stats.js.files.sort((a, b) => b.size - a.size)
  stats.css.files.sort((a, b) => b.size - a.size)
  stats.images.files.sort((a, b) => b.size - a.size)

  return stats
}

/**
 * Check if performance budgets are met
 */
function checkBudgets(metrics, budgets) {
  const violations = []

  for (const [metric, budget] of Object.entries(budgets)) {
    if (metrics[metric] && metrics[metric] > budget) {
      violations.push({
        metric,
        actual: metrics[metric],
        budget,
        exceeded: (((metrics[metric] - budget) / budget) * 100).toFixed(1),
      })
    }
  }

  return violations
}

/**
 * Generate performance report
 */
function generateReport(results) {
  const timestamp = new Date().toISOString()
  const reportPath = path.join(
    TEST_CONFIG.outputDir,
    `performance-report-${Date.now()}.json`
  )

  const report = {
    timestamp,
    config: TEST_CONFIG,
    results,
    summary: {
      passed: [],
      failed: [],
      warnings: [],
    },
  }

  // Check budgets for each route
  results.lighthouse?.forEach((test) => {
    const routeName = new URL(test.url).pathname.slice(1) || 'homepage'
    const budgets =
      PERFORMANCE_BUDGETS[routeName] || PERFORMANCE_BUDGETS.homepage
    const violations = checkBudgets(test.metrics, budgets)

    if (violations.length === 0) {
      report.summary.passed.push(`✅ ${test.url} - All metrics within budget`)
    } else {
      violations.forEach((v) => {
        if (parseFloat(v.exceeded) > 50) {
          report.summary.failed.push(
            `❌ ${test.url} - ${v.metric}: ${v.actual}ms (budget: ${v.budget}ms, +${v.exceeded}%)`
          )
        } else {
          report.summary.warnings.push(
            `⚠️ ${test.url} - ${v.metric}: ${v.actual}ms (budget: ${v.budget}ms, +${v.exceeded}%)`
          )
        }
      })
    }
  })

  // Save report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE BENCHMARK RESULTS')
  console.log('='.repeat(60))

  if (report.summary.passed.length > 0) {
    console.log('\n✅ PASSED:')
    report.summary.passed.forEach((msg) => console.log('  ' + msg))
  }

  if (report.summary.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:')
    report.summary.warnings.forEach((msg) => console.log('  ' + msg))
  }

  if (report.summary.failed.length > 0) {
    console.log('\n❌ FAILED:')
    report.summary.failed.forEach((msg) => console.log('  ' + msg))
  }

  console.log('\n📁 Full report saved to:', reportPath)
  console.log('='.repeat(60))

  // Return exit code based on failures
  return report.summary.failed.length > 0 ? 1 : 0
}

/**
 * Main benchmark runner
 */
async function runBenchmarks() {
  console.log('🚀 Starting HomeMatch Performance Benchmarks')
  console.log(`📍 Testing ${TEST_CONFIG.url}`)
  console.log(`🔄 Running ${TEST_CONFIG.iterations} iterations per test\n`)

  const results = {
    lighthouse: [],
    api: [],
    components: {},
    bundle: {},
  }

  // Ensure the app is running
  console.log('⏳ Ensuring application is ready...')
  try {
    await testAPIPerformance('/api/health')
  } catch {
    console.error(
      '❌ Application is not running. Please start the server first.'
    )
    process.exit(1)
  }

  // Run Lighthouse tests for each route
  console.log('\n📱 Running Lighthouse tests...')
  for (const route of TEST_CONFIG.routes) {
    const url = new URL(route, TEST_CONFIG.url).toString()
    const metrics = await runLighthouseTest(url, {
      device: TEST_CONFIG.device,
      network: TEST_CONFIG.network,
    })

    if (metrics) {
      results.lighthouse.push(metrics)
    }
  }

  // Test API endpoints
  console.log('\n🔌 Testing API performance...')
  const apiEndpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/properties/marketing', method: 'GET' },
    { path: '/api/couples/mutual-likes', method: 'GET' },
    { path: '/api/couples/activity', method: 'GET' },
  ]

  for (const endpoint of apiEndpoints) {
    const metrics = await testAPIPerformance(endpoint.path, endpoint.method)
    if (metrics) {
      results.api.push(metrics)
    }
  }

  // Test component performance
  console.log('\n🧩 Testing component performance...')
  results.components = await testComponentPerformance()

  // Analyze bundle size
  console.log('\n📦 Analyzing bundle size...')
  results.bundle = await testBundleSize()

  // Generate and save report
  const exitCode = generateReport(results)

  // Exit with appropriate code
  process.exit(exitCode)
}

// Run benchmarks if called directly
if (require.main === module) {
  runBenchmarks().catch((error) => {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runLighthouseTest,
  testAPIPerformance,
  testComponentPerformance,
  testBundleSize,
  checkBudgets,
  PERFORMANCE_BUDGETS,
}
