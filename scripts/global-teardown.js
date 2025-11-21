/**
 * Playwright global teardown
 * Cleans up Playwright/Chromium processes started during the test run
 */

const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PLAYWRIGHT_PROCESS_REGEX =
  /(playwright|headless_shell|chrome-linux|ms-playwright)/i
const PLAYWRIGHT_BASELINE_FILE = path.join(
  os.tmpdir(),
  'homematch-v2-playwright-baseline.json'
)

function listPlaywrightProcesses() {
  try {
    const output = execSync('ps -eo pid,etimes,comm,args', { encoding: 'utf8' })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('PID'))
      .map((line) => {
        const [pidStr, etimesStr, ...rest] = line.split(/\s+/)
        const pid = Number.parseInt(pidStr, 10)
        const etimes = Number.parseInt(etimesStr, 10)
        const cmd = rest.join(' ')
        return { pid, etimes, cmd }
      })
      .filter(
        (proc) =>
          Number.isFinite(proc.pid) &&
          PLAYWRIGHT_PROCESS_REGEX.test(proc.cmd || '')
      )
  } catch {
    return []
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function terminateProcesses(targets) {
  targets.forEach((proc) => {
    try {
      process.kill(proc.pid, 'SIGTERM')
    } catch (error) {
      console.warn(
        `⚠️  Failed to send SIGTERM to PID ${proc.pid}: ${error?.message}`
      )
    }
  })

  await new Promise((resolve) => setTimeout(resolve, 1500))

  targets.forEach((proc) => {
    if (isAlive(proc.pid)) {
      try {
        process.kill(proc.pid, 'SIGKILL')
      } catch (error) {
        console.warn(
          `⚠️  Failed to send SIGKILL to PID ${proc.pid}: ${error?.message}`
        )
      }
    }
  })
}

async function globalTeardown() {
  console.log('🧹 Running Playwright global teardown...')

  let baselinePids = []
  try {
    if (fs.existsSync(PLAYWRIGHT_BASELINE_FILE)) {
      const fileContent = fs.readFileSync(PLAYWRIGHT_BASELINE_FILE, 'utf8')
      const parsed = JSON.parse(fileContent)
      baselinePids = Array.isArray(parsed.pids) ? parsed.pids : []
    }
  } catch (error) {
    console.warn(
      `⚠️  Failed to read Playwright baseline file: ${error?.message}`
    )
  }

  const baselineSet = new Set(baselinePids)
  const processes = listPlaywrightProcesses()
  const targets = processes.filter((proc) => !baselineSet.has(proc.pid))

  if (!targets.length) {
    console.log('✅ No stray Playwright/Chromium processes detected')
  } else {
    console.log(
      `🧼 Cleaning up ${targets.length} Playwright/Chromium process(es): ${targets
        .map((proc) => proc.pid)
        .join(', ')}`
    )
    await terminateProcesses(targets)
  }

  try {
    if (fs.existsSync(PLAYWRIGHT_BASELINE_FILE)) {
      fs.unlinkSync(PLAYWRIGHT_BASELINE_FILE)
    }
  } catch {
    // Ignore cleanup errors
  }
}

module.exports = globalTeardown
