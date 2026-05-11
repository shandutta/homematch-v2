import { spawn, execSync, ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)

const DEV_PORT = 3000
const HEALTH_URL = `http://127.0.0.1:${DEV_PORT}/api/health`

let devServer: ChildProcess | null = null

function findSearchRoots(): string[] {
  const roots = [ROOT]
  // When running from a git worktree, also search the main worktree for env files
  // so credentials don't have to be duplicated into each worktree directory.
  try {
    const out = execSync('git worktree list --porcelain', {
      cwd: ROOT,
      encoding: 'utf8',
    })
    for (const line of out.split('\n')) {
      if (line.startsWith('worktree ')) {
        const wt = line.slice('worktree '.length).trim()
        if (wt !== ROOT && !roots.includes(wt)) roots.push(wt)
      }
    }
  } catch {
    /* not a git repo or git unavailable */
  }
  return roots
}

function loadEnvFiles(): NodeJS.ProcessEnv {
  // Merge env files; earlier entries win (.env.test.local > .env.prod > .env.local)
  // Search in this worktree first, then fallback to other worktrees (e.g. main).
  const candidates = ['.env.test.local', '.env.prod', '.env.local']
  const merged: NodeJS.ProcessEnv = {}

  for (const searchRoot of findSearchRoots()) {
    for (const file of candidates) {
      const envPath = path.join(searchRoot, file)
      if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath))
        for (const [k, v] of Object.entries(parsed)) {
          if (!(k in merged)) merged[k] = v
        }
      }
    }
  }

  return merged
}

function killPort(port: number): void {
  try {
    if (process.platform === 'win32') {
      // Windows: kill via netstat + taskkill
      try {
        const out = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8',
        })
        const pids = [
          ...new Set(
            out
              .split('\n')
              .map((l) => l.trim().split(/\s+/).pop())
              .filter(Boolean)
          ),
        ]
        for (const pid of pids)
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      } catch {
        /* port free */
      }
    } else {
      // Unix: lsof
      const out = execSync(`lsof -ti:${port} 2>/dev/null || true`, {
        encoding: 'utf8',
      })
      const pids = out.trim().split('\n').filter(Boolean)
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        } catch {
          /* already gone */
        }
      }
    }
  } catch {
    // Port was already free
  }
}

async function waitForHealth(url: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (res.status < 500) return
    } catch (err) {
      lastError = err
    }
    await new Promise<void>((r) => setTimeout(r, 1000))
  }

  throw new Error(
    `Dev server at ${url} did not become ready within ${timeoutMs}ms. Last error: ${lastError}`
  )
}

export async function setup(): Promise<void> {
  const envFromFiles = loadEnvFiles()

  const pick = (...keys: string[]): string =>
    keys.map((k) => envFromFiles[k] ?? process.env[k] ?? '').find(Boolean) ?? ''

  const supabaseUrl =
    pick('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:54200'
  const supabaseAnonKey = pick(
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
  const supabaseServiceRoleKey = pick('SUPABASE_SERVICE_ROLE_KEY')
  const serverActionsKey = pick('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY')

  console.log(`[globalSetup] Freeing port ${DEV_PORT}...`)
  killPort(DEV_PORT)
  // Brief pause for OS to release the port
  await new Promise<void>((r) => setTimeout(r, 500))

  // Honor SKIP_DEV_SERVER (CI memory budget): if set, skip Next.js dev
  // server entirely. Tests that need HTTP will fail explicitly; pure DB
  // and route-handler-import tests still run.
  if (process.env.SKIP_DEV_SERVER === 'true') {
    console.log(
      '[globalSetup] SKIP_DEV_SERVER=true — Next.js dev server NOT started.'
    )
    return async () => {
      console.log('[globalSetup] Teardown (no dev server to stop)')
    }
  }

  // Build env for the Next.js dev server: test mode + local Supabase, no prod DB
  const devEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...envFromFiles,
    NODE_ENV: 'test',
    NEXT_PUBLIC_TEST_MODE: 'true',
    MARKETING_USE_SEED: 'true',
    NODE_NO_WARNINGS: '1',
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: serverActionsKey,
  }

  // Strip production DB vars so they can't shadow local Supabase
  for (const key of [
    'POSTGRES_URL',
    'POSTGRES_DATABASE',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'POSTGRES_PRISMA_URL',
  ]) {
    delete devEnv[key]
  }

  console.log(
    `[globalSetup] Starting Next.js dev server on port ${DEV_PORT}...`
  )
  console.log(`[globalSetup] Supabase URL: ${supabaseUrl}`)

  // Spawn next dev directly — bypasses npm guard scripts (guard:supabase, ensure:server-action-key)
  // that are designed for interactive use and would block in CI/test mode.
  devServer = spawn(
    'pnpm',
    [
      'exec',
      'next',
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(DEV_PORT),
    ],
    {
      cwd: ROOT,
      env: devEnv,
      stdio: process.env.DEBUG_TEST_SETUP ? 'inherit' : 'pipe',
      detached: false,
    }
  )

  devServer.on('error', (err) => {
    console.error('[globalSetup] Dev server spawn error:', err.message)
  })

  if (devServer.stdout && !process.env.DEBUG_TEST_SETUP) {
    devServer.stdout.resume() // drain to prevent buffer fill
  }
  if (devServer.stderr && !process.env.DEBUG_TEST_SETUP) {
    devServer.stderr.resume()
  }

  await waitForHealth(HEALTH_URL)
  console.log(`[globalSetup] Dev server ready at http://127.0.0.1:${DEV_PORT}`)

  // Propagate Supabase credentials + test env into the parent process so fork
  // workers inherit them. vitest.setup.ts reads these from process.env directly.
  const inherit: Array<[string, string]> = [
    ['TEST_API_URL', `http://127.0.0.1:${DEV_PORT}`],
    ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
    ['SUPABASE_URL', supabaseUrl],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey],
    ['SUPABASE_ANON_KEY', supabaseAnonKey],
    ['SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey],
    ['NODE_ENV', 'test'],
    ['NEXT_PUBLIC_TEST_MODE', 'true'],
    ['MARKETING_USE_SEED', 'true'],
  ]
  for (const [k, v] of inherit) {
    if (v) process.env[k] = v
  }
}

export async function teardown(): Promise<void> {
  if (devServer) {
    console.log('[globalSetup] Stopping dev server...')
    devServer.kill('SIGTERM')
    devServer = null
    await new Promise<void>((r) => setTimeout(r, 1000))
    killPort(DEV_PORT)
  }
}
