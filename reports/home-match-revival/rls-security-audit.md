# RLS Policy Security Audit — HomeMatch Revival

**Date:** 2026-05-07
**Auditor:** backend-eng (Kanban task t_d6ca0cef)
**Scope:** 6 core tables + 3 additional RLS-enabled tables
**Repo:** /home/shan/projects/homematch-v2
**Migrations reviewed:** 36

---

## Executive Summary

| Risk Level | Count | Description |
|---|---|---|
| **CRITICAL** | 1 | Properties `listing_status` bypass via general SELECT policy |
| **HIGH** | 3 | Missing user_profiles DELETE, `/api/couples/disputed` service-role data leak, household INSERT gap |
| **MEDIUM** | 4 | User search service-role pattern, invite page unauthenticated access, missing household policies |
| **LOW** | 4 | Neighborhood public read (design), missing admin-only policies, metro-boundaries endpoint |

---

## 1. RLS Coverage Matrix

### 1.1 Core Tables (per task scope)

| Table | RLS? | SELECT | INSERT | UPDATE | DELETE | Coverage |
|---|---|---|---|---|---|---|
| `user_profiles` | Yes | `auth.uid() = id` + `supabase_auth_admin` FOR ALL | `auth.uid() = id` | `auth.uid() = id` | **MISSING** | Partial |
| `households` | Yes | Subquery (user_profiles) | **MISSING** | Subquery (user_profiles) | **MISSING** | Partial |
| `neighborhoods` | Yes | `true` (public) | **MISSING** | **MISSING** | **MISSING** | Read-only |
| `properties` | Yes | `is_active = true` (all) + `anon` marketing read | **MISSING** | **MISSING** | **MISSING** | Read-only |
| `user_property_interactions` | Yes | `auth.uid() = user_id` + household members mutual likes | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | Full |
| `saved_searches` | Yes | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | Full |

### 1.2 Additional RLS-Enabled Tables

| Table | RLS? | Policies | Coverage |
|---|---|---|---|
| `neighborhood_vibes` | Yes | SELECT (authenticated), INSERT/UPDATE/DELETE (service_role) | Read + admin |
| `household_property_resolutions` | Yes | SELECT/INSERT/UPDATE/DELETE (household-scoped) | Full |
| `household_invitations` | Yes | SELECT/INSERT/UPDATE (household-scoped) | Partial (no DELETE) |

---

## 2. Policy Permissiveness Audit

### 2.1 CRITICAL — Properties `listing_status` Bypass

**Migration:** `20250728013721_create_rls_policies.sql` (line 35) + `20250801052809_enable_marketing_read_policy.sql`

**The gap:** Two SELECT policies overlap on `properties`, creating an OR condition:

```
Policy A: "Anyone can view active properties" (no TO clause = all roles)
  USING (is_active = true)
  → Allows any property with is_active=true, regardless of listing_status

Policy B: "properties_anon_marketing_read" (TO anon)
  USING (listing_status = 'active' AND coalesce(is_active, true) = true)
  → Scoped to listing_status='active' but only for anon role
```

Because Supabase RLS applies OR logic across policies for the same operation, an anon (unauthenticated) user can see a property if EITHER policy passes. Policy A has no `listing_status` check, so:

- A property with `is_active = true` but `listing_status = 'draft'` or `listing_status = 'sold'` is visible to **all users including unauthenticated**.
- A property with `is_active = false` but `listing_status = 'active'` is visible to anon users via Policy B.

**Impact:** Draft/pending/sold listings leak through the API. A malicious user can enumerate all non-public properties by querying with different filters.

**Recommended fix:**
```sql
-- Replace Policy A to match the stricter anon policy scope
DROP POLICY "Anyone can view active properties" ON properties;
CREATE POLICY "Anyone can view active properties" ON properties
  FOR SELECT USING (
    is_active = true
    AND listing_status = 'active'
  );

-- Or, add listing_status gate:
DROP POLICY "Anyone can view active properties" ON properties;
CREATE POLICY "Anyone can view active properties" ON properties
  FOR SELECT USING (
    is_active = true
    AND listing_status IN ('active', 'pending')
  );
```

---

### 2.2 HIGH — Missing DELETE on `user_profiles`

**Migration:** `20250728013721_create_rls_policies.sql`

No DELETE policy exists for `user_profiles`. Users cannot delete their own profile. The table has `ON DELETE CASCADE` from `auth.users` in one direction (the FK is `id UUID REFERENCES auth.users(id)`), but there's no user-facing delete path.

**Risk:** Account deletion workflow cannot function. If a user deletes their auth.users entry (via Supabase Auth admin API), the cascade will clean up, but the app has no self-serve delete.

**Recommended fix:**
```sql
CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = id);
```

---

### 2.3 HIGH — `/api/couples/disputed` Service-Role Data Leak

