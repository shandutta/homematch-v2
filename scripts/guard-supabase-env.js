const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const rootDir = path.join(__dirname, '..')
const envLocalPath = path.join(rootDir, '.env.local')
const envProdPath = path.join(rootDir, '.env.prod')

// Load local env so process.env matches what dev uses
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
}

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}
  return dotenv.parse(fs.readFileSync(filePath))
}

const prodEnv = parseEnvFile(envProdPath)
const hasProdBaseline = Object.keys(prodEnv).length > 0

// Fallback known production Supabase hosts so we still block if .env.prod is missing
const fallbackProdHosts = ['lpwlbbowavozpywnpamn.supabase.co']

const allowHosts = new Set([
  '127.0.0.1',
  'localhost',
  'supabase.local',
  'dev.homematch.pro', // current dev proxy host
])

const suspiciousHostPattern =
  /(supabase\.co|supabase\.net|supabase\.com|supabase\.in)$/i

const keysToCheck = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'POSTGRES_HOST',
]

const matches = keysToCheck
  .map((key) => {
    const current = process.env[key]
    const prod = prodEnv[key]
    return current && prod && current.trim() === prod.trim() ? key : null
  })
  .filter(Boolean)

const getHost = (value) => {
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    // Handle bare hosts (e.g. POSTGRES_HOST)
    if (/^[\w.-]+$/.test(value)) return value
    return null
  }
}

// Catch cases where URLs differ by protocol/path but still point to prod host
const prodHosts = new Set(
  [
    getHost(prodEnv.SUPABASE_URL),
    getHost(prodEnv.NEXT_PUBLIC_SUPABASE_URL),
    ...fallbackProdHosts,
  ].filter(Boolean)
)

const currentHost =
  getHost(process.env.SUPABASE_URL) ||
  getHost(process.env.NEXT_PUBLIC_SUPABASE_URL)
const hostMatches =
  currentHost &&
  Array.from(prodHosts).some(
    (host) => host.toLowerCase() === currentHost.toLowerCase()
  )

// Block if any Supabase-related host looks like a real Supabase project (supabase.*) and is not explicitly allowed
const currentHostsToCheck = [
  currentHost,
  getHost(process.env.POSTGRES_HOST),
  getHost(process.env.POSTGRES_URL),
  getHost(process.env.POSTGRES_URL_NON_POOLING),
].filter(Boolean)

const looksLikeProdSupabaseHost = currentHostsToCheck.some((host) => {
  const normalized = host.toLowerCase()
  if (allowHosts.has(normalized)) return false
  return (
    suspiciousHostPattern.test(normalized) ||
    normalized.includes('pooler.supabase.com')
  )
})

if (matches.length || hostMatches || looksLikeProdSupabaseHost) {
  const offenders = [...matches]
  if (hostMatches) offenders.push('SUPABASE_URL_HOST')
  if (looksLikeProdSupabaseHost) offenders.push('SUPABASE_HOST_PATTERN')

  console.error(
    '❌ Supabase env looks like production. Matching keys:',
    offenders.join(', ')
  )
  console.error(
    '   Update .env.local to point at your local/proxy instance (e.g. SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 or your dev proxy).'
  )
  console.error(
    '   This guard compares against .env.prod and blocks dev resets when values match production.'
  )
  process.exit(1)
}

if (!hasProdBaseline) {
  console.warn(
    '⚠️  .env.prod not found or empty. Used fallback prod host list and supabase.* host detection; add .env.prod to make this guard stricter.'
  )
}
