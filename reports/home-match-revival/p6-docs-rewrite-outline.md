# P6 Docs Rewrite Outline

Scout date: 2026-05-08
Status: outline — no files touched

## 1. User-Facing Story

A developer clones HomeMatch and in 5 minutes understands:

1. **What this is.** (README — one screen of prose)
2. **How to run it.** (SETUP_GUIDE — env vars, one dev command, test users)
3. **How it's built.** (ARCHITECTURE — directory map, auth boundary, data layer)
4. **How to test it.** (TESTING — unit/integration/e2e in one page)
5. **How to design for it.** (STYLE_GUIDE — tokens, fonts, components)

Everything else is supplementary: business readiness tracking, integration-specific docs, and product specs. The core five are the entrypoint.

## 2. Docs by Category

### 2.1 Entrypoint Docs (rewrite/tighten)

| Doc | Current Lines | Verdict | Notes |
|---|---|---|---|
| README.md | 102 | Rewrite (minor) | Good bones. Collapse Docker bullet points from 6 to 2. Tighten "Essential Commands" table. Remove duplicated stack list (already in ARCHITECTURE). |
| docs/README.md | 65 | Rewrite (minor) | Drop CONTEXT.md reference. Remove "Removed Historical Docs" section — that's archaeology. Simplify to: "Start here → SETUP → ARCHITECTURE → TESTING → STYLE_GUIDE." |
| docs/SETUP_GUIDE.md | 126 | Tighten | Solid. Remove "Current Status" / "In progress" section — those rot instantly. The env var list is good. Merge the Supabase local proxy section into the main env block. |
| docs/ARCHITECTURE.md | 109 | Keep (minor trim) | Already clean. Remove the "Reading path" header line — that's docs/README's job. |
| docs/TESTING.md | 93 | Keep (minor trim) | Already clean. Remove "See docs/testing/README.md for deeper guidance" — the testing appendix adds nothing TESTS.md doesn't say. |
| docs/STYLE_GUIDE.md | 98 | Keep | Good reference. Minor: move "Parallax Stars" admonition to a component comment, not the style guide. |

### 2.2 Merge Candidates

| Docs | Action | Notes |
|---|---|---|
| docs/DEVELOPMENT_WORKFLOWS.md (74 lines) | Merge into SETUP_GUIDE.md | 80% overlap. SETUP_GUIDE already covers dev commands. Move the "Code Quality" and "CI Expectations" sections to SETUP_GUIDE and TESTING respectively. Delete the standalone file. |
| docs/CONTEXT.md (31 lines) | Delete | Redundant with README.md + ARCHITECTURE.md. Nothing here that isn't already said better elsewhere. |

### 2.3 Business / Product Docs (keep, don't rewrite now)

| Doc | Verdict | Notes |
|---|---|---|
| docs/BUSINESS_HARDENING_REVIEW.md | Keep as-is | This is the working control document. It's a living matrix, not prose. Don't de-bloat it — it's supposed to be dense. |
| docs/COUPLES_MATCH_PLAN.md | Keep | Solid product spec with data model invariants, API contracts, test strategy. |
| docs/cookie-session-security-evidence.md | Keep | Evidence artifact tied to Phase 0/1 closure. |

### 2.4 Refactoring / Archaeology (cut hard)

| Doc | Verdict | Notes |
|---|---|---|
| docs/REFACTORING_ARCHITECTURE.md (866 lines) | **Delete or radical cut** | 866 lines. First half: refactoring plan with TypeScript interface stubs. Second half: completion report with checkmarks and metrics tables. Both are archaeological. The actual architecture is in the code. If anything here is still relevant, fold a 20-line summary into ARCHITECTURE.md. Otherwise: delete. |
| docs/TROUBLESHOOTING_AUTH.md (40 lines) | Rewrite or delete | Reads like a chat transcript ("You are correct that..."). If the Google OAuth redirect fix is still correct, fold into SETUP_GUIDE as a one-paragraph note. Otherwise delete. |

### 2.5 Integration / Operations Docs (keep, flag for later refresh)

These are reference docs for specific integrations. They're fine as-is for now — update when the integration changes.

| Doc | Notes |
|---|---|
| docs/RAPIDAPI_ZILLOW.md | Zillow ingest reference. |
| docs/SMTP_SETUP.md | Custom SMTP config. |
| docs/property-vibes-backfill.md | Vibes generation workflow. |
| docs/auto-commit.md | Auto-commit flow. |
| docs/secrets.md | Secrets scanning. |
| docs/performance.md | Performance notes. |
| docs/CI_INTEGRATION_TESTS.md | CI pipeline reference. |
| docs/marketing/assets-credits.md | Asset attribution. |

### 2.6 Testing Appendix

| Doc | Verdict |
|---|---|
| docs/testing/README.md (14 lines) | Delete — this is an index to an index. TESTS.md already points to the integration/E2E guides. |
| docs/testing/integration-testing-guide.md | Keep |
| docs/testing/fixtures.md | Keep |
| docs/testing/manual-test-guide.md | Keep |

## 3. LLM-Tell Removal Guidance

The OG scout found these patterns to scrub during rewrite:

- "comprehensive" (7 in REFACTORING, 3 in CLAUDE.md)
- "ensure" / "crucial" / "deep dive"
- "robust" / "scalable" / "production-ready"
- Metrics tables that state the obvious (complexity scores, "80% improvement")
- Checkmark completion reports ("✅ All tests passing")
- Multi-paragraph conclusions that restate what the doc already said

**Rule:** if a sentence can be deleted without losing information a developer needs, delete it.

**Rule:** avoid "Note: This document is a refactoring plan and may not reflect the current code state." — if that disclaimer is needed, the doc shouldn't exist.

## 4. Target Doc Count

| Phase | Count |
|---|---|
| Current | 25 files in docs/ + 1 README |
| After rewrite | ~18 files (delete 6-7, merge 2) |

## 5. Implementation Order

1. **Delete first.** Remove CONTEXT.md, docs/testing/README.md. Archive REFACTORING_ARCHITECTURE.md (or cut to 20-line summary in ARCHITECTURE).
2. **Merge.** Fold DEVELOPMENT_WORKFLOWS into SETUP_GUIDE + TESTING. Delete the standalone file.
3. **Rewrite entrypoint five.** README → docs/README → SETUP_GUIDE → ARCHITECTURE → TESTING. Tighten each to ~80 lines max.
4. **Scrub LLM tells.** Pass over remaining docs (REFACTORING_ARCHITECTURE especially if kept, TROUBLESHOOTING_AUTH).
5. **Verify.** Read the five entrypoint docs end-to-end. Can a new developer run the app without guessing? Is every command accurate?

## 6. Reports Directory

The `reports/home-match-revival/` directory contains 100+ timestamped evidence artifacts from Phase 0/1 closure work. These are not docs to rewrite — they're the audit trail. The operating plan (`reports/home-match-business-revival-operating-plan.md`) is the canonical roadmap and should stay as-is.

The P6 rewrite should NOT touch reports/ — it's exclusively scoped to `docs/` and `README.md`.
