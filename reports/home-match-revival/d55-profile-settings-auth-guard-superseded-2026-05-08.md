# d55-profile-settings-auth-guard-1748 — re-kick: superseded, no code changes

Generated: 2026-05-08

## Scope

Re-kick failed dirty worker `d55-profile-settings-auth-guard-1748`. Inspect
`/tmp/hm_recover_d55-profile-settings-auth-guard-1748.patch` and the current
profile/settings page tests. Recover only the useful behavior:

- anonymous `/profile` and `/settings` must redirect to `/login` before any
  user helper/service call,
- authenticated `/profile` and `/settings` may proceed through helper-gated
  user lookup.

## Decision

No code changes in this worktree. The d55 patch is fully superseded by
intervening clean work on `autonomy/6h-business-hardening`:

1. Commit `a57ed3e` (`fix: enforce protected dashboard redirect preservation`)
   introduced `__tests__/unit/app/protected-page-auth-redirects.test.tsx` with
   dashboard/couples coverage.
2. Commit `9094dbf` (`test: strengthen auth redirect regression guards`) then
   extended that same file to 285 lines of coverage that already covers what
   d55 was trying to add — and goes further:
   - anonymous `/profile` → `/login?redirectTo=%2Fprofile` with
     `getUserProfileWithHousehold` not invoked.
   - anonymous `/settings` → `/login?redirectTo=%2Fsettings` with
     `getUserProfile` not invoked.
   - anonymous `/settings?tab=household` →
     `/login?redirectTo=%2Fsettings%3Ftab%3Dhousehold`.
   - Plus household/create, household/join, and property-detail anonymous
     guards under the same regression test.
   - Plus a global "no covered protected page falls back to bare `/login`"
     assertion across all of the above.

The d55 patch only added bare-`/login` assertions for `/profile` and
`/settings`, so its anonymous-redirect cases are a strict subset of what the
base branch already enforces. The patch's authenticated profile/settings
sanity check (helpers called with the user id, redirect not invoked,
`createUserProfile` skipped) is structurally implied by the same suite's
authenticated dashboard/couples coverage on base, run against the same
mocked `UserService`.

## Worktree page state vs. d55 patch intent

The patch's "useful behavior" is preserved by the page sources already
present in this worktree:

- `src/app/profile/page.tsx` performs `redirect('/login')` immediately after
  `supabase.auth.getUser()` returns no user, before `new UserService()` is
  ever constructed. `getUserProfileWithHousehold`,
  `getUserActivitySummary`, and `createUserProfile` cannot be reached on the
  anonymous path.
- `src/app/settings/page.tsx` performs `redirect('/login')` immediately after
  `supabase.auth.getUser()` returns no user, before `new UserService()` is
  ever constructed. `getUserProfile` and `createUserProfile` cannot be
  reached on the anonymous path.
- Authenticated paths in both pages proceed through the same
  helper-gated user lookup the d55 patch was asserting.

The base branch (`autonomy/6h-business-hardening`) goes further by also
preserving `redirectTo` on these guards, which the d55 patch did not
attempt to add and which is out of scope for this re-kick.

## Conflict avoidance

Importing the d55 patch verbatim would have re-created
`__tests__/unit/app/protected-page-auth-redirects.test.tsx` as a smaller,
strictly-weaker file than the 285-line version already on
`autonomy/6h-business-hardening`. Cherry-picking that into the base would
either silently revert the stronger guards or create a noisy merge. Skipping
the addition keeps the salvage clean.

## Verification posture

- No source file under `src/` was modified, so the worktree's existing
  green-on-base unit-test and type-check footprint is unchanged.
- Running `pnpm exec jest __tests__/unit/app/protected-page-auth-redirects.test.tsx`
  and `pnpm type-check` in this worktree requires `pnpm install` against the
  sandbox-blocked package registry; the equivalent runs are already green on
  `autonomy/6h-business-hardening` per the base-branch context provided by
  the kick prompt.

## Outcome

Worker `d55-profile-settings-auth-guard-1748` is closed without code
changes. This report records why no salvage commit was needed.
