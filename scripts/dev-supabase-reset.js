#!/usr/bin/env node

/**
 * Resilient Supabase start + db reset for `pnpm dev`.
 * Handles the CLI "already running" / "container is starting" flake by:
 * - retrying `supabase start` when the stack is still booting
 * - polling Docker health + HTTP endpoints before moving on
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { runCleanup } = require('./supabase-cleanup')

const START_CMD =
  'supabase start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime'
const RESET_CMD = 'supabase db reset'
const STATUS_CMDS = ['supabase status --output json', 'supabase status -o json']
const START_RETRIES = 3
const RETRY_DELAY_MS = 5_000
const HEALTH_TIMEOUT_MS = 90_000
const POLL_MS = 2_000
const WAIT_LOG_EVERY_MS = 10_000

let supabaseApiBase = null

const sleep = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

const log = (message) => console.log(`🔧 ${message}`)

const parseSupabaseUrls = (text) => {
  const apiMatch = text.match(/API URL:\s*(\S+)/i)
  const graphqlMatch = text.match(/GraphQL URL:\s*(\S+)/i)
  const dbMatch = text.match(/Database URL:\s*(\S+)/i)

  return {
    apiUrl: apiMatch?.[1] || null,
    graphqlUrl: graphqlMatch?.[1] || null,
    dbUrl: dbMatch?.[1] || null,
  }
}

const runCommand = (cmd, options = {}) => {
  const { silent = false } = options
  try {
    const stdout = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    })
    if (!silent) process.stdout.write(stdout)
    return { ok: true, output: stdout }
  } catch (error) {
    const stdout = error?.stdout?.toString?.() || ''
    const stderr = error?.stderr?.toString?.() || ''
    const output = `${stdout}${stderr}`
    if (output && !silent) process.stdout.write(output)
    return { ok: false, output, code: error?.status ?? 1 }
  }
}

const readApiBaseFromConfig = () => {
  try {
    const configPath = path.join(__dirname, '..', 'supabase', 'config.toml')
    if (!fs.existsSync(configPath)) return null
    const text = fs.readFileSync(configPath, 'utf8')
    const match = text.match(/\[api\][\s\S]*?^\s*port\s*=\s*(\d+)/m)
    if (!match) return null
    const port = Number(match[1])
    if (!Number.isFinite(port)) return null
    return `http://127.0.0.1:${port}`
  } catch {
    return null
  }
}

const getStatusJson = () => {
  for (const cmd of STATUS_CMDS) {
    const result = runCommand(cmd, { silent: true })
    if (!result.ok || !result.output) continue
    try {
      return JSON.parse(result.output)
    } catch {
      continue
    }
  }
  return null
}

const updateApiBaseFromStatus = () => {
  const status = getStatusJson()
  const apiUrl =
    status?.API_URL ||
    status?.api_url ||
    status?.REST_URL?.replace(/\/rest\/v1\/?$/, '') ||
    status?.rest_url?.replace(/\/rest\/v1\/?$/, '')

  if (apiUrl) {
    supabaseApiBase = apiUrl
    log(`Using Supabase API base: ${supabaseApiBase}`)
    return true
  }

  return false
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
    const state = execSync(`docker inspect -f '{{json .State}}' ${name}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    const parsed = JSON.parse(state)
    return parsed?.Health?.Status || parsed?.Status || null
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
  const bases = new Set()

  if (supabaseApiBase) {
    bases.add(supabaseApiBase)
  } else {
    ;[process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]
      .filter(Boolean)
      .forEach((base) => bases.add(base))
  }

  if (bases.size === 0) {
    const configuredBase = readApiBaseFromConfig()
    bases.add(configuredBase || 'http://127.0.0.1:54321')
  }

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
  let lastLog = 0

  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    const elapsed = Date.now() - start
    const dockerReady = containersHealthy()
    const httpReady =
      endpoints.length === 0
        ? true
        : (await Promise.all(endpoints.map(endpointResponding))).every(Boolean)

    if (dockerReady && httpReady) {
      if (label) log(`${label} ready`)
      return true
    }

    if (elapsed - lastLog >= WAIT_LOG_EVERY_MS) {
      log(
        `Waiting for services${
          endpoints.length ? ` (${endpoints.join(', ')})` : ''
        }... (${Math.round(elapsed / 1000)}s elapsed)`
      )
      lastLog = elapsed
    }

    sleep(POLL_MS)
  }

  return false
}

const ensureSupabaseStarted = async () => {
  for (let attempt = 1; attempt <= START_RETRIES; attempt++) {
    log(`Starting Supabase (attempt ${attempt}/${START_RETRIES})...`)
    const result = runCommand(START_CMD)
    const urls = parseSupabaseUrls(result.output || '')
    if (urls.apiUrl) {
      supabaseApiBase = urls.apiUrl
      log(`Using Supabase API base: ${supabaseApiBase}`)
    }

    if (!supabaseApiBase) {
      updateApiBaseFromStatus()
    }

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
      if (!supabaseApiBase) {
        updateApiBaseFromStatus()
      }
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
