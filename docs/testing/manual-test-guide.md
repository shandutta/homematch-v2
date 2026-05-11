# Manual Testing Guide (Couples Flow)

## Prerequisites

1. Local Supabase running and seeded: `pnpm dev:db`
2. Test users created: `pnpm test:setup-users`
3. Dev server at http://localhost:3000

## Test Users

Defined in `scripts/setup-test-users-admin.js`:

- `test1@example.com` / `testpassword123`
- `test2@example.com` / `testpassword456`
- `test3@example.com` / `testpassword789`

## Manual Checks

### 1) Authentication

1. Go to `/login`.
2. Log in with `test1@example.com`.
3. Confirm redirect to `/dashboard`, no console errors.

### 2) Dashboard and Mutual Likes

1. On `/dashboard`, verify the swipe UI loads.
2. If mutual likes exist: "Both Liked" section renders with property cards.
3. If no mutual likes: empty state renders correctly.

### 3) Couples Page

1. Visit `/couples`.
2. No household: verify create/join CTA state.
3. In household: verify mutual likes, activity, and stats sections render.

### 4) Second User

1. Log out and log in as `test2@example.com`.
2. Verify same household state and mutual likes behavior.

### 5) API Smoke Checks

- `/api/couples/mutual-likes`
- `/api/couples/stats`
- `/api/couples/activity`

All endpoints require auth. No 500s.

## Troubleshooting

- Not in a household: re-run seed + test user setup (`pnpm dev:db`).
- Supabase unreachable: restart Docker + Supabase.
