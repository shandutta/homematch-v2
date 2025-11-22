# HomeMatch

**Status**: Active development — marketing site, Supabase auth, and the dashboard swipe experience are live; property search, ML scoring, and deeper collaboration are still in progress.

HomeMatch is an AI-assisted home discovery app that blends Next.js, Supabase, and real-time UI patterns so households can shortlist homes side by side.

## Features

### ✅ Working now

- Authentication with Supabase (email/password + Google) and protected routes
- Dashboard swiper with like/pass/view tracking and real-time stats
- Couples workflows: mutual likes highlights and celebration states on dashboard
- Marketing site with feature grid, how-it-works, CTA band, and dynamic marketing cards
- Liked / Passed / Viewed pages plus profile and settings screens

### 🚧 In progress

- Property search and filters beyond dashboard feed
- ML ranking and recommendation pipeline
- Household collaboration (invitations + shared lists) beyond mutual likes
- Background jobs and marketing/landing refinements

## Tech Stack

- Next.js 15.4.5 (App Router) with React 19.1 and TypeScript strict
- Tailwind CSS 4 + shadcn/ui components
- Supabase for database, auth, storage, and real-time features
- TanStack Query + Zustand for state
- Zod + React Hook Form for validation
- Framer Motion + Lucide for motion and icons
- Inngest (libraries present; jobs not wired yet)

## Testing & Quality

- Jest for unit tests, Vitest for integration, Playwright for E2E
- ESLint + Prettier + TypeScript strict mode
- See `docs/TESTING.md` for how to run suites locally

## Quick Start

```bash
git clone https://github.com/shandutta/homematch-v2.git
cd homematch-v2
pnpm install

# Copy env vars and add your Supabase credentials
cp .env.example .env.local

# (Optional) start local Supabase
pnpm dlx supabase@latest start -x studio
supabase db reset --force   # apply migrations + seed fixtures

# Run the dev server
pnpm dev
```

Visit `http://localhost:3000` to see the app.

## Essential Commands

```bash
pnpm dev                # Start development server
pnpm build              # Production build
pnpm start              # Serve production build
pnpm lint               # ESLint
pnpm type-check         # TypeScript checks
pnpm test               # Unit + integration + E2E wrapper
pnpm test:unit          # Jest unit tests
pnpm test:integration   # Vitest integration runner
pnpm test:e2e           # Playwright E2E tests
pnpm migrate            # Run migration script helper
```

## Documentation

- Setup: `docs/SETUP_GUIDE.md`
- Architecture: `docs/ARCHITECTURE.md`
- Testing: `docs/TESTING.md`
- Style guide: `docs/STYLE_GUIDE.md`
- Performance: `docs/PERFORMANCE.md`
- RapidAPI/Zillow: `docs/RAPIDAPI_ZILLOW.md`
- Workflows: `docs/DEVELOPMENT_WORKFLOWS.md`
- Documentation index: `docs/README.md`

## Architecture

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

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes
3. Run checks (`pnpm lint && pnpm type-check && pnpm test`)
4. Commit with Conventional Commits (`feat: ...`, `fix: ...`, etc.)
5. Push and open a Pull Request

## License

This project is licensed under the MIT License - see `LICENSE` for details.

## Links

- Live Demo: Coming soon
- Documentation: `./docs/`
- Issues: https://github.com/shandutta/homematch-v2/issues
- Discussions: https://github.com/shandutta/homematch-v2/discussions
