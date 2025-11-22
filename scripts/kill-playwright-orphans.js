#!/usr/bin/env node

/**
 * Cron-friendly cleaner for orphaned Playwright/Chromium processes
 * Kills processes older than PLAYWRIGHT_ORPHAN_MAX_AGE (default: 2 hours)
 * that are effectively idle.
 */

const { execSync } = require('child_process')

const PLAYWRIGHT_PROCESS_REGEX =
  /(playwright|headless_shell|chrome-linux|ms-playwright)/i
const MAX_AGE_SECONDS = Number.parseInt(
  process.env.PLAYWRIGHT_ORPHAN_MAX_AGE || '3600',
  10
)
const MAX_CPU_PERCENT = Number.parseFloat(
  process.env.PLAYWRIGHT_ORPHAN_MAX_CPU || '1.0'
)

const timestamp = () => new Date().toISOString()
const log = (msg) => console.log(`[${timestamp()}] ${msg}`)
const warn = (msg) => console.warn(`[${timestamp()}] ${msg}`)
const errorLog = (msg) => console.error(`[${timestamp()}] ${msg}`)

function listPlaywrightProcesses() {
  try {
    const output = execSync('ps -eo pid,etimes,pcpu,comm,args', {
      encoding: 'utf8',
    })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('PID'))
      .map((line) => {
        const [pidStr, etimesStr, pcpuStr, ...rest] = line.split(/\s+/)
        const pid = Number.parseInt(pidStr, 10)
        const etimes = Number.parseInt(etimesStr, 10)
        const pcpu = Number.parseFloat(pcpuStr)
        const cmd = rest.join(' ')
        return {
          pid,
          etimes,
          pcpu: Number.isFinite(pcpu) ? pcpu : 0,
          cmd,
        }
      })
      .filter(
        (proc) =>
          Number.isFinite(proc.pid) &&
          proc.etimes > MAX_AGE_SECONDS &&
          proc.pcpu < MAX_CPU_PERCENT &&
          PLAYWRIGHT_PROCESS_REGEX.test(proc.cmd || '')
      )
  } catch (error) {
    errorLog(`Failed to list Playwright/Chromium processes: ${error?.message}`)
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
      log(
        `Sent SIGTERM to pid=${proc.pid} (age=${proc.etimes}s, cpu=${proc.pcpu}%)`
      )
    } catch (error) {
      warn(`⚠️  Failed to send SIGTERM to PID ${proc.pid}: ${error?.message}`)
    }
  })

  await new Promise((resolve) => setTimeout(resolve, 2000))

  targets.forEach((proc) => {
    if (isAlive(proc.pid)) {
      try {
        process.kill(proc.pid, 'SIGKILL')
        log(`Sent SIGKILL to stubborn pid=${proc.pid}`)
      } catch (error) {
        warn(`⚠️  Failed to send SIGKILL to PID ${proc.pid}: ${error?.message}`)
      }
    }
  })
}

async function main() {
  const targets = listPlaywrightProcesses()
  if (!targets.length) {
    log(
      `No orphaned Playwright/Chromium processes older than ${MAX_AGE_SECONDS}s found.`
    )
    return
  }

  log(
    `Found ${targets.length} Playwright/Chromium process(es) older than ${MAX_AGE_SECONDS}s (idle CPU < ${MAX_CPU_PERCENT}%): ${targets
      .map((proc) => proc.pid)
      .join(', ')}`
  )
  await terminateProcesses(targets)
}

main().catch((error) => {
  errorLog(`Cron cleanup failed: ${error?.message}`)
  process.exitCode = 1
})
