#!/usr/bin/env node

/**
 * D6 DB validation evidence runner (no-secret, dry-run).
 *
 * Operator-proof guard for the D6 reset/lint/rollback/integration evidence
 * plan in reports/home-match-revival/d6-db-execution-evidence-plan-2026-05-08.md.
 *
 * Always dry-run: this script never executes supabase reset/lint/db query,
 * never invokes Docker, and never echoes secret values. It classifies the
 * Supabase URL target as one of:
 *
 *   - local-loopback   (127.0.0.1, localhost, supabase.local)
 *   - dev-proxy        (dev.homematch.pro)
 *   - preview-branch   (supabase.* host, only if --preview-branch is passed
 *                      and the host is not in config/supabase-production-hosts.json)
 *   - production       (refuses; exits 1)
 *   - unset / unknown  (warns; exits 0)
 *
 * It then prints the enumerated E1-E4 commands so the operator can run
 * them themselves under their own approval, with the relevant stop
 * conditions.
 */

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const PHASE1_MIGRATIONS = [
  '20260507225000_add_schema_safety_constraints.sql',
  '20260508000000_add_property_stats_rpc.sql',
  '20260508001000_harden_security_definer_search_paths.sql',
  '20260508003500_fix_properties_public_select_policy.sql',
  '20260508015000_fix_interaction_uniqueness.sql',
  '20260508021000_add_user_profiles_delete_policy.sql',
  '20260508022000_add_jsonb_gin_indexes.sql',
  '20260508023000_add_realtime_mutual_like_payload_rpc.sql',
  '20260508024000_create_admin_role_assignments.sql',
]

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', 'supabase.local'])
const DEV_PROXY_HOSTS = new Set(['dev.homematch.pro'])
const SUPABASE_PROD_PATTERN = /(\.supabase\.co|\.supabase\.net|\.supabase\.com|\.supabase\.in)$/i
const POOLER_SUFFIX = '.pooler.supabase.com'

const SECRET_KEY_NAMES = [
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_ACCESS_TOKEN',
  'POSTGRES_PASSWORD',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
]

const getHost = (value) => {
  if (!value) return null
  try {
    return new URL(value).host.toLowerCase()
  } catch {
    if (/^[\w.-]+$/.test(value)) return value.toLowerCase()
    return null
  }
}

const stripPort = (host) => {
  if (!host) return null
  return host.includes(':') ? host.split(':')[0] : host
}

const loadProductionHosts = (root) => {
  const filePath = path.join(root, 'config', 'supabase-production-hosts.json')
  if (!fs.existsSync(filePath)) return new Set()
  try {
    const cfg = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!Array.isArray(cfg.hosts)) return new Set()
    return new Set(
      cfg.hosts
        .map((h) => stripPort(getHost(h) || (typeof h === 'string' ? h.toLowerCase() : null)))
        .filter(Boolean)
    )
  } catch {
    return new Set()
  }
}

const isSupabaseProdShape = (host) => {
  if (!host) return false
  if (host === 'pooler.supabase.com') return true
  if (host.endsWith(POOLER_SUFFIX)) return true
  return SUPABASE_PROD_PATTERN.test(host)
}

const classifyTarget = ({
  env,
  root,
  previewBranchAcknowledged = false,
}) => {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const host = stripPort(getHost(url))
  const offenders = []

  if (!host) {
    return { target: 'unset', host: null, offenders }
  }

  if (LOOPBACK_HOSTS.has(host)) {
    return { target: 'local-loopback', host, offenders }
  }

  if (DEV_PROXY_HOSTS.has(host)) {
    return { target: 'dev-proxy', host, offenders }
  }

  const prodHosts = loadProductionHosts(root)
  if (prodHosts.has(host)) {
    offenders.push('SUPABASE_URL_HOST_TRACKED_PRODUCTION')
    return { target: 'production', host, offenders }
  }

  // Also block if any companion env points at a tracked or supabase-shaped host.
  const companionHosts = [
    stripPort(getHost(env.POSTGRES_HOST)),
    stripPort(getHost(env.POSTGRES_URL)),
    stripPort(getHost(env.POSTGRES_URL_NON_POOLING)),
  ].filter(Boolean)

  for (const companion of companionHosts) {
    if (prodHosts.has(companion)) {
      offenders.push('POSTGRES_HOST_TRACKED_PRODUCTION')
      return { target: 'production', host, offenders }
    }
    if (isSupabaseProdShape(companion) && !previewBranchAcknowledged) {
      offenders.push('POSTGRES_HOST_SUPABASE_SHAPE')
      return { target: 'production', host, offenders }
    }
  }

  if (isSupabaseProdShape(host)) {
    if (previewBranchAcknowledged) {
      return { target: 'preview-branch', host, offenders }
    }
    offenders.push('SUPABASE_URL_HOST_SHAPE')
    return { target: 'production', host, offenders }
  }

  return { target: 'unknown', host, offenders }
}