**File:** `src/app/api/couples/disputed/route.ts`

The `GET` handler (lines 108-182):
1. Authenticates the user normally
2. Uses `getServiceRoleClient()` to read ALL household members' `user_profiles` (id, display_name, email) — bypassing the per-user RLS
3. Uses service role to read ALL interactions for the household
4. Returns disputed properties with partner names, emails, and score data

**Risk:** If the RLS on `user_profiles` or `user_property_interactions` is working correctly, the service role bypasses all of it. The code does scope reads to `household_id`, so it's not a cross-household leak — but within a household, service role exposes all members' data that would otherwise be scoped by RLS.

**Recommended fix:** Create a `get_household_members` SECURITY DEFINER function that returns only the fields needed (id, display_name) — no emails. This avoids exposing raw service-role reads in application code.
```sql
CREATE FUNCTION get_household_member_profiles(p_household_id UUID)
RETURNS TABLE(id UUID, display_name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, display_name FROM user_profiles WHERE household_id = p_household_id;
$$;
```

---

### 2.4 HIGH — Missing INSERT on `households`

**Migration:** `20250728013721_create_rls_policies.sql`

No INSERT policy on `households`. Creating a household requires calling `create_household_for_user()` (SECURITY DEFINER function in `20251130200000_consolidated_pending_features.sql`).

**Risk:** The RPC function bypasses RLS via SECURITY DEFINER. This is functional but fragile — if the function is dropped or modified incorrectly, household creation breaks entirely. A direct INSERT policy would be more robust.

**However:** The RPC validates auth user existence, checks for existing household membership, and handles profile upsert — logic that can't be done in a simple `WITH CHECK` clause. The RPC is the right pattern for now, but it's a single point of failure.

---

### 2.5 MISSING — No DELETE on `households`

No way for users to delete households. No RPC, no policy, no app route. This is likely intentional (households are permanent) but should be documented.

---

## 3. Subquery Performance Analysis

### 3.1 Household SELECT/UPDATE Policy Subquery

```sql
-- Used in both households SELECT and UPDATE policies
id IN (SELECT household_id FROM user_profiles WHERE id = auth.uid())
```

**Analysis:**
- `user_profiles.id` is a PK (UUID), so the `WHERE id = auth.uid()` clause is an index lookup — O(1).
- The subquery returns 0 or 1 row (one user = one household).
- Supabase evaluates the USING expression per candidate row. For households with N rows, the subquery fires N times.
- In practice: most apps have <100 households, and the subquery itself is trivially fast on a PK index.

**Verdict: LOW risk at current scale.** The subquery pattern won't bottleneck until thousands of households.

**Optimization path (if scaling needed):**
```sql
CREATE FUNCTION get_user_household_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT household_id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Users can view their household" ON households
  FOR SELECT USING (id = get_user_household_id());
```

This evaluates `auth.uid()` once (not per-row) and avoids the subquery. Worth implementing pre-emptively since it's a negligible change.

---

## 4. Service-Role Bypass Inventory

| Endpoint | File | Tables Accessed | Auth Required | Risk |
|---|---|---|---|---|
| `GET /api/couples/disputed` | `couples/disputed/route.ts` | user_profiles, household_property_resolutions, user_property_interactions | Yes | HIGH |
| `PATCH /api/couples/disputed` | `couples/disputed/route.ts` | household_property_resolutions (upsert) | Yes | MEDIUM |
| `GET /api/users/search` | `users/search/route.ts` | user_profiles (search) | Yes + rate-limited | MEDIUM |
| `POST /api/interactions` | `interactions/route.ts` | user_profiles (fallback), user_property_interactions (backfill) | Yes | LOW |
| `InvitePage (SSR)` | `invite/[token]/page.tsx` | household_invitations, user_profiles | No | MEDIUM |
| `acceptInviteAction` | `invite/[token]/actions.ts` | household_invitations, user_profiles | Yes | LOW |
| `GET /api/maps/metro-boundaries` | `maps/metro-boundaries/route.ts` | neighborhoods | **No** | LOW |

### 4.1 Detail: `/api/users/search` (MEDIUM)

The endpoint uses service role because RLS on `user_profiles` scopes to `auth.uid() = id` — users can't see other users' profiles. The code explicitly acknowledges this (line 35-36): `// Use service role client to bypass RLS for user search`.

**What it returns:** id, email, display_name, household_id — minimal fields, and it filters to `onboarding_completed = true` + excludes the requesting user.

**Risk:** Email enumeration. An authenticated user can search by email prefix and discover other users' emails and household associations. Rate-limited.

