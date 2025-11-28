#!/usr/bin/env node

/**
 * Resilient Supabase start + db reset for `pnpm dev`.
 * Handles the CLI "already running" / "container is starting" flake by:
 * - retrying `supabase start` when the stack is still booting
 * - polling Docker health + HTTP endpoints before moving on
 */

const { execSync } = require('child_process')
const { runCleanup } = require('./supabase-cleanup')

const START_CMD =
  'supabase start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime'
const RESET_CMD = 'supabase db reset'
const START_RETRIES = 3
const RETRY_DELAY_MS = 5_000
const HEALTH_TIMEOUT_MS = 90_000
const POLL_MS = 2_000

const sleep = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

const log = (message) => console.log(`🔧 ${message}`)

const runCommand = (cmd) => {
  try {
    const stdout = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    })
    process.stdout.write(stdout)
    return { ok: true, output: stdout }
  } catch (error) {
    const stdout = error?.stdout?.toString?.() || ''
    const stderr = error?.stderr?.toString?.() || ''
    const output = `${stdout}${stderr}`
    if (output) process.stdout.write(output)
    return { ok: false, output, code: error?.status ?? 1 }
  }
}

const listSupabaseContainers = () => {
  try {
    return execSync('docker ps --filter name=supabase --format "{{.Names}}"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

const readContainerState = (name) => {
  try {
    const state = execSync(
      `docker inspect -f "{{.State.Health.Status}}|{{.State.Status}}" ${name}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    )
      .trim()
      .split('|')
    const [health, status] = state
    if (health && health !== '<no value>') return health
    return status || null
  } catch {
    return null
  }
}

const containersHealthy = () => {
  const containers = listSupabaseContainers()
  if (containers.length === 0) return false

  return containers.every((name) => {
    const state = readContainerState(name)
    return state === 'healthy' || state === 'running'
  })
}

const getHealthEndpoints = () => {
  const bases = new Set(
    [
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'http://127.0.0.1:54321',
    ].filter(Boolean)
  )

  const endpoints = []
  bases.forEach((base) => {
    try {
      endpoints.push(new URL('/rest/v1/', base).toString())
      endpoints.push(new URL('/auth/v1/health', base).toString())
    } catch {
      // ignore malformed URLs
    }
  })

  return Array.from(new Set(endpoints))
}

const endpointResponding = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) })
    return response.ok || (response.status >= 400 && response.status < 500)
  } catch {
    return false
  }
}

const waitForReadiness = async (label) => {
  const start = Date.now()
  const endpoints = getHealthEndpoints()

  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    const dockerReady = containersHealthy()
    const httpReady =
      endpoints.length === 0
        ? true
        : (await Promise.all(endpoints.map(endpointResponding))).every(Boolean)

    if (dockerReady && httpReady) {
      if (label) log(`${label} ready`)
      return true
    }

    sleep(POLL_MS)
  }

  return false
}

const ensureSupabaseStarted = async () => {
  for (let attempt = 1; attempt <= START_RETRIES; attempt++) {
    log(`Starting Supabase (attempt ${attempt}/${START_RETRIES})...`)
    const result = runCommand(START_CMD)

    if (result.ok) {
      const ready = await waitForReadiness('Supabase stack')
      if (ready) return
    }

    const text = (result.output || '').toLowerCase()
    const startInProgress =
      text.includes('already running') ||
      text.includes('not ready: starting') ||
      text.includes('container is not ready')

    if (startInProgress) {
      log(
        'Supabase CLI reports stack is already starting; waiting for health...'
      )
      const ready = await waitForReadiness('Supabase stack')
      if (ready) return
    }

    if (attempt < START_RETRIES) {
      log('Retrying Supabase start after short delay...')
      sleep(RETRY_DELAY_MS)
    }
  }

  throw new Error('Supabase failed to start after retries')
}

const resetDatabase = async () => {
  log('Resetting Supabase database...')
  const result = runCommand(RESET_CMD)
  if (!result.ok) {
    throw new Error('supabase db reset failed')
  }

  const ready = await waitForReadiness('Database reset')
  if (!ready) {
    log('Warning: services did not report ready before timeout')
  }
}

const main = async () => {
  try {
    await ensureSupabaseStarted()
    await resetDatabase()
    runCleanup()
  } catch (error) {
    console.error(`❌ ${error.message || error}`)
    process.exit(1)
  }
}

main()
