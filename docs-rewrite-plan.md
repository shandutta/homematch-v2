# P6 Docs Rewrite Plan

Date: 2026-05-09
Task: t_fd311981 (P6 docs rewrite)
Scope: `README.md`, `docs/**/*.md`, and inline JSDoc on `src/app/**/page.tsx`. Reports under `reports/home-match-revival/` are out of scope (audit trail, not docs).

## Executive summary

The docs landscape has already moved closer to the scout's target. Several files flagged for deletion in `p6-docs-rewrite-outline.md` (`CONTEXT.md`, `REFACTORING_ARCHITECTURE.md`, `TROUBLESHOOTING_AUTH.md`, `DEVELOPMENT_WORKFLOWS.md`, `docs/testing/README.md`) are no longer present, so the "delete first" phase of the scout's plan is effectively done.

Current state (21 markdown files, 1621 lines total):

- **Entrypoint five (README, docs/README, SETUP_GUIDE, ARCHITECTURE, TESTING, STYLE_GUIDE)** — solid bones, mostly need tightening and de-duplication. None are bloated; combined ~660 lines.
- **Business / product specs (BUSINESS_HARDENING_REVIEW, COUPLES_MATCH_PLAN, cookie-session-security-evidence, QA_FILTER_PROTOCOL)** — keep; these are working control documents.
- **Integration references (RAPIDAPI_ZILLOW, SMTP_SETUP, property-vibes-backfill, auto-commit, secrets, performance, CI_INTEGRATION_TESTS, marketing/assets-credits)** — keep; reference material that updates with each integration change.
- **Testing appendix (testing/integration-testing-guide, testing/fixtures, testing/manual-test-guide)** — keep.
- **Inline page docs** — most `src/app/**/page.tsx` files have no JSDoc; only four pages (`login`, `signup`, `reset-password`, `verify-email`) have a single inline comment. Route-level documentation today is expressed only via `metadata` factories (`createPublicRouteMetadata`, `createNoindexRouteMetadata`), which is sufficient for SEO but does not document route behavior, auth boundary, or non-obvious data dependencies for a developer reading the file cold.

The actual work left for P6 is: (1) rewrite the entrypoint five for shape and scrub LLM tells, (2) decide a uniform inline-doc convention for `page.tsx` files, (3) add brief module headers on a small set of pages where the file's purpose is non-obvious. No deletions or merges are required.

## File-by-file rewrite priorities

Listed roughly in execution order. Effort is rough hours of focused writing, not calendar time.

### HIGH priority (entrypoint five)

| File | Lines | Current state | Gaps | Effort |
|---|---|---|---|---|
| `README.md` | 95 | Good bones. Stack list duplicates ARCHITECTURE; Docker bullets verbose; "Essential Commands" overlaps SETUP_GUIDE. | Tighten to a one-screen pitch + quickstart pointer. Drop redundant stack table. | 0.5h |
| `docs/README.md` | 45 | Acts as docs index. Reasonable but lists every file — index of an index. | Reduce to "Start here → SETUP → ARCHITECTURE → TESTING → STYLE_GUIDE", followed by a short reference list grouped by purpose (entrypoint / product / integration / testing). | 0.5h |
| `docs/SETUP_GUIDE.md` | 111 | Solid. Env block good. Has ambient "Current Status" / "In progress" prose that rots. | Remove status prose. Merge Supabase local proxy into the env block. Add a one-line "what success looks like" check at the bottom (`pnpm check && pnpm test:unit` clean). | 1h |
| `docs/ARCHITECTURE.md` | 106 | Already clean. "Reading path" framing belongs in docs/README. | Trim reading-path framing; let the doc just describe the system. | 0.5h |
| `docs/TESTING.md` | 93 | Already clean. Cross-references `testing/integration-testing-guide.md` correctly. | Replace "comprehensive" / "ensure" / "robust" tells. Confirm pass-rate counts in CLAUDE.md still match. | 0.5h |

