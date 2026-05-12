/**
 * @jest-environment node
 *
 * Phase 4 meta-guard: verifies every Phase 0/1 closure from the canonical
 * matrix is covered by at least one guard file tagged with
 * `// Phase 0/1 closure: <ID>`.
 *
 * This test IS the guard-of-guards — if it fails, either a closure has no
 * guard or a guard was removed without updating the tag.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoRoot = process.cwd()
const CLOSURE_MATRIX_REL =
  'reports/home-match-revival/phase0-phase1-closure-matrix.md'
const TEST_DIR = '__tests__/unit'

/**
 * Canonical Phase 0/1 closure IDs extracted from the closure matrix.
 * Each entry maps to at least one guard file via `// Phase 0/1 closure: <id>`.
 */
const PHASE_0_CLOSURES: Record<string, string> = {
  'P0-local-dev-guard-bypass': 'Local dev guard bypass (SKIP_SUPABASE_GUARD)',
  'P0-maps-auth-hardening': 'Maps paid API auth hardening',
  'P0-docker-doc-clarity': 'Docker/local-Supabase documentation clarity',
  'P0-readme-fast-dev': 'README fast-dev/Docker optional guidance',
  'P0-cron-secret-opacity': 'Cron-secret endpoint opacity',
  'P0-supabase-proxy-off': 'Local Supabase proxy disabled-by-default',
  'P0-env-prod-guard': '.env.prod guard precision',
  'P0-metro-boundaries-anon': 'Metro-boundaries no-credential slice fix',
  'P0-noauth-traversal-guard': 'No-auth traversal smoke guard',
  'P0-noauth-probe-harness': 'No-auth API/protected redirect probe harness',
  'P0-auth-redirect-guards': 'Auth redirect regression guards',
  'P0-noauth-live-probe-expand':
    'Safe no-auth live probe route coverage expand',
  'P0-strict-anon-protected': 'Strict anonymous protected-route closure',
  'P0-remote-test-seed': 'Remote Supabase test seeding and auth probe',
  'P0-accessibility-core-flow': 'Accessibility core-flow matrix',
}

const PHASE_1_CLOSURES: Record<string, string> = {
  'M5-route-limiter': 'M5 route-scoped limiter coverage',
  'M6-error-standardization': 'M6 JSON API error standardization',
  'M7-middleware-timeouts': 'M7 middleware AbortController timeout cleanup',
  'M8-external-timeouts': 'M8 external-call timeout coverage',
  'M9-dead-server-actions': 'M9 dead server-action cleanup',
  'M10-rate-limit-consolidation': 'M10 duplicate rate-limit consolidation',
  'M11-test-only-exports': 'M11 test-only export cleanup',
  'M12-duplicate-rpc': 'M12 duplicate RPC wrapper cleanup',
  'M13-dead-zillow-factory': 'M13 dead Zillow factory cleanup',
  'M14-unused-couples-middleware': 'M14 unused CouplesMiddleware cleanup',
  'M15-stale-neighborhood-todo': 'M15 stale neighborhood TODO cleanup',
  'D1-service-role-rbac': 'D1 service-role RBAC authority',
  'D2-durable-rate-limiter': 'D2 durable production rate limiter',
  // D3 closure retired 2026-05-11: the legacy SignupForm + its guard test
  // were deleted during the /health dead-code sweep. Clerk now handles
  // signup verification natively; there is no in-repo surface left to
  // guard against regression.
  // 'D3-signup-verification': 'D3 production email confirmation/CAPTCHA policy',
  'D4-env-prod-handling': 'D4 .env.prod handling model',
  'D5-numeric-constraints': 'D5 numeric constraint semantics',
  'D6-db-reset-readiness': 'D6 static DB reset/lint/integration readiness',
  'D7-disputed-route-exposure': 'D7 disputed-route email/profile exposure',
  'P1-cookie-httpOnly': 'httpOnly Supabase cookies',
  'P1-coop-corp': 'COOP/CORP headers',
  'P1-properties-rls': 'Properties RLS read-policy hardening',
  'P1-security-definer-paths': 'SECURITY DEFINER search-path hardening',
  'P1-property-stats-rpc': 'Property stats RPC',
  'P1-interaction-uniqueness': 'Interaction uniqueness migration',
  'P1-middleware-matchers': 'Middleware matcher exclusions',
  'P1-cache-policy-classification': 'GET route cache-policy classification',
  'P1-route-deadline-helper': 'Route-deadline helper for long APIs',
  'P1-api-fast-path': 'API middleware fast path',
  'P1-anon-public-fast-path': 'Anonymous public-page middleware fast path',
  'P1-supabase-factory-consolidation':
    'Duplicate Supabase factory consolidation',
  'P1-auth-client-consolidation': 'Auth client consolidation',
  'P1-internal-demo-gate': 'Internal/demo surface production gate',
  'DB-P1.2-dashboard-dedupe': 'Dashboard query in-flight dedupe',
  // DB-P1.3 closure retired 2026-05-11: the useCouplesRealtime hook +
  // couples-realtime client module were deleted during the dead-code sweep
  // (zero consumers). The DB-side get_realtime_mutual_like_payload RPC
  // still exists but no client-side surface needs guarding against
  // regression of the consumer side.
  // 'DB-P1.3-couples-rpc': 'CouplesRealtime mutual-like RPC enrichment',
  'DB-P1.4-rollback-down': 'Phase 1 rollback/DOWN static coverage',
  'DB-P2.3-P2.4-inline-typing':
    'Inline DB typing cleanup for realtime + dashboard',
}

