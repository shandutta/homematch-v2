# HomeMatch Project Brief

HomeMatch is an AI-assisted home discovery app that helps households shortlist properties together. It pairs a swipe-based discovery flow with collaboration features and ML-driven ranking.

## Stack (High Level)

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime)
- TanStack Query + Zustand
- Zod + React Hook Form
- Jest, Vitest, Playwright

## Architecture Snapshot

- UI routes: `src/app`
- Components: `src/components`
- Services: `src/lib/services`
- Supabase clients: `src/lib/supabase`
- Schemas: `src/lib/schemas`

## Current Focus

- Property search UI and filtering
- ML scoring and recommendations
- Household invitations and shared decision lists
- Background jobs

For deeper details, see `docs/ARCHITECTURE.md` and `docs/SETUP_GUIDE.md`.