### MEDIUM priority (entrypoint companions + scrubbing)

| File | Lines | Current state | Gaps | Effort |
|---|---|---|---|---|
| `docs/STYLE_GUIDE.md` | 98 | Good reference. `Parallax Stars` admonition is component-specific. | Move the parallax admonition next to the component (`ParallaxStars.tsx`). Otherwise leave alone. | 0.5h |
| `docs/QA_FILTER_PROTOCOL.md` | 127 | Living protocol; useful. | Verify steps still match current QA tooling (post P0/P1 closure). Light scrub. | 0.5h |
| `docs/BUSINESS_HARDENING_REVIEW.md` | 57 | Working control matrix. Dense by design. | Do **not** prose-ify. Update status column to reflect Phase 0/1 closure landed. | 0.25h |
| `docs/COUPLES_MATCH_PLAN.md` | 147 | Solid spec. | Spot-check API contract section against current `/api/couples/*` routes. | 0.5h |
| `docs/cookie-session-security-evidence.md` | 59 | Evidence artifact. | Keep as-is unless cookie strategy changes. | — |

### LOW priority (integration / reference; refresh when the integration changes)

These are reference docs scoped to a single integration. Don't rewrite preemptively.

| File | Lines | When to touch |
|---|---|---|
| `docs/RAPIDAPI_ZILLOW.md` | 142 | Next Zillow ingest change |
| `docs/SMTP_SETUP.md` | 63 | Next SMTP provider change |
| `docs/property-vibes-backfill.md` | 96 | Next vibes prompt/model change |
| `docs/auto-commit.md` | 39 | Next auto-commit flow change |
| `docs/secrets.md` | 49 | Next secrets-scanning rule change |
| `docs/performance.md` | 34 | Next perf budget change |
| `docs/CI_INTEGRATION_TESTS.md` | 67 | Next CI pipeline change |
| `docs/marketing/assets-credits.md` | 27 | New asset added |
| `docs/testing/integration-testing-guide.md` | 82 | Integration suite layout change |
| `docs/testing/fixtures.md` | 30 | Fixture set change |
| `docs/testing/manual-test-guide.md` | 54 | Manual test playbook change |

## Inline doc gaps in `src/app/**/page.tsx`

Surveyed all 29 page files. Findings:

- **Zero pages have JSDoc on the default export.** Most are short and self-explanatory, but a handful warrant a one- to three-line module header that names: what the route is, who can see it (public / authenticated / internal-preview), and any non-obvious data dependency.
- **Only 4 pages have any inline comment at all** (`login`, `signup`, `reset-password`, `verify-email` — each has a single `// Force dynamic rendering` line).
- **Route-level metadata is well-handled** via `createPublicRouteMetadata` / `createNoindexRouteMetadata` / `createPropertyJsonLd`. No gap there.
- **Internal preview pages** (`/validation`, `/sponsor-mockups`, `/demo/ads`, `/dashboard/vibes-test`) gate via `requireInternalPreviewAccess` but do not document **why** they exist or who they're for. A reader must trace the gate to understand they are not real product surfaces. These are the highest-value candidates for a 2-3 line module header.

### Pages that benefit from a brief header (≤3 lines)

