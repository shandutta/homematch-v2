# P1 Auth Provider Replacement Decision Memo

Generated: 2026-05-08T08:24Z
Scope: read-only provider decision. No auth code changed.
Repo: `/home/shan/projects/homematch-v2`

## Decision

**Keep Supabase Auth. Do not migrate to Clerk, Auth0, WorkOS, or Better Auth for the HomeMatch revival gate.**

This should be an aggressive keep-and-clean decision, not a neutral comparison. The current app is already structurally coupled to Supabase Auth, Supabase RLS, Supabase service-role/admin paths, Supabase realtime, and Supabase test/seed tooling. Replacing only the identity provider would not remove Supabase from the architecture; it would create two identity systems unless the database/RLS layer is redesigned at the same time. That is the wrong trade for a consumer couples/product-search app trying to revive quickly.

The right Phase 1 move is:

1. Keep Supabase Auth as the source of user identity.
2. Finish the remaining Supabase auth hardening decisions: service-role RBAC source of truth, production email confirmation/CAPTCHA policy, E2E auth lifecycle coverage.
3. Delete or consolidate dead auth/client compatibility paths after the Supabase decision gate, especially duplicate client/factory abstractions and stale docs/tests.
4. Reconsider WorkOS/Clerk only if HomeMatch pivots into a B2B buyer/org product where enterprise SSO, directory sync, and organization admin become core revenue features.

## Why this is the right call

### Current architecture is not just "auth provider = Supabase"

HomeMatch currently uses Supabase as both auth and data-control plane:

- Next.js middleware uses `@supabase/ssr` to refresh/check users and redirect protected pages.
- App route handlers use `createApiClient()` plus `requireUserFromRequest()` for cookie/bearer-token auth.
- Server components call `createClient().auth.getUser()` directly for protected page data loading.
- Client auth forms use Supabase password, Google OAuth, signup verification, reset password, resend, and signout APIs.
- Database security relies on `auth.uid()` in RLS policies and Supabase Auth internal roles such as `supabase_auth_admin`.
- Test users, integration tests, scripts, migrations, and RLS audits all assume Supabase Auth users exist in `auth.users`.

A replacement provider would therefore need either:

- a Supabase-compatible JWT bridge that preserves `auth.uid()` and all RLS assumptions, or
- a deeper data/security rewrite that moves ownership checks out of Supabase RLS and into application code/RPCs.

Both are higher-risk than finishing the current Supabase cleanup.

### The known issues are cleanup/ops issues, not provider-failure issues

Prior and current audits show the major auth issues are addressable in the existing stack:

- Already closed: `httpOnly: true` cookie hardening through `src/lib/supabase/cookie-options.ts` and middleware/server tests.
- Already closed: paid Maps endpoints now use `requireUserFromRequest()`.
- Already closed: interactions route service-role fallback removed.
- Already closed: duplicate `getUser` monkey-patch in `createApiClient()` removed.
- Still blocked: true service-role RBAC authority model.
- Still blocked: production email confirmation and CAPTCHA policy.
- Still open: E2E login/signup/protected-route/logout lifecycle coverage.
- Still open: duplicate Supabase client/factory cleanup and docs alignment.

None of those justify taking on provider migration, user-ID mapping, RLS/JWT claim rewriting, session cookie migration, test harness rewrite, and production account migration.

## Provider comparison

