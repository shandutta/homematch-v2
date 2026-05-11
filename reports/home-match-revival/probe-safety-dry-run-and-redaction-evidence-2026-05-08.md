# Probe Safety Evidence — Dry-Run / No-Mutation Policy and Redaction Requirements

Generated: 2026-05-08
Scope: read-only static evidence note for the canonical Phase 0/1 probe
safety contract that already governs the local no-auth probe harness and
the strict anonymous protected-route reruns. No live probe was executed
to write this note, no secrets read, no production data inspected, and
no Phase 2+ work authorized.

This note exists so a reviewer can confirm in one read that the existing
probe surfaces meet the bar required by Shan's bounded-worker policy:

- probes never mutate data,
- probes never run outside an explicitly local target,
- probes never carry credentials, cookies, or service-role keys, and
- probe artifacts never embed secrets, tokens, real user identifiers, or
  paid-API responses that could leak quota or PII.

It does **not** re-state any closure verdict, and it does **not**
authorize live execution of any plan/probe.

## Dry-run / no-mutation contract

The wrapper, harness, and live rerun artifacts already encode a single
shared contract. Each row below cites the file and the concrete clause
that enforces it.

| #   | Guarantee                                                                                                                                                                    | Where enforced                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Default base URL is `http://127.0.0.1:3000` and only `127.0.0.1`, `localhost`, `::1` are accepted as probe hosts.                                                            | `scripts/run-no-auth-live-probes.js:11-19` (`assertLocalBaseUrl`); mirrored in `__tests__/integration/routing/no-auth-live-probe.spec.ts:230-234` (`assertLocalBaseUrl`).                                                               |
| 2   | Live spec is gated behind `NO_AUTH_LIVE_PROBES_RUN=1` and skipped by default; the wrapper additionally skips when no local app responds.                                     | `__tests__/integration/routing/no-auth-live-probe.spec.ts:3` and `:248` (`describe.skipIf(!RUN_LIVE_PROBES)`); `scripts/run-no-auth-live-probes.js:43-48` (skip-on-no-server).                                                          |
| 3   | The wrapper does not start a server, deploy, use production dashboards, paid APIs, browser swarms, or submit auth/signup/reset/contact forms.                                | `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:17`.                                                                                                                                          |
| 4   | The wrapper does not use credentials, bearer tokens, session cookies, real user data, cron secrets, admin secrets, or external service keys.                                 | `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:18`.                                                                                                                                          |
| 5   | Public page probes are GET render/status checks only.                                                                                                                        | `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:19`; spec uses only `fetch(..., { redirect: 'manual' })` without bodies (`__tests__/integration/routing/no-auth-live-probe.spec.ts:236-246`). |
| 6   | Protected page probes are unauthenticated GETs with `redirect: 'manual'` that assert redirect to `/login` with `redirectTo` preserved — no follow, no cookie jar.            | `__tests__/integration/routing/no-auth-live-probe.spec.ts:261-273`; documented at `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:20`.                                                        |
| 7   | Public API probes are limited to `/api/health` and a GET method-boundary check on `/api/performance/metrics`; the metrics probe does not POST metrics.                       | `__tests__/integration/routing/no-auth-live-probe.spec.ts:168-180`; `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:21`.                                                                      |
| 8   | Protected API probes are anonymous GET denial checks for user-scoped read APIs and synthetic IDs/query values only — never real IDs, never write methods.                    | `__tests__/integration/routing/no-auth-live-probe.spec.ts:182-228`; `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md:22`.                                                                      |
| 9   | Anonymous paid-API POSTs (`/api/maps/geocode`, `/api/maps/places/autocomplete`) are confirmed to reject before any external Google call, so no quota is spent.               | `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md:65-66`.                                                                                                                                               |
| 10  | Cron/admin endpoints are probed only to confirm rejection of missing secrets; the probe does not supply or guess a secret.                                                   | `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md:67-72`.                                                                                                                                               |
| 11  | Live execution is repo-local only; the strict anonymous rerun further refuses to use port 3000 if the body is not the HomeMatch app, falling back to a dedicated local port. | `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md:40-57`.                                                                                                                                               |
| 12  | The live rerun stops the local dev server after the probe set completes; it does not leave a long-running process.                                                           | `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md:57`.                                                                                                                                                  |

