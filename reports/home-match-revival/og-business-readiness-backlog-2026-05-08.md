# OG Business-Readiness Backlog

Generated: 2026-05-08T08:44Z
Task: t_80f5955d
Mode: read-only scout; no implementation, deploys, external calls, paid APIs, dashboard changes, or real-user data access.

## Scope

This backlog expands the missing-items section of `reports/home-match-business-revival-operating-plan.md` for observability, accessibility, SEO, data quality, admin tools, growth loops, trust, and cost controls.

Phase 2+ implementation remains held until `reports/home-match-revival/phase0-phase1-closure-matrix.md` marks Phase 0/1 clean or Shan approves a written exception.

## Existing coverage to avoid duplicating

- Route/API/site traversal: `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md` and `p0-site-traversal-acceptance-matrix-2026-05-08.md` already inventory 29 page routes, 26 API routes, robots/sitemap, and traversal gates.
- Phase 0/1 blockers: `phase0-phase1-closure-matrix.md` and `p1-decision-needed-register-2026-05-08.md` already own live probes, auth/session approval, service-role RBAC, durable rate limiter, `.env.prod`, and DB validation environment decisions.
- Middleware/API perf: `p1-middleware-api-performance-audit-2026-05-08.md` already owns API middleware fast path, route deadlines, route-scoped limiter keys, and Google status mapping.
- Legal/analytics/ads/payments: `docs/BUSINESS_HARDENING_REVIEW.md` and Phase 5 roadmap already own consent, Vercel Speed Insights, AdSense gating, and Stripe/subscription planning.
- Maps/images/metadata: Phase 2 roadmap already owns maps/images/metadata/SEO implementation; this backlog narrows the business-readiness acceptance surface.
- Matching/ingest: Phase 3 roadmap already owns matching eval, LLM prompt hardening, ingest idempotency, source freshness, and rollback safety.

## Current repo signal

- Observability exists but is not production-grade: `src/instrumentation.ts`, `src/lib/utils/performance.ts`, `src/lib/performance/metrics.ts`, `src/lib/utils/performance-tracker.ts`, and `/api/performance/metrics` collect/log metrics, but server metrics are in-memory/dev-console oriented and public metrics ingest is a known abuse/retention surface.
- `@sentry/nextjs` is installed, but no `sentry.*.config.*` files were found. Error reporting is therefore dependency-present, not configured.
- SEO basics exist: `src/app/robots.ts`, `src/app/sitemap.ts`, root metadata, metadata routes tests, and Organization JSON-LD in `layout.tsx`. Private-route exclusion is present in robots; page-level canonical/structured-data coverage is not systematically proven.
- Accessibility coverage exists mostly as tests and component conventions: style guide keyboard/ARIA rules, auth a11y tests, some dialog/aria-current tests, and accessibility test inclusion in Vitest config. There is no single core-flow a11y acceptance matrix.
- Admin tooling is fragmented: protected `/dashboard/vibes-test` and cron-secret admin APIs exist for vibes/ingest/status-refresh, but there is no dedicated admin console for ingest status, bad listing triage, prompt/debug traces, or spend visibility.
- Cost controls are partial: route rate limiting exists, admin rate limiting exists, Maps endpoints were auth-hardened, and LLM/admin routes are gated by cron secrets. There is no shared budget ledger, per-run cost estimate, cache-hit visibility, or quota alerting.

## Priority backlog

### P0. Observability launch floor

Problem: failures, slow endpoints, provider quota errors, and expensive admin jobs are still mostly console/log-report artifacts rather than operator-visible signals.

Repo-local first slice:

- Add a small `src/lib/observability/` wrapper that emits structured JSON events for API route start/end/error, external provider calls, admin jobs, and rate-limit decisions.
- Convert existing `withPerformanceTracking` and `/api/performance/metrics` to use the wrapper while preserving current tests.
- Add unit tests that assert no secrets, emails, full addresses, auth tokens, or raw upstream payloads are logged.
- Add a repo-local `reports/home-match-revival/observability-dashboard-contract.md` that defines the future external-dashboard fields without creating the dashboard.

Acceptance criteria:

