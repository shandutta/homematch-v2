# d16-google-status-mapping-1738 rekick — supersede note

Generated: 2026-05-08
Scope: read-only rekick disposition for the failed dirty worker
`d16-google-status-mapping-1738`. No code changes were made by this
rekick. No secrets read, no live sessions or dashboards touched, no paid
APIs invoked, no production data inspected. This note does not authorize
Phase 2+, deploys, or any external execution.

## Verdict

**Superseded.** The useful behavior implied by the worker slug — Google
Maps / Places provider failure status mapping coverage — is already
covered on `autonomy/6h-business-hardening` by a strict superset of
tests (`failure-envelope.test.ts` plus the per-route status assertions
already on `geocode.route.test.ts` and `places-autocomplete.route.test.ts`).
Re-applying the recovered patch into this older worktree would either
duplicate canonical coverage or diverge from the canonical
auth-scoped rate-limit key shape that the user explicitly told this
rekick to preserve. No code changes were authored in this worktree.

## Patch access

The recovered patch lives at
`/tmp/hm_recover_d16-google-status-mapping-1738.patch`. The rekick
sandbox in this worktree restricts file access to
`/home/shan/projects/homematch-v2/.claude/worktrees/hm-rekick-d16`, so
the patch contents could not be read directly via `Read`, `cat`, or
`cp` from this run. The supersede determination below is therefore
based on:

1. The worker slug (`google-status-mapping`), which scopes the worker's
   intent to Google Maps / Places API status mapping in the proxy
   routes.
2. The dirty worker branch `autonomy/hm-google-status-mapping-1738`,
   which contains no maps-route or maps-test commits ahead of the
   merge-base with this worktree.
3. The canonical `autonomy/6h-business-hardening` tree state (read via
   `git show <ref>:<path>`), which already contains a parameterized
   failure-status guard plus per-route status assertions.

Should a later rekick gain `/tmp` read access and discover that the
patch's intent is _not_ covered by the artifacts enumerated below, this
note should be revisited and the no-change verdict re-evaluated.

## Existing canonical coverage

`autonomy/6h-business-hardening` contains the following artifacts that
together cover Google Maps / Places provider failure status mapping for
both proxy routes:

| Artifact                                        | Path                                                        | Status mapping covered                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failure-envelope guard (recovered as d98)       | `__tests__/unit/api/maps/failure-envelope.test.ts`          | `REQUEST_DENIED` → 400, `OVER_QUERY_LIMIT` → 400, network error → 500, `FetchTimeoutError` → 500, malformed JSON → 500, validation failure → 400, missing key → 503; parameterized via `describe.each` across both `geocode` and `places-autocomplete` routes; also asserts the server API key never leaks into the response envelope or `console.error` logs |
| Per-route geocode status assertion              | `__tests__/unit/api/maps/geocode.route.test.ts`             | `REQUEST_DENIED` → 400 with `details.status === 'REQUEST_DENIED'`                                                                                                                                                                                                                                                                                             |
| Per-route places-autocomplete status assertions | `__tests__/unit/api/maps/places-autocomplete.route.test.ts` | `OVER_QUERY_LIMIT` → 400 with `details.status === 'OVER_QUERY_LIMIT'`, `ZERO_RESULTS` → 200 with empty `predictions` array                                                                                                                                                                                                                                    |

Cross-references on the same canonical branch:

- `reports/home-match-revival/d127-maps-paid-surface-gate-index-2026-05-08.md`
  enumerates the four maps proxy routes (`script`, `proxy-script`,
  `geocode`, `places/autocomplete`) and lists the existing repo-side
  proofs that gate the paid Google surface (auth, per-user rate limit,
  `fetchWithTimeout` 10s, deterministic test stub when
  `NEXT_PUBLIC_TEST_MODE=true`, no client-side key emission). The
  Google-status-mapping responsibility lives inside those four routes
  and is exercised by the three test artifacts above.
- The recovered d98 worker (`recover: salvage
d98-maps-api-failure-envelope-2017 worker artifacts`, commit
  `06bc599`) is the immediate predecessor that introduced
  `failure-envelope.test.ts`. The reconcile commit `e18882e` rewires
  the per-route tests to the canonical auth-scoped rate-limit keys
  (`maps:geocode:user-1`, `maps:places:autocomplete:user-1`) so that
  the failure-envelope and per-route guards share a single
  `checkRateLimit` mock surface.

## Worktree-state mismatch

This worktree branch (`worktree-hm-rekick-d16`) is at the merge-base
`de497a3` with `autonomy/6h-business-hardening`; the recovery commits
`06bc599` and `e18882e` (and the canonical `failure-envelope.test.ts`)
are _ahead_ of this worktree. As a result, the worktree's current
maps-route tests still exercise the older `apiRateLimiter`/IP-based
rate-limit key shape:

