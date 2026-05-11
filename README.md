# HomeMatch

AI-assisted home discovery app. Households shortlist properties together. Marketing site, Supabase auth, and swipe dashboard are live; property search, ML ranking, and collaboration features are in progress.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime)
- TanStack Query + Zustand
- Zod + React Hook Form
- Jest, Vitest, Playwright

## Quick Start

```bash
pnpm install
cp .env.example .env.local

# Fast local dev; no Docker needed
SKIP_SUPABASE_GUARD=true pnpm dev
```

Visit http://localhost:3000.

Docker is optional. Use it for local database or integration-test work:

- `pnpm dev:db` — start/reset local Supabase, seed data, create test users. Requires Docker.
- `pnpm dev:integration` — dev server without reset, matching integration-test config.
- `SKIP_DOCKER=1` — bypass Docker checks in non-Docker environments.
- Manual Supabase: `pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime`

**Secrets**: keep real credentials in untracked local files. Never commit API keys, service-role keys, or database URLs. See `docs/secrets.md` for scanning.

**Production guard**: `pnpm dev` blocks `.env.local` values pointing at production Supabase hosts. Use `SKIP_SUPABASE_GUARD=true` for read-only remote dev loops. Do not run mutations, resets, or admin workflows against production data in local dev. Production hostnames live in `config/supabase-production-hosts.json` (hostnames only, no secrets).

## Commands

```bash
pnpm dev                 # Next.js dev server on port 3000
pnpm dev:db              # Local Supabase reset + seed + test users + dev server
pnpm dev:integration     # Dev server without reset (integration-test config)
pnpm build               # Production build
pnpm start               # Serve production build
pnpm lint                # ESLint
pnpm lint:fix            # ESLint auto-fix
pnpm format              # Prettier
pnpm type-check          # TypeScript check
pnpm test                # Unit + integration (parallel) then E2E
pnpm test:unit           # Jest unit tests
pnpm test:integration    # Vitest integration tests
pnpm test:e2e            # Playwright E2E tests
```

## Docs

Start at `docs/README.md`. Key pages:

- Setup: `docs/SETUP_GUIDE.md`
- Architecture: `docs/ARCHITECTURE.md`
- Testing: `docs/TESTING.md`
- Style guide: `docs/STYLE_GUIDE.md`
- Secrets: `docs/secrets.md`

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/
│   │   ├── features/        # Feature components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Zod schemas
│   │   ├── supabase/        # DB clients
│   │   └── utils/           # Utilities
│   └── types/               # TypeScript types
├── __tests__/               # Test suites
├── scripts/                 # Automation scripts
├── supabase/                # Migrations and seed
└── docs/                    # Documentation
```

## Contributing

1. Branch: `git checkout -b feature/your-branch`
2. Make changes
3. Pre-PR checks: `pnpm lint && pnpm type-check && pnpm test`
4. Commit with Conventional Commits (`feat: ...`, `fix: ...`)
5. Push and open a PR

## License

MIT — see `LICENSE`.
