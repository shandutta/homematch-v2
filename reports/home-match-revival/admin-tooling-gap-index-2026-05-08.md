---
date: 2026-05-08
phase: P1 readiness (held / future)
scope: admin tooling gap index — read-only inventory of operator surfaces
authors: hermes-claude (worktree d57-admin-tooling-gap-index-1748)
status: HELD — gates remain CLOSED; this index does not unblock or implement anything
related:
  - reports/home-match-revival/p1-decision-needed-register-2026-05-08.md
  - reports/home-match-revival/p1-decision-needed-register-freshness-2026-05-08.md
  - reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md
  - reports/home-match-revival/og-business-readiness-backlog-2026-05-08.md
---

# Admin Tooling Gap Index — Phase 1 Readiness

## 0. Purpose & boundary

This file is a docs-only **gap index** for operator-facing tooling that HomeMatch
will need before any meaningful Phase 1 dogfooding can happen. It exists so that
the next reviewer can see, on one page, what is missing across the four
operator capabilities and what each gap blocks.

**Out of scope (deliberately):**

- Building any dashboard, admin page, or operator UI.
- Calling any `/api/admin/*` endpoint, live or local.
- Touching Supabase data, secrets, or remote infra.
- Recommending implementation order beyond "these are HELD until a decision
  is made and a P1 gate is opened."

Every gap below is recorded as a **held / future gate**. None of them are
authorized to be implemented in this worker's scope. The closure column is
always `HELD — gate not opened`.

## 1. Capability map (what an operator needs)

| #   | Capability            | One-line description                                                                                            |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Ingest status         | Did the latest Zillow ingest job succeed? How many rows? Last run? Errors?                                      |
| 2   | Bad listing triage    | A queue for couples-disputed / clearly-broken listings with a take-action surface.                              |
| 3   | Prompt / debug traces | Per-property record of the prompt, model, output, latency, and cost for vibes / neighborhood-vibes generations. |
| 4   | Spend visibility      | Aggregate $ spent on OpenRouter/OpenAI/Zillow over a window, with per-route attribution.                        |

These four are the minimum operator surface to run the product without
hand-querying Supabase or grepping logs. They are **not** present today.

## 2. What exists today (grounded scan)

Scan basis: `src/app/api/admin/**`, `src/lib/services/vibes/**`,
`src/lib/services/neighborhood-vibes/**`, `src/lib/ingestion/**`,
`src/types/database.ts`. No code was modified.

### 2.1 Admin API surface

```
src/app/api/admin/
├── generate-neighborhood-vibes/route.ts
├── generate-vibes/route.ts
├── generate-vibes-zillow/route.ts
├── ingest/zillow/route.ts
└── status-refresh/route.ts
```

Observations (held, not asserted as bugs):

- All five routes import only `rateLimitAdminRoute` and `ApiErrorHandler` —
  the gate in front of them is **rate-limit-only**, not an admin identity
  check. Whether that is acceptable is itself a held P1 decision (already
  tracked elsewhere in the P1 decision register; not re-litigated here).
- There is **no `src/app/admin/**`\*\* route group — i.e., no operator UI
  pages exist. Admin functionality today is API-only.
- No `/api/admin/spend`, `/api/admin/triage`, or `/api/admin/traces` route
  exists. Spend, triage, and traces are entirely absent from the admin
  surface.

### 2.2 Data we already capture (raw signal, no surface)

| Signal                                   | Where                                                                                 | Surfaced in admin?                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `property_vibes.generation_cost_usd`     | `types/database.ts` schema                                                            | No                                                                       |
| `neighborhood_vibes.generation_cost_usd` | `types/database.ts` schema                                                            | No                                                                       |
| Per-batch `totalCostUsd` log line        | `src/lib/services/vibes/vibes-service.ts:691`                                         | No (stdout only)                                                         |
| Disputed properties (couple-flagged)     | `src/app/api/couples/disputed/route.ts`, `src/components/couples/Disputed*.tsx`       | No (couples-scoped, not operator-scoped)                                 |
| Zillow ingest run results                | `src/lib/ingestion/zillow.ts` (return value of `ingestZillowLocations`)               | No (returned from API, never persisted in a queryable run-history table) |
| Prompt strings                           | `src/lib/services/vibes/prompts.ts`, `src/lib/services/neighborhood-vibes/prompts.ts` | No (static in code; per-call rendered prompt is not stored)              |

The recurring pattern is: the **raw signal exists or is reachable, but no
operator-readable surface (table, page, or aggregated endpoint) consumes it**.

## 3. Gap matrix (one row per capability)

For each row: what is missing, what currently substitutes for it, why it is
held, and the gate that would have to open before any work can start.

### 3.1 Ingest status

