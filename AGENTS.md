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

## DevTools MCP Auth (Dev Only)

- When driving authenticated pages via the Chrome DevTools MCP, use the same local test users that are created by `scripts/setup-test-users-admin.js` (the primary user is `testUsers[0]` in that script).
- Don’t store plaintext creds in `.env.local`, `.env.test.local`, or `/home/shan/.codex/config.toml`; treat `scripts/setup-test-users-admin.js` as the source of truth.
- Login route is `/login`; a successful login should land on `/dashboard`.
