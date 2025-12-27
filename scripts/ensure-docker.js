#!/usr/bin/env node

if (process.env.SKIP_DOCKER === '1') {
  console.log('Skipping Docker check (SKIP_DOCKER=1)')
  process.exit(0)
}

const { execSync } = require('child_process')

const sleepSync = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const readError = (error) => {
  const stderr = error?.stderr?.toString() || ''
  const stdout = error?.stdout?.toString() || ''
  const message = error?.message || ''
  return (stderr + stdout + message).trim()
}

const checkDocker = () => {
  try {
    execSync('docker info', { stdio: 'pipe' })
    return { ok: true }
  } catch (error) {
    const text = readError(error)
    const missingCli =
      error?.code === 'ENOENT' || /command not found/i.test(text)
    const permissionDenied = /permission denied/i.test(text)
    return { ok: false, missingCli, permissionDenied, message: text }
  }
}

const tryStartDocker = () => {
  const platform = process.platform
  const attempts = []

  if (platform === 'darwin') {
    attempts.push('open -ga Docker')
  } else if (platform === 'win32') {
    attempts.push(
      'powershell.exe -Command "Start-Process \\"Docker Desktop\\" -ErrorAction SilentlyContinue"'
    )
  } else {
    attempts.push('systemctl start docker')
    attempts.push('service docker start')
    attempts.push('sudo -n systemctl start docker')
    attempts.push('sudo -n service docker start')
  }

  for (const cmd of attempts) {
    try {
      execSync(cmd, { stdio: 'ignore' })
      return true
    } catch {
      // try next
    }
  }

  return false
}

const waitForDocker = (timeoutMs = 60_000, pollMs = 2_000) => {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const status = checkDocker()
    if (status.ok) return { ok: true }
    if (status.permissionDenied) return { ok: false, permissionDenied: true }
    sleepSync(pollMs)
  }

  return { ok: false }
}

function main() {
  const status = checkDocker()

  if (status.ok) {
    return
  }

  if (status.missingCli) {
    console.error(
      'Docker CLI not found. Install Docker Desktop or the Docker engine to run `pnpm dev`.'
    )
    process.exit(1)
  }

  if (status.permissionDenied) {
    console.error(
      'Docker is installed but this user cannot access the daemon (permission denied).'
    )
    console.error(
      'Add the user to the docker group (e.g. `sudo usermod -aG docker $USER && newgrp docker`) or run Docker rootless, then rerun `pnpm dev`.'
    )
    process.exit(1)
  }

  console.log(
    'Docker is not running or not reachable. Attempting to start it...'
  )

  const started = tryStartDocker()
  if (!started) {
    console.error(
      'Could not start Docker automatically. Please start Docker Desktop or the docker service, then rerun `pnpm dev`.'
    )
    process.exit(1)
  }

  const ready = waitForDocker()
  if (ready.ok) {
    console.log('Docker is running.')
    return
  }

  if (ready.permissionDenied) {
    console.error(
      'Docker started but this user still cannot access the daemon (permission denied).'
    )
    console.error(
      'Add the user to the docker group (e.g. `sudo usermod -aG docker $USER && newgrp docker`) or run Docker rootless, then rerun `pnpm dev`.'
    )
    process.exit(1)
  }

  console.error(
    'Docker did not become ready within 60s. Start it manually and rerun `pnpm dev`.'
  )
  process.exit(1)
}

main()
