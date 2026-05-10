#!/usr/bin/env node

/**
 * Runner for the tp0 Playwright spec (public-pages smoke + redirect guard).
 *
 * Locates @playwright/test in the pnpm store — either in this project's
 * node_modules or, when running from a git worktree, in the parent project's
 * store — then spawns the CLI with the tp0 config.
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

function findPnpmDir(startDir) {
  let dir = startDir
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'node_modules', '.pnpm')
    if (fs.existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  return null
}

function findPlaywrightCli(pnpmDir) {
  const entries = fs
    .readdirSync(pnpmDir)
    .filter((e) => e.startsWith('@playwright+test@'))
    .sort()
    .reverse()
  if (!entries.length) throw new Error(`No @playwright/test in ${pnpmDir}`)
  return path.join(
    pnpmDir,
    entries[0],
    'node_modules',
    '@playwright',
    'test',
    'cli.js'
  )
}

const projectRoot = path.join(__dirname, '..')

// In a git worktree, node_modules live in the main worktree (not this branch worktree).
// Derive the main project root via git's common-dir pointer.
function findMainProjectRoot(startDir) {
  try {
    const { execSync } = require('child_process')
    const commonDir = execSync('git rev-parse --git-common-dir', {
      cwd: startDir,
      encoding: 'utf8',
    }).trim()
    // common-dir is <main-project>/.git — its parent is the main project root
    const mainGitDir = path.resolve(startDir, commonDir)
    return path.dirname(mainGitDir)
  } catch {
    return startDir
  }
}

const pnpmDir = findPnpmDir(projectRoot) || findPnpmDir(findMainProjectRoot(projectRoot))
if (!pnpmDir) {
  console.error(
    'Could not locate node_modules/.pnpm. Run pnpm install first.'
  )
  process.exit(1)
}

const cli = findPlaywrightCli(pnpmDir)
const rootWithModules = path.dirname(path.dirname(pnpmDir)) // project root that owns node_modules

// The pnpm store entry for @playwright/test contains its own node_modules,
// which is where `@playwright/test` is resolvable as a package name.
// e.g. <pnpmDir>/@playwright+test@1.56.1/node_modules  →  contains @playwright/test
const playwrightEntry = path.basename(path.dirname(path.dirname(path.dirname(cli)))) // "@playwright+test@1.56.1"
const playwrightNodeModules = path.join(pnpmDir, playwrightEntry, 'node_modules')

// Build NODE_PATH so @playwright/test resolves from the worktree config file.
const extraNodePath = [
  playwrightNodeModules,
  path.join(rootWithModules, 'node_modules'), // top-level node_modules
].join(path.delimiter)

const args = [cli, 'test', '--config', path.join(projectRoot, 'playwright.tp0.config.ts'), ...process.argv.slice(2)]

console.log(`Using Playwright from: ${path.relative(rootWithModules, cli)}`)

const child = spawn('node', args, {
  stdio: 'inherit',
  cwd: rootWithModules,
  env: {
    ...process.env,
    NODE_PATH: extraNodePath + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : ''),
    NEXT_PUBLIC_TEST_MODE: process.env.NEXT_PUBLIC_TEST_MODE || 'true',
  },
})

child.on('close', (code) => process.exit(code))
child.on('error', (err) => { console.error('Failed to start Playwright:', err); process.exit(1) })
