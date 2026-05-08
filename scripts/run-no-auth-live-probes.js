#!/usr/bin/env node

const { spawnSync } = require('node:child_process')

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'
const baseUrl = process.env.NO_AUTH_LIVE_PROBES_BASE_URL || DEFAULT_BASE_URL
const timeoutMs = Number(
  process.env.NO_AUTH_LIVE_PROBES_READY_TIMEOUT_MS || 2000
)

function assertLocalBaseUrl(rawUrl) {
  const url = new URL(rawUrl)
  const host = url.hostname.toLowerCase()
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(
      `Refusing no-auth live probes against non-local URL ${rawUrl}. Use only a local app/test URL.`
    )
  }
}

async function isLocalServerReady() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(new URL('/api/health', baseUrl), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    return response.status < 500
  } catch (error) {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  assertLocalBaseUrl(baseUrl)

  if (!(await isLocalServerReady())) {
    console.log(
      `[p0-no-auth-live-probes] SKIP: no local app server responded at ${baseUrl}; start the local app before running live probes.`
    )
    process.exit(0)
  }

  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '__tests__/integration/routing/no-auth-live-probe.spec.ts',
      '--config',
      'vitest.config.ts',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        NO_AUTH_LIVE_PROBES_RUN: '1',
        NO_AUTH_LIVE_PROBES_BASE_URL: baseUrl,
      },
    }
  )

  if (result.error) {
    throw result.error
  }

  process.exit(result.status ?? 1)
}

main().catch((error) => {
  console.error(`[p0-no-auth-live-probes] ERROR: ${error.message}`)
  process.exit(1)
})
