# d126 — Prod-config no-secret guard index — 2026-05-08

## Purpose

Phase 0/1 evidence-only index of tracked, non-secret production/config guard files and the no-secret evidence boundary that protects `.env.prod` and local-dev environments. This document indexes existing artifacts; it does not add or change runtime behavior, does not introduce new env reads, and was produced without opening, copying, or printing any `.env*` file contents.

## No-secret evidence boundary

- `.env.prod`, `.env.local`, `.env.vercel`, `.env.test.local`, and the broad `.env*` glob are gitignored at `.gitignore`. Only `.env.example` (placeholder values) is tracked.
- Phase 0/1 guard authoring rule: tracked files in this repo may reference production hostnames only. API keys, anon keys, service-role keys, database URLs, passwords, cron secrets, and copied `.env.prod` values must never appear in tracked files.
- This worker did not read any `.env*` file. The index below was produced from `git ls-files` membership and the previously closed slice in `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`.

## Tracked non-secret guard surface

| Path                                                                                | Role                                                                                                                                                                                      | Non-secret invariant                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/guard-supabase-env.js`                                                     | Pre-`pnpm dev` guard. Loads `.env.local` to honour `SKIP_SUPABASE_GUARD=true`, then evaluates host/key matches against an absent or untracked `.env.prod` plus the tracked host baseline. | Logs offender categories only (`SUPABASE_URL_HOST`, `SUPABASE_HOST_PATTERN`, key names) — never env values.                                              |
| `config/supabase-production-hosts.json`                                             | Tracked non-secret host baseline used when `.env.prod` is intentionally absent.                                                                                                           | Schema is `{ description, hosts: string[] }`; hostnames only, with an in-file note forbidding API keys, service-role keys, passwords, and database URLs. |
| `.env.example`                                                                      | Documentation-only placeholder schema for required env vars.                                                                                                                              | All values are `your_*` placeholders; no real keys or hosts.                                                                                             |
| `.gitignore` (`.env.prod`, `.env.local`, `.env.vercel`, `.env.test.local`, `.env*`) | Untracking rule that keeps real production env files out of the repo.                                                                                                                     | Confirms `.env.prod` is intentionally untracked and does not need to be created for routine local dev.                                                   |

## Local-dev no-secret documentation index

| Path                                                               | What it documents                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md` (around the `SKIP_SUPABASE_GUARD=true pnpm dev` block) | Read-only-only escape hatch and the tracked non-secret host policy when `.env.prod` is absent.                                                                                                                                 |
| `docs/SETUP_GUIDE.md` (env setup section)                          | Do not create or commit `.env.prod`; production credentials live in untracked files or an approved secrets manager only; `config/supabase-production-hosts.json` holds hostnames only.                                         |
| `docs/DEVELOPMENT_WORKFLOWS.md` (dev guard section)                | `.env.prod` is intentionally untracked; the guard preserves precision via the tracked host config; production keys, service-role keys, passwords, database URLs, and copied `.env.prod` values must never enter tracked files. |

## Tracked test coverage anchoring the boundary

| Path                                                | What it pins                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/unit/scripts/guard-supabase-env.test.ts` | Builds a temp root with a fixture host config, asserts the tracked host blocks without `.env.prod`, and asserts error output never echoes the offending URL — keeping the no-secret error-output invariant testable. |
| `__tests__/unit/docs/readme-local-dev.test.ts`      | Pins README/local-dev documentation strings for the `SKIP_SUPABASE_GUARD` escape hatch and the no-secret host policy.                                                                                                |

## Closure linkage

- Originating closure: `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md` (guard precision + README/local-dev doc cleanup + non-secret host baseline).
- Adjacent indexes (cross-domain, kept separate to preserve scope): `reports/home-match-revival/security-evidence-index-2026-05-08.md`, `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`, `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`.

## Scope and non-actions

- Phase 0/1 docs/evidence only. No runtime, schema, or test changes were performed by this worker.
- No `.env*` file was read, copied, or printed. No live Supabase mutation, API probe, browser session, or deploy was triggered.
- Phase 2+ work (rotating real production secrets, adding additional production hostnames, or moving the host baseline into a secrets manager) is intentionally out of scope and not initiated here.

## Verification evidence

- `pwd` -> `/home/shan/projects/homematch-v2.claude-workers/d126-prod-config-no-secret-guard-index-2026`
- `git rev-parse --show-toplevel` -> `/home/shan/projects/homematch-v2.claude-workers/d126-prod-config-no-secret-guard-index-2026`
- `git branch --show-current` -> `autonomy/hm-d126-prod-config-no-secret-guard-index-2026`
- `git status --short` -> clean at start of run.
- Index entries cross-checked against `git ls-files` (tracked) for `scripts/guard-supabase-env.js`, `config/supabase-production-hosts.json`, `.env.example`, `__tests__/unit/scripts/guard-supabase-env.test.ts`, `__tests__/unit/docs/readme-local-dev.test.ts`, `README.md`, `docs/SETUP_GUIDE.md`, and `docs/DEVELOPMENT_WORKFLOWS.md`.