| Provider      | Fit for HomeMatch now                                     | Strengths                                                                                                                                                                                       | Problems for this repo                                                                                                                                          | Recommendation                                                                                          |
| ------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Supabase Auth | Best fit                                                  | Already integrated; native `auth.uid()` RLS; Postgres/user profile coupling; generous included MAU; one control plane with DB/realtime/storage; current code already hardened in several places | Needs RBAC decision, production auth policy, test coverage, and duplicate-client cleanup                                                                        | **Keep**                                                                                                |
| Clerk         | Good greenfield consumer auth, poor migration ROI here    | Excellent Next.js DX, hosted UI/components, good session ergonomics, generous free MRU tier                                                                                                     | Does not remove Supabase DB/RLS dependency; requires JWT templates/claim mapping; app still needs Supabase service role/RPCs; duplicates user/profile lifecycle | Do not migrate now; reconsider only for a future frontend-heavy rebuild without Supabase RLS dependence |
| Auth0         | Overbuilt for current product                             | Mature enterprise auth, broad protocols, attack protection, custom domains, org features                                                                                                        | More expensive/complex than needed; Auth0 user IDs/JWT claims must be mapped into Supabase RLS; migration adds operational surface without product lift         | Reject for this phase                                                                                   |
| WorkOS        | Best for B2B enterprise SaaS, not this B2C couples app    | Enterprise SSO, Directory Sync, Audit Logs, org policies, AuthKit; very strong if selling to companies                                                                                          | HomeMatch has households/couples, not enterprise tenants; WorkOS does not replace Supabase DB/RLS; enterprise features are not current revenue blockers         | Reject unless product pivots to B2B relocation/agent teams                                              |
| Better Auth   | Interesting if self-hosting auth becomes a strategic goal | Open-source TypeScript framework; BYO database; plugin ecosystem; strong control story                                                                                                          | Would require owning auth tables/session lifecycle and migrating from Supabase Auth/RLS semantics; more implementation burden while Phase 1 is still not closed | Reject for revival gate; maybe spike later if leaving Supabase entirely                                 |

Pricing/source notes reviewed from provider pages:

- Supabase pricing page: Free includes 50,000 monthly active users; Pro is $25/mo with 100,000 MAU included and MAU overage after that.
- Clerk pricing page: Hobby/Pro include 50,000 monthly retained users per app; Pro starts at $25/mo; MRU overage begins after included tier.
- Auth0 pricing page: Free advertises up to 25,000 MAU; Essentials starts at $35/mo; Professional starts at $240/mo.
- WorkOS pricing/user-management pages: AuthKit/user management is positioned around social auth, MFA, RBAC and enterprise add-ons; SSO/Directory Sync/Audit Logs are separate connection/log-retention dimensions.
- Better Auth homepage: framework-first, BYO database, built-in email/password, social providers, organizations, SSO/SCIM plugins, and optional managed infrastructure.

## Current auth architecture inventory

### Runtime boundary

| Layer                                | Files                                                                                                          | Current behavior                                                                                                                                                              | Decision                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Middleware session/redirect boundary | `middleware.ts`                                                                                                | Creates Supabase SSR client, uses dynamic cookie name, checks user for protected paths, handles invalid refresh tokens and auth timeouts, redirects `/login`/protected routes | Keep, simplify only after tests                                                       |
| Protected route list                 | `src/lib/routing/protected-routes.ts`                                                                          | Central list for dashboard/profile/household/settings/validation/couples/properties                                                                                           | Keep                                                                                  |
| API auth helper                      | `src/lib/api/auth.ts`                                                                                          | Canonical `getUserFromRequest()` and `requireUserFromRequest()` with bearer-token fallback and shared 401 response                                                            | Keep as the API boundary                                                              |
| Server Supabase clients              | `src/lib/supabase/server.ts`                                                                                   | `createClient()`, `createApiClient()`, and guarded `createServiceClient()`                                                                                                    | Keep, but migrate cleanup toward fewer paths                                          |
| Browser Supabase client              | `src/lib/supabase/client.ts`                                                                                   | `createBrowserClient()`, dynamic storage key, refresh recovery                                                                                                                | Keep                                                                                  |
| Auth callback                        | `src/app/auth/callback/route.ts`                                                                               | Exchanges Supabase OAuth code and redirects                                                                                                                                   | Keep; add redirect allowlist coverage if not already present                          |
| Client auth forms                    | `src/components/features/auth/LoginForm.tsx`, `SignupForm.tsx`, `ResetPasswordForm.tsx`, `VerifyEmailForm.tsx` | Password auth, Google OAuth, verification/resend/reset flows through Supabase client                                                                                          | Keep; do UX polish later                                                              |
| Signout server action                | `src/lib/supabase/actions.ts`                                                                                  | Calls `supabase.auth.signOut()` and redirects                                                                                                                                 | Keep                                                                                  |
| Optional anonymous server user       | `src/lib/supabase/optional-user.ts`                                                                            | Treats missing Supabase config as unauthenticated for safe startup                                                                                                            | Keep, but keep tests around config failure                                            |
| Cookie/storage helpers               | `src/lib/supabase/cookie-options.ts`, `storage-keys.ts`, `auth-helpers.ts`, `refresh-recovery.ts`              | Shared cookie hardening, host-specific storage/cookie names, invalid refresh-token recovery                                                                                   | Keep                                                                                  |
| Standalone/script client             | `src/lib/supabase/standalone.ts`                                                                               | Service-key client for scripts/migrations/tests outside Next context                                                                                                          | Keep for scripts; do not expose to route code                                         |
| Service-role facade                  | `src/lib/supabase/service-role-client.ts`                                                                      | Thin wrapper around gated `createServiceClient()`                                                                                                                             | Keep only if it remains gated; delete if all imports can move to `server.ts` directly |