**Recommended fix:** Create a dedicated search function:
```sql
CREATE FUNCTION search_users_by_email(p_query TEXT, p_exclude_id UUID)
RETURNS TABLE(id UUID, display_name TEXT, household_id UUID)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, display_name, household_id
  FROM user_profiles
  WHERE onboarding_completed = true
    AND id != p_exclude_id
    AND email ILIKE p_query || '%'
  LIMIT 10;
$$;
```
This function returns NO emails — just ids, display_names, and household_ids. The client no longer gets raw user_profiles data.

### 4.2 Detail: `/invite/[token]/page.tsx` (MEDIUM)

This is a Server Component that reads `household_invitations` and `user_profiles` with service role, **with no auth check whatsoever**. Unauthenticated users can:
- View invitation details (household name, inviter name/email, collaboration mode, expiry)
- This is actually the intended UX — you should see an invite before logging in

**Risk:** Token enumeration. An attacker can brute-force tokens to discover household names and inviter emails. The token is a UUID (unguessable), so practical risk is low.

**Mitigation:** The `household_invitations` table already has RLS policies, so the service role bypass is intentional for the unauthenticated view. Rate-limiting the page route would help.

---

## 5. Auth Admin Access Audit

**Migration:** `20251122101500_auth_admin_user_profiles_access.sql`

```sql
GRANT ALL PRIVILEGES ON TABLE public.user_profiles TO supabase_auth_admin;
CREATE POLICY user_profiles_auth_admin_full_access
  ON public.user_profiles FOR ALL TO supabase_auth_admin
  USING (true) WITH CHECK (true);
```

**Analysis:**
- `supabase_auth_admin` is the GoTrue internal role that manages auth.users and needs to sync user_profiles via triggers (like `handle_new_user()`).
- The `FOR ALL ... USING (true)` is the standard pattern for auth admin access.
- The `TO supabase_auth_admin` clause scopes the policy to a single internal role — no end-user role inherits from it.

**Verdict: LOW risk.** This is standard Supabase practice and correctly scoped. No escalation path exists unless a SECURITY DEFINER function owned by `supabase_auth_admin` is accidentally exposed to authenticated users — which is not the case here.

---

## 6. Security Definer Function Inventory

| Function | Migration | search_path | Risk |
|---|---|---|---|
| `handle_new_user()` | 20251204040000 | (not set — `language plpgsql security definer` only) | **MEDIUM** |
| `get_properties_in_bounds()` | 20251204040000 | `public, extensions` | LOW |
| `get_walkability_score()` | 20251204040000 | `public, extensions` | LOW |
| `get_transit_score()` | 20251204040000 | `public, extensions` | LOW |
| `get_properties_by_distance()` | 20251204040000 | `public, extensions` | LOW |
| `get_neighborhoods_in_bounds()` | 20251204040000 | `public, extensions` | LOW |
| `get_property_clusters()` | 20251204040000 | `public, extensions` | LOW |
| `get_properties_in_polygon()` | 20251204040000 | `public, extensions` | LOW |
| `get_properties_along_route()` | 20251204040000 | `public, extensions` | LOW |
| `get_geographic_density()` | 20251204040000 | `public, extensions` | LOW |
| `get_household_mutual_likes()` | 20250816045943 | `public` | LOW |
| `get_household_activity_enhanced()` | 20250816045943 | `public` | LOW |
| `check_potential_mutual_like()` | 20250816045943 | `public` | LOW |
| `create_household_for_user()` | 20251130200000 | `public` | LOW |
| `backfill_property_neighborhoods()` | 20251220170000 | `public, extensions` | LOW |
| `backfill_property_coordinates()` | 20251220203000 | `public, extensions` | LOW |

**Finding:** `handle_new_user()` (line 35 of `20251204040000`) uses `$$ language plpgsql security definer;` **without an explicit `set search_path`**. This is a potential vulnerability — if the caller can inject objects into the search_path, the function could execute unintended code.

**Recommended fix:**
```sql
$$ language plpgsql security definer set search_path = public;
```

All other SECURITY DEFINER functions correctly set `search_path = public` or `search_path = public, extensions`.

---

## 7. Policy-by-Policy Inventory

### 7.1 user_profiles (3 policies + 1 admin)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Users can view their own profile | SELECT | all roles | `auth.uid() = id` | 20250728013721 |
| Users can update their own profile | UPDATE | all roles | `auth.uid() = id` | 20250728013721 |
| Users can insert their own profile | INSERT | all roles | `auth.uid() = id` | 20250728013721 |
| user_profiles_auth_admin_full_access | ALL | supabase_auth_admin | `true` | 20251122101500 |

### 7.2 households (2 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Users can view their household | SELECT | all roles | `id IN (SELECT household_id FROM user_profiles WHERE id = auth.uid())` | 20250728013721 |
| Users can update their household | UPDATE | all roles | Same subquery | 20250728013721 |

### 7.3 neighborhoods (1 policy)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Anyone can view neighborhoods | SELECT | all roles | `true` | 20250728013721 |

