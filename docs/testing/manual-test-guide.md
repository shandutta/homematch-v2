# Manual Testing Guide (Couples Flow)

## Prerequisites

1. Local Supabase running and seeded (`pnpm dev` does this).
2. Test users created (`pnpm test:setup-users`).
3. Dev server running at http://localhost:3000.

## Test Users

Default accounts are defined in `scripts/setup-test-users-admin.js`:

- `test1@example.com` / `testpassword123`
- `test2@example.com` / `testpassword456`
- `test3@example.com` / `testpassword789`

## Manual Checks

### 1) Authentication

1. Go to `/login`.
2. Log in with `test1@example.com`.
3. Confirm redirect to `/dashboard` and no console errors.

### 2) Dashboard and Mutual Likes

1. On `/dashboard`, verify the swipe UI loads.
2. If mutual likes exist, confirm the “Both Liked” section renders and contains property cards.
3. If no mutual likes exist, confirm the empty state messaging renders correctly.

### 3) Couples Page

1. Visit `/couples`.
2. If the user is not in a household, verify the create/join CTA state.
3. If the user is in a household, verify mutual likes, activity, and stats sections render.

### 4) Second User

1. Log out and log in as `test2@example.com`.
2. Verify the same household state and mutual likes behavior (if applicable).

### 5) API Smoke Checks

- `/api/couples/mutual-likes`
- `/api/couples/stats`
- `/api/couples/activity`

All endpoints should require authentication and respond without 500s.

## Troubleshooting

- If the user is not in a household, run or re-run the DB seed and test user setup.
- If auth fails, see `docs/TROUBLESHOOTING_AUTH.md`.
- If Supabase is unreachable, restart Docker and Supabase (`pnpm dev`).
