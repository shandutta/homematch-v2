# HomeMatch Canonical Control-Plane Plan

Status: **canonical Phase 0/1 control-plane artifact**. This file is the single planning surface for the Telegram control-plane, Kanban board, worker archetypes, phase gates, and artifact map.

Generated/updated: 2026-05-08

Public HTML mirror: `reports/home-match-parallel-kanban-execution-plan.html`

## Operating agreement — condensed

- This Telegram thread is the **control plane**, not the execution container.
- Work execution happens in **bounded Kanban workers / worktrees / resource-limited runs** with small prompts and narrow toolsets.
- Artifacts and commits are the durable memory; Telegram receives short deltas and links.
- `/goal` is a mission monitor/continuation loop, not a substitute for Kanban decomposition.
- A single `/goal` turn may consume up to `agent.max_turns = 150`; the mission-level `/goal` chain is governed by `goals.max_turns = 80`.
- Explicit incomplete status such as “Phase 0/1 not 100% complete” must **not** be judged as achieved.
- Correct project shape: **one strict Phase 0/1 gate + multiple child workers + fan-in decision register + no Phase 2+ until the closure matrix is clean**.

## Current truth

- Repo: `/home/shan/projects/homematch-v2`
- Branch: `autonomy/6h-business-hardening`
- Latest integration HEAD seen: `ede6a83 fix: close auth client cleanup slice`
- Board: `home-match-revival`
- Board state after auth worker reconciliation: `todo=2, ready=0, running=0, blocked=10, done=29`
- Latest completed worker: `t_42e0d08a` (`P1 auth/client cleanup`) merged into main at `ede6a83`.
- Important interpretation: the small board counts are **gate counts**, not the full product roadmap. Phase 2+ decomposition belongs in the held backlog below until Phase 0/1 are proven clean.
- Phase 0: **not 100% complete**
- Phase 1: **not 100% complete**
- Phase 2+: **held**

### Latest control-plane reconciliation — 2026-05-08T06:05Z

- `t_42e0d08a` completed and was integrated into main as `ede6a83 fix: close auth client cleanup slice`.
- Closed in that slice: removed duplicate `createApiClient()` `auth.getUser` monkey-patch, removed user-scoped interactions POST service-role fallback/backfill, added static regression coverage, and updated the auth-boundary report.
- Verification rerun in main: targeted auth/interactions/error-standardization Jest passed 3 suites / 37 tests when `.worktrees/` is ignored; `pnpm type-check` passed; `git diff --check` passed.
- Closure matrix updated: the auth client consolidation slice, interactions service-role fallback removal, and duplicate getUser monkey-patch removal moved from open to closed. Phase 0/1 still not 100%.
- Next safe execution shape: release one additional Phase 0/1 child at a time, or a read-only scout, never Phase 2+ implementation.

## Strict gates

### Phase gate

Phase 2/3/4/5/6 work must not dispatch until both Phase 0 and Phase 1 are proven 100% closed in the closure matrix.

“Complete with caveats,” “audit complete,” “remediation incomplete,” or “blocked/decision-needed” means the next work is still Phase 0/1 closure only.

### External side-effect gate

No production deploys, paid API calls, external dashboard changes, legal publication, outreach/emails, or real customer/user data without separate explicit approval.

### Telegram/gateway safety gate

From this Telegram lane:

- no worker fleets directly inside the gateway context
- no broad installs/builds/browser swarms
- no same-worktree parallel writers
- safe default is one writer plus read-only scouts, or Kanban dispatch outside the gateway with resource caps

## Canonical artifacts

Use these as source of truth instead of relying on Telegram history.

### Main control-plane artifact

- Markdown: `reports/home-match-parallel-kanban-execution-plan.md`
- HTML: `reports/home-match-parallel-kanban-execution-plan.html`
- Role: canonical plan, gates, worker archetypes, artifact map, current board graph, and operating agreement.

### Live status artifact

- HTML: `reports/home-match-revival-status.html`
- URL: `http://100.79.222.28:8767/home-match-revival-status.html`
- Role: Shan-facing current status / latest proof / links.

### Phase gate artifacts

- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
  - Current verdict: Phase 0/1 not 100%; Phase 2+ held.
- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
  - Strict gate correction and allowed next wave.
- `reports/home-match-revival/phase1-remediation-closure-scout.md`
- `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md`
  - Detailed Phase 1 remediation inventory.