### Routes using the canonical API boundary

Current route inventory shows the API auth boundary is broadly standardized around `createApiClient()` + `requireUserFromRequest()`:

- `src/app/api/couples/activity/route.ts`
- `src/app/api/couples/check-mutual/route.ts`
- `src/app/api/couples/disputed/route.ts`
- `src/app/api/couples/mutual-likes/route.ts`
- `src/app/api/couples/notify/route.ts`
- `src/app/api/couples/stats/route.ts`
- `src/app/api/interactions/reset/route.ts`
- `src/app/api/interactions/route.ts`
- `src/app/api/maps/geocode/route.ts`
- `src/app/api/maps/places/autocomplete/route.ts`
- `src/app/api/neighborhoods/vibes/route.ts`
- `src/app/api/properties/vibes/route.ts`
- `src/app/api/users/avatar/route.ts`
- `src/app/api/users/search/route.ts`

This is exactly the shape that makes Supabase Auth salvageable: one helper can police the API boundary.

### Service-role and RLS-sensitive areas

These are the places where provider replacement would be especially expensive because they depend on Supabase RLS/service-role semantics:

- `src/lib/supabase/server.ts` `createServiceClient()` and `checkServiceRoleAuthorization()`.
- `src/lib/supabase/service-role-client.ts` wrapper.
- `src/app/api/couples/disputed/route.ts`, still RLS-sensitive and previously flagged for profile/email exposure.
- `src/app/api/users/search/route.ts`, uses service-role pattern for cross-user search.
- `src/app/api/maps/metro-boundaries/route.ts`, public-ish endpoint with service-role read path.
- `src/app/invite/[token]/page.tsx` and `src/app/invite/[token]/actions.ts`, service-role reads/writes for invitation UX.
- Supabase migrations containing `auth.uid()`, `supabase_auth_admin`, and `SECURITY DEFINER` functions.
- Integration tests and scripts that create/delete Supabase auth users.

A Clerk/Auth0/WorkOS migration must rewrite or bridge every one of these, not just change login UI.

## File-level keep/delete/migrate list

### Keep

