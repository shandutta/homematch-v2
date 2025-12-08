#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const dotenv = require('dotenv')

const rootDir = path.join(__dirname, '..')
const envPath = path.join(rootDir, '.env.local')

const isValidKey = (value) => {
  if (!value) return false
  try {
    const buf = Buffer.from(value.trim(), 'base64')
    return buf.length === 32
  } catch {
    return false
  }
}

const loadExisting = () => {
  if (process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
    return process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
  }

  if (!fs.existsSync(envPath)) return null

  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath))
    return parsed.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY || null
  } catch {
    return null
  }
}

const persistKey = (key) => {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

  const line = `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${key}`
  const lines = content.split(/\r?\n/)
  const idx = lines.findIndex((l) =>
    l.startsWith('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=')
  )

  if (idx >= 0) {
    lines[idx] = line
    content = lines.join('\n')
  } else {
    content = `${content}${content.endsWith('\n') || content === '' ? '' : '\n'}${line}\n`
  }

  fs.writeFileSync(envPath, content)
}

function main() {
  const existing = loadExisting()

  if (isValidKey(existing)) {
    process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = existing.trim()
    console.log('[ensure-server-action-key] Using existing stable key')
    return
  }

  const key = crypto.randomBytes(32).toString('base64')
  persistKey(key)
  process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = key

  console.log(
    `[ensure-server-action-key] Generated NEXT_SERVER_ACTIONS_ENCRYPTION_KEY and wrote to ${path.relative(
      rootDir,
      envPath
    )}`
  )
}

main()
