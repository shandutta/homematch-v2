# Repository Guidelines

## Project Structure & Module Organization

- Source: `src/` — App Router in `src/app`, UI in `src/components`, domain logic in `src/lib`, shared types in `src/types`.
- Tests: `__tests__/` — unit, integration, e2e, plus fixtures/factories/utils.
- Tooling/ops: `scripts/` (automation), `supabase/` (migrations/local config), `public/` (assets), `.github/workflows/` (CI).

## Build, Test, and Development Commands

- `pnpm dev`: Start Next.js dev server (Turbopack) on `http://localhost:3000`.
- `pnpm build` / `pnpm start`: Production build and serve.
- `pnpm test`: Run unit (Jest), integration (Vitest), and E2E (Playwright).
- `pnpm test:unit` | `pnpm test:integration` | `pnpm test:e2e`: Run specific suites.
- `pnpm lint` | `pnpm lint:fix`: Lint / auto-fix.
- `pnpm type-check`: TypeScript checks. `pnpm format`: Prettier format.
- Database: `pnpm dlx supabase@latest start -x studio`, `pnpm db:reset`, `pnpm migrate`.
- E2E setup: `pnpm test:e2e:validate` to verify local Supabase + env.

## Coding Style & Naming Conventions

- Language: TypeScript + React 19, Next.js 15 (App Router).
- Formatting: Prettier (no semicolons, single quotes, 2 spaces); Tailwind plugin enabled.
- Linting: ESLint (TS/React/Next). Fix with `pnpm lint:fix`.
- Components: PascalCase exports; files in `src/components/**` use kebab-case (e.g., `property-image.tsx`).
- Hooks/utilities: camelCase. Tests mirror feature paths under `__tests__/`.

## Testing Guidelines

- Frameworks: Jest (unit in `__tests__/unit`), Vitest (integration/API), Playwright (E2E UI).
- Environments: jsdom for unit/integration; node for E2E/API; Playwright hits `http://localhost:3000`.
- Coverage: Jest global threshold ≥ 50%. Add tests for changed code.
- Naming: `*.test.ts(x)` or `*.spec.ts(x)` under the appropriate suite.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits via commitlint. Types: `feat|fix|docs|style|refactor|test|chore`.
  - Example: `feat(dashboard): add swipe animation to cards`.
- Hooks: `simple-git-hooks` runs format, lint:fix, and type-check pre-commit.
- PRs: Clear description, linked issues, screenshots for UI, and tests. All CI checks must pass.

## Security & Configuration Tips

- Env: Copy from `.env.example`; never commit secrets. Use `.env.local` for dev, `.env.test.local` for tests.
- Supabase: Prefer local `pnpm dlx supabase@latest start`; keep migrations in `supabase/`.
