/**
 * Nightly Full Test Runner
 * Runs Unit, Integration, and E2E tests and generates a report.
 * Intended to be run via Cron.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(__dirname, '..', '.logs')
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const REPORT_FILE = path.join(LOG_DIR, 'nightly-test-report.txt')
const TIMESTAMP = new Date().toISOString()

const echoRawOutput = Boolean(
  process.env.NIGHTLY_FULL_TEST_ECHO === '1' || process.stdout.isTTY
)

const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function appendToReport(message) {
  // Write exactly what is received to file to preserve partial lines/progress bars
  fs.appendFileSync(REPORT_FILE, message)
}

function appendToConsole(message) {
  process.stdout.write(message)
}

function logLine(message) {
  const line = message.endsWith('\n') ? message : `${message}\n`
  appendToReport(line)
  appendToConsole(line)
}

function runCommand(name, command, args) {
  return new Promise((resolve) => {
    const header = `\n--- Running ${name} ---\n`
    appendToReport(header)
    appendToConsole(header)
    const startTime = Date.now()

    const child = spawn(command, args, {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        CI: 'true', // Force CI mode for headless E2E etc.
        FORCE_COLOR: '0', // Disable color for log file readability
      },
    })

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (data) => {
      appendToReport(data)
      if (echoRawOutput) appendToConsole(data)
    })

    child.stderr.on('data', (data) => {
      appendToReport(data)
      if (echoRawOutput) appendToConsole(data)
    })

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      if (code === 0) {
        logLine(`✅ ${name} PASSED in ${duration}s`)
        resolve(true)
      } else {
        logLine(`❌ ${name} FAILED in ${duration}s (Exit Code: ${code})`)
        resolve(false)
      }
    })

    child.on('error', (err) => {
      logLine(`❌ ${name} FAILED to start: ${err.message}`)
      resolve(false)
    })
  })
}

;(async () => {
  // Initialize Report
  fs.writeFileSync(
    REPORT_FILE,
    `Nightly Test Report - ${TIMESTAMP}\n========================================\n`
  )
  if (!echoRawOutput) {
    logLine(`[nightly-full-test] Writing full output to ${REPORT_FILE}`)
  }

  let success = true

  // 1. Unit Tests
  if (!(await runCommand('Unit Tests', pnpmCmd, ['test:unit']))) {
    success = false
  }

  // 2. Integration Tests
  if (!(await runCommand('Integration Tests', pnpmCmd, ['test:integration']))) {
    success = false
  }

  // 3. E2E Tests (using headless mode explicitly if needed, but CI=true usually suffices)
  // We use the direct playwright wrapper via pnpm script
  if (!(await runCommand('E2E Tests', pnpmCmd, ['test:e2e']))) {
    success = false
  }

  appendToReport(`\n========================================\n`)
  logLine(`Final Status: ${success ? 'ALL PASSED' : 'FAILURES DETECTED'}`)

  // Exit with 0 so cron doesn't think the script itself crashed,
  // unless you want cron to send an email on failure (which is default behavior).
  // If we return non-zero, cron usually emails the output.
  const exitCode = success ? 0 : 1
  logLine(
    `[nightly-full-test] EXIT_CODE=${exitCode} STATUS=${success ? 'success' : 'error'}`
  )
  process.exit(exitCode)
})()
