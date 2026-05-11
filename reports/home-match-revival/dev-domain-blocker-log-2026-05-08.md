# dev.homematch.pro connection/refusal log — 2026-05-08

Generated: 2026-05-08
Scope: strict Phase 0/1 docs-only closure slice. Read-only repo grep. No
live HTTP/DNS probe against `dev.homematch.pro` was performed in this slice
(would require owner-approved external connectivity authorization that the
bounded P0/P1 docs worker does not hold). No secrets read or printed.

## Verdict

`dev.homematch.pro` is referenced in this repo as the **canonical Caddy
reverse-proxy host for the local dev stack** but its current
connection/refusal state has **never been recorded as live evidence** in
any `reports/home-match-revival/*` artifact. All recorded Phase 0/1 live
probes target `127.0.0.1:3000`, `127.0.0.1:3101`, or `127.0.0.1:54200`
directly. Until either an owner-approved bounded probe records the host's
status, or the host is formally removed from the dev-proxy contract,
this is an open Phase 0/1 evidence gap.

## What the repo says about `dev.homematch.pro`

| Source                                                                         | What it asserts                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/guard-supabase-env.js:12-17`                                          | Listed in `allowHosts` alongside `127.0.0.1`, `localhost`, `supabase.local`, with comment `// current dev proxy host`. Treated as not-prod for guard-blocking purposes.                                             |
| `scripts/setup-caddy.sh:4-50`                                                  | Default `DOMAIN` for the Caddy reverse-proxy installer, fronting `127.0.0.1:3000` (Next dev) with the listed forwarded headers. Implies the host's purpose is HTTPS termination + proxy to a local Next process.    |
| `scripts/setup-dev-box.sh:16`                                                  | `CADDY_DOMAIN="${CADDY_DOMAIN:-dev.homematch.pro}"` default for the dev-box bootstrap.                                                                                                                              |
| `scripts/integration-test-setup.js:70`                                         | Hint to set `ALLOW_REMOTE_SUPABASE=true` "if you are reverse-proxying a local Supabase (e.g. dev.homematch.pro -> localhost)".                                                                                      |
| `scripts/setup-test-users-admin.js:52`                                         | Same `ALLOW_REMOTE_SUPABASE=true` hint targeting `dev.homematch.pro`.                                                                                                                                               |
| `__tests__/integration/infrastructure/supabase-proxy.integration.test.ts:5-10` | Documents that the proxy "is handled by Caddy (dev.homematch.pro) which strips `/supabase` prefix and forwards to `127.0.0.1:54200`", and that local test runs **bypass** the Caddy host and hit Supabase directly. |
| `reports/home-match-revival/phase0-synthesis.md:37`                            | Records the host as part of `allowHosts` in the original synthesis of the dev-guard blocker.                                                                                                                        |

## What recorded Phase 0/1 evidence does _not_ show

- No artifact under `reports/home-match-revival/` records an HTTP, HTTPS, TLS,
  or DNS observation against `dev.homematch.pro` (`grep -ri "dev.homematch.pro"
reports/home-match-revival/` returns only the synthesis reference above).
- `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`, `p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`, and `p0-p1-env-prod-local-dev-closure-2026-05-08.md` all probe loopback endpoints; none extend to the proxy host.
- No artifact records whether the Caddy host is currently reachable, returns connection-refused, returns DNS NXDOMAIN, or has been retired in favor of a different dev proxy.

## What must be validated before Phase 0/1 closure can claim "dev proxy verified"

1. **Live status, owner-approved**: a bounded read-only probe of `dev.homematch.pro` (`curl -I` against `/` and `/api/health` only, no `Authorization` header, no cookies, no `apikey`, no secrets) recording one of {200, connection refused, DNS NXDOMAIN, TLS error}. Result must be appended to this artifact.
2. **Contract decision**: confirm whether `dev.homematch.pro` is still the canonical dev proxy host. If retired, `scripts/guard-supabase-env.js:16`, `scripts/setup-caddy.sh:4`, `scripts/setup-dev-box.sh:16`, `scripts/integration-test-setup.js:70`, `scripts/setup-test-users-admin.js:52`, and `__tests__/integration/infrastructure/supabase-proxy.integration.test.ts:5-10` should be updated together (single PR) so the allowHosts entry, the Caddy default, and the `ALLOW_REMOTE_SUPABASE` hints stay coherent.
3. **`ALLOW_REMOTE_SUPABASE=true` reaffirmation**: confirm the recommended path for integration setup is still "reverse-proxy via `dev.homematch.pro`" or whether to harden the scripts toward `127.0.0.1:54200`-only. Either way, document the chosen direction in `docs/SETUP_GUIDE.md` and remove the stale hint from the other branch.
4. **Guard-script invariant**: if `dev.homematch.pro` is retired, confirm the `looksLikeProdSupabaseHost` suffix-pattern logic in `scripts/guard-supabase-env.js:118-125` still cannot be bypassed by lookalike `*.homematch.pro` hosts (currently the guard relies only on `supabase.*` suffix detection, so a non-Supabase host is not a bypass risk; but this should be re-affirmed in the same change set).
5. **Phase 0/1 closure-matrix line**: add an explicit row to `phase0-phase1-closure-matrix.md` for "dev proxy host (`dev.homematch.pro`) connectivity / contract status" so this gap is visible in the closure ledger rather than only here.

## Bounded scope of this artifact

This artifact does **not** itself probe `dev.homematch.pro`, does **not** alter
`scripts/guard-supabase-env.js` allowHosts, and does **not** change the Caddy
defaults. Those are the explicit follow-ups gated on owner approval and an
approved external connectivity slice.
