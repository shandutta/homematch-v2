const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const rootDir = path.join(__dirname, '..')
const defaultProductionHostsPath = path.join(
  rootDir,
  'config',
  'supabase-production-hosts.json'
)

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

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}
  return dotenv.parse(fs.readFileSync(filePath))
}

const loadEnvFile = (filePath, env) => {
  const parsed = parseEnvFile(filePath)
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] === undefined) env[key] = value
  }
  return parsed
}

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

const normalizeHost = (host) => {
  if (!host) return null
  const lower = host.toLowerCase().trim()
  return lower.includes(':') ? lower.split(':')[0] : lower
}

const loadProductionHosts = (filePath = defaultProductionHostsPath) => {
  if (!fs.existsSync(filePath)) return []

  try {
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!Array.isArray(config.hosts)) return []

    return config.hosts
      .map((host) => normalizeHost(getHost(host) || host))
      .filter(Boolean)
  } catch (error) {
    throw new Error(
      `Unable to parse non-secret production Supabase host config at ${filePath}: ${error.message}`
    )
  }
}

const buildProdHosts = (prodEnv, productionHostsPath) =>
  new Set(
    [
      getHost(prodEnv.SUPABASE_URL),
      getHost(prodEnv.NEXT_PUBLIC_SUPABASE_URL),
      ...loadProductionHosts(productionHostsPath),
    ]
      .map(normalizeHost)
      .filter(Boolean)
  )

const evaluateSupabaseGuard = ({ env, prodEnv, productionHostsPath }) => {
  const hasProdBaseline = Object.keys(prodEnv).length > 0

  const matches = keysToCheck
    .map((key) => {
      const current = env[key]
      const prod = prodEnv[key]
      return current && prod && current.trim() === prod.trim() ? key : null
    })
    .filter(Boolean)

  const prodHosts = buildProdHosts(prodEnv, productionHostsPath)
  const currentHost = normalizeHost(
    getHost(env.SUPABASE_URL) || getHost(env.NEXT_PUBLIC_SUPABASE_URL)
  )
  const hostMatches = currentHost && prodHosts.has(currentHost)

  // Block if any Supabase-related host looks like a real Supabase project (supabase.*)
  // and is not explicitly allowed. Use suffix checks to prevent bypass via domains like
  // 'pooler.supabase.com.evil.com'.
  const currentHostsToCheck = [
    currentHost,
    getHost(env.POSTGRES_HOST),
    getHost(env.POSTGRES_URL),
    getHost(env.POSTGRES_URL_NON_POOLING),
  ]
    .map(normalizeHost)
    .filter(Boolean)

  const looksLikeProdSupabaseHost = currentHostsToCheck.some((host) => {
    if (allowHosts.has(host)) return false
    return (
      suspiciousHostPattern.test(host) ||
      host.endsWith('.pooler.supabase.com') ||
      host === 'pooler.supabase.com'
    )
  })

  const offenders = [...matches]
  if (hostMatches) offenders.push('SUPABASE_URL_HOST')
  if (looksLikeProdSupabaseHost) offenders.push('SUPABASE_HOST_PATTERN')

  return {
    blocked: offenders.length > 0,
    offenders,
    hasProdBaseline,
  }
}

const runGuard = ({
  env = process.env,
  root = rootDir,
  logger = console,
  exit = process.exit,
} = {}) => {
  const envLocalPath = path.join(root, '.env.local')
  const envProdPath = path.join(root, '.env.prod')
  const productionHostsPath = path.join(
    root,
    'config',
    'supabase-production-hosts.json'
  )

  // Load local env so process.env matches what dev uses, including an intentionally
  // local-only SKIP_SUPABASE_GUARD=true entry in .env.local.
  loadEnvFile(envLocalPath, env)

  if (env.SKIP_SUPABASE_GUARD === 'true') {
    logger.log('⏩ Skipping Supabase env guard (SKIP_SUPABASE_GUARD=true)')
    return exit(0)
  }

  const prodEnv = parseEnvFile(envProdPath)
  const result = evaluateSupabaseGuard({ env, prodEnv, productionHostsPath })

  if (result.blocked) {
    logger.error(
      '❌ Supabase env looks like production. Matching keys:',
      result.offenders.join(', ')
    )
    logger.error(
      '   Update .env.local to point at your local/proxy instance (e.g. SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54200 or your dev proxy).'
    )
    logger.error(
      '   This guard compares against .env.prod when available and always blocks tracked non-secret production Supabase hosts plus supabase.* host patterns.'
    )
    return exit(1)
  }

  if (!result.hasProdBaseline) {
    logger.warn(
      '⚠️  .env.prod not found or empty. Used tracked non-secret production host config and supabase.* host detection; add .env.prod only through approved local secret handling if exact value comparisons are needed.'
    )
  }

  return undefined
}

if (require.main === module) {
  runGuard()
}

module.exports = {
  buildProdHosts,
  evaluateSupabaseGuard,
  getHost,
  loadProductionHosts,
  normalizeHost,
  runGuard,
}