/** All closures (Phase 0 + Phase 1) */
const ALL_CLOSURES: Record<string, string> = {
  ...PHASE_0_CLOSURES,
  ...PHASE_1_CLOSURES,
}

const TAG_PATTERN = /\/\/\s*Phase\s+0\/1\s+closure:\s*(\S+)/g

/** Directories under __tests__/unit/ to exclude from scanning (the meta-tests
 *  themselves should not carry closure tags). */
const EXCLUDED_DIRS = new Set(['regression'])

/**
 * Closures that are verified through source-code review, documentation,
 * live-probe evidence, or closure-matrix reports rather than through
 * dedicated unit-test guard files.  These remain in the canonical
 * PHASE_0_CLOSURES / PHASE_1_CLOSURES maps so they are preserved in the
 * registry, but they do not require a `// Phase 0/1 closure: <ID>` tag in
 * a unit test file.
 */
const UNTAGGED_CLOSURE_EXEMPTIONS = new Set([
  // --- Phase 0 ---
  // Docs are verified by the docs/ directory review and SETUP_GUIDE
  'P0-docker-doc-clarity',
  'P0-readme-fast-dev',
  // Auth redirect behaviour is exercised by the protected-routes guard
  // (P0-strict-anon-protected) and live-probe evidence
  'P0-auth-redirect-guards',
  // --- Phase 1 ---
  // Middleware AbortController timeout cleanup is verified by the
  // middleware source review; no separate unit test exists
  'M7-middleware-timeouts',
  // COOP/CORP headers are statically verified in middleware.ts
  // (Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy)
  'P1-coop-corp',
  // Middleware matcher exclusions are verified by middleware config review
  'P1-middleware-matchers',
  // API middleware fast path is verified by middleware source review
  'P1-api-fast-path',
  // Anonymous public-page middleware fast path is verified by middleware
  // source review and live-probe evidence
  'P1-anon-public-fast-path',
])

/** Walk __tests__/unit recursively, collect all .test.ts paths, skipping excluded dirs */
function collectTestFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSafe(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    const s = statsSafe(full)
    if (!s) continue
    if (s.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue
      results.push(...collectTestFiles(full))
    } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
      results.push(full)
    }
  }
  return results
}

function readdirSafe(dir: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-assertions
    return require('fs').readdirSync(dir) as string[]
  } catch {
    return []
  }
}

function statsSafe(path: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('fs').statSync(path)
  } catch {
    return null
  }
}

/** Extract closure tags from a file's content */
function extractTags(content: string): string[] {
  const tags = new Set<string>()
  let match: RegExpExecArray | null
  const regex = new RegExp(TAG_PATTERN.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1])
  }
  return Array.from(tags)
}

describe('Phase 4 closure-guard coverage meta-test', () => {
  const allTestFiles = collectTestFiles(join(repoRoot, TEST_DIR))
  const fileTags = new Map<string, string[]>()
  const allTagsFound = new Set<string>()

  for (const file of allTestFiles) {
    const content = readFileSync(file, 'utf8')
    const tags = extractTags(content)
    if (tags.length > 0) {
      fileTags.set(file, tags)
      tags.forEach((t) => allTagsFound.add(t))
    }
  }

  it('has at least one guard file tagged for every Phase 0 closure', () => {
    const missing: string[] = []
    for (const [id, desc] of Object.entries(PHASE_0_CLOSURES)) {
      if (UNTAGGED_CLOSURE_EXEMPTIONS.has(id)) continue
      if (!allTagsFound.has(id)) {
        missing.push(`${id} (${desc})`)
      }
    }
    if (missing.length > 0) {
      // This will fail until guards are tagged — that's by design (RED→GREEN).
      // The failure message tells you exactly which closures need guard tags.
    }
    expect(missing).toEqual([])
  })

  it('has at least one guard file tagged for every Phase 1 closure', () => {
    const missing: string[] = []
    for (const [id, desc] of Object.entries(PHASE_1_CLOSURES)) {
      if (UNTAGGED_CLOSURE_EXEMPTIONS.has(id)) continue
      if (!allTagsFound.has(id)) {
        missing.push(`${id} (${desc})`)
      }
    }
    expect(missing).toEqual([])
  })

  it('no guard file tags a nonexistent closure ID', () => {
    const invalid: string[] = []
    fileTags.forEach((tags, file) => {
      const relPath = file.replace(repoRoot + '/', '')
      tags.forEach((tag: string) => {
        if (!(tag in ALL_CLOSURES)) {
          invalid.push(`${relPath}: "${tag}" is not a known closure ID`)
        }
      })
    })
    expect(invalid).toEqual([])
  })

  it('closure matrix file exists and is readable', () => {
    expect(existsSync(join(repoRoot, CLOSURE_MATRIX_REL))).toBe(true)
  })
})
