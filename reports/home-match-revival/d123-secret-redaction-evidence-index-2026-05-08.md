# D123 Secret Redaction Evidence Index — 2026-05-08

## Scope

Static, read-only index of the no-secret / no-env-value safeguards
already shipped under Phase 0/1 across this repo. It collects the
guards that keep `.env*`, anon keys, service-role keys, postgres
passwords, full database URLs, and full production Supabase URLs out
of diagnostics, committed config, docs, and CI artifacts.

This index does **not**:

- read, copy, or print any `.env*` file or secret value;
- authorize Phase 2+, deploys, paid APIs, browser swarms, dashboard
  changes, or production data access;
- duplicate the broader
  [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md)
  or
  [`security-evidence-index-2026-05-08.md`](./security-evidence-index-2026-05-08.md);
  it is the narrow secret-redaction subset of that work.
- restate `phase0-phase1-strict-closure-gate.md` /
  `phase0-phase1-closure-matrix.md` verdicts.

The artifact set below is what a reviewer needs to see to confirm that
the redaction posture itself is closed at the repo layer, with the
remaining work being live-environment validation only.

## Safeguard inventory

### Scripts

| # | Script | What it guarantees | No-secret posture |
|---|---|---|---|
| S1 | `scripts/guard-supabase-env.js` | Blocks production-looking Supabase URL/host/anon/service-role/postgres env wiring before `pnpm dev`/`pnpm build` unless `SKIP_SUPABASE_GUARD=true` is opted in via `.env.local`. Uses the tracked non-secret host baseline at `config/supabase-production-hosts.json` when `.env.prod` is absent. | Diagnostic output is offender-category-only (`SUPABASE_URL_HOST`, `SUPABASE_HOST_PATTERN`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); raw values, JWTs, passwords, full URLs, and bare production hostnames are never echoed. |
| S2 | `scripts/secrets-scan.sh` | Wraps `git secrets --scan --untracked` (and optional `--scan-history`) so a developer can dry-run a tree-wide secret scan locally or in CI. | Exits non-zero on hits; only file paths and offending pattern names are surfaced — the script itself never expands matches. |
| S3 | `scripts/setup-git-secrets.sh` | Bootstraps `git-secrets` patterns (Supabase, AWS-shape, generic high-entropy) for the working tree as the supply for S2. | Setup-only; produces no diagnostic that could leak a value. |
| S4 | `config/supabase-production-hosts.json` (consumed by S1) | Tracks the known production Supabase hostname as **non-secret** guard metadata so S1 can fail closed without an `.env.prod` file present. | File schema documents that API keys, service-role keys, passwords, and database URLs MUST NOT be stored there. Hostname is the only field. |

### Reports / docs

| # | Artifact | Role in the redaction story |
|---|---|---|
| R1 | [`p0-p1-env-prod-local-dev-closure-2026-05-08.md`](./p0-p1-env-prod-local-dev-closure-2026-05-08.md) | Original Phase 0/1 closure for the `.env.prod` guard and local-dev no-secret docs. Records the offender-category-only diagnostic posture and the `SKIP_SUPABASE_GUARD=true` escape hatch. |
| R2 | [`phase0-live-probe-auth-cron-env-closure-2026-05-08.md`](./phase0-live-probe-auth-cron-env-closure-2026-05-08.md) | Records that env-cron-auth Phase 0 live probes ran without ingesting secrets/anon/service-role keys or session tokens. |
| R3 | `README.md`, `docs/SETUP_GUIDE.md`, `docs/DEVELOPMENT_WORKFLOWS.md` | Document that `.env.prod` is intentionally untracked, that `config/supabase-production-hosts.json` stores **only** hostnames, that secrets must never be committed, and that the `SKIP_SUPABASE_GUARD=true pnpm dev` bypass is read-only-style local dev only. (See R3-T2 for the static guard.) |
| R4 | `docs/secrets.md` | Canonical no-commit secrets policy. Linked from the README. |
| R5 | `.gitignore` | Pattern set covers `.env.local`, `.env.vercel`, `.env.test.local`, `.env.prod`, and the broader `.env*` glob, while keeping `.env.example` as the only intentionally tracked env file. |