- Every production API route has a named operation, status, duration bucket, request id, and sanitized error class.
- Google/Zillow/OpenRouter/Supabase failures map to operational classes: validation, auth, quota, timeout, provider_error, app_error.
- `/api/performance/metrics` has explicit retention, payload-size limits, and public-ingest abuse controls, or is disabled for production.
- Sentry decision is explicit: either configure `@sentry/nextjs` repo-locally behind env gates or remove the unused dependency from the launch path.

Approval gates:

- External Sentry/Datadog/Better Stack/Vercel dashboard creation, DSNs, tokens, alert routing, uptime checks, and production sampling rates need Shan approval.
- No production log export or real-user telemetry review without approval.

### P0. Cost-control ledger for Maps, LLM, Zillow, and analytics

Problem: the app has rate limits and auth gates, but no operator-facing budget model before paid upstreams are used at scale.

Repo-local first slice:

- Create `src/lib/cost-controls/` constants for provider budgets and per-action cost estimates: Maps geocode, Places autocomplete, Maps JS load, Zillow/RapidAPI fetch, OpenRouter property vibes, OpenRouter neighborhood vibes, status refresh.
- Add dry-run cost estimation to admin/vibes/ingest/status routes without calling paid providers.
- Add tests that admin routes expose estimated cost/counts in dry-run responses and refuse oversized batches without an explicit override flag.
- Add a report-only cache-hit-rate contract for Maps script/proxy, marketing payload, property vibes, and neighborhood vibes.

Acceptance criteria:

- Every paid-provider route can answer “what would this run cost?” before it runs.
- Every batch/admin route has max item limits, dry-run mode, and consistent 429/413/422 behavior.
- Cost and cache metrics are emitted through the observability wrapper.
- Production budget thresholds are constants/configurable envs, not magic numbers inside route bodies.

Approval gates:

- Paid API calls, quota increases, production cron enabling, external billing-dashboard changes, and real provider cost reconciliation need explicit approval.

### P1. Accessibility acceptance matrix for core flows

Problem: accessibility is partially covered by tests and conventions, but not owned as a launch-readiness gate.

Repo-local first slice:

- Add `reports/home-match-revival/accessibility-core-flow-matrix.md` covering public landing/auth/legal pages plus protected dashboard, property detail, couples, settings, profile, household, and invite flows.
- Add Playwright/RTL axe-lite or role-based smoke checks for keyboard tab order, visible focus, dialog focus trap, form labels/errors, aria-current navigation, and image alt text on non-external fixtures.
- Start with no-credential routes and protected redirect checks; authenticated fixture states stay gated by the Phase 0 auth/session decision.

Acceptance criteria:

- Public routes pass keyboard-only navigation, visible focus, heading hierarchy, form label/error, color-contrast spot checks, and screen-reader landmark sanity.
- Protected route acceptance names the fixture state needed before a positive authenticated pass.
- Modals/dialogs in property detail, invite/household, cookie preferences, and mobile nav have focus trap/escape/return-focus coverage.
- Accessibility violations become categorized backlog items, not silent browser-test screenshots.

Approval gates:

- Authenticated a11y browser pass needs approved local/test auth session and seeded non-production data.
- No production user sessions or real household/listing data.

### P1. Data quality and trust contract

Problem: listing freshness/source confidence and match explanations exist conceptually, but user-facing trust rules are not fully specified.

Repo-local first slice:

- Define `reports/home-match-revival/data-quality-trust-contract.md` for listing states: fresh, stale, unavailable, provider_unverified, image_missing, price_changed, status_unknown.
- Map current DB fields/migrations and ingest outputs to those states; list missing columns/derived fields without adding migrations yet.
- Add fixture-level tests for UI copy rules: when to show freshness badges, incomplete-data warnings, and “why this match” explanations.

Acceptance criteria:

- Every property card/detail surface can show source, freshness, incomplete-data warning, and match explanation without implying certainty the app does not have.
- Stale/off-market handling is deterministic and does not silently recommend stale listings.
- LLM-generated vibes/match reasons must include confidence/source fields and degrade to non-LLM fallback copy when unavailable.
- No demographic, safety, school, commute, or local-business claims appear unless source-backed.

Approval gates:

