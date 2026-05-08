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
- Latest integration HEAD seen: `ba647e9 fix: add JSONB GIN indexes`
- Board: `home-match-revival`
- Board state at last reconciliation: `todo=7`, `ready=0`, `running=0`, `blocked=7`, `done=27`
- Phase 0: **not 100% complete**
- Phase 1: **not 100% complete**
- Phase 2+: **held**

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
  - Status: blocked
  - Reason: waiting for explicit dispatch/resource window before spawning workers from Telegram Home Purchase lane.

### Phase 0/1 child tasks under gate

- `t_d60106b` — `P0 close: live probes, browser/auth traversal, cron/.env opacity`
  - Assignee: `ops`
  - Workspace: main repo dir
  - Mode: read/probe/report first; external side effects gated.
- `t_42e0d08a` — `P1 auth/client cleanup: consolidation, getUser patch, service-role fallback`
  - Assignee: `backend-eng`
  - Workspace: worktree
  - Mode: bounded code remediation with targeted tests.
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

## Hermes `/goal` patch status

Local patch committed in Hermes Agent repo:

- Commit: `65e21d69c fix: keep incomplete goals active`
- Files:
  - `/home/shan/.hermes/hermes-agent/hermes_cli/goals.py`
  - `/home/shan/.hermes/hermes-agent/tests/hermes_cli/test_goals.py`
- Test evidence: `27 passed in 2.00s` for goal tests.
- Durable patch copy: `/home/shan/.hermes/patches/hermes-goal-incomplete-override-65e21d69c.patch`

Risk: `/home/shan/.hermes/hermes-agent` is currently `ahead 1, behind 457`, so a normal upstream update/rebase may conflict. A clean upstream PR/issue is warranted because this is a real bug: an explicit incomplete/blocker report should not be judged as mission achieved.

Recommended update posture:

1. Do not blindly overwrite the local Hermes checkout.
2. Before `hermes update`, preserve the patch file above and inspect `git status`.
3. Fetch/rebase upstream, then re-apply/cherry-pick `65e21d69c` if upstream has not fixed equivalent semantics.
4. If upstream already fixed it, drop the local patch after verifying the regression test or equivalent behavior.
5. File upstream issue/PR with the regression test; do not rely on a long-lived local fork forever.

Unrelated local Hermes state to preserve:

- `/home/shan/.hermes/hermes-agent/hermes_cli/profiles.py` is modified but not part of the `/goal` fix. Do not accidentally overwrite or commit it without inspecting ownership.

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
