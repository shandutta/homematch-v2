# Agent Guidelines for homematch-v2

## Commands

- **Build**: `pnpm build`
- **Lint/Format**: `pnpm lint:fix && pnpm format`
- **Test (All)**: `pnpm test`
- **Test (Single Unit)**: `pnpm exec jest -t 'test name'`
- **Test (Single Integration)**: `pnpm exec vitest -t 'test name'`
- **Type Check**: `pnpm type-check`

## Code Style & Conventions

- **Stack**: TypeScript, React 19, Next.js 15 (App Router), Tailwind, shadcn/ui.
- **Formatting**: Prettier (single quotes, no semi). Run format before committing.
- **Naming**: PascalCase for components, camelCase for hooks/utils/files.
- **Imports**: Use absolute paths (e.g., `src/components/ui/button`).
- **State**: TanStack Query (server), Zustand (client), RHF + Zod (forms).
- **Testing**: Jest (unit), Vitest (integration), Playwright (E2E).
- **Error Handling**: Use Zod for validation; consistent errors via `lib/api/errors.ts`.
- **Commits**: Conventional Commits (e.g., `feat: add login`).
