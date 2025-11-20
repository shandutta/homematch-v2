# HomeMatch

**Status**: Building in public — dashboard + Supabase auth are live; search, ML ranking, and collaboration polish are in progress.

HomeMatch is an AI-assisted home discovery app I'm building to make real estate less confusing for my family and anyone who wants to navigate home search together. It blends Next.js, Supabase, and real-time UI patterns so households can shortlist homes side by side.

## Features

### ✅ Working now

- Authentication: Supabase Auth with Google plus email/password flows
- Database: PostGIS-enabled PostgreSQL with row-level security and real-time updates
- Dashboard: Tinder-style swiper for properties with like/pass and live counters
- Property cards: Glassmorphism design, Zillow-backed data, and image optimization
- Activity views: Dedicated screens for viewed, liked, and passed homes

### 🚧 In progress

- Property search: Filtering, sorting, and better browsing controls
- ML scoring: Staged recommendation pipeline that adapts to feedback
- Household collaboration: Shared lists, notifications, and tour planning polish
- Natural language search: Conversational queries for properties
- Marketing site: Landing page and onboarding refinements

## Tech Stack

- Next.js 15 (App Router) with React 19 and TypeScript (strict)
- Tailwind CSS with shadcn/ui components
- Supabase for database, auth, storage, and real-time features
- TanStack Query + Zustand for state management
- Zod + React Hook Form for validation
- Framer Motion + Lucide for animation and icons
- Inngest for background jobs

## Testing & Quality

- Jest for unit tests, Vitest for integration, Playwright for E2E
- ESLint + Prettier + TypeScript strict mode
- See `docs/TESTING.md` for suite setup, environments, and workflows

## Quick Start

```bash
git clone https://github.com/shandutta/homematch-v2.git
cd homematch-v2
pnpm install

# Copy env vars and add your Supabase credentials
cp .env.example .env.local

# (Optional) start local Supabase
pnpm dlx supabase@latest start -x studio

# Run the dev server
pnpm run dev
```

Visit `http://localhost:3000` to see the app.

## Essential Commands

```bash
pnpm run dev             # Start development server
pnpm run build           # Production build
pnpm run start           # Serve production build
pnpm run lint            # ESLint + TypeScript checks
pnpm run test            # All test suites (unit, integration, E2E)
pnpm run test:unit       # Jest unit tests
pnpm run test:integration # Vitest integration tests
pnpm run test:e2e        # Playwright E2E tests
pnpm run db:migrate      # Apply database migrations
```

## Documentation

- Setup: `docs/SETUP_GUIDE.md`
- Architecture: `docs/ARCHITECTURE.md`
- Testing: `docs/TESTING.md`
- Style guide: `docs/STYLE_GUIDE.md`
- Performance: `docs/PERFORMANCE.md`
- API reference (Zillow): `docs/RAPIDAPI_ZILLOW.md`
- Implementation plan and workflows: `docs/IMPLEMENTATION_PLAN.md`, `docs/DEVELOPMENT_WORKFLOWS.md`
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
3. Run tests (`pnpm test`)
4. Commit with Conventional Commits (`feat: ...`, `fix: ...`, etc.)
5. Push and open a Pull Request

## License

This project is licensed under the MIT License - see `LICENSE` for details.

## Links

- Live Demo: Coming soon
- Documentation: `./docs/`
- Issues: https://github.com/shandutta/homematch-v2/issues
- Discussions: https://github.com/shandutta/homematch-v2/discussions
