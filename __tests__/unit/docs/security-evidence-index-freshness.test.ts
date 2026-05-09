// Phase 0/1 closure: P0-env-prod-guard
import { existsSync, readFileSync } from 'fs'
import * as path from 'path'

const repoRoot = process.cwd()

const INDEX_REL_PATH =
  'reports/home-match-revival/security-evidence-index-2026-05-08.md'
const BLOCKER_INDEX_REL_PATH =
  'reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md'

const readRepoFile = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), 'utf8')

const extractRevivalRefs = (raw: string): string[] => {
  const regex = /reports\/home-match-revival\/[A-Za-z0-9._-]+\.md/g
  const matches = raw.match(regex) ?? []
  return Array.from(new Set(matches))
}

// The canonical security-evidence subset that must remain discoverable from
// the new single index. Each entry is the relative path of an artifact that
// already exists today; if any of these is renamed/moved without updating
// the index, this guard fails so the cross-reference cannot drift silently.
const REQUIRED_SECURITY_ARTIFACTS: ReadonlyArray<string> = [
  'reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md',
  'reports/home-match-revival/auth-audit.md',
  'reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md',
  'reports/home-match-revival/p1-auth-provider-replacement-decision-memo-2026-05-08.md',
  'reports/home-match-revival/rls-security-audit.md',
  'reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md',
  'reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md',
  'reports/home-match-revival/d2-rate-limit-provider-readiness-map-2026-05-08.md',
  'reports/home-match-revival/rate-limit-gap-scout.md',
  'reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md',
  'reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md',
  'reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md',
  'reports/home-match-revival/p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md',
  'reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md',
  'reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md',
  'reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md',
  'reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md',
  'reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md',
  'reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md',
  'reports/home-match-revival/p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md',
]

describe('Phase 0/1 security evidence index freshness', () => {
  const indexRaw = readRepoFile(INDEX_REL_PATH)
  const indexRefs = extractRevivalRefs(indexRaw)

  it('exists at the expected path', () => {
    expect(existsSync(path.join(repoRoot, INDEX_REL_PATH))).toBe(true)
  })

  it('references only artifacts that resolve to real tracked files', () => {
    const missing = indexRefs.filter(
      (ref) => !existsSync(path.join(repoRoot, ref))
    )
    expect(missing).toEqual([])
  })

  it('covers every required canonical security-evidence artifact', () => {
    const indexRefSet = new Set(indexRefs)
    const uncovered = REQUIRED_SECURITY_ARTIFACTS.filter(
      (artifact) => !indexRefSet.has(artifact)
    )
    expect(uncovered).toEqual([])
  })

  it('is itself discoverable from the broader Phase 0/1 blocker evidence index', () => {
    const blockerIndexRaw = readRepoFile(BLOCKER_INDEX_REL_PATH)
    expect(blockerIndexRaw).toContain(INDEX_REL_PATH)
  })

  it('does not authorize live execution, paid APIs, or production data access', () => {
    // The index must keep its read-only scope explicit. If a future edit
    // accidentally removes these guards, fail loudly so a reviewer can
    // restore them before the index is conflated with an execution lane.
    expect(indexRaw).toMatch(/no secrets read/i)
    expect(indexRaw).toMatch(/no paid APIs invoked/i)
    expect(indexRaw).toMatch(/no production data\s+inspected/i)
    expect(indexRaw).toMatch(/does not authorize/i)
  })
})
