#!/usr/bin/env node

/**
 * Safe Next.js build wrapper.
 *
 * Why:
 * - `next dev --turbopack` and `next build` both write into `.next` by default.
 * - When a dev server is running (common on the devbox), a cron `pnpm build`
 *   can race and corrupt build artifacts, causing missing Turbopack runtime
 *   modules like `../chunks/ssr/[turbopack]_runtime.js`.
 *
 * Approach:
 * - If port 3000 is active, build into an isolated distDir (`.next-build`).
 * - Otherwise, build into the default `.next`.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')

const parseBool = (value) => {
  return ['1', 'true', 'yes'].includes(String(value || '').toLowerCase())
}

const resolvePnpmCmd = () => {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

const isPortOpen = (port, host = '127.0.0.1', timeoutMs = 250) => {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    const done = (result) => {
      socket.removeAllListeners()
      try {
        socket.destroy()
      } catch {
        // ignore
      }
      resolve(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))

    socket.connect(port, host)
  })
}

async function main() {
  const isolatedDistDir = process.env.NEXT_SAFE_BUILD_DIST_DIR || '.next-build'
  const devPort = Number.parseInt(
    process.env.NEXT_SAFE_BUILD_DEV_PORT || '3000',
    10
  )

  const forceIsolated = parseBool(process.env.NEXT_SAFE_BUILD_ISOLATED)
  const forceDefault = parseBool(process.env.NEXT_SAFE_BUILD_FORCE_DEFAULT)

  let useIsolated = forceIsolated

  if (!forceDefault && !forceIsolated) {
    useIsolated = await isPortOpen(devPort)
  }

  const distDir = useIsolated ? isolatedDistDir : '.next'
  const distPath = path.join(PROJECT_ROOT, distDir)

  if (useIsolated) {
    console.log(
      `🧱 Dev server detected on port ${devPort}; building into ${distDir} to avoid .next contention`
    )
  }

  try {
    fs.rmSync(distPath, { recursive: true, force: true })
  } catch {
    // ignore
  }

  const pnpmCmd = resolvePnpmCmd()
  const child = spawn(pnpmCmd, ['exec', 'next', 'build'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_DIST_DIR: distDir,
    },
  })

  child.on('close', (code) => {
    process.exit(code ?? 1)
  })

  child.on('error', (error) => {
    console.error('❌ Failed to start Next.js build:', error?.message || error)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error('❌ Safe build failed:', error?.message || error)
  process.exit(1)
})