- Schema migrations, backfills, production data audits, and any real-listing source reconciliation need Phase 0/1 gate clearance or explicit approval.

### P1. Admin operations console, not demo pages

Problem: internal operations are spread across `/dashboard/vibes-test`, admin APIs, scripts, and reports. Demo/test pages are already candidates to hide/delete before launch.

Repo-local first slice:

- Replace the product decision ambiguity with an admin-tools spec: ingest status, bad listing review queue, prompt/debug traces, cost estimates, recent admin jobs, and safe dry-run controls.
- Decide whether `/dashboard/vibes-test`, `/validation`, `/demo/ads`, and `/sponsor-mockups` are deleted, hidden, or replaced with an authenticated admin-only area.
- Add route inventory updates and tests for whichever decision is made.

Acceptance criteria:

- Internal/admin routes are not public marketing or normal user dashboard surfaces.
- Admin actions are dry-run by default, rate-limited, auditable, and never carry secrets in query strings.
- Bad listing review has clear action states: keep, hide, refresh, needs_source_review.
- Prompt/debug traces redact addresses/user info where possible and never expose raw secret-bearing requests.

Approval gates:

- RBAC authority decision D1 must be resolved before granting real admin powers to UI routes.
- Any production admin action, data mutation, or external-provider call needs approval.

### P2. SEO and shareability hardening

Problem: robots/sitemap exist, but SEO quality and private-surface exclusion are not a full product gate.

Repo-local first slice:

- Add a route metadata test matrix for title, description, canonical, robots, openGraph/twitter, JSON-LD, and private-route exclusion.
- Add public-only structured data for Organization/WebSite and high-quality landing pages only; do not generate thin programmatic neighborhood pages yet.
- Add tests ensuring dashboard, invite tokens, auth callback, API, demo/admin routes, and private property surfaces are excluded from sitemap and noindex/disallowed where appropriate.

Acceptance criteria:

- Public pages have unique metadata and canonical URLs using `NEXT_PUBLIC_BASE_URL` fallback safely.
- Private, auth, API, demo/admin, and tokenized routes do not leak through sitemap or social metadata.
- Property/listing share metadata is used only when data freshness/source trust meets the data-quality contract.
- No programmatic SEO pages ship until content quality and source attribution are reviewed.

Approval gates:

- Search Console, AdSense, Analytics, schema publishing strategy, and production domain/dashboard changes need approval.

### P2. Growth loops with privacy guardrails

Problem: couples collaboration is the business wedge, but growth loops are not specified as safe product surfaces.

Repo-local first slice:

- Write a growth-loop spec for shareable couple boards, invite flow, shortlist sharing, and “send this home to partner” without implementing.
- Define privacy boundaries: token scope, expiration, revocation, no indexed invite URLs, no public household identity, and no partner email leakage beyond approved UX.
- Add route/API acceptance criteria for invite/share endpoints before implementation.

Acceptance criteria:

- Every share/invite artifact has an owner, expiration/revocation model, auth boundary, analytics event, and abuse limit.
- Shared views expose only explicitly selected homes and redacted household/member info.
- Growth events are consent-aware and do not fire optional analytics before consent.
- Email/notification side effects are mocked/tested before any production provider is enabled.

Approval gates:

- Email sending, production invite flows, social sharing previews, referral analytics, and partner-identity exposure need product/security approval.

## Recommended sequencing

1. P0 observability launch floor and P0 cost-control ledger before any Phase 2+ traffic or paid-provider expansion.
2. P1 accessibility matrix and P1 data-quality/trust contract before core UX implementation slices, so UX work has acceptance gates.
3. P1 admin operations console after D1 RBAC and before enabling admin/provider jobs in production.
4. P2 SEO/shareability and P2 growth loops after trust/data-quality rules are explicit.

## Do-not-duplicate notes

- Do not create another generic route inventory; extend the existing P0 matrix only when route decisions change.
- Do not create another auth-provider memo; Supabase Auth is the current recommendation for the revival gate.
- Do not implement Phase 2+ UX or provider calls from this backlog until the closure matrix or an explicit exception permits it.
- Do not use real external dashboards/accounts, production data, paid APIs, deploys, or browser swarms from these first slices.
