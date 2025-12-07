#!/usr/bin/env node

/**
 * Start the dev server and warm key routes so Turbopack builds them up front.
 *
 * Configurable via env:
 *   WARMUP_START_DEV        Start dev server automatically (default true)
 *   WARMUP_DEV_COMMAND      Command to start dev server (default "pnpm run dev")
 *   WARMUP_BASE_URL          Base URL to warm (default http://localhost:3000)
 *   WARMUP_ROUTES            Comma-separated list of routes to hit
 *   WARMUP_READINESS_PATH    Path checked before warming (default /api/health)
 *   WARMUP_TIMEOUT_MS        Per-request timeout in ms (default 20000)
 *   WARMUP_WAIT_ATTEMPTS     How many times to poll for readiness (default 60; min wait enforced)
 *   WARMUP_WAIT_DELAY_MS     Delay between readiness polls (default 500)
 *   WARMUP_WAIT_MIN_MS       Minimum total time to wait for readiness (default 180000)
 *   WARMUP_RETRY_ABORTED     Retry routes that timed out (default true)
 *   WARMUP_RETRY_TIMEOUT_MS  Timeout for retry attempts (default max(timeout*2, 30000))
 *   WARMUP_RETRY_DELAY_MS    Delay before retrying timed-out routes (default 1000)
 */

const { spawn } = require('child_process')
const path = require('path')

let devProcessRef = null
let shuttingDown = false

const DEFAULT_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/dashboard/liked',
  '/dashboard/passed',
  '/dashboard/viewed',
  '/profile',
  '/settings',
  '/couples',
  '/couples/decisions',
  '/demo/ads',
  '/sponsor-mockups',
  '/validation',
]

const baseUrl = process.env.WARMUP_BASE_URL || 'http://localhost:3000'
const readinessPath = process.env.WARMUP_READINESS_PATH || '/api/health'
const timeoutMs = Number(process.env.WARMUP_TIMEOUT_MS || 20000)
const waitAttempts = Number(process.env.WARMUP_WAIT_ATTEMPTS || 60)
const waitDelayMs = Number(process.env.WARMUP_WAIT_DELAY_MS || 500)
const waitMinMs = Number(process.env.WARMUP_WAIT_MIN_MS || 180_000) // allow dev+Supabase boot to finish
const shouldStartDev =
  (process.env.WARMUP_START_DEV || 'true').toLowerCase() !== 'false'
const devCommand = process.env.WARMUP_DEV_COMMAND || 'pnpm run dev'
const retryAborted =
  (process.env.WARMUP_RETRY_ABORTED || 'true').toLowerCase() !== 'false'
const retryTimeoutMs = Number(
  process.env.WARMUP_RETRY_TIMEOUT_MS || Math.max(timeoutMs * 2, 30000)
)
const retryDelayMs = Number(process.env.WARMUP_RETRY_DELAY_MS || 1000)

const routes = (
  process.env.WARMUP_ROUTES
    ? process.env.WARMUP_ROUTES.split(',').map((route) => route.trim())
    : DEFAULT_ROUTES
).filter(Boolean)

const maxAttempts = Math.max(waitAttempts, Math.ceil(waitMinMs / waitDelayMs))

function normalizeRoute(route) {
  if (route.startsWith('http')) return route
  return route.startsWith('/') ? route : `/${route}`
}

function buildUrl(route) {
  const normalized = normalizeRoute(route)
  if (normalized.startsWith('http')) return normalized
  return `${baseUrl}${normalized}`
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, requestTimeoutMs = timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    return await fetch(url, { signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(timer)
  }
}

async function waitForServer() {
  const url = buildUrl(readinessPath)
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url)
      if (res.ok || res.status >= 400) {
        return true
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.log(
          `Waiting for dev server (${attempt}/${maxAttempts}): ${error.message}`
        )
      }
    }

    await sleep(waitDelayMs)
  }

  return false
}

async function runWarmup() {
  const serverReady = await waitForServer()
  if (!serverReady) {
    throw new Error(
      `Dev server not reachable at ${buildUrl(
        readinessPath
      )}. Start it first (or set WARMUP_START_DEV=true).`
    )
  }

  console.log(`Warming ${routes.length} route(s) against ${baseUrl}...`)

  const abortedRoutes = []

  for (const route of routes) {
    const url = buildUrl(route)
    const start = Date.now()

    try {
      const res = await fetchWithTimeout(url)
      const duration = Date.now() - start
      console.log(`[${res.status}] ${url} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - start
      if (error?.name === 'AbortError') {
        abortedRoutes.push(route)
        console.warn(`[timeout] ${url} (${duration}ms): request aborted`)
      } else {
        console.warn(`[error] ${url} (${duration}ms): ${error.message}`)
      }
    }
  }

  if (retryAborted && abortedRoutes.length > 0) {
    console.log(
      `Retrying ${abortedRoutes.length} timed-out route(s) with timeout=${retryTimeoutMs}ms...`
    )
    await sleep(retryDelayMs)

    for (const route of abortedRoutes) {
      const url = buildUrl(route)
      const start = Date.now()

      try {
        const res = await fetchWithTimeout(url, retryTimeoutMs)
        const duration = Date.now() - start
        console.log(`[retry ${res.status}] ${url} (${duration}ms)`)
      } catch (error) {
        const duration = Date.now() - start
        console.warn(
          `[retry error] ${url} (${duration}ms): ${error?.message || error}`
        )
      }
    }
  }

  console.log('Warmup complete.')
}

function startDevServer() {
  console.log(`Starting dev server with "${devCommand}"...`)

  const devProcess = spawn(devCommand, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })

  devProcess.on('exit', (code, signal) => {
    if (signal) {
      console.log(`Dev server exited due to signal: ${signal}`)
    } else {
      console.log(`Dev server exited with code: ${code ?? 0}`)
    }
  })

  return devProcess
}

function cleanup() {
  if (shuttingDown) return
  shuttingDown = true

  if (
    devProcessRef &&
    devProcessRef.exitCode === null &&
    !devProcessRef.killed
  ) {
    devProcessRef.kill('SIGINT')
  }
}

async function main() {
  let devProcess = null

  if (shouldStartDev) {
    devProcess = startDevServer()
    devProcessRef = devProcess
  } else {
    console.log(
      'WARMUP_START_DEV=false, assuming dev server is already running...'
    )
  }

  console.log(
    `Waiting for dev server at ${buildUrl(
      readinessPath
    )} (attempts=${maxAttempts}, delay=${waitDelayMs}ms, timeout=${timeoutMs}ms, minWait=${waitMinMs}ms; override with WARMUP_* env vars)...`
  )

  try {
    await runWarmup()
  } catch (error) {
    console.error(error?.message || error)
    cleanup()
    process.exit(1)
  }

  if (devProcess) {
    console.log(
      'Warmup complete; dev server is still running. Press Ctrl+C to stop.'
    )
    await new Promise((resolve) => {
      devProcess.on('exit', resolve)
    })
  } else {
    console.log('Warmup complete.')
  }
}

main()

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

process.on('exit', () => {
  cleanup()
})
