#!/usr/bin/env node

/**
 * Playwright wrapper script to avoid pnpm module resolution conflicts
 * This ensures we use the correct @playwright/test installation
 */

const { spawn } = require('child_process')
const path = require('path')

// Path to the correct Playwright CLI
const playwrightCli = path.join(
  __dirname,
  '..',
  'node_modules',
  '.pnpm',
  '@playwright+test@1.54.1',
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
)

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