# P1 Internal/Demo Surface Disposition Decision Packet

Generated: 2026-05-08T12:48Z
Task: t_8f622c6b
Mode: strict Phase 0/1 decision packet only. Static file reads/searches only; no route deletions, no deploys, no external calls, no browser swarm, no production data.

## Verdict

The repo-side inventory and PM recommendation are complete, but launch disposition is still owner-decision-gated until Shan approves the route policy and an implementation worker hides/restricts/deletes the surfaces.

Recommended default: hide public demo/monetization previews from launch, restrict internal operational tooling behind an admin-only area after the D1 RBAC authority decision, and delete stale validation/dashboard debug pages only after replacement acceptance tests exist.

## Surface recommendations

| Surface | Current exposure | Recommendation | Rationale | Minimal follow-on implementation/tests |
| --- | --- | --- | --- | --- |
| `/dashboard/vibes-test` | Protected by `/dashboard` middleware prefix, but available to any authenticated user; client page accepts a cron secret in local React state and appends it as `cron_secret` query param to admin endpoints. | Restrict/replace. Move this into a real admin-only operations console after D1 RBAC is resolved; until then hide the route from normal dashboard nav and add an explicit server-side admin gate or temporary 404/disabled page. | Operationally useful for property vibes review, but unsafe as a normal user dashboard surface: it can trigger OpenRouter/Zillow-generation paths, exposes a secret-entry UI, uses query-string secrets, and mixes paid-provider/admin actions with customer-facing dashboard IA. | Add route-level admin authorization acceptance once D1 is decided; change admin API calls to `x-cron-secret`/server-side credentials, not query params; add tests that non-admin authenticated users cannot access the page and that no cron secret is serialized into URLs. |
| `/validation` | Protected by `/validation` middleware prefix; available to any authenticated user. Server page reads Supabase auth user, table counts, service-layer stats, `pg_extension`, and prints user email plus a sliced user id. | Delete or restrict to admin-only after replacing any useful checks with tests/reports. Default launch posture should be disabled for all non-admin users. | This is a migration/debug dashboard, not a user feature. It advertises old phase-completion claims, exposes database health/table names/counts/errors to any authenticated user, and duplicates acceptance evidence that now belongs in tests and reports. | Create an admin-only replacement spec if operators still need DB health; otherwise remove `src/app/validation/page.tsx`, update `PROTECTED_PATH_PREFIXES`, traversal matrices, auth helpers, and any fixture references. Add a redirect/404 test for `/validation`. |
| `/demo/ads` | Public route. Page metadata marks `robots: { index: false, follow: false }`; not in sitemap. It renders only static ad placement mockups through `AdMonetizationMockup`. | Hide from production launch, keep temporarily as a local/internal preview route or move under admin/preview. | Low security risk because it is static/no external ad calls, but it is thin monetization/internal preview content. A public demo route can confuse launch positioning and should not be part of the public acquisition surface unless Shan explicitly wants a sponsor sales demo. | Add middleware/route guard or remove the route from production build; add metadata/route tests confirming noindex/no sitemap and expected 404/redirect in production; keep component tests if `AdMonetizationMockup` remains used in docs/admin. |
| `/sponsor-mockups` | Public route. Page metadata marks `robots: { index: false, follow: false }`; not in sitemap. It renders marketing header/footer plus static `AdMonetizationMockup`. | Hide from production launch; keep only as internal sales collateral if needed. | Same low technical risk as `/demo/ads`, but higher product/brand ambiguity because it looks like a public marketing page for sponsor placements before the monetization strategy is approved. | Move behind admin/preview or delete route; add production noindex/no-sitemap/404 or redirect tests; if kept as collateral, document owner and intended audience. |

## Directly related files inventoried

### Routes and shared guards

- `src/app/dashboard/vibes-test/page.tsx` — authenticated internal/client debug UI for property vibes, generation summaries, Zillow URL/zpid vibes, cost display, and manual cron-secret entry.
- `src/app/validation/page.tsx` — authenticated migration/database validation dashboard with table stats, service checks, user profile display, and extension status.
- `src/app/demo/ads/page.tsx` — public static ad preview page with noindex metadata.
- `src/app/sponsor-mockups/page.tsx` — public static sponsor mockup page with noindex metadata.
- `src/lib/routing/protected-routes.ts` — protects `/dashboard` and `/validation`; does not protect `/demo/ads` or `/sponsor-mockups`.
- `src/app/robots.ts` — disallows `/dashboard/` but does not explicitly disallow `/validation`, `/demo/`, or `/sponsor-mockups`; `/validation` is protected by middleware, while the public demo pages rely on page-level noindex and sitemap exclusion.
- `src/app/sitemap.ts` — publishes only `/`, `/about`, `/contact`, `/signup`, `/privacy`, `/terms`, and `/cookies`; the four reviewed surfaces are excluded.

