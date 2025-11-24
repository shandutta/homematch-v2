const { exec } = require('child_process')
const { promisify } = require('util')
const net = require('net')
const execPromise = promisify(exec)

// Delay helper for retry logic
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Check if a port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(true)
      }
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port)
  })
}

async function killProcessOnPort(port, options = {}) {
  const { maxRetries = 3, retryDelay = 1000 } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔍 Searching for process on port ${port}... (attempt ${attempt}/${maxRetries})`
      )

      if (process.platform === 'win32') {
        // Windows - use netstat and parse output
        const { stdout } = await execPromise('netstat -ano')
        const lines = stdout.trim().split('\n')

        // Find the line that contains our port and is LISTENING
        const processLine = lines.find((line) => {
          const trimmed = line.trim()
          return trimmed.includes(`:${port}`) && trimmed.includes('LISTENING')
        })

        if (!processLine) {
          const available = await isPortAvailable(port)
          if (available) {
            console.log(`✅ No process found on port ${port}.`)
            return true
          }
          console.warn(
            `⚠️  Port ${port} appears in use but no PID found (Windows). Retrying...`
          )
          if (attempt < maxRetries) {
            await delay(retryDelay)
            continue
          }
          return false
        }

        // Extract PID from the last column
        const pid = processLine.trim().split(/\s+/).pop()

        if (!pid || isNaN(pid)) {
          console.error(`❌ Could not extract PID from netstat output.`)
          if (attempt < maxRetries) {
            await delay(retryDelay)
            continue
          }
          return false
        }

        console.log(`🎯 Found process with PID ${pid}. Killing...`)
        await execPromise(`taskkill /PID ${pid} /F`)
        console.log(`✅ Process ${pid} killed successfully.`)
      } else {
        // macOS & Linux - try fuser first, then lsof
        let pids = []
        try {
          const { stdout: fuserStdout } = await execPromise(
            `fuser -n tcp ${port}`
          )
          pids = fuserStdout.trim().split(/\s+/).filter(Boolean)
        } catch {
          // ignore; fall back to lsof
        }

        if (pids.length === 0) {
          const { stdout } = await execPromise(`lsof -ti:${port}`)
          pids = stdout.trim().split('\n').filter(Boolean)
        }

        if (pids.length === 0) {
          // Double-check availability; if still blocked, try fuser as a fallback
          const available = await isPortAvailable(port)
          if (available) {
            console.log(`✅ No process found on port ${port}.`)
            return true
          }

          console.warn(
            `⚠️  Port ${port} appears in use but no PIDs found. Trying fuser...`
          )
          try {
            await execPromise(`fuser -k -n tcp ${port}`)
          } catch {
            // Ignore fuser errors; we'll check availability next
          }

          await delay(500)
          const availableAfter = await isPortAvailable(port)
          if (availableAfter) {
            console.log(`✅ Port ${port} freed via fallback.`)
            return true
          }

          if (attempt < maxRetries) {
            console.log(`⚠️  Port ${port} still in use, retrying...`)
            await delay(retryDelay)
            continue
          }

          return false
        }

        for (const pid of pids) {
          console.log(`🎯 Found process with PID ${pid}. Killing...`)
          await execPromise(`kill -9 ${pid}`)
          console.log(`✅ Process ${pid} killed successfully.`)
        }
      }

      // Wait a bit for the port to be released
      await delay(500)

      // Verify the port is actually available
      const available = await isPortAvailable(port)
      if (available) {
        console.log(`✅ Port ${port} is now available.`)
        return true
      } else {
        console.log(`⚠️  Port ${port} still in use, retrying...`)
        if (attempt < maxRetries) {
          await delay(retryDelay)
          continue
        }
        return false
      }
    } catch (error) {
      // Handle the case where lsof returns empty (no process found)
      if (error.code === 1 && error.stdout === '') {
        console.log(`✅ No process found on port ${port}.`)
        return true
      } else {
        console.error(`❌ An error occurred:`, error.stderr || error.message)
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying in ${retryDelay}ms...`)
          await delay(retryDelay)
          continue
        }
        return false
      }
    }
  }

  return false
}

// Export functions for use in other scripts
module.exports = { killProcessOnPort, isPortAvailable }

// Run if called directly
if (require.main === module) {
  // Get port from command line argument or use 3000 as default
  const port = parseInt(process.argv[2], 10) || 3000

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ Please provide a valid port number between 1 and 65535.')
    process.exit(1)
  }

  killProcessOnPort(port).then((success) => {
    if (!success) {
      console.error(`❌ Failed to free port ${port} after all retries.`)
      process.exit(1)
    }
  })
}