| Field               | Value                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What's missing      | A persisted `ingest_runs` (or equivalent) table + read-only operator view: `started_at`, `finished_at`, `locations`, `succeeded`, `failed`, `error_summary`.                                                                    |
| Current substitute  | Operator must invoke `/api/admin/ingest/zillow` and read the response body in-flight; nothing is persisted for later inspection.                                                                                                |
| Why held            | (a) No P1 decision yet on whether ingest history persists in app DB or in a logging sink. (b) Implementing it requires a migration, which is gated by the broader migration freeze tracked in the P0/P1 blocker evidence index. |
| Future gate to open | "Phase 1 ingest observability" — depends on migration freeze lifting and on a decision about run-history retention.                                                                                                             |
| Closure             | HELD — gate not opened.                                                                                                                                                                                                         |

### 3.2 Bad listing triage

| Field               | Value                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What's missing      | An operator-scoped triage queue that surfaces listings flagged as "bad" (couple-disputed, ingest-malformed, vibes-generation-failed) with a take-action affordance (suppress / re-ingest / dismiss).                                                          |
| Current substitute  | `couples/disputed/*` exists at the **couple** level only. There is no operator aggregation across couples, and no surface for ingest-malformed or vibes-failed listings at all.                                                                               |
| Why held            | (a) Definition of "bad listing" is not a decided product surface — couple-disputed and ingest-malformed are different signals with different action sets. (b) Admin auth gating (3.0 above) needs to be decided before any triage write surface can be built. |
| Future gate to open | "P1 operator triage surface" — depends on admin identity decision + a product decision on which signals merge into one queue vs. stay separate.                                                                                                               |
| Closure             | HELD — gate not opened.                                                                                                                                                                                                                                       |

### 3.3 Prompt / debug traces

| Field               | Value                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What's missing      | Per-generation record of: rendered prompt (not just the static template), model id, input data hash, raw output, latency ms, cost usd, and which admin route invoked it. Reachable by `property_id` and `neighborhood_id`.                                                                                                   |
| Current substitute  | `property_vibes` / `neighborhood_vibes` rows store `generation_cost_usd` and `input_data` but do not store the **rendered** prompt or the raw model response. Per-batch totals are `console.log`-only (`vibes-service.ts:691`).                                                                                              |
| Why held            | (a) Storing rendered prompts may include user-derived address strings — privacy review is gated separately. (b) Cost of additional row-per-call storage is non-trivial and needs a retention decision. (c) No P1 decision yet on whether traces live in app DB, an external observability sink, or a structured log shipper. |
| Future gate to open | "Prompt trace store" — depends on privacy review of stored prompt content + retention decision.                                                                                                                                                                                                                              |
| Closure             | HELD — gate not opened.                                                                                                                                                                                                                                                                                                      |

### 3.4 Spend visibility

| Field               | Value                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What's missing      | An aggregated read-only view: total $ spent over `[window]`, broken down by `(provider, route, day)`. Bonus: a soft-cap alert threshold.                                                                                                                                                                                                                   |
| Current substitute  | Per-row `generation_cost_usd` exists in `property_vibes` and `neighborhood_vibes`, but nothing aggregates them. Zillow API spend is **not captured anywhere** — there is no per-call cost field on the ingest path.                                                                                                                                        |
| Why held            | (a) Zillow per-call cost is a constant negotiated with the provider; a decision is needed on whether to model it as a config constant or pull from billing API. (b) Aggregation surface depends on the same admin-identity decision as 3.2. (c) Soft-cap alerting requires a decision on the alerting channel (already deferred per P1 decision register). |
| Future gate to open | "P1 spend dashboard" — depends on admin identity + Zillow cost-model decision + alerting channel decision.                                                                                                                                                                                                                                                 |
| Closure             | HELD — gate not opened.                                                                                                                                                                                                                                                                                                                                    |

## 4. Cross-gap dependencies (read-only)

The four gaps share three upstream decisions that are themselves held:

1. **Admin identity gate** — currently rate-limit-only. Until a decision is
   recorded on whether admin endpoints require an identity check (and which
   one), no operator-write surface (3.2 triage, 3.4 cap alerts) can be built
   safely.
2. **Migration freeze** — 3.1 (ingest_runs) and 3.3 (prompt traces) both
   require new tables. The migration freeze tracked in the P0/P1 blocker
   evidence index must lift first.
3. **Privacy review of stored prompts** — 3.3 cannot proceed until a decision
   is recorded on whether rendered prompts may be persisted given that they
   include address-level inputs derived from user-provided couple data.

None of these decisions are made in this index. They are linked here only so
that a future reviewer can see the full prerequisite chain at one glance.

## 5. What this index does **not** do

Stated explicitly so that scope creep is visible:

- It does not propose a schema for `ingest_runs`, `prompt_traces`, or
  `spend_rollups`.
- It does not recommend a UI framework, route group, or page layout.
- It does not benchmark or call any admin endpoint, live or local.
- It does not assert that any of the gaps are P0 — they are all P1 readiness
  items.
- It does not change any existing decision in the P1 decision register; the
  register remains the source of truth for what is actually decided.

## 6. Snapshot freshness

This index reflects the repository state at commit `e63b596` on branch
`autonomy/hm-admin-tooling-gap-index-1748` as of 2026-05-08. Any of the
"current substitute" lines may go stale once the admin auth gate or migration
freeze decisions land — re-grep `src/app/api/admin/**` and the relevant
schema columns before quoting this index in a future planning doc.
