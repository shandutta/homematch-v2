#!/usr/bin/env node

/**
 * Warm up a running dev server by hitting key pages so Turbopack builds them up front.
 *
 * Usage:
 *   1) Start the dev server: pnpm dev
 *   2) In another terminal: pnpm dev:warmup
 *
 * Configurable via env:
 *   WARMUP_BASE_URL          Base URL to warm (default http://localhost:3000)
 *   WARMUP_ROUTES            Comma-separated list of routes to hit
 *   WARMUP_READINESS_PATH    Path checked before warming (default /api/health)
 *   WARMUP_TIMEOUT_MS        Per-request timeout in ms (default 10000)
 *   WARMUP_WAIT_ATTEMPTS     How many times to poll for readiness (default 20)
 *   WARMUP_WAIT_DELAY_MS     Delay between readiness polls (default 500)
 */

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
const timeoutMs = Number(process.env.WARMUP_TIMEOUT_MS || 10000)
const waitAttempts = Number(process.env.WARMUP_WAIT_ATTEMPTS || 60)
const waitDelayMs = Number(process.env.WARMUP_WAIT_DELAY_MS || 500)

const routes = (process.env.WARMUP_ROUTES
  ? process.env.WARMUP_ROUTES.split(',').map((route) => route.trim())
  : DEFAULT_ROUTES
).filter(Boolean)

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

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(timer)
  }
}

async function waitForServer() {
  const url = buildUrl(readinessPath)
  for (let attempt = 1; attempt <= waitAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url)
      if (res.ok || res.status >= 400) {
        return true
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.log(
          `Waiting for dev server (${attempt}/${waitAttempts}): ${error.message}`
        )
      }
    }

    await sleep(waitDelayMs)
  }

  return false
}

async function warmup() {
  console.log(
    `Waiting for dev server at ${buildUrl(
      readinessPath
    )} (attempts=${waitAttempts}, delay=${waitDelayMs}ms, timeout=${timeoutMs}ms; override with WARMUP_* env vars)...`
  )

  const serverReady = await waitForServer()
  if (!serverReady) {
    console.error(
      `Dev server not reachable at ${buildUrl(
        readinessPath
      )}. Start it first with "pnpm dev".`
    )
    process.exit(1)
  }

  console.log(`Warming ${routes.length} route(s) against ${baseUrl}...`)

  for (const route of routes) {
    const url = buildUrl(route)
    const start = Date.now()

    try {
      const res = await fetchWithTimeout(url)
      const duration = Date.now() - start
      console.log(`[${res.status}] ${url} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - start
      console.warn(`[error] ${url} (${duration}ms): ${error.message}`)
    }
  }

  console.log('Warmup complete.')
}

warmup()
