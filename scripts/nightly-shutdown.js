#!/usr/bin/env node

/**
 * Nightly shutdown helper
 * - If a dev server is listening on DEV_PORT (default 3000), kill it.
 * - Stop Supabase containers afterward (via infrastructure manager, with docker fallback).
 * Intended to be run from cron around 02:00 local time.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { killProcessOnPort } = require('./kill-port')
const WorkingInfrastructure = require('./infrastructure-working')
const { runCleanup: cleanupSupabaseDocker } = require('./supabase-cleanup')

const DEV_PORT = Number.parseInt(process.env.DEV_PORT || '3000', 10)
const LOG_DIR = path.join(__dirname, '..', '.logs')
const LOG_FILE = path.join(LOG_DIR, 'nightly-shutdown.log')

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
    console.warn(`Unable to write nightly shutdown log: ${error.message}`)
  }
}

function run(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return ''
  }
}

async function killDevServerIfRunning() {
  const pids = run(`lsof -ti:${DEV_PORT}`).trim().split('\n').filter(Boolean)
  if (!pids.length) {
    log(`No dev server detected on port ${DEV_PORT}`)
    return false
  }

  log(
    `Dev server detected on port ${DEV_PORT} (pids: ${pids.join(', ')}) — terminating`
  )
  const success = await killProcessOnPort(DEV_PORT, {
    maxRetries: 5,
    retryDelay: 1500,
  })
  if (!success) {
    log(`Failed to cleanly kill dev server on port ${DEV_PORT}`)
  }
  return true
}

async function stopSupabaseStack() {
  const infra = new WorkingInfrastructure()
  try {
    const stopped = await infra.stopSupabase()
    if (stopped) return
    throw new Error('Supabase CLI stop returned falsy')
  } catch (error) {
    log(
      `Supabase stop via CLI failed (${error.message}). Attempting docker fallback...`
    )
    const ids = run('docker ps --filter name=supabase --quiet')
      .trim()
      .split('\n')
      .filter(Boolean)
    if (!ids.length) {
      log('No Supabase containers to stop in fallback')
      return
    }
    try {
      execSync(`docker stop ${ids.join(' ')}`, { stdio: 'ignore' })
      log(`Stopped Supabase containers via docker: ${ids.join(', ')}`)
    } catch (dockerError) {
      log(`Docker fallback stop failed: ${dockerError.message}`)
    }
  }
}

async function main() {
  const devKilled = await killDevServerIfRunning()
  if (devKilled) {
    log('Dev server terminated; proceeding to stop Supabase')
  } else {
    log('No dev server running; stopping Supabase only')
  }

  await stopSupabaseStack()

  await cleanupSupabaseDocker()
}

main().catch((error) => {
  log(`Nightly shutdown failed: ${error.message}`)
  process.exitCode = 1
})
