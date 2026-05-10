# D1 Service-Role RBAC Authority Implementation Packet — 2026-05-08

Generated: 2026-05-08T13:01:23Z
Scope: strict Phase 0/1 planning/guard slice only. No app code, deploys, external dashboards, secrets, paid APIs, browser swarms, or real user/customer data were used.

## Current finding

`src/lib/supabase/server.ts:createServiceClient()` is protected by `checkServiceRoleAuthorization()`, but that check still derives authority from `user_profiles.role === 'admin'`. That is placeholder-grade authority because `user_profiles` is an application profile table, not a hardened administrator authority boundary.

Current service-role callers found in repo-local inspection:

- `src/lib/supabase/service-role-client.ts` delegates to the gated server service client.
- `src/app/api/users/search/route.ts` uses service role after user auth to search other onboarded profiles by email prefix.
- `src/app/api/couples/disputed/route.ts` uses service role after user auth and household lookup to read household members, interactions, properties, and to upsert household dispute resolutions.
- `src/app/invite/[token]/actions.ts` uses service role after auth to accept household invites and update invitation/profile state.
- Prior public `maps/metro-boundaries` service-role usage has already been removed in a separate slice.

## Recommendation

Use a dedicated admin authority table for admin/service-role authorization, and separately reduce user-facing service-role calls into constrained RPCs or capability-specific helpers.

Recommended authority model:

1. Add `public.admin_role_assignments` as the source of truth for human/admin authority. Suggested fields: `user_id uuid primary key references auth.users(id) on delete cascade`, `role text not null`, `enabled boolean not null default true`, `created_at`, `created_by`, `reason`, and optional `expires_at`.
2. Restrict table visibility/administering through RLS. Normal authenticated users must not be able to read the full table or self-promote. Server/service maintenance can read it; human admin management requires an approved bootstrap/admin process.
3. Replace `checkServiceRoleAuthorization()` with a lookup against that table, not `user_profiles.role`.
4. Stop treating every service-role caller as an admin action. For user-facing flows, prefer security-definer RPCs or route-specific helpers that accept only the already-authenticated user context and enforce resource ownership/membership server-side:
   - `users/search`: replace generic service-role profile search with a constrained `search_onboarded_users_for_invite(query, requester_id)` RPC returning only `id`, `email`, `display_name`, and `household_id`, or keep a narrow helper that validates authenticated user + rate limit + selected columns before service-role use.
   - `couples/disputed`: replace multi-table service-role reads/writes with household-scoped RPCs that assert requester household membership and return the existing no-email DTO shape.
   - `invite/[token]/actions`: replace direct service-role mutations with an `accept_household_invite(token, requester_id)` RPC that validates token status/expiry, requester identity, and profile/household updates atomically.
5. Keep cron/admin-secret endpoints as a distinct non-human authority path. Do not silently map cron secrets to human admin RBAC.

Why this over alternatives:

- Supabase custom claims are fast at request time but require external auth metadata mutation and token refresh discipline; they are a good future cache of authority, not the first repo-local source of truth.
- Accepting `user_profiles.role` would be smallest, but it preserves the same profile-table self-/app-write risk class that made D1 a blocker.
- A dedicated roles table is auditable, migratable, testable in repo, and does not require dashboard mutation to plan or guard.

## File-level change plan after owner approval

Minimum repo implementation packet after Shan approves this model:

1. `supabase/migrations/<timestamp>_create_admin_role_assignments.sql`
   - Create `public.admin_role_assignments`.
   - Enable RLS.
   - Add policies that prevent normal users from selecting/upserting/deleting arbitrary assignments.
   - Add comments documenting bootstrap/administering rules.
   - Add DOWN/rollback companion if the project keeps rollback files separately.
2. `src/lib/supabase/server.ts`
   - Replace `profile.role === 'admin'` with an `admin_role_assignments` lookup.
   - Select only the fields needed for authorization, e.g. `role, enabled, expires_at`.
   - Fail closed on missing row, disabled row, expired assignment, or query error.
   - Preserve invalid-refresh-token graceful failure.