### 7.4 properties (2 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Anyone can view active properties | SELECT | all roles | `is_active = true` | 20250728013721 |
| properties_anon_marketing_read | SELECT | anon | `listing_status = 'active' AND is_active = true` | 20250801052809 |

### 7.5 user_property_interactions (5 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Users can view their own interactions | SELECT | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can insert their own interactions | INSERT | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can update their own interactions | UPDATE | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can delete their own interactions | DELETE | all roles | `auth.uid() = user_id` | 20251125120000 |
| Household members can access mutual likes | SELECT | all roles | `household_id IN (SELECT ...)` | 20250816045943 |

### 7.6 saved_searches (4 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Users can view their own searches | SELECT | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can insert their own searches | INSERT | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can update their own searches | UPDATE | all roles | `auth.uid() = user_id` | 20250728013721 |
| Users can delete their own searches | DELETE | all roles | `auth.uid() = user_id` | 20250728013721 |

### 7.7 neighborhood_vibes (4 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| neighborhood_vibes_select_authenticated | SELECT | authenticated | `true` | 20251215090000 |
| neighborhood_vibes_insert_service | INSERT | service_role | `true` | 20251215090000 |
| neighborhood_vibes_update_service | UPDATE | service_role | `true` | 20251215090000 |
| neighborhood_vibes_delete_service | DELETE | service_role | `true` | 20251215090000 |

### 7.8 household_property_resolutions (4 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Household members can view property resolutions | SELECT | all roles | household_id subquery | 20251218091000 |
| Household members can create property resolutions | INSERT | all roles | `resolved_by = auth.uid() AND household_id subquery` | 20251218091000 |
| Household members can update property resolutions | UPDATE | all roles | household_id subquery | 20251218091000 |
| Household members can delete property resolutions | DELETE | all roles | household_id subquery | 20251218091000 |

### 7.9 household_invitations (3 policies)

| Policy Name | Operation | Scope | Using/Check | Migration |
|---|---|---|---|---|
| Users can view their household invitations | SELECT | all roles | household_id subquery | 20251130200000 |
| Users can create invitations for their household | INSERT | all roles | `auth.uid() = created_by AND household_id subquery` | 20251130200000 |
| Users can update their own invitations | UPDATE | all roles | `auth.uid() = created_by` | 20251130200000 |

---

## 8. Prioritized Remediation Plan

### Immediate (this sprint)

1. **CRITICAL — Fix property SELECT policy overlap (Section 2.1)**
   - Add `listing_status` check to the general "Anyone can view active properties" policy
   - Migration file: create a new migration that drops and recreates the policy

2. **HIGH — Add DELETE policy on user_profiles (Section 2.2)**
   - One-line policy addition

3. **HIGH — Fix `handle_new_user()` missing search_path (Section 6)**
   - Add `set search_path = public` to the function definition

### Short-term (next sprint)

4. **HIGH — Replace `/api/couples/disputed` service-role reads with SECURITY DEFINER function (Section 2.3)**
   - Create `get_household_member_profiles(household_id)` function
   - Return only id + display_name (no emails)

5. **MEDIUM — Replace `/api/users/search` service-role reads with search function (Section 4.1)**
   - Create `search_users_by_email(query, exclude_id)` function
   - Remove email from returned fields

### Nice-to-have

6. **LOW — Create `get_user_household_id()` function (Section 3.1)**
   - Replaces subquery in household policies
   - Marginal perf improvement now, prevents scaling issues later

7. **LOW — Add rate limiting to `/invite/[token]` route**
   - Mitigates token enumeration

8. **LOW — Document intentional policy gaps**
   - Household INSERT (handled by RPC)
   - Properties/neighborhoods write policies (admin-only)

---

## 9. Appendix: Migration Reference

| Migration | Purpose | RLS Impact |
|---|---|---|
| 20250728013711 | Enable RLS on all 6 core tables | Foundation |
| 20250728013721 | Create initial RLS policies | Core policies |
| 20250801052809 | Marketing anon read policy | Properties SELECT for anon |
| 20250804053305 | Interaction summary function | No RLS (runs as caller) |
| 20250804053950 | Harden function search_path | Security hardening |
| 20250816045943 | Couples optimization functions + RLS policy | user_property_interactions SELECT |
| 20251122101500 | Auth admin access | user_profiles FOR ALL TO supabase_auth_admin |
| 20251125120000 | Interaction DELETE policy | user_property_interactions DELETE |
| 20251130200000 | Household invitations + RLS | New table + 3 policies |
| 20251204040000 | Geo RPCs + handle_new_user | Multiple SECURITY DEFINER functions |
| 20251215090000 | Neighborhood vibes + RLS | New table + 4 policies |
| 20251218091000 | Household property resolutions + RLS | New table + 4 policies |
