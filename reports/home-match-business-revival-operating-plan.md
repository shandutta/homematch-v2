# HomeMatch Business Revival Operating Plan

Updated: 2026-05-08T12:34Z

## Executive intent

HomeMatch is no longer being treated as a fragile dead project. The working goal is to turn it into a credible business: fast, opinionated, shippable, legible, monetizable, and good enough that the couples flow feels obviously better than a generic property search site.

This plan expands the original scope beyond the current visible Kanban count. The current `todo=16` is not the whole plan. It is only the already-materialized subset. This document is the umbrella backlog and gate model.

## Operating model

- Telegram is the control plane. Keep updates short.
- This report and Kanban are the durable memory.
- Active overnight execution: one repo-writing lane plus up to two read-only scout lanes when RAM allows.
- Use git, not backups.
- Be aggressive on dead code once verified. Delete unused code instead of preserving archaeological layers.
- Do not deploy, spend money, change production dashboards, use real customer data, or alter external accounts while Shan is sleeping unless a task has explicit approval.
- Third-party dashboards, email, Stripe, AdSense, and production settings can be reviewed/planned, but credentialed external changes need a separate approval checkpoint.


## 2026-05-08 Shan approval update

Shan granted blanket approval for HomeMatch recovery/hardening work except spending money or making paid-resource/subscription changes. Tiny live probes are approved. Continue using Kanban workers and autonomous execution. Test credentials should be sourced from repo docs/scripts (`scripts/setup-test-users-admin.js`, `pnpm test:setup-users`) and, if needed, 1Password/helpers without printing secrets. Add/maintain lanes for local seeded auth lifecycle verification and Zillow/RapidAPI provider evaluation.


## 2026-05-08 remote Supabase test-user approval

Shan approved creating/seeding test users on remote Supabase with full API authority. This unblocks remote/safeguarded auth lifecycle and authenticated traversal work, bounded to disposable test users/fixtures and still excluding paid-resource changes. Workers should use secret-safe admin credentials, never print secrets, and produce cleanup/probe evidence artifacts.


## 2026-05-08 1Password access + remote test seeding update

Shan approved use of 1Password and remote Supabase test-user creation/seeding. The control plane verified `op` sign-in via `/home/shan/bin/op_auth` without exposing secrets. This unblocks worker execution that retrieves HomeMatch Supabase/Vercel/API secrets through 1Password/helpers and seeds disposable remote test users/fixtures for authenticated traversal/API smoke. No spending, subscriptions, paid plan changes, or broad paid usage without explicit approval.

## 2026-05-08 remote Supabase deletion/reseed approval

Shan approved removing existing HomeMatch Supabase users if helpful, because the current population should be treated as trash/test data. Workers may delete stale/test users and replace them with a clean documented seed set for remote auth/API/browser probes. Record the seed fixture contract in docs/artifacts, avoid printing credentials/secrets, and pause only if an account looks plausibly real/non-test or if an action would spend money/change paid resources.

## Current gate

Phase 0 and Phase 1 still gate implementation-heavy later work. That does not mean the broader plan waits. It means later-phase implementation is held while scouts can safely plan, audit, and create acceptance criteria.

- Phase 0: prove the app works end-to-end, all routes/endpoints known, site traversed, live/local gaps explicit. The current static inputs are `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md` and `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`. They clarify the surface area but do not close the gate without public traversal, protected redirects, authenticated traversal, and safe API probe evidence.
- Phase 1: clean architecture, auth boundary, API/middleware performance, DB shape, local dev, test harness, and dead code. Repo-local remediations are broad, but owner decisions and environment-backed integration/E2E proof remain open.
- Phase 2+: UX/product/business upgrades, gated until Phase 0/1 are clean or Shan approves a written exception.

Current approval blockers: local/test DB reset and integration path beyond approved remote disposable user reseeding, service-role RBAC authority, durable rate-limit storage, production signup verification settings, keep/hide/delete decisions for demo/internal surfaces, and mocked or approved paid/external endpoint checks.

## Full workstreams from the original instruction

### A. Full verification and site traversal

Goal: know exactly what works, what is fake, what is slow, and what is broken.

Tasks:
- Build a route and API endpoint inventory from `src/app/**`, middleware, route handlers, cron endpoints, image/metadata routes, and server actions.
- Traverse the public site start to finish locally where possible.
- Define authenticated traversal coverage separately, because it needs a test user/session.
- Create an endpoint matrix: method, auth boundary, rate limit, outbound calls, cache behavior, timeout, expected status, test coverage, live/local status.
- Identify dead pages/routes and delete them after verification.

Acceptance:
- Every route and API has an owner, expected behavior, test status, and action: keep, fix, replace, or delete.

### B. Auth strategy and dead-code cleanup

Goal: decide whether to ditch existing auth for a third-party provider and make the codebase simpler either way.

Tasks:
- Inventory all current auth code, Supabase auth usage, cookies, middleware, route guards, service-role paths, test helpers, and dead compatibility code.
- Compare Supabase Auth vs Clerk/Auth0/WorkOS/Better Auth for this product.
- Recommend one path aggressively, including migration cost, UX impact, code deletion opportunity, and operational risk.
- If moving providers, design the deletion plan before implementing.
- Remove dead auth paths after the decision gate.

Acceptance:
- One strong recommendation, not a neutral comparison.
- A file-level delete/keep/migrate list.

### C. Frontend design and product UX

Goal: make the product feel sharp, snappy, and differentiated, especially for couples.

Tasks:
- Review all UI surfaces, flows, empty states, cards, maps, saved searches, compare flows, metadata/social previews, mobile behavior, and loading states.
- Use Shan style docs: concise, direct, not generic SaaS copy.
- Identify where UX is slow, generic, confusing, or visually stale.
- Propose a stronger information architecture and interaction model.
- Implement Phase 2 changes only after Phase 0/1 gate opens.

