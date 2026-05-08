#!/usr/bin/env node

const { spawnSync } = require('node:child_process')

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1']

function assertLocalBaseUrl(rawUrl) {
  const url = new URL(rawUrl)
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!ALLOWED_LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing no-auth live probes against non-local URL ${rawUrl}. Use only a local app/test URL.`
    )
  }
}

async function isLocalServerReady(
  baseUrl,
  { timeoutMs = 2000, fetchImpl = fetch } = {}
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(new URL('/api/health', baseUrl), {
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

async function runMain({
  env = process.env,
  logger = console,
  exit = process.exit,
  spawn = spawnSync,
  readyCheck = isLocalServerReady,
} = {}) {
  const baseUrl = env.NO_AUTH_LIVE_PROBES_BASE_URL || DEFAULT_BASE_URL
  const timeoutMs = Number(env.NO_AUTH_LIVE_PROBES_READY_TIMEOUT_MS || 2000)

  try {
    assertLocalBaseUrl(baseUrl)
  } catch (error) {
    logger.error(`[p0-no-auth-live-probes] ERROR: ${error.message}`)
    return exit(1)
  }

  if (!(await readyCheck(baseUrl, { timeoutMs }))) {
    logger.log(
      `[p0-no-auth-live-probes] SKIP: no local app server responded at ${baseUrl}; start the local app before running live probes.`
    )
    return exit(0)
  }

  const result = spawn(
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
        ...env,
        NO_AUTH_LIVE_PROBES_RUN: '1',
        NO_AUTH_LIVE_PROBES_BASE_URL: baseUrl,
      },
    }
  )

  if (result.error) {
    throw result.error
  }

  return exit(result.status ?? 1)
}

module.exports = {
  DEFAULT_BASE_URL,
  ALLOWED_LOCAL_HOSTS,
  assertLocalBaseUrl,
  isLocalServerReady,
  runMain,
}

if (require.main === module) {
  runMain().catch((error) => {
    console.error(`[p0-no-auth-live-probes] ERROR: ${error.message}`)
    process.exit(1)
  })
}