| File | Why a header helps |
|---|---|
| `src/app/page.tsx` | Landing page redirects authenticated users to `/dashboard`; call out the redirect so it isn't surprising. |
| `src/app/dashboard/page.tsx` | Composes `DashboardErrorBoundary + EnhancedDashboardPageImpl`; actual dashboard logic lives in `lib/data/loader.ts`. Header should point readers there. |
| `src/app/properties/[id]/page.tsx` | Renders `PropertyDetailRouteModal` and uses `getSafeRedirectPath` to bounce stale share links — the modal-as-route pattern is non-obvious. |
| `src/app/couples/page.tsx` | "Couples" route is actually the household management surface (per the metadata title). Note that mismatch. |
| `src/app/invite/[token]/page.tsx` | Token-scoped invite page; document the token validation path and expiration behavior. |
| `src/app/dashboard/vibes-test/page.tsx` | Internal vibes triage UI. Header should say: internal-preview only, manual prompt/quality testing. |
| `src/app/validation/page.tsx` | Internal migration validation dashboard. Already gated; header should make "delete or hide before launch" status explicit per the OG backlog admin-tooling priority. |
| `src/app/sponsor-mockups/page.tsx` | Marketing preview, internal-preview gated. Header should clarify it's not a customer surface. |
| `src/app/demo/ads/page.tsx` | Ad-monetization preview, internal-preview gated. Same as above. |

### Pages that don't need extra docs

Self-explanatory routes where metadata + filename are enough: `about`, `contact`, `privacy`, `terms`, `cookies`, `login`, `signup`, `reset-password`, `verify-email`, `auth/auth-code-error`, `dashboard/{liked,passed,viewed,activity,mutual-likes}`, `household/{create,join}`, `profile`, `settings`, `couples/decisions`. Adding boilerplate JSDoc here is pure churn.

### Recommended convention

Use a short module-level comment (no JSDoc ceremony) on the pages identified above:

```tsx
// Route: /properties/[id]. Renders PropertyDetailRouteModal as a modal-over-list pattern.
// Auth: redirects unauthenticated users to /login. Stale share links are sanitized via getSafeRedirectPath.
```

Two to three lines, no `@param` / `@returns` boilerplate. Default-export comments only when the file's purpose is not obvious from name + metadata.

## Recommended docs structure changes

None. The current `docs/` layout (entrypoints at root, integration docs at root, testing appendix in `docs/testing/`, asset attribution in `docs/marketing/`) is reasonable. The scout's deletion list is already substantively complete.

One small consistency fix: any inline cross-reference in `docs/TESTING.md` to `docs/testing/README.md` should be removed during the rewrite (that file no longer exists).

## LLM-tell scrub list

Apply during rewrite passes; do not create a standalone "scrub" PR.

- "comprehensive" / "robust" / "scalable" / "production-ready"
- "ensure" / "crucial" / "deep dive" / "leverage"
- Multi-paragraph conclusions that restate the doc
- Checkmark completion reports (`✅ All tests passing`)
- Metric tables stating the obvious ("80% improvement", "4× faster")
- Disclaimers of the form "this document may not reflect the current code state"

Rule: if a sentence can be deleted without losing information a developer needs, delete it.

## Phasing suggestion

One-week solo effort; ≤6 focused hours of writing.

| Phase | Work | Effort |
|---|---|---|
| 1 | Rewrite entrypoint five (README, docs/README, SETUP_GUIDE, ARCHITECTURE, TESTING). Single PR. | 3h |
| 2 | Light scrub on STYLE_GUIDE, QA_FILTER_PROTOCOL, BUSINESS_HARDENING_REVIEW status column, COUPLES_MATCH_PLAN API contract spot-check. | 1.5h |
| 3 | Add 2-3 line module headers to the 9 non-obvious `page.tsx` files identified above. Single small PR. | 1h |
| 4 | Verification pass: read entrypoint five end-to-end. Can a new developer run `pnpm dev` from cold? Is every command and env var name accurate? Cross-check against `package.json` scripts. | 0.5h |

Phases 1-3 are independent and can be reordered. Phase 4 must be last.

## Out of scope for P6

- `reports/home-match-revival/**` — audit trail, not docs.
- `reports/home-match-business-revival-operating-plan.md` — canonical roadmap; do not edit.
- `CLAUDE.md` — Claude Code instructions, not human docs.
- New documentation (observability dashboard contract, data quality trust contract) called out in `og-business-readiness-backlog-2026-05-08.md`. Those are P0/P1 deliverables for the relevant feature work, not P6 rewrite work.