| File/path                                                                                                                                       | Why                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `middleware.ts`                                                                                                                                 | Central auth redirect/session boundary; current issues are manageable and tested.         |
| `src/lib/routing/protected-routes.ts`                                                                                                           | Simple route ownership boundary.                                                          |
| `src/lib/api/auth.ts`                                                                                                                           | Canonical API auth helper; keep and require all authenticated routes to use it.           |
| `src/lib/supabase/client.ts`                                                                                                                    | Browser client remains required for login/signup/session UI.                              |
| `src/lib/supabase/server.ts`                                                                                                                    | Server/API/service-role client source remains required, but should be simplified.         |
| `src/lib/supabase/cookie-options.ts`                                                                                                            | Correct hardened cookie policy.                                                           |
| `src/lib/supabase/storage-keys.ts`                                                                                                              | Keeps host/project-specific cookie/storage isolation.                                     |
| `src/lib/supabase/auth-helpers.ts`                                                                                                              | Shared invalid-refresh-token classifier.                                                  |
| `src/lib/supabase/refresh-recovery.ts`                                                                                                          | Shared recovery wrapper used by browser/server clients.                                   |
| `src/lib/supabase/optional-user.ts`                                                                                                             | Useful for public/optional user flows and missing-config graceful degradation.            |
| `src/lib/supabase/actions.ts`                                                                                                                   | Keep current signout action; do not re-add dead login/signup server actions unless wired. |
| `src/app/auth/callback/route.ts`                                                                                                                | Needed for Supabase OAuth PKCE code exchange.                                             |
| `src/components/features/auth/LoginForm.tsx`                                                                                                    | Keep Supabase password/OAuth UI for now.                                                  |
| `src/components/features/auth/SignupForm.tsx`                                                                                                   | Keep Supabase signup/verification flow.                                                   |
| `src/components/features/auth/ResetPasswordForm.tsx`                                                                                            | Keep Supabase password reset flow.                                                        |
| `src/components/features/auth/VerifyEmailForm.tsx`                                                                                              | Keep verification code/email flow.                                                        |
| `supabase/config.toml`                                                                                                                          | Keep, but production policy needs a decision for confirmations/CAPTCHA.                   |
| `supabase/migrations/**`                                                                                                                        | Keep; RLS and `auth.uid()` are the reason provider replacement is expensive.              |
| `scripts/setup-test-users-admin.js`, `scripts/get-test-auth-token.js`, `scripts/debug-auth.js`                                                  | Keep as Supabase-auth test/admin utilities, but document no real-user use while gated.    |
| `__tests__/unit/lib/supabase/**`, `__tests__/unit/lib/api/auth.test.ts`, `__tests__/unit/middleware.test.ts`                                    | Keep and expand; these are the safety net for the keep-Supabase path.                     |
| `__tests__/e2e/auth-login-flow.spec.ts`, `__tests__/e2e/auth-redirects.spec.ts`, `__tests__/e2e/auth.setup.ts`, `__tests__/e2e/auth.cleanup.ts` | Keep and strengthen into full lifecycle coverage.                                         |

### Delete after verification

| File/path                                                                                                  | Why                                                                                                                                                                                                           | Gate before delete                                                    |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Any remaining obsolete Supabase factory abstraction if present, historically `src/lib/supabase/factory.ts` | Prior audits recorded duplicate client factory paths. If the file still exists in a branch, remove it or fully canonicalize it. Current `src/lib/supabase/` listing did not show it, so treat as verify-only. | Search imports, run unit/type-check.                                  |
| Stale auth docs that contradict current keep-Supabase decision                                             | Avoid future workers reopening provider migration without a product trigger.                                                                                                                                  | Docs rewrite lane should consolidate into one auth architecture note. |
| Dead server login/signup/Google action references                                                          | `src/lib/supabase/actions.ts` now only exports signout; keep it that way.                                                                                                                                     | Static test should prevent dead action reintroduction.                |
| Duplicate auth helper mocks that do not model `requireUserFromRequest()`                                   | Reduces false confidence in route tests.                                                                                                                                                                      | Replace with canonical test utilities first.                          |
| Any archived compatibility code for non-Supabase providers                                                 | No evidence current production code uses Clerk/Auth0/WorkOS/Better Auth.                                                                                                                                      | Verify with dependency/import scan before deleting.                   |

### Migrate/consolidate within Supabase Auth

