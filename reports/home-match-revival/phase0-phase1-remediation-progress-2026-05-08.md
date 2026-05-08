# Phase 0/1 Remediation Progress — 2026-05-08

Status: **Phase 1 partially remediated; Phase 0/1 still not closed**.

## Closed in this remediation slice

1. **DB P0.4 — interaction uniqueness**
   - Added migration `supabase/migrations/20260508015000_fix_interaction_uniqueness.sql`.
   - Deduplicates existing `user_property_interactions` rows by keeping the newest row per `(user_id, property_id)`.
   - Replaces `(user_id, property_id, interaction_type)` uniqueness with `UNIQUE (user_id, property_id)`.
   - Added static regression test `__tests__/unit/database/interaction-uniqueness-migration.test.ts`.

2. **Middleware/API M1 — matcher exclusions**
   - Expanded middleware matcher exclusions for `_next/data` and common static/metadata assets: JS, CSS, JSON, XML, TXT, maps, fonts, icons.
   - Added regression coverage in `__tests__/unit/middleware.test.ts`.

## Verification

- RED observed:
  - `hm-p1-red-1778204519.service` failed because the interaction migration was missing and matcher did not include `_next/data`.
- GREEN observed:
  - `hm-p1-green2-1778204589.service`: targeted Jest passed, 2 suites / 8 tests.
- Final checks:
  - `hm-p1-test-final-1778204612.service`: targeted Jest passed.
  - `hm-p1-typecheck-1778204617.service`: `pnpm type-check` passed under resource limits.
  - `git diff --check`: passed.

## Remaining gate

Phase 0 and Phase 1 are still not 100% closed. Continue strict Phase 0/1 remediation only; keep Phase 2+ held.
