import { spawn, ChildProcess } from 'child_process'

let devServer: ChildProcess | null = null

async function waitForHealthCheck(
  url: string,
  timeoutMs = 90000
): Promise<void> {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch (err) {
      lastError = err
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(
    `Dev server did not become ready at ${url} within ${timeoutMs}ms: ${lastError}`
  )
}

export async function setup() {
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
  process.env.NEXT_PUBLIC_TEST_MODE = 'true'
  process.env.TEST_API_URL = 'http://127.0.0.1:3100'

  devServer = spawn('pnpm', ['dev', '--port', '3100'], {
    stdio: 'pipe',
    env: { ...process.env },
  })

  devServer.stdout?.on('data', (data: Buffer) => {
    if (process.env.DEBUG_TEST_SETUP) {
      process.stdout.write(`[dev-server] ${data}`)
    }
  })

  devServer.stderr?.on('data', (data: Buffer) => {
    if (process.env.DEBUG_TEST_SETUP) {
      process.stderr.write(`[dev-server] ${data}`)
    }
  })

  devServer.on('error', (err) => {
    console.error('[dev-server] Failed to start:', err.message)
  })

  await waitForHealthCheck('http://127.0.0.1:3100/api/health')
}

export async function teardown() {
  if (devServer) {
    devServer.kill('SIGTERM')
    devServer = null
  }
}
