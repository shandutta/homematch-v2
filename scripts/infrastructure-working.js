#!/usr/bin/env node

/**
 * WORKING Infrastructure Management
 * TESTED SOLUTIONS: PowerShell + Direct Supabase Binary
 */

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

class WorkingInfrastructure {
  constructor() {
    this.supabaseBinary = process.env.SUPABASE_CLI || 'supabase'
    this.supabasePathDefault = path.join(
      os.homedir(),
      '.local',
      'bin',
      'supabase'
    )
    this.supabaseWindowsBinary = path.join(__dirname, '..', 'supabase.exe')
    this.timeout = 120000
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19)
    const prefix =
      {
        info: '✅',
        warn: '⚠️',
        error: '❌',
        progress: '🔄',
      }[type] || 'ℹ️'

    console.log(`[${timestamp}] ${prefix} ${message}`)
  }

  async ensureSupabaseBinary() {
    const candidates = [
      process.env.SUPABASE_CLI,
      'supabase',
      this.supabasePathDefault,
      this.supabaseWindowsBinary,
    ].filter(Boolean)

    for (const candidate of candidates) {
      if (candidate === 'supabase') {
        try {
          execSync('supabase --version', { stdio: 'ignore' })
          this.supabaseBinary = 'supabase'
          return true
        } catch {
          continue
        }
      }

      if (fs.existsSync(candidate)) {
        this.supabaseBinary = candidate
        return true
      }
    }

    await this.log(
      'Supabase CLI not found. Install it (see docs) or set SUPABASE_CLI to the binary path.',
      'error'
    )
    return false
  }

  async checkDockerStatus() {
    try {
      execSync('docker version', { stdio: 'ignore' })
      await this.log('Docker is running')
      return true
    } catch {
      await this.log('Docker is not running', 'error')
      return false
    }
  }

  async startDocker() {
    await this.log('Starting Docker Desktop...', 'progress')

    try {
      // TESTED WORKING SOLUTION
      execSync(
        `powershell -Command "Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe' -WindowStyle Hidden"`
      )

      // Wait for Docker to be ready
      let attempts = 0
      while (attempts < 30) {
        try {
          execSync('docker version', { stdio: 'ignore' })
          await this.log('Docker started successfully')
          return true
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          attempts++
        }
      }

      throw new Error('Docker failed to start within 60 seconds')
    } catch (error) {
      await this.log(`Failed to start Docker: ${error.message}`, 'error')
      return false
    }
  }

  async runSupabaseCommand(command, options = {}) {
    if (!(await this.ensureSupabaseBinary())) {
      throw new Error('Supabase binary not available')
    }

    return new Promise((resolve, reject) => {
      const args = command.split(' ')
      const supabase = spawn(this.supabaseBinary, args, {
        stdio: options.silent ? 'ignore' : 'inherit',
        cwd: process.cwd(),
      })

      supabase.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code })
        } else {
          reject(new Error(`Supabase command failed with code ${code}`))
        }
      })

      supabase.on('error', (error) => {
        reject(error)
      })
    })
  }

  async checkSupabaseHealth() {
    try {
      const containers = execSync(
        'docker ps --filter name=supabase --format "{{.Names}}"',
        { encoding: 'utf8' }
      )
      const runningContainers = containers
        .trim()
        .split('\n')
        .filter((name) => name)

      if (runningContainers.length > 0) {
        await this.log(
          `${runningContainers.length} Supabase containers running`
        )
        return true
      } else {
        await this.log('No Supabase containers running', 'warn')
        return false
      }
    } catch {
      await this.log('Cannot check Supabase containers', 'warn')
      return false
    }
  }

  async startSupabase(excludeStudio = true) {
    await this.log('Starting Supabase...', 'progress')
    const command = excludeStudio ? 'start -x studio' : 'start'

    try {
      await this.runSupabaseCommand(command)
      await this.log('Supabase started successfully')
      return true
    } catch (error) {
      await this.log(`Failed to start Supabase: ${error.message}`, 'error')
      return false
    }
  }

  async stopSupabase() {
    await this.log('Stopping Supabase...', 'progress')

    try {
      await this.runSupabaseCommand('stop', { silent: true })
      await this.log('Supabase stopped successfully')
      return true
    } catch (error) {
      await this.log(`Failed to stop Supabase: ${error.message}`, 'error')
      return false
    }
  }

  async waitForServicesReady() {
    const maxAttempts = 30
    const delayMs = 2000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // First check if containers are running
        const containers = execSync(
          'docker ps --filter name=supabase --format "{{.Names}}"',
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        )

        const runningContainers = containers
          .trim()
          .split('\n')
          .filter((name) => name)

        if (runningContainers.length === 0) {
          throw new Error('No Supabase containers running')
        }

        // Use timeout with curl to prevent hanging
        const services = [
          'http://127.0.0.1:54321/rest/v1/',
          'http://127.0.0.1:54321/auth/v1/health',
        ]

        let allReady = true
        for (const service of services) {
          try {
            // Use timeout flag and max-time to prevent hanging
            execSync(
              `curl -s -f --connect-timeout 2 --max-time 5 "${service}" > nul 2>&1`,
              {
                stdio: 'ignore',
                timeout: 6000, // 6 second timeout for the command itself
              }
            )
          } catch {
            allReady = false
            break
          }
        }

        if (allReady) {
          await this.log(`All services ready after ${attempt} attempts`)
          return true
        } else {
          throw new Error('Services not yet ready')
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          await this.log('Services not ready after maximum attempts', 'warn')
          await this.log(`Last error: ${error.message}`, 'warn')
          return false
        }
        if (attempt % 5 === 0) {
          await this.log(
            `Still waiting for services... (attempt ${attempt}/${maxAttempts})`,
            'progress'
          )
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  async resetSupabaseDB() {
    await this.log('Resetting Supabase database...', 'progress')

    try {
      await this.runSupabaseCommand('db reset')

      // Wait for all services to be ready after container restart
      await this.log(
        'Waiting for services to be ready after reset...',
        'progress'
      )
      await this.waitForServicesReady()

      await this.log('Supabase database reset successfully')
      return true
    } catch (error) {
      await this.log(`Failed to reset database: ${error.message}`, 'error')
      return false
    }
  }

  async ensureInfrastructure(options = {}) {
    const { restart = false, excludeStudio = true, resetDB = false } = options

    await this.log('🚀 Starting WORKING infrastructure management...')

    // Step 1: Ensure Docker is running
    if (!(await this.checkDockerStatus())) {
      if (!(await this.startDocker())) {
        throw new Error('Failed to start Docker')
      }
    }

    // Step 2: Handle Supabase
    if (restart) {
      await this.stopSupabase()
    }

    const isHealthy = await this.checkSupabaseHealth()
    if (!isHealthy) {
      if (!(await this.startSupabase(excludeStudio))) {
        throw new Error('Failed to start Supabase')
      }
    }

    // Step 3: Reset database if requested
    if (resetDB) {
      if (!(await this.resetSupabaseDB())) {
        throw new Error('Failed to reset database')
      }
    }

    await this.log('🎉 Infrastructure ready with WORKING automation!')
    return true
  }
}

// CLI interface
if (require.main === module) {
  const infrastructure = new WorkingInfrastructure()
  const command = process.argv[2]

  const commands = {
    start: () => infrastructure.ensureInfrastructure(),
    restart: () => infrastructure.ensureInfrastructure({ restart: true }),
    'reset-db': () => infrastructure.ensureInfrastructure({ resetDB: true }),
    'start-docker': () => infrastructure.startDocker(),
    'start-supabase': () => infrastructure.startSupabase(),
    'stop-supabase': () => infrastructure.stopSupabase(),
    health: () => infrastructure.checkSupabaseHealth(),
    version: () => infrastructure.runSupabaseCommand('--version'),
    download: () => infrastructure.ensureSupabaseBinary(),
  }

  if (commands[command]) {
    commands[command]()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('❌ Infrastructure management failed:', error.message)
        process.exit(1)
      })
  } else {
    console.log(`
🚀 WORKING Infrastructure Management

Usage: node scripts/infrastructure-working.js <command>

Commands:
  start           - Ensure full infrastructure is running  
  restart         - Stop and restart infrastructure
  reset-db        - Start infrastructure and reset database
  start-docker    - Start Docker Desktop only
  start-supabase  - Start Supabase only  
  stop-supabase   - Stop Supabase only
  health          - Check infrastructure health
  version         - Show Supabase CLI version
  download        - Download Supabase CLI binary

Examples:
  node scripts/infrastructure-working.js start      # Full startup
  node scripts/infrastructure-working.js restart    # Clean restart
  node scripts/infrastructure-working.js reset-db   # Reset database
    `)
    process.exit(1)
  }
}

module.exports = WorkingInfrastructure
