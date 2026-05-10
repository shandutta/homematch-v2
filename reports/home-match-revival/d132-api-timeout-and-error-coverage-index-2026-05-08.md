# D132 — API Timeout + Error-Envelope Coverage Cross-Index

Generated: 2026-05-08
Scope: read-only static cross-index of the canonical Phase 0/1 evidence
covering M6 (standardized API error envelopes) and M8 (external-call
timeout adoption + the long-Supabase route-deadline helper). No tests,
builds, network calls, live probes, secret reads, dashboard mutations,
or paid-API invocations were performed for this artifact. This index
does not change any gate verdict, does not authorize Phase 2+, and does
not authorize live execution of any plan/probe referenced below.

This index is intentionally **not** a re-statement of:

- `phase0-phase1-strict-closure-gate.md` (the gate itself).
- `phase0-phase1-closure-matrix.md` (the canonical matrix).
- `p0-p1-blocker-evidence-index-2026-05-08.md` (the broader Phase 0/1
  blocker → proof index).
- `security-evidence-index-2026-05-08.md` (security-themed subset).

It exists to give a reviewer one place to find the M6/M8 proof set
without rebuilding it from the ~80+ revival reports.

## Coverage rows

| #   | Surface                                                                                                                   | Artifact                                                                                                                                                                                     | Lane                            |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | M6 raw-error inventory (route-by-route, pre-remediation)                                                                  | `reports/home-match-revival/api-error-standardization-scout.md`                                                                                                                              | Repo-side scout                 |
| 2   | M6 helper + shared-helper standardization (ApiErrorHandler 405/429/502/503/504, admin-rate-limit, rateLimiter middleware) | `reports/home-match-revival/api-error-standardization-remediation-2026-05-08.md`                                                                                                             | Repo-side closed                |
| 3   | M6 route-family conversions (interactions, couples, maps, admin, final JSON)                                              | `reports/home-match-revival/api-error-standardization-remediation-2026-05-08.md` (sections "Additional M6 route conversion" / "Remaining M6 work")                                           | Repo-side closed                |
| 4   | M8 external-call timeout adoption across `src/app/api/**/route.ts`                                                        | `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md`                                                                                                                      | Repo-side closed                |
| 5   | M8/M6 route-deadline helper (`withRouteDeadline` → `ApiErrorHandler.gatewayTimeout`)                                      | `reports/home-match-revival/p1-route-deadline-helper-closure-2026-05-08.md`                                                                                                                  | Repo-side closed                |
| 6   | M8 rate-limit / route-scoped limiter integration referenced from timeout/error envelope flows                             | `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`                                                                                                               | Repo-side closed                |
| 7   | M6/M8 supporting helper modules in repo today                                                                             | `src/lib/api/errors.ts`, `src/lib/api/fetch-timeout.ts`, `src/lib/api/route-deadline.ts`, `src/lib/api/admin-rate-limit.ts`, `src/lib/middleware/rateLimiter.ts`                             | Repo source-of-truth            |
| 8   | M6/M8 regression coverage in the test suite                                                                               | `__tests__/unit/api/error-standardization.test.ts`, `__tests__/unit/api/external-timeouts.test.ts`, `__tests__/unit/lib/api/route-deadline.test.ts`, `__tests__/unit/lib/api/errors.test.ts` | Repo-side; local-only execution |

## Documented exceptions

These are intentional carve-outs already justified in the underlying
reports. Reviewers should treat these as out-of-scope for the M6/M8
envelope contract:

1. `src/app/api/maps/proxy-script/route.ts` returns JavaScript
   (script body) responses, not JSON, and intentionally emits its
   error states as JS comments rather than `ApiErrorHandler`
   envelopes. Documented in
   `api-error-standardization-remediation-2026-05-08.md`.
2. The two pre-remediation 204-with-error-body cases in
   `src/app/api/zillow/random-image/route.ts` were resolved during
   M6: production/config/upstream failures now use `ApiErrorHandler`,
   and empty demo results return a no-store 200 payload instead of a
   204 carrying a body. Documented in
   `api-error-standardization-remediation-2026-05-08.md`.
3. M8 closure scope is `src/app/api/**/route.ts` direct outbound
   `fetch(` calls. Outbound `fetch` from non-route modules and from
   tests is out of scope and not asserted by the M8 static scan.
   Documented in `m8-external-timeouts-closure-2026-05-08.md`.
4. Pre-existing lint debt (e.g., `actions.test.ts`, `middleware.ts`,
   `generate-vibes/route.ts`, unused `NextResponse` imports) is
   tracked separately and is not part of the M6/M8 contract; the M8
   closure note explicitly carves these out as untouched by the
   slice.

## Remaining live / API-execution caveats

The repo-side closure of M6/M8 does **not** by itself produce live
evidence. The following caveats remain and must be honored by any
reviewer proposing to act on this index:

- No live HTTP probe, no remote Supabase mutation, no paid Google
  Maps / RapidAPI / Zillow call, and no production deploy is
  authorized by this index. The M6/M8 evidence above is static
  (helper adoption, type-check, and Jest unit suites run locally).
- Live cron-secret, live RapidAPI/Zillow upstream, and live Google
  Maps quota behavior remain environment-gated and are tracked
  through the broader Phase 0/1 blocker index, not here.
- Phase 1 is **not** 100% closed by M6+M8 alone; other open/blocked
  items remain. See `phase0-phase1-closure-matrix.md` and
  `p0-p1-blocker-evidence-index-2026-05-08.md` for the full set.
- Phase 2+ remains held; nothing in this index changes that.

## What this index does NOT do

- Does not change any gate verdict; the canonical matrix is unchanged.
- Does not authorize live execution of any plan/probe.
- Does not enumerate every Phase 0/1 evidence doc — only the M6 + M8
  - route-deadline subset relevant to API timeout and error-envelope
    coverage.
- Does not ingest secrets, anon keys, service-role keys, cron
  secrets, RapidAPI keys, Google Maps keys, refresh tokens, or PKCE
  verifiers; none are present in this report.
