#!/usr/bin/env node

/**
 * Nightly system cleanup helper
 * - Docker prune (images/containers/networks/volumes/builder cache)
 * - Snap disabled revision cleanup
 * - Journal vacuum to a fixed size
 * - Apt clean
 *
 * Safe to run repeatedly; failures are logged and non-fatal.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const LOG_DIR = path.join(__dirname, '..', '.logs')
const LOG_FILE = path.join(LOG_DIR, 'nightly-system-clean.log')

const timestamp = () => new Date().toISOString()
function log(message) {
  const line = `[${timestamp()}] ${message}`
  console.log(line)
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    fs.appendFileSync(LOG_FILE, `${line}\n`)
  } catch (error) {
    console.warn(`Unable to write nightly system clean log: ${error.message}`)
  }
}

function run(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function safeRun(name, cmd) {
  try {
    const output = run(cmd)
    if (output.trim()) log(`${name} output:\n${output.trim()}`)
    else log(`${name} completed`)
  } catch (error) {
    const msg = error?.stderr?.toString().trim() || error.message
    log(`${name} failed: ${msg}`)
  }
}

function binAvailable(bin) {
  try {
    run(`command -v ${bin}`)
    return true
  } catch {
    return false
  }
}

function runSystemCleanup() {
  log('Starting nightly system cleanup')

  if (binAvailable('docker')) {
    safeRun(
      'Docker prune',
      'sudo -n docker system prune -a --volumes --force && sudo -n docker builder prune -a --force'
    )
  } else {
    log('Docker not installed; skipping docker prune')
  }

  if (binAvailable('snap')) {
    safeRun(
      'Snap disabled revision cleanup',
      'sudo -n sh -c "snap list --all | awk \'/disabled/{print $1, $3}\' | while read snap rev; do snap remove \\"$snap\\" --revision=\\"$rev\\"; done"'
    )
  } else {
    log('snap not installed; skipping snap cleanup')
  }

  if (binAvailable('journalctl')) {
    safeRun('Journal vacuum (200M)', 'sudo -n journalctl --vacuum-size=200M')
  } else {
    log('journalctl not available; skipping journal vacuum')
  }

  if (binAvailable('apt-get')) {
    safeRun('Apt clean', 'sudo -n apt-get clean')
  } else {
    log('apt-get not available; skipping apt clean')
  }

  safeRun(
    'Disk usage (/ and volume)',
    'df -h / /mnt/HC_Volume_104069074 || df -h /'
  )

  log('Nightly system cleanup complete')
}

if (require.main === module) {
  runSystemCleanup()
}

module.exports = { runSystemCleanup }
