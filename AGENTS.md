# Agent Guidelines — HomeMatch V2

## Commands

- **Dev (fast)**: `pnpm dev` — no Docker, no DB reset; blocks production Supabase hosts
- **Dev (skip guard)**: `SKIP_SUPABASE_GUARD=true pnpm dev` — read-only remote dev only; no mutations
- **Dev (local DB)**: `pnpm dev:db` — Docker + local Supabase reset + seed + test users
- **Dev (integration)**: `pnpm dev:integration` — no-reset dev server for integration-test config
- **Build**: `pnpm build`
- **Lint/Format**: `pnpm lint:fix && pnpm format`
- **Type Check**: `pnpm type-check`
- **Test (all)**: `pnpm test`
- **Test (single unit)**: `pnpm exec jest -t 'test name'`
- **Test (single integration)**: `pnpm exec vitest -t 'test name'`

Docker only needed for `pnpm dev:db` and `pnpm test:integration`. `SKIP_DOCKER=1` bypasses Docker checks.

## Stack

TypeScript, React 19, Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui. Supabase (Postgres, Auth, RLS). TanStack Query (server state), Zustand (client state), RHF + Zod (forms). Jest (unit), Vitest (integration), Playwright (E2E).

## Conventions

- **Formatting**: Prettier (single quotes, no semicolons). Run before commit.
- **Naming**: PascalCase components, camelCase hooks/utils/files.
- **Imports**: Absolute paths (`src/components/ui/button`).
- **Error handling**: Zod validation; `src/lib/api/errors.ts` for consistent error responses.
- **Commits**: Conventional Commits (`feat:`, `fix:`, etc.), enforced by commitlint.

## Docs

- `docs/README.md` — index
- `docs/SETUP_GUIDE.md` — env, dev paths, test users
- `docs/ARCHITECTURE.md` — service layer, data access, directory layout
- `docs/TESTING.md` — Jest/Vitest/Playwright commands

## Test Users

Created by `pnpm test:setup-users` or automatically by `pnpm dev:db`. Source of truth: `scripts/setup-test-users-admin.js` (`testUsers[0]` is the primary test user). Login at `/login`; successful login lands on `/dashboard`. Do not store plaintext credentials in tracked files.

## Safety

- Never commit secrets, API keys, service-role keys, or database URLs
- Never run mutations, resets, or admin workflows against production data
- Production hostnames (no secrets) live in `config/supabase-production-hosts.json`
- Deployments, paid API calls, and dashboard changes require explicit approval
