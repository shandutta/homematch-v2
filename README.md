# HomeMatch

HomeMatch is an AI-assisted home discovery app that helps households shortlist properties together. The marketing site, Supabase auth, and the swipe dashboard are live; property search, ML ranking, and deeper collaboration features are still in progress.

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

# Start the fast local Next.js loop against the env you configured
pnpm dev
```

Visit http://localhost:3000.

Optional:

- Use `pnpm dev:db` when you explicitly want to start/reset local Supabase, seed data, and create test users.
- Use `pnpm dev:integration` if Supabase is already running and you want the same Next.js command used by integration tests.
- If you want to start Supabase manually, run:
  `pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime`

## Essential Commands

```bash
pnpm dev                # Fast local Next.js dev loop; no DB reset
pnpm dev:db             # Start/reset local Supabase + seed + test users
pnpm dev:integration    # Integration-test dev server; no reset
pnpm build              # Production build
pnpm start              # Serve production build
pnpm lint               # ESLint
pnpm lint:fix           # ESLint auto-fix
pnpm format             # Prettier
pnpm type-check         # TypeScript checks
pnpm test               # Unit + integration + E2E wrapper
pnpm test:unit          # Jest unit tests
pnpm test:integration   # Vitest integration runner
pnpm test:e2e           # Playwright E2E tests
```

## Documentation

Start with `docs/README.md` for the full documentation index. Key entry points:

- Setup: `docs/SETUP_GUIDE.md`
- Architecture: `docs/ARCHITECTURE.md`
- Testing: `docs/TESTING.md`
- Workflows: `docs/DEVELOPMENT_WORKFLOWS.md`
- Style guide: `docs/STYLE_GUIDE.md`
- Secrets scanning: `docs/secrets.md` (enable with `./scripts/setup-git-secrets.sh --scan`)

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── features/        # Feature-specific components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── services/        # Business logic layer
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── supabase/        # Database clients
│   │   └── utils/           # Utility functions
│   └── types/               # TypeScript definitions
├── __tests__/               # Test suites
├── scripts/                 # Automation scripts
├── supabase/                # Database migrations
└── docs/                    # Documentation
```

## Contributing

1. Create a feature branch (`git checkout -b feature/your-branch`)
2. Make changes
3. Run checks (`pnpm lint && pnpm type-check && pnpm test`)
4. Commit with Conventional Commits (`feat: ...`, `fix: ...`, etc.)
5. Push and open a PR

## License

MIT - see `LICENSE`.

## Links

- Issues: https://github.com/shandutta/homematch-v2/issues
- Discussions: https://github.com/shandutta/homematch-v2/discussions
