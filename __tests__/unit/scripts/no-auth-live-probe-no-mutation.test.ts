/**
 * @jest-environment node
 *
 * Static no-mutation guard for the P0 no-auth live-probe harness
 * (`scripts/run-no-auth-live-probes.js` and
 * `__tests__/integration/routing/no-auth-live-probe.spec.ts`).
 *
 * Existing guards exercise behavior dynamically (skipping when the local
 * server is absent, refusing non-local URLs at runtime). This test pins the
 * static text invariants so a future edit cannot silently introduce a
 * mutating HTTP method, drop the explicit opt-in gate, weaken the local-only
 * host allowlist, or add a credential/secret dependency without tripping a
 * fast unit-level guard.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()

const PROBE_SPEC_REL = '__tests__/integration/routing/no-auth-live-probe.spec.ts'
const PROBE_WRAPPER_REL = 'scripts/run-no-auth-live-probes.js'
const HARNESS_REPORT_REL =
  'reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md'

const readRepoFile = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8')

describe('P0 no-auth live-probe harness no-mutation invariants', () => {
  const probeSpec = readRepoFile(PROBE_SPEC_REL)
  const probeWrapper = readRepoFile(PROBE_WRAPPER_REL)

  describe('probe spec', () => {
    it('is gated on the explicit NO_AUTH_LIVE_PROBES_RUN=1 opt-in (default skip)', () => {
      // The describe.skipIf on the negation of the opt-in is what makes the
      // suite default to dry-run. If this gate is removed, the suite would
      // execute on every test run regardless of caller intent.
      expect(probeSpec).toMatch(
        /process\.env\.NO_AUTH_LIVE_PROBES_RUN\s*===\s*['"]1['"]/
      )
      expect(probeSpec).toMatch(/describe\.skipIf\(\s*!\s*RUN_LIVE_PROBES\s*\)/)
    })

    it('uses redirect: "manual" so no protected redirect is followed onto an authenticated surface', () => {
      expect(probeSpec).toMatch(/redirect:\s*['"]manual['"]/)
    })

    it('does not invoke any mutating HTTP method (POST/PUT/PATCH/DELETE)', () => {
      // The harness is read-only by design. It may mention POST-only or
      // DELETE-only routes in explanatory copy, but no fetch() call may set a
      // mutating method.
      expect(probeSpec).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i)
    })

    it('does not attach credentials, bearer tokens, or session cookies on probes', () => {
      expect(probeSpec).not.toMatch(/credentials:\s*['"](include|same-origin)['"]/i)
      expect(probeSpec).not.toMatch(/Authorization\s*:/i)
      expect(probeSpec).not.toMatch(/Cookie\s*:/i)
      expect(probeSpec).not.toMatch(/Bearer\s+/i)
    })

    it('confines probes to synthetic identifiers/tokens (no real fixture data)', () => {
      // Every protected/synthetic probe path uses an explicit `synthetic-*`
      // marker so a reviewer can spot a non-synthetic ID at a glance.
      expect(probeSpec).toContain('/invite/synthetic-invalid-token')
      expect(probeSpec).toContain('/properties/synthetic-property-id')
      expect(probeSpec).toContain('/synthetic-missing-route-for-p0-no-auth-probe')
    })

    it('asserts the configured base URL is local before probing', () => {
      expect(probeSpec).toMatch(/assertLocalBaseUrl/)
      expect(probeSpec).toMatch(
        /\[\s*['"]127\.0\.0\.1['"]\s*,\s*['"]localhost['"]\s*,\s*['"]::1['"]\s*\]/
      )
    })
  })

  describe('probe wrapper script', () => {
    it('refuses non-local target URLs', () => {
      expect(probeWrapper).toMatch(/assertLocalBaseUrl/)
      expect(probeWrapper).toMatch(
        /\[\s*['"]127\.0\.0\.1['"]\s*,\s*['"]localhost['"]\s*,\s*['"]::1['"]\s*\]/
      )
      expect(probeWrapper).toMatch(/Refusing no-auth live probes against non-local URL/)
    })

    it('defaults to a local 127.0.0.1 base URL', () => {
      expect(probeWrapper).toMatch(/['"]http:\/\/127\.0\.0\.1:3000['"]/)
    })

    it('exits cleanly with an explicit SKIP when no local app server is running (no live mutation)', () => {
      expect(probeWrapper).toMatch(/SKIP: no local app server responded/)
      expect(probeWrapper).toMatch(/return\s+exit\(0\)/)
    })

    it('only opts the spawned vitest run into NO_AUTH_LIVE_PROBES_RUN=1; no other live-execution gates are forced on', () => {
      // Explicit opt-in is required to enter the probe matrix at all. Other
      // possible "run live" gates must remain unset by the wrapper so a
      // single edit cannot silently widen the live-execution surface.
      expect(probeWrapper).toMatch(/NO_AUTH_LIVE_PROBES_RUN:\s*['"]1['"]/)
      expect(probeWrapper).not.toMatch(/NO_AUTH_LIVE_PROBES_MUTATE/i)
      expect(probeWrapper).not.toMatch(/LIVE_MUTATION/i)
      expect(probeWrapper).not.toMatch(/RUN_LIVE_MUTATIONS/i)
      expect(probeWrapper).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
      expect(probeWrapper).not.toMatch(/CRON_SECRET/)
    })

    it('does not invoke mutating HTTP methods directly', () => {
      // Wrapper performs only a GET readiness probe to /api/health and then
      // shells out to vitest. Any mutating fetch in the wrapper itself would
      // be out of scope.
      expect(probeWrapper).toMatch(/method:\s*['"]GET['"]/)
      expect(probeWrapper).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i)
    })
  })

  describe('harness report', () => {
    const harnessReport = readRepoFile(HARNESS_REPORT_REL)

    it('keeps the no-mutation guarantees documented for reviewers', () => {
      // If a future edit weakens these documented guarantees, the harness
      // report should be updated in the same change so the review trail
      // stays honest. This guard pins the language reviewers rely on.
      expect(harnessReport).toMatch(/GET render\/status checks only/i)
      expect(harnessReport).toMatch(/redirect:\s*['"]manual['"]/)
      expect(harnessReport).toMatch(/does not POST metrics/i)
      expect(harnessReport).toMatch(/does not use credentials/i)
      expect(harnessReport).toMatch(
        /does not (?:start a server|deploy|use production dashboards|use paid APIs|use browser swarms|submit auth\/signup\/reset\/contact forms)/i
      )
    })
  })
})