### Tests (static, no-network)

| # | Test | Asserts |
|---|---|---|
| T1 | `__tests__/unit/scripts/guard-supabase-env.test.ts` | Guard blocks the tracked non-secret production host with `.env.prod` absent; `SKIP_SUPABASE_GUARD=true` from `.env.local` is honored before host detection; suffix-based Supabase host detection rejects real production suffixes but allows lookalike `*.supabase.co.evil.example`; documented local + dev-proxy hosts are allowed. The dedicated redaction test injects synthetic secret-shaped anon/service-role/postgres values and proves the diagnostic surfaces only category labels and never raw values, full URLs, or bare production hostnames. |
| T2 | `__tests__/unit/docs/env-example-guard.test.ts` | `.env.example` exposes only placeholder values, never real-secret patterns (JWT-shape `ey…`, `sb_/sk_/pk_/rk_`-prefixed, `postgres(ql)://user:pass@…`, ≥32-char hex, ≥40-char base64); does not opt agents into `SKIP_SUPABASE_GUARD` / `SKIP_DOCKER`; never references `.env.prod` or a production database URL; Supabase URL keys point at the documented placeholder or the documented localhost default. |
| T3 | `__tests__/unit/docs/readme-local-dev.test.ts` | README keeps secret handling explicit: `Never commit secrets`, `docs/secrets.md`, `.env.prod is intentionally untracked`, `config/supabase-production-hosts.json`, and the no-keys-no-DB-URL rule for that file. |
| T4 | `__tests__/unit/docs/security-evidence-index-freshness.test.ts` | Cross-reference guard for the broader security index; if any artifact path is renamed, the test fails before the link rots. (Companion guard for this redaction-themed index would be added in a future bounded slice — see "Remaining work".) |

## Remaining live-validation caveats

These are the live-environment-gated lanes that this static index
explicitly does **not** close:

1. **Live secret-redaction probe of CI logs and deploy logs.** The
   guard tests above verify the guard *script* never echoes raw
   values; they do not assert that no production CI runner, deploy
   log, error-tracking sink (Sentry/PostHog), or third-party tail
   surfaces a secret in practice. That requires an environment-gated
   review of those external dashboards, which is out of scope here.
2. **`.env.prod` round-trip.** The guard's "host baseline replaces
   `.env.prod`" path is exercised in T1 with a synthetic temp
   workspace; live behavior on a real (untracked) `.env.prod` is not
   exercised here and remains environment-gated.
3. **`git-secrets` history scan.** S2 supports `--scan-history`, but
   the bounded Phase 0/1 worker only runs the working-tree scan. A
   full history scan stays an environment-gated action because it can
   be long-running and its findings need a redaction owner.
4. **Supabase / hosting dashboard inspection.** Whether the actual
   production Supabase project's anon/service-role keys, JWT secret,
   or DB password have ever been rotated/leaked is an external,
   approval-gated audit — not derivable from this repo.
5. **Companion freshness guard for THIS index.** A small Jest test
   modeled on T4 (asserting every artifact path listed in this file
   resolves and the canonical safeguard set is fully covered) can be
   added in a future bounded slice; it would prevent silent rot of
   the table above. Not authorized by this commit.

## Closure impact

- Phase 0/1 secret-redaction posture: **repo-side closed.** The
  guard, guard tests, env-example guard, README/secret-policy docs,
  and `.gitignore` collectively prove that no secret values, full
  production URLs, or bare production hostnames are emitted from
  this repo's diagnostics or committed configuration.
- This index changes **no** existing gate verdict. The Phase 0/1
  matrix and strict closure gate are unchanged. Items in "Remaining
  live-validation caveats" stay in their existing live / external
  approval lanes.