| File/path                                                                                        | Migration target                                                                                                                          | Why                                                                                               |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/supabase/server.ts` `checkServiceRoleAuthorization()`                                   | Explicit admin authority: custom claims or dedicated admin table; do not leave as vague `user_profiles.role === 'admin'` without decision | This is the most important auth hardening blocker.                                                |
| `src/lib/supabase/service-role-client.ts` imports                                                | Either keep as the one facade or remove and import `createServiceClient()` directly                                                       | Avoid two mental models for service role.                                                         |
| `src/app/api/couples/disputed/route.ts`                                                          | Scoped RPC/security-definer output returning only needed partner fields                                                                   | Avoid broad service-role profile/email reads.                                                     |
| `src/app/api/users/search/route.ts`                                                              | Scoped search RPC returning minimal fields, ideally no raw email unless product requires it                                               | Reduces email enumeration surface.                                                                |
| `src/app/invite/[token]/page.tsx`                                                                | Keep unauthenticated invite preview, but rate-limit and minimize displayed inviter fields                                                 | Token is high entropy, but page reveals household/inviter metadata.                               |
| `supabase/config.toml`                                                                           | Production-specific confirmation/CAPTCHA stance                                                                                           | Launch auth posture must be explicit.                                                             |
| `__tests__/e2e/*auth*`                                                                           | One full auth lifecycle suite: signup/verify/login/protected/logout/redirect                                                              | Closes current coverage gap without changing providers.                                           |
| Docs: `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING_AUTH.md`, `docs/SETUP_GUIDE.md`, `README.md` | One concise current auth architecture page                                                                                                | Existing docs are likely fragmented; docs phase should remove outdated provider/factory language. |

### Do not migrate now

| Candidate migration          | Why not now                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Auth -> Clerk       | Needs JWT/RLS bridging and profile sync while still keeping Supabase DB. Better UX/DX does not offset migration risk.                  |
| Supabase Auth -> Auth0       | Adds enterprise-grade complexity and cost without solving current Supabase RLS/service-role blockers.                                  |
| Supabase Auth -> WorkOS      | Strong only if HomeMatch becomes B2B enterprise/org-auth product. Current households are not enterprise tenants.                       |
| Supabase Auth -> Better Auth | Self-hosting auth means owning session tables, migration, adapters, and RLS replacement/bridging. Good future spike, bad current gate. |

## Implementation backlog after this decision

P0/P1 follow-ups that should be implemented before calling auth Phase 1 closed:

1. Choose the service-role RBAC source of truth:
   - recommended: dedicated `admin_users`/`admin_roles` table plus SECURITY DEFINER/RLS-safe check, or Supabase custom claims if Shan wants dashboard-managed admin grants.
   - do not silently rely on an undocumented `user_profiles.role` column.
2. Close production signup policy:
   - enable email confirmations for production or document an explicit exception.
   - choose Turnstile/hCaptcha or document why launch skips CAPTCHA.
3. Replace broad service-role reads with scoped RPCs where they expose profile/email data:
   - `couples/disputed` first.
   - `users/search` second.
4. Add full auth lifecycle E2E tests with seeded test users.
5. Consolidate auth docs and stale duplicate client/factory references.
6. Keep provider migration as an explicit future product-decision gate, not a Phase 1 cleanup task.

## Approval-gated checklist if Shan still wants a provider migration later

Do not execute any of this without explicit approval, because it touches external dashboards/accounts, auth production state, and potentially user migration.

1. Pick product direction:
   - B2C couples app: Clerk is the only plausible hosted replacement.
   - B2B relocation/agent/team app: WorkOS becomes plausible.
   - Own-auth/control: Better Auth becomes plausible.
   - Enterprise/security procurement: Auth0 becomes plausible.
2. Design Supabase RLS bridge:
   - Decide whether external JWTs will be accepted by Supabase PostgREST/RLS.
   - Map external user IDs to existing `auth.users.id` or create a stable `external_auth_id` mapping table.
   - Define rollback from mixed identity state.
3. Inventory all `auth.uid()` policies and RPCs.
4. Inventory all service-role routes and decide which become RPCs.
5. Build dual-login migration in a staging branch only.
6. Migrate test-user setup and E2E fixtures.
7. Run local DB reset, integration, E2E, and a staging auth migration dry run.
8. Only then consider production dashboard/account changes.

## Final recommendation

**Keep Supabase Auth and close the Supabase-specific hardening backlog.**

Provider replacement is not a Phase 1 cleanup shortcut. It is a full identity/data-security migration disguised as a login-provider swap. Supabase Auth is good enough for the current HomeMatch business revival, and the existing codebase is already close to the right shape: one middleware boundary, one API auth helper, RLS-backed data ownership, and a clear list of remaining security/product decisions.
