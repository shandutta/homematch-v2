import { describe, test, expect } from 'vitest'
import fs from 'node:fs'
import dotenv from 'dotenv'

describe('Production test credentials (opt-in)', () => {
  const shouldRun = process.env.ENABLE_PROD_AUTH_CHECK === 'true'
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('authenticates test user against prod Supabase', async () => {
    if (!fs.existsSync('.env.prod') || !fs.existsSync('.env.local')) {
      throw new Error('Missing .env.prod or .env.local for prod auth check')
    }

    const prodEnv = dotenv.parse(fs.readFileSync('.env.prod'))
    const localEnv = dotenv.parse(fs.readFileSync('.env.local'))

    const url =
      prodEnv.NEXT_PUBLIC_SUPABASE_URL ||
      prodEnv.SUPABASE_URL ||
      prodEnv.SUPABASE_LOCAL_PROXY_TARGET
    const anonKey =
      prodEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || prodEnv.SUPABASE_ANON_KEY
    const email = localEnv.TEST_USER_EMAIL
    const password = localEnv.TEST_USER_PASSWORD

    if (!url || !anonKey || !email || !password) {
      throw new Error('Missing required env vars for prod auth check')
    }

    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const payload = await response.json().catch(() => null)

    expect(response.ok).toBe(true)
    expect(payload?.access_token).toBeTruthy()
  })
})