### Related components and APIs

- `src/components/marketing/AdMonetizationMockup.tsx` — shared static mockup component used by `/demo/ads` and `/sponsor-mockups`.
- `src/app/api/admin/generate-vibes/route.ts` — cron-secret-gated, admin-rate-limited LLM/property-vibes generation API; accepts `x-cron-secret` or `cron_secret` query param.
- `src/app/api/admin/generate-vibes-zillow/route.ts` — cron-secret-gated, admin-rate-limited Zillow/OpenRouter vibes path used by the vibes test page.
- `src/app/api/admin/generate-neighborhood-vibes/route.ts` and `src/app/api/admin/ingest/zillow/route.ts` — adjacent admin/provider job surfaces that should feed a future admin console, not normal dashboard/demo pages.
- `src/app/api/properties/vibes` — authenticated property-vibes read surface used by the vibes test page.

### Tests and prior report evidence

- `__tests__/unit/api/generate-vibes-route.test.ts` — targeted coverage for `/api/admin/generate-vibes` secret rejection and source-hash/force behavior.
- `__tests__/unit/app/metadata-routes.test.ts` — verifies robots disallow private/API surfaces and sitemap excludes non-canonical public routes.
- `__tests__/e2e/fixtures-validation.spec.ts` — generic fixture validation only; despite the filename, it does not validate `/validation` route disposition.
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md` — already classified `/dashboard/vibes-test` and `/validation` as candidate hide/delete surfaces and `/demo/ads` plus `/sponsor-mockups` as render-only public demo surfaces needing product decision.
- `reports/home-match-revival/og-business-readiness-backlog-2026-05-08.md` — P1 admin-operations-console section explicitly asks to decide whether the four reviewed surfaces are deleted, hidden, or replaced with authenticated admin-only tooling.

## Security/business rationale

1. Admin/provider actions should not live in normal customer dashboard IA. `/dashboard/vibes-test` is authenticated, but not admin-only, and currently points at cron-secret-gated generation endpoints capable of paid/provider work when secrets and provider keys exist.
2. Query-string secrets should not be normalized. The current UI appends `cron_secret` to admin API URLs. Even though this packet does not change code, the follow-on implementation should move away from URL-carried secrets and toward server-side admin auth or headers in local-only tooling.
3. Migration/debug status should not be a launch user surface. `/validation` can reveal table names, counts, service errors, user email, and partial user id to any authenticated user. Its useful evidence should become tests/reports, not a shipped page.
4. Public monetization mockups are noindex and absent from sitemap, but they still exist as public routes. That is acceptable for local demo collateral only if intentionally approved; otherwise they create brand/positioning ambiguity before ads/sponsor strategy is ready.
5. Robots/sitemap posture is partially good but incomplete. Sitemap excludes all four surfaces; page-level noindex exists for the two public demo pages; robots disallows `/dashboard/` but not `/demo/ads` or `/sponsor-mockups`, so hiding/deleting is cleaner than relying on crawl hints alone.

## Minimal follow-on task list

1. Owner decision: approve the route policy table above or override each surface with keep/hide/restrict/delete.
2. Admin authorization gate: resolve D1 service-role/admin RBAC authority before shipping any replacement admin UI with real powers.
3. Implementation slice: disable or guard `/dashboard/vibes-test`, `/validation`, `/demo/ads`, and `/sponsor-mockups` according to the approved policy; update route inventory/traversal docs.
4. Test slice: add route-level tests for anonymous, authenticated non-admin, and admin behavior; add metadata/sitemap/robots tests for any kept public/internal preview route.
5. Admin console spec: fold useful vibes/ingest/status/cost/debug operations into a dry-run-first admin operations console with auditability, redaction, rate limits, and no secret query strings.

## Closure status

- Repo-side decision packet: closed by this artifact.
- Launch blocker: still owner-decision-gated because no approved keep/hide/restrict/delete policy has been applied yet and D1 admin authority remains unresolved.
- Phase 2+: remains held; this packet does not authorize later-phase monetization/admin product work.