const findPhase1Migrations = (root) => {
  const dir = path.join(root, 'supabase', 'migrations')
  if (!fs.existsSync(dir)) return []
  const files = new Set(fs.readdirSync(dir))
  return PHASE1_MIGRATIONS.filter((f) => files.has(f))
}

const formatPlan = ({ target, migrations }) => {
  const lines = []
  lines.push('🛡️  D6 DB validation evidence runner — DRY-RUN')
  lines.push('   This script never executes destructive commands.')
  lines.push(`   target classification: ${target}`)
  lines.push('')
  lines.push('Plan (operator-run only — runner does not invoke these):')
  lines.push('')
  lines.push('E1 — supabase db reset clean replay')
  if (target === 'local-loopback') {
    lines.push(
      '   pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime'
    )
    lines.push('   pnpm dlx supabase@latest db reset')
  } else if (target === 'preview-branch') {
    lines.push('   pnpm dlx supabase@latest branches create d6-reset-evidence')
    lines.push('   pnpm dlx supabase@latest db reset --linked   # preview branch only')
  } else if (target === 'dev-proxy') {
    lines.push('   <dev-proxy: route via local Supabase wrapper, do not target the proxy directly>')
  } else {
    lines.push('   <skipped — target is not local-loopback or approved preview-branch>')
  }
  lines.push('')
  lines.push('E2 — supabase db lint clean run')
  if (target === 'local-loopback') {
    lines.push('   pnpm dlx supabase@latest db lint --schema public')
  } else if (target === 'preview-branch') {
    lines.push('   pnpm dlx supabase@latest db lint --linked --schema public')
  } else {
    lines.push('   <skipped>')
  }
  lines.push('')
  lines.push('E3 — UP→DOWN→UP rollback dry-run for each Phase 1 migration')
  if (migrations.length === 0) {
    lines.push('   <no Phase 1 migrations found in supabase/migrations>')
  } else {
    for (const migration of migrations) {
      lines.push(`   - ${migration}`)
    }
    lines.push('   stop before DOWN of fix_interaction_uniqueness against any data,')
    lines.push('   and before DOWN of create_admin_role_assignments without a recorded D1 cutover decision.')
  }
  lines.push('')
  lines.push('E4 — Vitest integration suite against the reset stack')
  lines.push('   pnpm run test:integration')
  lines.push('')
  lines.push('Stop conditions (enforced by this runner):')
  lines.push('   - SUPABASE_URL classified as production → refused (exit 1).')
  lines.push('   - --preview-branch ack only allowed when the host is NOT in')
  lines.push('     config/supabase-production-hosts.json.')
  lines.push('   - secrets (SUPABASE_*_KEY, SUPABASE_DB_PASSWORD, POSTGRES_PASSWORD,')
  lines.push('     POSTGRES_URL) are never printed; only category labels.')
  return lines
}

const sanitizeEnvSummary = (env) => {
  const summary = {}
  for (const key of SECRET_KEY_NAMES) {
    if (env[key]) summary[key] = '<set, redacted>'
  }
  return summary
}

const run = ({
  env = process.env,
  root = path.join(__dirname, '..'),
  argv = [],
  logger = console,
  exit = process.exit,
} = {}) => {
  const previewBranchAcknowledged = argv.includes('--preview-branch')

  const envLocalPath = path.join(root, '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envLocalPath))
    for (const [k, v] of Object.entries(parsed)) {
      if (env[k] === undefined) env[k] = v
    }
  }

  const classification = classifyTarget({ env, root, previewBranchAcknowledged })
  const migrations = findPhase1Migrations(root)

  if (classification.target === 'production') {
    logger.error('❌ D6 evidence runner refusing: target classifies as production.')
    logger.error(
      `   offender categories: ${classification.offenders.join(', ') || 'SUPABASE_URL_HOST'}`
    )
    logger.error(
      '   Run against 127.0.0.1 / localhost or pass --preview-branch ' +
        'after creating a Supabase preview branch (must not be in ' +
        'config/supabase-production-hosts.json).'
    )
    return exit(1)
  }

  if (classification.target === 'unset') {
    logger.warn(
      '⚠️  SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL not set; printing plan with no target-specific commands.'
    )
  } else if (classification.target === 'unknown') {
    logger.warn(
      '⚠️  Target host did not match local-loopback, dev-proxy, preview-branch, or tracked-production. ' +
        'Treating as advisory dry-run only.'
    )
  }

  for (const line of formatPlan({ target: classification.target, migrations })) {
    logger.log(line)
  }

  const summary = sanitizeEnvSummary(env)
  if (Object.keys(summary).length > 0) {
    logger.log('')
    logger.log('Detected secret-bearing env keys (redacted):')
    for (const k of Object.keys(summary)) logger.log(`   - ${k}: <set, redacted>`)
  }

  return exit(0)
}

if (require.main === module) {
  run({ argv: process.argv.slice(2) })
}

module.exports = {
  PHASE1_MIGRATIONS,
  classifyTarget,
  findPhase1Migrations,
  formatPlan,
  isSupabaseProdShape,
  loadProductionHosts,
  run,
  sanitizeEnvSummary,
}
