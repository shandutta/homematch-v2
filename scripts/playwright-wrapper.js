#!/usr/bin/env node

/**
 * Playwright wrapper script to avoid pnpm module resolution conflicts
 * This ensures we use the correct @playwright/test installation
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Dynamically find the Playwright CLI in pnpm's .pnpm directory
function findPlaywrightCli() {
  const pnpmDir = path.join(__dirname, '..', 'node_modules', '.pnpm')

  // Find all @playwright+test directories and use the latest version
  const entries = fs.readdirSync(pnpmDir)
  const playwrightDirs = entries
    .filter((entry) => entry.startsWith('@playwright+test@'))
    .sort()
    .reverse() // Sort in descending order to get latest version first

  if (playwrightDirs.length === 0) {
    throw new Error('Could not find @playwright/test in node_modules/.pnpm')
  }

  // Use the latest version (first after reverse sort)
  const playwrightDir = playwrightDirs[0]
  console.log(`Using Playwright from: ${playwrightDir}`)

  return path.join(
    pnpmDir,
    playwrightDir,
    'node_modules',
    '@playwright',
    'test',
    'cli.js'
  )
}

// Path to the correct Playwright CLI
const playwrightCli = findPlaywrightCli()

// Pass through all arguments
const args = process.argv.slice(2)

// Spawn the Playwright process with environment variables
const child = spawn('node', [playwrightCli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    NEXT_PUBLIC_TEST_MODE: process.env.NEXT_PUBLIC_TEST_MODE || 'true',
  },
})

// Handle process exit
child.on('close', (code) => {
  process.exit(code)
})

child.on('error', (err) => {
  console.error('Failed to start Playwright:', err)
  process.exit(1)
})
