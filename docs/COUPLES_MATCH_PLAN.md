# Couples Match — Functional Plan + Test Strategy

This document describes how the Couples Match experience should behave end-to-end (data model → APIs → UI), and how we validate it with minimal mocking.

## Product Goals

- Let two household members “swipe” independently while staying in sync.
- Highlight “Both Liked” (mutual likes) quickly and reliably.
- Provide a shared activity feed and lightweight “journey” stats.
- Make household setup (create/join/invite) obvious and low-friction.
- Keep results correct even under caching, refreshes, and multi-tab usage.

## Core User Journeys

### 1) Create / Join Household

- If a user has no `user_profiles.household_id`:
  - Couples page shows “Create Household” + “Join Existing”.
  - Dashboard can still function, but couples-specific APIs should return empty/household-required behavior.
- Creating a household:
  - Uses `create_household_for_user()` RPC to atomically create the household and link the user.
  - Resulting household becomes the user’s `household_id`.
- Joining a household:
  - Updates `user_profiles.household_id` for the joining user.
  - Household membership count is derived from `user_profiles` and reflected in `households.user_count`.

### 2) Invite Partner

- When a user is the only household member:
  - Couples page shows an invite/send flow (household ID + invite link).
  - Invitations are created in `household_invitations` and can be shared via link or code.

### 3) Swiping + Recording Decisions

- When the user swipes/decides:
  - Client calls `POST /api/interactions` with `{ propertyId, type }`.
  - Server writes `user_property_interactions` with the user context AND `household_id` (if present).
  - Couples-related caches are invalidated for that household.

### 4) Mutual Like (“Both Liked”)

- A mutual like exists when **2+ unique household members** have `interaction_type = 'like'` for the same `property_id` within the same `household_id`.
- On a “like” interaction:
  - UI may call `/api/couples/check-mutual?propertyId=…` to determine whether to show a celebration/toast.
  - The “Both Liked” UI (dashboard + couples page) should update without requiring a hard refresh.

### 5) Review & Track Progress

- Couples page (active household) includes:
  - Mutual likes section (with optional property enrichment).
  - Recent household activity (who viewed/liked/passed, with timestamps and property preview).
  - Stats summary (“Your Journey”).

## Data Model & Invariants

### Household Membership

- Source of truth: `user_profiles.household_id`.
- Derived: `households.user_count`.
  - Kept correct by DB trigger: `supabase/migrations/20251217160000_sync_household_user_count.sql`.
  - Backfilled during migration to eliminate drift in existing data.

### Interactions

- Table: `user_property_interactions`.
- Invariant: if a user belongs to a household at interaction time, the row **must** include `household_id`.
  - Couples mutual-like RPCs require `household_id` for fast aggregation.

## API Contracts (Key Endpoints)

- `POST /api/interactions`
  - Records a user decision.
  - Ensures `household_id` is attached for household members.
  - Invalidates Couples caches for that household.

- `GET /api/couples/mutual-likes?includeProperties=(true|false)`
  - Returns:
    - `mutualLikes: Array<{ property_id, liked_by_count, first_liked_at, last_liked_at, user_ids?, property? }>`
    - `performance: { totalTime, cached, count }` (always includes `count`, even when empty)

- `GET /api/couples/activity?limit=…&offset=…`
  - Returns recent household interactions with enriched property info and `is_mutual` flag.

- `GET /api/couples/stats`
  - Returns aggregated stats for the household (mutual likes count, total likes, streak, last mutual like).

## Caching & Invalidation Rules

### Server-side (CouplesService)

- Couples queries are cached by household to reduce repeated aggregation work.
- Cache invalidation must work **across route handlers** in Next dev mode.
  - Caches are stored on `globalThis` (singleton) to prevent “per-route-bundle” cache divergence.
- Invalidation entrypoint: `CouplesService.clearHouseholdCache(householdId)` clears:
  - Mutual likes cache for `householdId`
  - All activity pages prefixed by `activity_${householdId}_`
  - Stats cache key `stats_${householdId}`

### Client-side (React Query)

- Mutual likes are fetched via a `['couples', 'mutual-likes']` query key.
- Any interaction mutation invalidates `['couples']` so all couples-related queries refetch.

## UI States (Expected)

### Couples Page

- `no-household`: show create/join CTA.
- `waiting-partner`: show invite flow and household ID.
- `active`:
  - Hero stats visible.
  - Mutual likes, activity, and stats sections render.
  - No console errors (unique keys; no hydration mismatches).

### Dashboard “Both Liked”

- Always renders a stable SSR placeholder to avoid hydration mismatches.
- Refreshes automatically after an interaction (query invalidation).

## Testing Strategy (Low Mocking)

### Integration/E2E (preferred)

- Real HTTP against the running dev server (Next route handlers + middleware + auth):
  - `__tests__/integration/api/mutual-likes.spec.ts`
  - `__tests__/integration/api/interactions-route.integration.test.ts`
- Real DB behavior (trigger + backfill correctness):
  - `__tests__/integration/database/household-user-count-trigger.spec.ts`

### What we avoid

- Mocking Supabase clients for the core couples flow.
- Snapshot-heavy UI tests that don’t validate the data/API invariants.

## Manual QA Checklist (Chrome DevTools)

- Household gating:
  - `/couples` shows waiting state with 1 member and active state with 2.
- Interaction pipeline:
  - Liking a property creates a `user_property_interactions` row with correct `household_id`.
- Mutual likes:
  - After both users like the same property, `/api/couples/mutual-likes` returns it without requiring a server restart.
- UI correctness:
  - Dashboard “Both Liked” loads without hydration warnings.
  - Couples hero does not log duplicate-key or AnimatePresence warnings.
