#!/usr/bin/env node

/**
 * Automated Performance Benchmark Runner
 *
 * Runs comprehensive performance tests and generates reports
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Configuration
const CONFIG = {
  baseUrl: process.env.BENCHMARK_URL || 'http://localhost:3000',
  outputDir: path.join(process.cwd(), '.performance-reports'),
  iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '5'),
  warmupIterations: 2,
  routes: [
    { path: '/', name: 'Homepage' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/properties', name: 'Properties' },
    { path: '/couples', name: 'Couples' },
    { path: '/profile', name: 'Profile' },
    { path: '/settings', name: 'Settings' },
  ],
  apiEndpoints: [
    { path: '/api/health', method: 'GET', name: 'Health Check' },
    {
      path: '/api/properties/marketing',
      method: 'GET',
      name: 'Marketing Properties',
    },
    { path: '/api/couples/mutual-likes', method: 'GET', name: 'Mutual Likes' },
    { path: '/api/couples/activity', method: 'GET', name: 'Couples Activity' },
    {
      path: '/api/performance/metrics',
      method: 'GET',
      name: 'Performance Metrics',
    },
  ],
  devices: ['desktop', 'mobile'],
  networkConditions: {
    '4g': {
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 40,
    },
    '3g': {
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    },
    'slow-3g': {
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
      latency: 400,
    },
  },
}

// Performance budgets
const BUDGETS = {
  Homepage: {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 600,
    SpeedIndex: 3400,
    TBT: 300,
    TTI: 3800,
  },
  Dashboard: {
    LCP: 3000,
    FID: 100,
    CLS: 0.1,
    FCP: 2000,
    TTFB: 800,
    SpeedIndex: 4000,
    TBT: 400,
    TTI: 4500,
  },
  default: {
    LCP: 2800,
    FID: 100,
    CLS: 0.15,
    FCP: 1900,
    TTFB: 700,
    SpeedIndex: 3600,
    TBT: 350,
    TTI: 4000,
  },
}

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true })
}

/**
 * Check if the application is running
 */
async function checkAppRunning() {
  return new Promise((resolve) => {
    const url = new URL(CONFIG.baseUrl)
    const protocol = url.protocol === 'https:' ? https : http

    const req = protocol.get(CONFIG.baseUrl, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304)
    })

    req.on('error', () => resolve(false))
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * Run Lighthouse benchmark
 */
function runLighthouse(url, device = 'desktop', network = '4g') {
  console.log(`  📊 Testing ${url} (${device}, ${network})...`)

  const outputPath = path.join(
    CONFIG.outputDir,
    `lighthouse-${Date.now()}.json`
  )

  try {
    const cmd = `npx lighthouse "${url}" \
      --output=json \
      --output-path="${outputPath}" \
      --preset=${device === 'mobile' ? 'perf' : 'desktop'} \
      --throttling-method=simulate \
      --chrome-flags="--headless --no-sandbox --disable-gpu" \
      --quiet \
      --no-enable-error-reporting`

    execSync(cmd, { stdio: 'pipe', encoding: 'utf8' })

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    fs.unlinkSync(outputPath) // Clean up temp file

    return {
      scores: {
        performance: Math.round(report.categories.performance.score * 100),
        accessibility: Math.round(report.categories.accessibility.score * 100),
        bestPractices: Math.round(
          report.categories['best-practices'].score * 100
        ),
        seo: Math.round(report.categories.seo.score * 100),
      },
      metrics: {
        LCP: report.audits['largest-contentful-paint'].numericValue,
        FID: report.audits['max-potential-fid'].numericValue,
        CLS: report.audits['cumulative-layout-shift'].numericValue,
        FCP: report.audits['first-contentful-paint'].numericValue,
        TTFB: report.audits['server-response-time']?.numericValue || 0,
        SpeedIndex: report.audits['speed-index'].numericValue,
        TBT: report.audits['total-blocking-time'].numericValue,
        TTI: report.audits['interactive'].numericValue,
      },
      opportunities: report.audits['performance-budget']?.details?.items || [],
    }
  } catch (error) {
    console.error(`    ❌ Lighthouse failed: ${error.message}`)
    return null
  }
}

/**
 * Test API endpoint performance
 */
async function testApiEndpoint(endpoint) {
  const url = new URL(endpoint.path, CONFIG.baseUrl)
  const timings = []

  for (let i = 0; i < CONFIG.iterations + CONFIG.warmupIterations; i++) {
    const isWarmup = i < CONFIG.warmupIterations
    const startTime = Date.now()

    try {
      await new Promise((resolve, reject) => {
        const protocol = url.protocol === 'https:' ? https : http

        const req = protocol.request(
          url.href,
          { method: endpoint.method },
          (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => resolve(data))
          }
        )

        req.on('error', reject)
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('Timeout'))
        })

        req.end()
      })

      const duration = Date.now() - startTime
      if (!isWarmup) {
        timings.push(duration)
      }
    } catch {
      if (!isWarmup) {
        timings.push(5000) // Timeout value
      }
    }
  }

  timings.sort((a, b) => a - b)

  return {
    endpoint: endpoint.path,
    method: endpoint.method,
    name: endpoint.name,
    samples: timings.length,
    metrics: {
      min: Math.min(...timings),
      max: Math.max(...timings),
      mean: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
      median: timings[Math.floor(timings.length / 2)],
      p75: timings[Math.floor(timings.length * 0.75)],
      p95: timings[Math.floor(timings.length * 0.95)],
      p99:
        timings[Math.floor(timings.length * 0.99)] ||
        timings[timings.length - 1],
    },
  }
}

