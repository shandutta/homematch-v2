/**
 * Nightly Full Test Runner
 * Runs Unit, Integration, and E2E tests and generates a report.
 * Intended to be run via Cron.
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(__dirname, '..', '.logs')
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const REPORT_FILE = path.join(LOG_DIR, 'nightly-test-report.txt')
const TIMESTAMP = new Date().toISOString()

function appendLog(message) {
  console.log(message)
  fs.appendFileSync(REPORT_FILE, message + '\n')
}

function runCommand(name, command, args) {
  appendLog(`\n--- Running ${name} ---`)
  const startTime = Date.now()

  const result = spawnSync(command, args, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      CI: 'true', // Force CI mode for headless E2E etc.
      FORCE_COLOR: '0', // Disable color for log file readability
    },
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  if (result.stdout) appendLog(result.stdout)
  if (result.stderr) appendLog(result.stderr)

  if (result.status === 0) {
    appendLog(`✅ ${name} PASSED in ${duration}s`)
    return true
  } else {
    appendLog(`❌ ${name} FAILED in ${duration}s (Exit Code: ${result.status})`)
    return false
  }
}

// Initialize Report
fs.writeFileSync(
  REPORT_FILE,
  `Nightly Test Report - ${TIMESTAMP}\n========================================\n`
)

let success = true

// 1. Unit Tests
if (!runCommand('Unit Tests', 'pnpm', ['test:unit'])) {
  success = false
}

// 2. Integration Tests
if (!runCommand('Integration Tests', 'pnpm', ['test:integration'])) {
  success = false
}

// 3. E2E Tests (using headless mode explicitly if needed, but CI=true usually suffices)
// We use the direct playwright wrapper via pnpm script
if (!runCommand('E2E Tests', 'pnpm', ['test:e2e'])) {
  success = false
}

appendLog(`\n========================================`)
appendLog(`Final Status: ${success ? 'ALL PASSED' : 'FAILURES DETECTED'}`)

// Exit with 0 so cron doesn't think the script itself crashed,
// unless you want cron to send an email on failure (which is default behavior).
// If we return non-zero, cron usually emails the output.
process.exit(success ? 0 : 1)