Acceptance:
- Opinionated design memo plus implementation backlog by component/page.

### D. Backend DB architecture

Goal: make the schema efficient and explainable.

Tasks:
- Review tables, RLS policies, RPCs, indexes, migrations, JSONB usage, relationship modeling, and query patterns.
- Decide where schema is too clever, too generic, or too hard to explain.
- Propose restructures for property data, couples, interactions, matching inputs, saved searches, and ingest freshness.
- Add performance indexes or simplify schema only after tests/guards.

Acceptance:
- Strongly opinionated architecture memo with specific migrations and rollback stance.

### E. Middleware and API architecture/performance

Goal: remove slowness and reduce request-path complexity.

Tasks:
- Audit middleware matcher behavior, auth checks, rate limiting, outbound fetches, cache headers, request timeouts, server/client boundaries, and service-role use.
- Delete dead middleware and duplicate helpers.
- Standardize errors and rate-limit behavior.
- Add timing/perf instrumentation where useful.

Acceptance:
- API surface is faster, easier to reason about, and covered by targeted tests.

### F. Vercel/local dev/Docker

Goal: make local development boring.

Tasks:
- Review Vercel env setup, preview/prod env separation, local dev bootstrap, ignored files, and deployment docs.
- Decide Docker: required, optional, or delete the fiction.
- Provide one canonical local dev command path.
- Document how to work without production secrets.

Acceptance:
- New developer can run the app locally without guessing or leaking secrets.

### G. Test suite and real TDD

Goal: stop pretending tests are TDD and make them useful.

Tasks:
- Inventory unit, integration, and E2E tests.
- Classify tests: valuable, brittle, stale, duplicate, fake, delete.
- Repair the highest-value test paths first.
- Define TDD rules: every bug fix gets a failing test first, every feature gets acceptance tests before implementation.
- Decide what E2E can run without external credentials and what needs a seeded auth path.

Acceptance:
- Test suite has a clear taxonomy, cleanup PRs, and a TDD workflow that workers can actually follow.

### H. Docs rewrite

Goal: docs should be user-facing and operator-facing, not LLM sludge.

Tasks:
- Read all docs.
- Delete duplicated/outdated docs.
- Rewrite README, local dev, env, architecture, test, deployment, and product docs.
- Remove LLM tells, hedging, and over-explaining.

Acceptance:
- Docs are short, accurate, and useful.

### I. Couples logic and matching system

Goal: make matching feel breathtakingly good, not generic.

Tasks:
- Review scoring logic, couple preference modeling, ranking explanations, LLM prompt quality, taste language, and latency.
- Replace generic prompts with product-specific taste models and structured outputs.
- Avoid paid LLM runs during the sleep window; prepare prompts/tests offline.
- Make recommendations explainable and fast.

Acceptance:
- Clear matching strategy, better prompts, tests/fixtures, and implementation backlog.

### J. Maps, images, and metadata

Goal: property presentation should look trustworthy and share well.

Tasks:
- Review maps keys, map routes, metro boundaries, geocoding/places behavior, image proxying, OG/social metadata, thumbnails, caching, and fallbacks.
- Fix setup gaps that are repo-local.
- External key/dashboard changes require approval.

Acceptance:
- Maps/images/metadata are correct, cached, and failure-tolerant.

### K. Ingest pipeline

Goal: improve the pipeline even while the external API is off.

Tasks:
- Review current ingest architecture, idempotency, dedupe, freshness, source attribution, retries, and observability.
- Design a better pipeline that can be turned on later without polluting the DB.
- No external API usage during the sleep window.

Acceptance:
- A better ingest design plus repo-local cleanup tasks.

### L. Legal, compliance, cookies, analytics, monetization

Goal: know what is shippable and what must be fixed before traffic/ads/subscriptions.

Tasks:
- Review terms/privacy/cookie policy/consent implementation.
- Review analytics setup and organic visitor tracking options.
- Review AdSense requirements and known concerns from dashboards/emails later with approval.
- Design Stripe subscription tiers and gating before changing Stripe account state.
- Identify what users should pay for first.

Acceptance:
- Compliance and monetization checklist with approval gates for external account actions.

### M. Missing items to add

- Observability: structured logs, uptime checks, error reporting, slow endpoint visibility.
- Accessibility: keyboard, contrast, screen-reader sanity for core flows.
- SEO: sitemap, robots, canonical URLs, structured data, programmatic landing pages only if quality is high.
- Data quality: freshness badges, source confidence, stale listing handling.
- Admin tools: lightweight internal tools for ingest status, bad listing review, and prompt/debug traces.
- Growth loops: shareable couple boards, listing shortlists, invite flow.
- Trust: explain why a match is recommended and what data may be incomplete.
- Cost controls: LLM and Maps usage budgets, cache hit rates, rate-limit observability.

## Six-hour execution priority

1. Keep current Phase 0/1 closure lanes running.
2. Expand Kanban so the whole OG plan exists, not just the 16 visible todos.
3. Run read-only scouts on broader workstreams while one writer closes Phase 0/1 repo-local blockers.
4. Convert scout outputs into implementation tasks with gates.
5. Only implement Phase 2+ after gate opens or Shan explicitly allows a written exception.

## Approval gates

Needs explicit approval before execution:
- Switching auth provider in production.
- External dashboard/account changes: Vercel, Supabase, Google, AdSense, Analytics, Stripe.
- Paid API calls, deploys, production data writes, or user-data exports.
- Email/dashboard review that requires sensitive credentials, unless the task is read-only and explicitly scoped.
