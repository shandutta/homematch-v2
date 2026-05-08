# HomeMatch Parallel Kanban Execution Plan

Status: **setup/check-in plan only**. No execution workers should be started until Shan approves.

## Short `/goal` command

```text
/goal Load skill homematch-parallel-kanban-execution. Use board home-match-revival and plan reports/home-match-parallel-kanban-execution-plan.md. Setup separate git worktrees + 1-min RAM monitor only, then check in before dispatch.
```

## Why this replaces the slow loop

The previous loop was safe but slow: one writer cron every 5-10 minutes, one bounded slice per tick, main worktree only. That avoids conflicts and OOMs, but it underuses Kanban parallelism and leaves macro tasks looking stale.

New model: use **separate git worktrees** for true parallel writers, plus a main integration lane and a RAM watchdog that can pause/prune jobs.

## Non-negotiable gates

- Do not start implementation workers until Shan approves after the setup check-in.
- No production deploys, paid API calls, external dashboard changes, legal publication, emails, or real customer/user data without separate approval.
- No same-worktree parallel writers.
- Each writer must own one branch/worktree and produce one artifact per run: commit, report artifact, Kanban completion/comment, or explicit blocked reason.
- Main worktree stays the integration lane.
- If RAM pressure is high, slow down or prune immediately.

## Resource policy

Current devbox profile observed during planning:

- CPU: 2 cores
- RAM: ~3.7 GiB
- Available RAM during check: ~2.6 GiB
- Swap: 2 GiB, ~792 MiB already used

RAM watchdog checks every minute and writes JSONL samples.

Thresholds:

- **Green:** available RAM >= 1.6 GiB and swap used < 1.2 GiB
  - Allow up to 2 writer lanes + 1 read-only scout.
- **Yellow:** available RAM 1.0-1.6 GiB or swap used 1.2-1.6 GiB
  - Pause new writer starts; allow existing targeted checks to finish.
- **Red:** available RAM < 1.0 GiB or swap used > 1.6 GiB
  - Pause/prune lower-priority lanes; keep only integration lane.
- **Critical:** available RAM < 700 MiB or load average > 3.0 for 5 minutes
  - Stop active worker services and report blocker.

## Worktree layout

Root: `/home/shan/projects/homematch-v2`

Planned worktrees:

- Integration lane
  - Path: `/home/shan/projects/homematch-v2`
  - Branch: `autonomy/6h-business-hardening`
  - Role: merge/review/report only; no broad feature work.

- P2 frontend lane
  - Path: `/home/shan/projects/homematch-v2.worktrees/p2-frontend`
  - Branch: `autonomy/hm-p2-frontend`
  - Kanban focus: `t_ff763f6d`, `t_1009b931`
  - Work: couples/matching UX, maps/images/metadata/social cards, tiny gstack browser checks only if green.

- P3 backend lane
  - Path: `/home/shan/projects/homematch-v2.worktrees/p3-backend`
  - Branch: `autonomy/hm-p3-backend`
  - Kanban focus: `t_11342c3d`, `t_4b4d5b96`
  - Work: LLM/matching prompt hardening, ingest architecture, no paid external runs.

- P4/P5 quality/compliance lane
  - Path: `/home/shan/projects/homematch-v2.worktrees/p4-quality-compliance`
  - Branch: `autonomy/hm-p4-quality-compliance`
  - Kanban focus: `t_acd542ca`, `t_eface8fd`
  - Work: test triage, compliance/analytics/monetization plan artifacts, no dashboard changes.

## Kanban strategy

Do not rely on the original six macro tasks as executable units. They are too broad.

For each macro task:

1. Add a Kanban comment saying it is being advanced by worktree lanes.
2. Create bounded child tasks named like:
   - `P2.W1 couples invite/mutual-like UX slice`
   - `P3.W1 prompt fallback and response-shape tests`
   - `P4.W1 fake/stale test triage matrix`
3. Assign child tasks to the lane owner.
4. Complete child tasks with artifact/commit/test evidence.
5. Complete or supersede the macro task only when enough child evidence exists.

This fixes the stale `blocked=6` problem without hiding the original plan structure.

## GStack usage

Use gstack deliberately:

- `health`: repo quality dashboard before final integration and after major merges.
- `review`: pre-merge review for each lane branch before integrating.
- `browse` / `qa-only`: only for tiny, bounded browser checks when RAM is green.
- Avoid `qa` fix-loop until the devbox has enough headroom or Shan explicitly asks.

## Setup sequence, no implementation yet

1. Pause current writer/scout crons.
2. Verify main worktree is clean.
3. Create worktree root.
4. Create/update the three lane branches from current integration HEAD.
5. Create RAM watchdog script and systemd user timer, but start only after check-in approval.
6. Create/update lane-specific Kanban comments/tasks, but do not dispatch workers yet.
7. Check in to Shan with:
   - worktree paths
   - branch names
   - RAM thresholds
   - proposed max concurrency
   - exact first three tasks

## Execution after approval

Start with max concurrency 2:

- P2 frontend writer
- P3 backend writer
- one read-only scout if RAM remains green

Hold P4/P5 until one of P2/P3 finishes or RAM stays green for 10 minutes.

Each worker must:

- use its own worktree
- run targeted checks under `systemd-run`
- avoid broad pre-commit hook
- commit with `SKIP_SIMPLE_GIT_HOOKS=1` or `--no-verify` only after targeted verification
- update report/Kanban
- exit

Integrator must:

- inspect each branch diff
- run gstack `review` or repo review equivalent
- cherry-pick/merge one lane at a time
- run resource-limited typecheck and targeted tests
- update live report

## First proposed task wave

Wave 1, after approval:

1. P2 frontend: bounded couples/matching UX slice from `t_ff763f6d`.
2. P3 backend: bounded prompt/response-shape hardening from `t_11342c3d`.
3. Read-only scout: compare both lane outputs against OG phases and final docs blockers.

Wave 2:

1. P2 frontend: maps/images/social-card slice from `t_1009b931`.
2. P3 backend: ingest architecture artifact from `t_4b4d5b96`.
3. P4/P5 quality lane starts only if RAM remains green.

## Check-in required

Before starting Wave 1, present this to Shan and wait for approval.