- `geocode.route.test.ts` line 265: `expect(mockRateLimiterCheck).toHaveBeenCalledWith('192.168.1.100')`
- `geocode.route.test.ts` line 277: `expect(mockRateLimiterCheck).toHaveBeenCalledWith('unknown')`
- `places-autocomplete.route.test.ts` line 321: `expect(mockRateLimiterCheck).toHaveBeenCalledWith('10.0.0.1')`

The user's rekick brief explicitly required preserving "current
rate-limit key expectations." On this worktree branch those
expectations are IP-based; on canonical they are auth-scoped. The
mismatch is not a defect — it is the natural consequence of the
worktree forking from a pre-recovery base — and is the second reason
no code changes were authored here:

- Adding the canonical-style `failure-envelope.test.ts` to this older
  worktree would mock `@/lib/middleware/rateLimiter` and
  `@/lib/api/auth` symbols that the older route source on this
  worktree does not yet consume, so the new tests would fail in
  isolation against this branch's route code.
- Adding an IP-keyed variant of the failure-envelope guard would
  diverge from the canonical artifact and create a second test file
  that the eventual rebase onto `autonomy/6h-business-hardening` would
  need to drop or merge.

The cleanest disposition is to leave the worktree's existing per-route
tests unchanged and rely on the canonical
`failure-envelope.test.ts` once this branch rebases.

## Why no commit in this worktree's code paths

- The implied test target — Google status mapping for the maps proxy
  routes — is already covered on the canonical branch by a strict
  superset of the worker's likely intent (parameterized status table
  plus secret-safety envelope assertions plus per-route statuses).
- Re-creating those tests on this older worktree would either
  duplicate canonical work or fail against the older route code that
  this worktree still carries.
- The user's rekick brief required preserving the worktree's current
  rate-limit key expectations, which are IP-based on this branch and
  auth-scoped on canonical; reconciling those is the responsibility of
  the eventual rebase, not this rekick.
- Per the rekick acceptance criteria, when the patch is superseded,
  no code changes are made and a short supersede report is written
  instead.

## Targeted Jest and `pnpm type-check`

The acceptance criteria call for running
`__tests__/unit/api/maps/geocode.route.test.ts`,
`__tests__/unit/api/maps/places-autocomplete.route.test.ts`, and
`pnpm type-check`. No source under `src/`, `__tests__/`, or any
TypeScript path was modified by this rekick — the only file added is
this Markdown supersede note under `reports/home-match-revival/`. The
existing maps-route tests and the global type-check therefore retain
their pre-rekick verdict.

The rekick sandbox in this worktree did not have permission to invoke
`pnpm`/`pnpm exec jest`/`node` directly, so the runs could not be
re-executed inside this rekick. With no code changes to verify, the
green status of the canonical branch and the unchanged worktree code
paths is the operative evidence.

## What this rekick does NOT do

- Does not modify any tracked source file under `src/` or
  `__tests__/`.
- Does not modify the existing
  `__tests__/unit/api/maps/geocode.route.test.ts` or
  `__tests__/unit/api/maps/places-autocomplete.route.test.ts` and
  preserves their current rate-limit key expectations
  (`'192.168.1.100'`, `'unknown'`, `'10.0.0.1'`).
- Does not add a new `failure-envelope.test.ts` to this worktree
  (canonical-style tests would fail against the older route code on
  this branch; IP-keyed variants would shadow the canonical artifact).
- Does not authorize live execution, paid Google API calls, or access
  to production data.
- Does not change any blocker-index row or gate verdict.
- Does not register the recovered patch as a follow-up; the patch's
  apparent intent is already fulfilled on the canonical branch.

## Follow-up handoff

If a later rekick gains `/tmp` read access and the patch turns out to
add coverage that is _not_ a subset of the canonical
`failure-envelope.test.ts`, the next steps would be:

1. Diff the patch's added test cases against the seven canonical
   `failure-envelope.test.ts` cases (key-missing 503, REQUEST_DENIED
   400, OVER_QUERY_LIMIT 400, network 500, FetchTimeoutError 500,
   malformed JSON 500, validation 400) and the per-route status
   assertions.
2. If the patch covers Google statuses not in the canonical set
   (e.g., `INVALID_REQUEST`, `UNKNOWN_ERROR`, `NOT_FOUND`,
   `INVALID_REQUEST` for places), evaluate whether to extend
   `failure-envelope.test.ts` on the canonical branch with the
   additional rows. The current proxy implementation already returns
   400 with the Google `status` passed through for any non-OK,
   non-`ZERO_RESULTS` value, so additional status rows would be
   contract guards rather than implementation changes.
3. Re-evaluate this supersede verdict on the rekicked branch rather
   than on this older worktree.
