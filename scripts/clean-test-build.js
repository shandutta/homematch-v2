#!/usr/bin/env node

/**
 * Clean up test build artifacts
 */

const fs = require('fs')
const path = require('path')

console.log('🧹 Cleaning up test build artifacts...')

const dirs = [
  '.next-test',
  '.next-dev-backup'
]

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir)
  if (fs.existsSync(dirPath)) {
    console.log(`📁 Removing ${dir}...`)
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
})

console.log('✅ Test build cleanup complete!')