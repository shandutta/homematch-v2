#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')
const targets = ['.next', '.next-build', '.turbo']

for (const target of targets) {
  try {
    fs.rmSync(path.join(PROJECT_ROOT, target), { recursive: true, force: true })
  } catch {
    // ignore missing paths
  }
}

console.log(`🧹 Removed: ${targets.join(', ')}`)