- `reports/home-match-revival/phase0-closure-scout.md`
  - Detailed Phase 0 closure caveats.

### Supporting audit/remediation artifacts

- `reports/home-match-revival/api-error-standardization-remediation-2026-05-08.md`
- `reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md`
- `reports/home-match-revival/api-error-standardization-scout.md`
- `reports/home-match-revival/rate-limit-gap-scout.md`
- `reports/home-match-revival/phase0-phase1-remediation-cache-control-2026-05-08.md`
- `reports/home-match-revival/phase0-phase1-remediation-progress-2026-05-08.md`
- `reports/home-match-revival/execution-optimization-2026-05-07.md`
- `reports/home-match-revival/parallel-worktree-setup-2026-05-07.md`
- baseline JSON artifacts: `repo-snapshot.json`, `routes-and-endpoints.json`, `command-baseline.json`, `startup-baseline.json`, `browser-traversal.json`, `api-probe-matrix.json`, `phase0-phase1-reconciliation.json`

## Kanban graph to build from

### Manual dispatch gate

- `t_114ade2b` — `Phase 0/1 parallel remediation dispatch gate`
  - Status: done; repaired after Shan approval.
  - Result: released the Kanban path but prevented a fleet by holding sibling children; exactly one Phase 0/1 child is running first (`t_42e0d08a`).

### Phase 0/1 child tasks under gate

- `t_d60106b` — `P0 close: live probes, browser/auth traversal, cron/.env opacity`
  - Assignee: `ops`
  - Workspace: main repo dir
  - Mode: read/probe/report first; external side effects gated.
- `t_42e0d08a` — `P1 auth/client cleanup: consolidation, getUser patch, service-role fallback`
  - Assignee: `backend-eng`
  - Workspace: worktree
  - Status: done and merged into main at `ede6a83`.
  - Closed: auth client consolidation slice, duplicate getUser monkey-patch removal, and user-scoped interactions service-role fallback removal.
- `t_62707f69` — `P1 API hardening: remaining external timeouts and limiter dedupe`
  - Assignee: `backend-eng`
  - Workspace: worktree
  - Mode: bounded code remediation with route-family tests.
- `t_67a26aa7` — `P1 DB/perf cleanup: query dedupe, realtime N+1, inline DB typing, rollback plan`
  - Assignee: `backend-eng`
  - Workspace: worktree
  - Mode: bounded code/remediation/report split as needed.
- `t_efb13943` — `P1 decision register: RBAC, auth policy, rate limiter, env, numeric semantics, DB env`
  - Assignee: `reviewer`
  - Workspace: main repo dir
  - Mode: fan-in decision register; separates repo-closeable work from Shan/cloud approval decisions.

### Later-phase tasks remain blocked/held

- `t_ff763f6d` — P2 couples/matching UX upgrade
- `t_1009b931` — P2 maps/images/metadata/SEO fixes
- `t_11342c3d` — P3 LLM/matching prompt hardening
- `t_4b4d5b96` — P3 ingest pipeline review
- `t_acd542ca` — P4 test suite triage and TDD lane
- `t_eface8fd` — P5 compliance/analytics/AdSense/Stripe plan
- `t_fd311981` — P6 docs rewrite and final report
- `t_aeba612c` — final merge readiness review

## Worker archetypes

Each worker must have a narrow prompt, small tool context, and a hard artifact. Do not load the whole Telegram transcript.

### 1. Control-plane orchestrator

- Runs in this Telegram thread.
- Tools: Kanban CLI/status, small file reads/writes, config checks, no heavy builds.
- Output: terse status, gate decisions, artifact links.
- Never claims 100% closure without closure-matrix evidence.

### 2. Integration lane

- Path: `/home/shan/projects/homematch-v2`
- Branch: `autonomy/6h-business-hardening`
- Role: merge/review/report only.
- Actions:
  - inspect worker diffs
  - merge/cherry-pick one lane at a time
  - run resource-limited targeted tests/type-check
  - update canonical artifacts
  - commit integration result

### 3. Backend writer worker

- Workspace: dedicated git worktree.
- Toolsets: terminal/file/search only; add web/browser only if task requires it.
- Max scope: one child task / one commit.
- Required verification:
  - targeted RED where practical
  - targeted GREEN/final test
  - `pnpm type-check` when TypeScript changed
  - `git diff --check`
  - update report + Kanban

### 4. Ops/probe worker