3. `src/lib/supabase/service-role-client.ts`
   - Keep delegation through the gated server helper.
   - Optionally add a typed internal capability parameter only after route callers are split by use case.
4. `src/app/api/users/search/route.ts`
   - Prefer constrained RPC or route-specific helper over a generic service-role client.
   - Preserve current auth, rate-limit, minimum-query, selected-field, and no-store behavior.
5. `src/app/api/couples/disputed/route.ts`
   - Prefer household-scoped RPC(s) for reads and resolution upserts.
   - Preserve no partner email in selects/DTOs.
6. `src/app/invite/[token]/actions.ts`
   - Prefer an atomic invite-acceptance RPC or route-specific helper.
   - Preserve token expiry/status checks and requester-bound profile update behavior.
7. Tests/static guards
   - Update unit coverage for service-role authorization to prove non-admin users fail, assigned admins pass, disabled/expired assignments fail, query errors fail closed, and invalid refresh tokens fail closed.
   - Add migration static guard for table name, RLS enabled, no broad authenticated self-upsert, and rollback/DOWN coverage.
   - Add route guards that no new production route imports `getServiceRoleClient()` without either a constrained RPC replacement or an explicit approved capability rationale.
   - Preserve existing route tests for `users/search`, `couples/disputed`, invite acceptance, and no-email disputed DTO behavior.

## Acceptance criteria

D1 is implementation-closed only when all of the following are true:

- `checkServiceRoleAuthorization()` no longer reads `user_profiles.role` as its authority source.
- Dedicated admin authority is represented by a migration, RLS policies, and static/unit tests.
- Ordinary application users cannot create or modify their own admin assignment through app APIs/RLS.
- User-facing service-role paths either move to constrained RPCs or document an approved narrow helper with per-route auth/resource checks.
- Admin/cron authority paths are explicitly separate from normal user authority.
- Targeted Jest/static tests pass, and DB reset/lint/integration evidence is recorded later under the D6 approved environment lane.

## Rollback and risk notes

Rollback approach:

- Revert the migration and code changes as a single PR/commit if admin lookup breaks all service-role creation.
- Keep `getServiceRoleClient()` fail-closed during rollback; do not temporarily open a raw service-role bypass.
- If a production emergency requires restoring old behavior, require explicit owner/security approval because that reintroduces `user_profiles.role` as authority.

Risks:

- Dedicated roles table needs a bootstrap/administering process; without it, no human admin can pass the service-role gate.
- Moving user-facing service-role callers to RPCs may expose missing DB integration coverage until D6 approves reset/lint/integration execution.
- Custom claims may still be desired later for performance, but caching authority in JWTs adds revocation/token-refresh complexity.
- Leaving generic service-role clients in user-facing routes keeps a large blast radius if route-level checks regress.

## Explicit owner approval questions

1. Approve dedicated `admin_role_assignments` table as the source of truth for human/admin service-role authority for Phase 1, instead of Supabase custom claims or accepted `user_profiles.role`?
2. Who/what is the initial bootstrap admin source: a one-time migration seed for a known non-production user, a service-only SQL runbook, or no seed until production ops approval?
3. Which role names are needed now: only `admin`, or separate `owner`, `ops`, and `support` roles?
4. Should user-facing service-role paths (`users/search`, `couples/disputed`, invite acceptance) be forced into constrained RPCs in the D1 implementation slice, or is an interim typed capability helper acceptable?
5. Should Supabase custom claims be deferred entirely, or used later as a cache derived from `admin_role_assignments`?
6. May the implementation slice add DB migrations and static tests only, or is an approved D6 local Supabase reset/lint path available for validation?

## Closure status

This packet does not close Phase 1. It converts D1 from a vague blocker into an implementation-ready owner-decision packet. Phase 1 remains open until Shan approves an authority model and a follow-up implementation/validation slice replaces the placeholder authority.
