# HomeMatch Phase 2–6 Execution Roadmap

Generated: 2026-05-08T06:50Z

Status: **held execution roadmap**. This is the full downstream plan, not authorization to implement Phase 2+. Phase 2+ implementation remains blocked until `reports/home-match-revival/phase0-phase1-closure-matrix.md` proves Phase 0 and Phase 1 are 100% clean, or Shan approves a written gate exception.

## Global execution rules

- Control plane: Telegram thread only.
- Durable state: Kanban board `home-match-revival`, this roadmap, the canonical plan, closure matrix, status HTML, and commits.
- Writer discipline: one project-dir writer at a time unless clean separate worktrees are explicitly verified.
- Verification per code slice: targeted failing/regression test where practical, targeted green test, `pnpm type-check` if TypeScript changed, `git diff --check`, report update, Kanban completion.
- External side effects: no production deploys, paid API calls, dashboard mutations, payments, legal publication, outreach, or real-user data access without separate approval.
- Secrets: never print; replace with `[REDACTED]`.

## Phase 0/1 remaining gate path

### Active now

- `t_54000dda` — P1 DB/perf cleanup explicit project workspace.
- `t_29d2185c` — roadmap scout, completed read-only and recommended fan-in verifier before releasing P0 probes.

### Next sequence

1. `t_54000dda` completes or blocks.
2. `t_113bb9c0` fan-in verifier reconciles DB/perf result into artifacts and determines next release.
3. If safe, release `t_d60106b6` for P0 live probes/browser/auth traversal/cron-opacity checks.
4. Then release `t_efb13943` decision register to classify remaining policy/cloud/environment decisions.
5. Only after the closure matrix says Phase 0/1 are clean, unblock downstream anchors.

## Phase 2 — Product UX, couples workflow, maps/images/SEO

Board anchors:

- `t_ff763f6d` — P2 couples/matching UX upgrade.
- `t_1009b931` — P2 maps/images/metadata/SEO fixes.

Child tasks now on board:

- `t_eab22374` — UX spec: couples review, saved-search, compare acceptance criteria.
- `t_7dd78d5d` — couples workflow implementation slice.
- `t_aa04c086` — maps/images/metadata/SEO implementation slice.
- `t_d258ca31` — production-safe UX/browser acceptance pass.

Acceptance criteria:

- Couples can review, compare, and annotate candidate homes with clear partner state.
- Saved-search and compare flows have explicit empty/loading/error states.
- Maps/listing imagery and metadata are accurate, privacy-safe, and SEO-safe.
- Public metadata does not expose private/auth/dashboard/API surfaces.
- Browser QA verifies unauthenticated, authenticated, and error states without production mutation.

Verification:

- Component/unit coverage for key workflow states.
- Route metadata tests for public/private surfaces.
- Browser walkthrough evidence after Phase 0 auth/API health is clean.

## Phase 3 — Matching, LLM, and ingest hardening

Board anchors:

- `t_11342c3d` — P3 LLM/matching prompt hardening.
- `t_4b4d5b96` — P3 ingest pipeline review.

Child tasks now on board:

- `t_498768f2` — matching eval plan and safety constraints.
- `t_35ef5d03` — LLM prompt/ranking hardening implementation.
- `t_3a7a7be2` — ingest idempotency/source freshness implementation.
- `t_377fda7d` — matching/ingest fan-in review.

Acceptance criteria:

- Matching has a documented eval set, ranking metrics, and regression checks.
- LLM prompts/rankers are robust to missing data, adversarial listing text, and stale context.
- Ingest is idempotent, source freshness is visible, and backfills are rollback-safe.
- No scaled LLM calls, paid external ingestion, or live backfills occur without approval.

Verification:

- Offline deterministic eval where possible.
- Unit tests for ranking edge cases and ingest idempotency.
- Fan-in review signs off on data safety and rollback plan.

## Phase 4 — Test suite and TDD lane

Board anchor:

- `t_acd542ca` — P4 test suite triage and TDD lane.

Child tasks now on board:

- `t_af0f0dc4` — test-suite inventory and flake taxonomy.
- `t_d0b4cbb0` — TDD harness and regression cleanup.

Acceptance criteria:

- Test suites are categorized by purpose, speed, flake risk, and external dependency.
- Phase 0/1 regressions are covered by fast targeted tests.
- Playwright/browser coverage has clear auth fixtures and does not mutate production state.
- CI/local commands are documented with Docker-optional paths.

Verification:

- Inventory artifact with suite taxonomy.
- Targeted test runs for any harness changes.
- Type-check and diff-check for harness/config updates.

## Phase 5 — Compliance, analytics, AdSense, Stripe

Board anchor:

- `t_eface8fd` — P5 compliance/analytics/AdSense/Stripe plan.

Child tasks now on board:

- `t_65920da3` — compliance/analytics/payments approval checklist.
- `t_8ba987bd` — approved analytics/AdSense/Stripe setup execution.

Acceptance criteria:

- Compliance/legal checklist distinguishes content changes from legal review items.
- Analytics plan specifies events, privacy constraints, retention, and consent posture.
- AdSense/Stripe work has explicit approvals, dashboard change plan, rollback plan, and no surprise charges.
- External mutations require Shan approval at execution time.

Verification:

- Approval checklist artifact.
- Dry-run/config-only proof before dashboard/payment mutation.
- Post-change audit if approval is granted.

## Phase 6 — Docs, launch readiness, final merge review

Board anchors:

- `t_fd311981` — P6 docs rewrite and final report.
- `t_aeba612c` — final merge readiness review.

Child tasks now on board:

- `t_d7d36f14` — final documentation rewrite.
- `t_771292b6` — final launch/merge readiness gate.

Acceptance criteria:

- README and operational docs match actual commands and deployment constraints.
- Final report links all Phase 0–6 evidence and unresolved decisions.
- Merge readiness review verifies clean git status, tests, build, security posture, and external-side-effect log.
- Launch checklist clearly says what is safe, what is blocked, and what needs Shan approval.

Verification:

- Docs diff review.
- Final test/build matrix where resource-safe.
- Reviewer gate must explicitly pass or block with exact reasons.
