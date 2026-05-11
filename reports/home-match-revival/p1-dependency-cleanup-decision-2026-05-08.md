# P1 Dependency Cleanup Decision — Phase 0/1 Closure

Generated: 2026-05-08T10:07Z
Task: t_ca8cc31a
Scope: strict Phase 0/1 decision closure only; no installs, upgrades, deploys, external dashboards/accounts, paid APIs, or production data access.

## Decision

Do not configure Sentry, PostHog, Inngest, Vercel AI SDK, React Query Devtools, Zustand, or `express-rate-limit` as part of the Phase 0/1 launch gate.

For Phase 0/1 closure, classify the dependency cleanup item as a repo-local decision:

- Keep `rate-limiter-flexible` in the launch path because it is imported by the consolidated rate limiter.
- Keep `@vercel/speed-insights` because `AnalyticsGate` dynamically imports it behind analytics consent.
- Keep the ambient `window.Sentry` / `window.posthog` fallback code for now because it has no package import and remains inert unless an approved external script/provider is added later.
- Defer physical package/lockfile removal for the unused production dependencies to a separate package-pruning slice, because removing them safely requires a lockfile rewrite and package-manager verification. That is outside this strict closure slice's no-install/no-upgrade constraint.
- Do not add `sentry.*.config.*`, DSNs, dashboard setup, production sampling, or telemetry export in Phase 0/1 without explicit approval.

This closes the remaining Phase 1 dependency cleanup decision by making the launch-path choice explicit: unused observability/AI/admin/demo dependencies are not part of the Phase 0/1 launch path and should not be configured during the gate.

## File-level evidence

### Package and lockfile presence

`package.json` still lists the audited candidates in production `dependencies`:

- `@sentry/nextjs`
- `posthog-js`
- `posthog-node`
- `@ai-sdk/openai`
- `ai`
- `inngest`
- `express-rate-limit`
- `zustand`
- `@tanstack/react-query-devtools`
- `@vercel/speed-insights`
- `rate-limiter-flexible`

`pnpm-lock.yaml` contains matching top-level importer entries for those packages, so physical dependency removal would require a targeted lockfile rewrite.

### Sentry

Evidence:

- `package.json` lists `@sentry/nextjs`.
- No `sentry.*.config.*` files are present in the repository root.
- `src/components/shared/AsyncErrorBoundary.tsx` and `src/components/shared/PropertyErrorBoundary.tsx` only reference ambient `window.Sentry` when it exists.
- The only direct `@sentry/nextjs` references outside reports/lock/package files are Jest mocks in `__tests__/setupSentry.ts`.
- `pnpm-workspace.yaml` allows the `@sentry/cli` build dependency because it is pulled by the installed package; do not keep that as launch-path evidence.

Decision: do not configure Sentry in Phase 0/1. Treat `@sentry/nextjs` as unused for the current launch path; remove it in a dedicated package-pruning slice after lockfile rewrite verification is allowed.

### PostHog

Evidence:

- `package.json` lists `posthog-js` and `posthog-node`.
- Source code uses only ambient `window.posthog` in `src/lib/utils/performance-tracker.ts`; there are no package imports from `posthog-js` or `posthog-node`.
- `src/app/privacy/page.tsx` describes PostHog only as optional if enabled.

Decision: do not configure PostHog in Phase 0/1. Keep the ambient fallback inert; treat both PostHog packages as package-pruning candidates.

### Vercel AI SDK and Inngest

Evidence:

- `package.json` lists `@ai-sdk/openai`, `ai`, and `inngest`.
- Targeted source search found no imports from those packages under active source files.
- Admin/provider work that could use them remains governed by later observability/cost-control and provider approval gates.

Decision: not in Phase 0/1 launch path; package-pruning candidates unless a later approved provider/admin slice reintroduces them with tests.

### Rate limiting packages

Evidence:

- `src/lib/middleware/rateLimiter.ts` imports `rate-limiter-flexible` and its `RateLimiterMemory` subpath.
- `types/rate-limiter-flexible.d.ts` declares the subpath typing used by the active limiter.
- Targeted source search found no imports from `express-rate-limit`.

Decision: keep `rate-limiter-flexible`; treat `express-rate-limit` as a package-pruning candidate.

### React Query Devtools and Zustand

Evidence:

- `package.json` lists `@tanstack/react-query-devtools` and `zustand`.
- Targeted source search found no imports from either package under active source files.
- `@tanstack/react-query` itself remains in active use and is not part of this cleanup decision.

Decision: not in Phase 0/1 launch path; package-pruning candidates.

### Vercel Speed Insights

Evidence:

- `src/components/legal/AnalyticsGate.tsx` dynamically imports `@vercel/speed-insights/next` and renders `SpeedInsights` only after analytics consent.
- `types/vercel-speed-insights.d.ts` declares the module used by that dynamic import.
- `docs/BUSINESS_HARDENING_REVIEW.md` already records Speed Insights as consent-gated.

Decision: keep `@vercel/speed-insights` in Phase 0/1.

## Verification performed

Read-only/targeted verification only:

- Verified workspace and branch: `/home/shan/projects/homematch-v2`, git top-level `/home/shan/projects/homematch-v2`, branch `autonomy/6h-business-hardening`.
- Inspected `package.json`, `pnpm-lock.yaml` references, `pnpm-workspace.yaml`, Sentry test setup, and the active source import surface.
- Confirmed no root `sentry.*.config.*` files exist.

No source/package files were changed, so `pnpm type-check` was not required for this decision-artifact-only slice.

## Follow-up boundary

A future package-pruning task may remove these dependency and lockfile entries after package-manager verification is allowed:

- `@sentry/nextjs`
- `posthog-js`
- `posthog-node`
- `@ai-sdk/openai`
- `ai`
- `inngest`
- `express-rate-limit`
- `zustand`
- `@tanstack/react-query-devtools`

That follow-up must preserve or update the inert ambient telemetry tests before removing any package-backed Jest mock.