- Workspace: repo dir or scratch, usually read-only.
- Scope: live probes, env-opacity checks, browser/auth traversal inventory.
- Must not deploy, mutate dashboards, call paid APIs beyond approved minimal probes, or touch real user data.
- Output: close/block matrix with exact evidence and blockers.

### 5. Reviewer / decision-register worker

- Workspace: repo dir or scratch.
- Scope: fan-in all Phase 0/1 outputs.
- Output:
  - decision register for RBAC, auth policy, rate limiter, env, numeric semantics, DB env
  - exact classification: repo-closed, code-remediation-needed, ops-approval-needed, blocked

### 6. Read-only scout

- Workspace: scratch or repo dir.
- No writes except report artifact if explicitly assigned.
- Purpose: compare OG plan, board, commits, and closure matrix for contradictions.

## Compression/context policy

Hermes config changed to compress earlier:

- `compression.threshold = 0.5`
- `compression.protect_last_n = 12`
- `compression.target_ratio = 0.2`
- `goals.max_turns = 80`
- `agent.max_turns = 150`

Gateway restart is required before Telegram definitely uses the changed config/code.

Operational rules:

- use artifacts as memory, not Telegram history
- avoid pasting long report bodies into Telegram
- worker prompts should reference paths and task IDs, not full thread summaries
- tool outputs should be targeted, not broad dumps
- after any huge report/status, manually compress or move execution into workers

## Later-phase held backlog skeleton

These phases should be visible in the plan so we do not lose roadmap shape, but they are **not dispatchable** until Phase 0/1 closure is clean. Expanding this backlog into more granular issue/task specs is allowed as Phase 0/1 planning/decision-register work only if it does not implement later-phase product code.

### Phase 2 — product UX, couples workflow, maps/images/SEO

- Board anchors: `t_ff763f6d`, `t_1009b931`.
- Intended scope after gate opens:
  - couples/matching workflow UX upgrades
  - saved-search / compare / partner review flows
  - map pins, neighborhood imagery, listing metadata, OpenGraph/SEO quality
  - production-safe UX QA and acceptance criteria
- Pre-gate allowed work:
  - write acceptance criteria
  - classify dependencies on Phase 0/1 auth/API/DB stability
  - identify tests needed later
- Pre-gate forbidden work:
  - implementing new UX features
  - deploying metadata/SEO changes
  - touching external dashboards or paid APIs without approval

### Phase 3 — LLM/matching and ingest pipeline hardening

- Board anchors: `t_11342c3d`, `t_4b4d5b96`.
- Intended scope after gate opens:
  - prompt and ranking robustness
  - confidence/explainability guardrails
  - ingest pipeline idempotency, source freshness, backfill safety
  - evaluation dataset and regression checks
- Pre-gate allowed work:
  - document target eval plan and data-safety constraints
  - list external integrations requiring approval
- Pre-gate forbidden work:
  - new LLM calls at scale
  - data ingest/backfills against real external systems

### Phase 4 — test suite/TDD lane

- Board anchor: `t_acd542ca`.
- Intended scope after gate opens:
  - test-suite triage and flake classification
  - TDD harness improvements
  - Playwright/browser coverage expansion once Phase 0/1 auth/API surfaces are stable
- Pre-gate allowed work:
  - inventory current test gaps discovered during Phase 0/1 closure
  - add regression tests directly tied to Phase 0/1 fixes

### Phase 5 — compliance, analytics, AdSense, Stripe plan

- Board anchor: `t_eface8fd`.
- Intended scope after gate opens:
  - compliance/legal review checklist
  - analytics instrumentation plan
  - AdSense/Stripe gating, pricing, and dashboard work
- Pre-gate allowed work:
  - write decision register entries and approval checklist
- Pre-gate forbidden work:
  - dashboard mutations, legal publication, payments, paid-service changes, outreach

### Phase 6 — docs rewrite, launch readiness, final merge review

- Board anchors: `t_fd311981`, `t_aeba612c`.
- Intended scope after gate opens:
  - docs rewrite
  - final report and launch checklist
  - merge readiness review
- Pre-gate allowed work:
  - capture current artifacts and contradictions
  - define final evidence requirements

## Hermes `/goal` patch status

Local/upstream patch state after careful update:

- Local rebased commit: `1a074c8b2 fix: keep incomplete goals active`
- Upstream base checked: `origin/main` at `faa13e49f docs(web): fix SearXNG env configuration`
- Upstream equivalent behavior search: no equivalent `explicit_incomplete` / incomplete-response override found before rebase.
- Upstream PR opened: `https://github.com/NousResearch/hermes-agent/pull/21689`
- Files:
  - `/home/shan/.hermes/hermes-agent/hermes_cli/goals.py`
  - `/home/shan/.hermes/hermes-agent/tests/hermes_cli/test_goals.py`
- Test evidence after rebase: `python -m pytest tests/hermes_cli/test_goals.py -o 'addopts=' -q` → `36 passed`; `python -m compileall -q hermes_cli/goals.py` passed.
- Durable patch copies:
  - `/home/shan/.hermes/patches/hermes-goal-incomplete-override-65e21d69c.patch`
  - `/home/shan/.hermes/patches/hermes-goal-incomplete-override-rebased-*.patch`

Risk is reduced but not eliminated: the local checkout is now current with upstream plus one PR branch commit. If upstream merges equivalent behavior later, drop the local patch after verifying the regression test/behavior.

Recommended update posture:

1. Do not blindly overwrite the local Hermes checkout.
2. Before `hermes update`, preserve the patch file above and inspect `git status`.
3. Fetch/rebase upstream, then re-apply/cherry-pick `65e21d69c` if upstream has not fixed equivalent semantics.
4. If upstream already fixed it, drop the local patch after verifying the regression test or equivalent behavior.
5. File upstream issue/PR with the regression test; do not rely on a long-lived local fork forever.

Unrelated local Hermes state to preserve:

- `/home/shan/.hermes/hermes-agent/hermes_cli/profiles.py` is modified but not part of the `/goal` fix. Do not accidentally overwrite or commit it without inspecting ownership.

## Saved `/goal` command for this control-plane thread

After a `/compress` or gateway restart, use this short command to resume HomeMatch efficiently without rehydrating the whole Telegram history:

```text
/goal Use this Telegram thread only as the HomeMatch control plane. Treat reports/home-match-parallel-kanban-execution-plan.md as canonical, with live HTML at http://100.79.222.28:8767/home-match-parallel-kanban-execution-plan.html and status at http://100.79.222.28:8767/home-match-revival-status.html. Keep Phase 0/1 strict gate active: do not dispatch or implement Phase 2+ until reports/home-match-revival/phase0-phase1-closure-matrix.md proves both Phase 0 and Phase 1 are 100% clean. Continue by updating artifacts/Kanban first, then run bounded worker/worktree slices only when safe and necessary. Use concise Telegram deltas, no giant pasted logs, no secrets, no external side effects without approval.
```

Context-overhang procedure:

1. Update/commit artifacts first.
2. Run `/compress` in Telegram.
3. Use the saved `/goal` command above.
4. Workers get only path/task packets, not the whole chat.

## Execution sequence from here

### Step A — Control-plane stabilization

- Keep this artifact canonical.
- Keep Telegram updates brief.
- Restart gateway at a safe point so compression and `/goal` code/config changes apply.

### Step B — Open or selectively run the Phase 0/1 gate

Only after explicit resource-window approval:

- unblock/advance `t_114ade2b`, or
- selectively run one child worker at a time if using a safer incremental mode.

### Step C — First worker wave

1. P0 ops/probe close-block matrix — `t_d60106b`
2. P1 backend auth/client cleanup — `t_42e0d08a`
3. P1 reviewer decision register — `t_efb13943`

Optional read-only scout only if RAM is green.

### Step D — Fan-in

- Update closure matrix.
- Update live status HTML.
- Complete/comment Kanban tasks with evidence.
- Keep Phase 2+ held unless closure matrix is clean.

## Short commands

### Correct compact `/goal`

```text
/goal Use board home-match-revival and canonical plan reports/home-match-parallel-kanban-execution-plan.md. Treat this Telegram thread as control plane only. Continue Phase 0/1 closure via bounded Kanban/worktree workers, keep Phase 2+ held until reports/home-match-revival/phase0-phase1-closure-matrix.md proves both phases 100%, update artifacts/Kanban after each slice, and never mark explicit incomplete/blocker status as achieved.
```

### Gate-opening approval phrase

```text
Approve bounded Phase 0/1 Kanban worker window
```

Default interpretation: max two resource-limited workers, one writer at a time unless separate worktrees are confirmed clean, no external side effects, no Phase 2+.
