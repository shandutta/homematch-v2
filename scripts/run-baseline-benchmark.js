#!/usr/bin/env node

/**
 * Run Baseline Performance Benchmark
 *
 * This script establishes baseline performance metrics for the application
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🚀 Running Baseline Performance Benchmark for HomeMatch v2')
console.log('='.repeat(60))

// Check if server is already running
function checkServerRunning() {
  return new Promise((resolve) => {
    const http = require('http')
    http
      .get('http://localhost:3000', (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 304)
      })
      .on('error', () => {
        resolve(false)
      })
  })
}

async function runBaseline() {
  const isRunning = await checkServerRunning()

  let devServer = null

  if (!isRunning) {
    console.log('📦 Building application...')

    // Build the application first
    try {
      require('child_process').execSync('pnpm run build', {
        stdio: 'inherit',
      })
    } catch (error) {
      console.error('❌ Build failed:', error.message)
      process.exit(1)
    }

    console.log('\n🚀 Starting production server...')

    // Start the production server
    devServer = spawn('pnpm', ['run', 'start'], {
      stdio: 'pipe',
      shell: true,
    })

    // Wait for server to be ready
    await new Promise((resolve) => {
      devServer.stdout.on('data', (data) => {
        const output = data.toString()
        if (output.includes('ready') || output.includes('started')) {
          console.log('✅ Server is ready')
          resolve()
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        console.log('⚠️ Server startup timeout, proceeding anyway...')
        resolve()
      }, 30000)
    })

    // Additional wait to ensure server is fully ready
    await new Promise((resolve) => setTimeout(resolve, 3000))
  } else {
    console.log('✅ Server is already running')
  }

  console.log('\n📊 Running performance benchmark...\n')

  // Run the benchmark
  const benchmark = spawn('node', ['scripts/performance-benchmark.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BENCHMARK_URL: 'http://localhost:3000',
      BENCHMARK_ITERATIONS: '5',
    },
  })

  benchmark.on('close', (code) => {
    if (devServer) {
      console.log('\n🛑 Stopping server...')
      devServer.kill()
    }

    if (code === 0) {
      console.log('\n✅ Baseline benchmark completed successfully!')

      // Save baseline timestamp
      const baselinePath = path.join(
        process.cwd(),
        '.performance-reports',
        'baseline.json'
      )
      if (fs.existsSync(baselinePath.replace('baseline.json', ''))) {
        const baseline = {
          timestamp: new Date().toISOString(),
          message: 'Baseline performance metrics established',
        }
        fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2))
      }
    } else {
      console.error('\n❌ Benchmark failed with exit code:', code)
      process.exit(code)
    }
  })
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n⚠️ Benchmark interrupted')
  process.exit(1)
})

// Run the baseline
runBaseline().catch((error) => {
  console.error('❌ Error running baseline:', error)
  process.exit(1)
})