/**
 * Analyze bundle size
 */
function analyzeBundleSize() {
  const buildDir = path.join(process.cwd(), '.next')

  if (!fs.existsSync(buildDir)) {
    console.log('  ⚠️ Build directory not found. Run "pnpm build" first.')
    return null
  }

  const stats = {
    js: { total: 0, files: [] },
    css: { total: 0, files: [] },
    total: 0,
  }

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return

    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        walkDir(fullPath)
      } else if (stat.isFile()) {
        const ext = path.extname(item)
        const size = stat.size

        if (['.js', '.mjs'].includes(ext)) {
          stats.js.total += size
          stats.js.files.push({ name: item, size })
        } else if (ext === '.css') {
          stats.css.total += size
          stats.css.files.push({ name: item, size })
        }

        stats.total += size
      }
    }
  }

  walkDir(path.join(buildDir, 'static'))

  // Sort files by size
  stats.js.files.sort((a, b) => b.size - a.size)
  stats.css.files.sort((a, b) => b.size - a.size)

  // Keep only top 5 largest files
  stats.js.files = stats.js.files.slice(0, 5)
  stats.css.files = stats.css.files.slice(0, 5)

  return stats
}

/**
 * Check performance budget violations
 */
function checkBudgets(routeName, metrics) {
  const budget = BUDGETS[routeName] || BUDGETS.default
  const violations = []

  for (const [metric, limit] of Object.entries(budget)) {
    const value = metrics[metric]
    if (value && value > limit) {
      const percentOver = (((value - limit) / limit) * 100).toFixed(1)
      violations.push({
        metric,
        value,
        limit,
        percentOver,
        severity:
          percentOver > 50 ? 'high' : percentOver > 20 ? 'medium' : 'low',
      })
    }
  }

  return violations
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results) {
  const timestamp = new Date().toISOString()
  const reportPath = path.join(CONFIG.outputDir, `benchmark-${Date.now()}.html`)

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Benchmark Report - ${timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #4CAF50; }
    .metric-card.warning { border-left-color: #FFC107; }
    .metric-card.error { border-left-color: #F44336; }
    .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
    .metric-label { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .good { color: #4CAF50; }
    .warning { color: #FFC107; }
    .poor { color: #F44336; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge.good { background: #E8F5E9; color: #2E7D32; }
    .badge.warning { background: #FFF3E0; color: #F57C00; }
    .badge.poor { background: #FFEBEE; color: #C62828; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Performance Benchmark Report</h1>
    <p><strong>Generated:</strong> ${timestamp}</p>
    <p><strong>URL:</strong> ${CONFIG.baseUrl}</p>
    <p><strong>Iterations:</strong> ${CONFIG.iterations}</p>
`

  // Summary section
  const totalViolations = results.lighthouse.reduce(
    (sum, r) => sum + r.violations.length,
    0
  )
  const avgPerformanceScore = Math.round(
    results.lighthouse.reduce((sum, r) => sum + r.scores.performance, 0) /
      results.lighthouse.length
  )

  html += `
    <h2>📊 Summary</h2>
    <div class="summary">
      <div class="metric-card ${avgPerformanceScore < 75 ? 'error' : avgPerformanceScore < 90 ? 'warning' : ''}">
        <div class="metric-label">Average Performance Score</div>
        <div class="metric-value">${avgPerformanceScore}/100</div>
      </div>
      <div class="metric-card ${totalViolations > 10 ? 'error' : totalViolations > 5 ? 'warning' : ''}">
        <div class="metric-label">Budget Violations</div>
        <div class="metric-value">${totalViolations}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Routes Tested</div>
        <div class="metric-value">${results.lighthouse.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">API Endpoints Tested</div>
        <div class="metric-value">${results.api.length}</div>
      </div>
    </div>
`

  // Lighthouse results
  html +=
    '<h2>🌐 Page Performance</h2><table><thead><tr><th>Route</th><th>Performance</th><th>LCP</th><th>FID</th><th>CLS</th><th>FCP</th><th>Violations</th></tr></thead><tbody>'

  for (const result of results.lighthouse) {
    const perfClass =
      result.scores.performance >= 90
        ? 'good'
        : result.scores.performance >= 50
          ? 'warning'
          : 'poor'

    html += `
      <tr>
        <td>${result.routeName}</td>
        <td class="${perfClass}">${result.scores.performance}%</td>
        <td>${Math.round(result.metrics.LCP)}ms</td>
        <td>${Math.round(result.metrics.FID)}ms</td>
        <td>${result.metrics.CLS.toFixed(3)}</td>
        <td>${Math.round(result.metrics.FCP)}ms</td>
        <td>${result.violations.length > 0 ? `<span class="badge poor">${result.violations.length}</span>` : '<span class="badge good">✓</span>'}</td>
      </tr>
    `
  }

  html += '</tbody></table>'

  // API performance
  html +=
    '<h2>🔌 API Performance</h2><table><thead><tr><th>Endpoint</th><th>Method</th><th>Median</th><th>P95</th><th>P99</th><th>Max</th></tr></thead><tbody>'

  for (const result of results.api) {
    const medianClass =
      result.metrics.median < 200
        ? 'good'
        : result.metrics.median < 500
          ? 'warning'
          : 'poor'

    html += `
      <tr>
        <td>${result.name}</td>
        <td>${result.method}</td>
        <td class="${medianClass}">${result.metrics.median}ms</td>
        <td>${result.metrics.p95}ms</td>
        <td>${result.metrics.p99}ms</td>
        <td>${result.metrics.max}ms</td>
      </tr>
    `
  }

  html += '</tbody></table>'

  // Bundle size
  if (results.bundleSize) {
    html += `
      <h2>📦 Bundle Size</h2>
      <div class="summary">
        <div class="metric-card">
          <div class="metric-label">Total JS</div>
          <div class="metric-value">${(results.bundleSize.js.total / 1024).toFixed(1)} KB</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total CSS</div>
          <div class="metric-value">${(results.bundleSize.css.total / 1024).toFixed(1)} KB</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Size</div>
          <div class="metric-value">${(results.bundleSize.total / 1024).toFixed(1)} KB</div>
        </div>
      </div>
    `
  }

  html += '</div></body></html>'

  fs.writeFileSync(reportPath, html)
  return reportPath
}

/**
 * Main benchmark runner
 */
async function runBenchmark() {
  console.log('🚀 HomeMatch Performance Benchmark')
  console.log('='.repeat(50))

  // Check if app is running
  console.log('\n📡 Checking application status...')
  const isRunning = await checkAppRunning()

  if (!isRunning) {
    console.error('❌ Application is not running at', CONFIG.baseUrl)
    console.log('💡 Start the application with: pnpm run dev')
    process.exit(1)
  }

  console.log('✅ Application is running\n')

  const results = {
    lighthouse: [],
    api: [],
    bundleSize: null,
    timestamp: new Date().toISOString(),
  }

  // Run Lighthouse tests
  console.log('🌐 Running Lighthouse benchmarks...')
  for (const route of CONFIG.routes) {
    const url = new URL(route.path, CONFIG.baseUrl).toString()
    const lighthouseResult = runLighthouse(url, 'desktop', '4g')

    if (lighthouseResult) {
      const violations = checkBudgets(route.name, lighthouseResult.metrics)
      results.lighthouse.push({
        ...lighthouseResult,
        routeName: route.name,
        path: route.path,
        violations,
      })
    }
  }

  // Test API endpoints
  console.log('\n🔌 Testing API endpoints...')
  for (const endpoint of CONFIG.apiEndpoints) {
    console.log(`  📊 Testing ${endpoint.name}...`)
    const apiResult = await testApiEndpoint(endpoint)
    results.api.push(apiResult)
  }

  // Analyze bundle size
  console.log('\n📦 Analyzing bundle size...')
  results.bundleSize = analyzeBundleSize()

  // Generate reports
  console.log('\n📄 Generating reports...')

  // Save JSON report
  const jsonPath = path.join(CONFIG.outputDir, `benchmark-${Date.now()}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2))
  console.log('  ✅ JSON report:', jsonPath)

  // Generate HTML report
  const htmlPath = generateHtmlReport(results)
  console.log('  ✅ HTML report:', htmlPath)

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 BENCHMARK COMPLETE')
  console.log('='.repeat(50))

  const totalViolations = results.lighthouse.reduce(
    (sum, r) => sum + r.violations.length,
    0
  )

  if (totalViolations === 0) {
    console.log('✅ All performance budgets met!')
  } else {
    console.log(`⚠️ Found ${totalViolations} budget violations`)

    for (const result of results.lighthouse) {
      if (result.violations.length > 0) {
        console.log(`\n  ${result.routeName}:`)
        for (const violation of result.violations) {
          const icon =
            violation.severity === 'high'
              ? '❌'
              : violation.severity === 'medium'
                ? '⚠️'
                : '📊'
          console.log(
            `    ${icon} ${violation.metric}: ${Math.round(violation.value)}ms (limit: ${violation.limit}ms, +${violation.percentOver}%)`
          )
        }
      }
    }
  }

  console.log(`\n📁 Reports saved to: ${CONFIG.outputDir}`)

  // Exit with error if there are critical violations
  const criticalViolations = results.lighthouse.some((r) =>
    r.violations.some((v) => v.severity === 'high')
  )

  process.exit(criticalViolations ? 1 : 0)
}

// Run the benchmark
runBenchmark().catch((error) => {
  console.error('❌ Benchmark failed:', error)
  process.exit(1)
})
