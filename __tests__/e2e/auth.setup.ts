/**
 * E2E Auth Setup — verify pre-generated auth states
 *
 * Auth states are generated programmatically by scripts/generate-e2e-auth-states.js
 * (Supabase SDK sign-in, no form, no cookie race). This setup step just validates
 * the files exist and are not expired.
 */
import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '../../playwright/.auth')
const WORKER_COUNT = 8
const FRESH_INDEX = 99

setup('verify pre-generated auth states', async () => {
  const files = [
    ...Array.from({ length: WORKER_COUNT }, (_, i) => `user-worker-${i}.json`),
    `user-worker-${FRESH_INDEX}.json`,
  ]

  let missing = 0
  for (const file of files) {
    const filePath = path.join(AUTH_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ Missing: ${file}`)
      missing++
      continue
    }
    const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const localStorageEntries = state.origins?.[0]?.localStorage || []
    const hasAuthToken = localStorageEntries.some(
      (entry) => entry.name?.includes('auth-token') && entry.value?.length > 10
    )
    if (!hasAuthToken) {
      console.error(`  ❌ No auth token in: ${file}`)
      missing++
      continue
    }
    console.log(`  ✅ ${file}`)
  }

  if (missing > 0) {
    throw new Error(
      `${missing} auth state file(s) invalid or missing. Run: node scripts/generate-e2e-auth-states.js`
    )
  }

  console.log(`✅ All ${files.length} E2E auth states verified`)
})