Together these clauses constitute the dry-run / no-mutation guarantee:
no probe in this lane writes to a database, mints a session, calls a
paid API, or contacts any non-local host.

## Redaction requirements

Probe artifacts under `reports/home-match-revival/` and the underlying
spec/wrapper must satisfy the following redaction rules. Each rule is
already met by the cited artifact; this section is a checklist a future
artifact must continue to honor before being committed.

1. **No secrets in body or headers.** No anon key, service-role key,
   refresh token, PKCE verifier, cron secret, admin secret, Google Maps
   key, Zillow key, or PostHog key may appear in any probe artifact.
   Confirmed for the existing artifacts:
   `reports/home-match-revival/security-evidence-index-2026-05-08.md:73-74`
   ("Does not ingest secrets, anon keys, service-role keys, refresh
   tokens, or PKCE verifiers; none are present in this report.") and
   the harness/rerun artifacts which only show status codes and route
   paths.
2. **No real user identifiers.** Any user-scoped probe input must be a
   synthetic value. The protected-API matrix uses
   `synthetic-property-id`, `00000000-0000-0000-0000-000000000000`,
   `q=synthetic`, and the `/invite/synthetic-invalid-token` form
   (`__tests__/integration/routing/no-auth-live-probe.spec.ts:33-35`,
   `:152-154`, `:199-202`, `:213-216`, `:219-222`, `:224-227`).
3. **No production hostnames.** Probe artifacts must not name a
   production hostname or production Supabase project ref. The harness
   artifact and rerun artifact only ever show `127.0.0.1` /
   `localhost` URLs; the wrapper's `assertLocalBaseUrl` will throw
   before any non-local URL is recorded
   (`scripts/run-no-auth-live-probes.js:11-19`).
4. **No paid-API response payloads.** Probe artifacts may record only
   the auth-rejection status of paid endpoints, never the body of a
   successful paid call. Confirmed for the closure evidence
   (`reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md:65-66`).
5. **No mutation request bodies.** Even when a future probe extends to
   POST/PATCH/DELETE for boundary checks, the artifact must record only
   that the route rejected anonymous calls — not the body shape that
   would have been written. The current matrix never POSTs/PATCHes a
   mutation payload at all
   (`__tests__/integration/routing/no-auth-live-probe.spec.ts:168-228`).
6. **No long-lived process state.** Probe artifacts must explicitly
   record server start/stop and the bounded local port used; see the
   strict anonymous rerun example
   (`reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md:40-57`).
7. **No environment dump.** A probe artifact must not paste the output
   of `env`, `printenv`, `pnpm dlx supabase status`, or any command
   that would render the contents of `.env.local` / `.env.prod`. The
   existing reports name only the variables relevant to the slice
   (e.g. `SKIP_SUPABASE_GUARD=true`,
   `NEXT_TELEMETRY_DISABLED=1`) and never their values for secret
   variables.

## How this note is kept honest

- This note adds no new harness, no new test, and no new permitted
  command. It is a static reference; if any of the cited line ranges
  change, the linked artifact remains the source of truth.
- The freshness guard at
  `__tests__/unit/docs/security-evidence-index-freshness.test.ts`
  continues to assert that the canonical security artifacts referenced
  here remain tracked under `reports/home-match-revival/`.
- This note does not list synthetic emails, synthetic property IDs, or
  synthetic UUIDs that are not already documented in the cited
  harness/spec; if you need to extend the synthetic-fixture set, add
  it to the spec first and let this note re-cite it.

## What this evidence note does NOT do

- Does not authorize a live probe run, a deploy, or any Phase 2+ work.
- Does not change any closure verdict.
- Does not enumerate every Phase 0/1 evidence doc — only the
  probe-safety contract. For the broader security subset see
  `reports/home-match-revival/security-evidence-index-2026-05-08.md`,
  and for the full P0/P1 blocker → proof index see
  `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`.
- Does not ingest or print secrets; none are present in this report.
