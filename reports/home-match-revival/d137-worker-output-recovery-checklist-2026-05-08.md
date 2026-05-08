# D137 Worker Output Recovery Checklist

Generated: 2026-05-08
Scope: repo-local procedural checklist only. Docs-only artifact. No merges, no cherry-picks, no pushes, no Supabase mutations, no dashboard changes, no secret printing, no paid APIs, no Docker/DB resets, no broad test runs. Reading and `git cherry`-style inspection only; any actual recovery action stays gated by the integration owner.

Parent artifacts:
- `reports/home-match-revival/parallel-worktree-setup-2026-05-07.md` (worktree topology and lane policy)
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` (canonical index recovered worker outputs must crosslink into)
- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md` (strict gate; recovery does not advance closure on its own)

## Purpose

Many bounded HomeMatch worker worktrees under `/home/shan/projects/homematch-v2.claude-workers/d*-*/` produce one tightly-scoped commit on a branch named `autonomy/hm-d{NN}-...`. Their output (commit + new/updated `reports/home-match-revival/*` and/or test files) needs to land back on the integration lane (worktree `/home/shan/projects/homematch-v2`, branch `autonomy/6h-business-hardening`) without two workers fighting over the same checkout, without losing in-flight reports, and without silently dropping work that already landed via a sibling lane.

This checklist is the safe pre-flight for that recovery. It is intentionally docs-only: the actual cherry-pick / merge step is performed by the integration owner in the integration worktree, not by the worker that produced the commit and not by this worker.

## Topology assumptions

- Integration worktree: `/home/shan/projects/homematch-v2`, branch `autonomy/6h-business-hardening`.
- Worker worktrees: `/home/shan/projects/homematch-v2.claude-workers/<slug>/`, each on its own `autonomy/...` branch, sharing the same `.git` directory through `git worktree`.
- One branch is checked out in at most one worktree at a time (git enforces this). Recovery must therefore never try to `checkout` the worker's branch inside the integration worktree, and must never try to `checkout autonomy/6h-business-hardening` inside a worker worktree.
- Worker commits are typically a single `docs:` or `test:` commit, narrowly scoped, with no dependency edits or schema changes (per the worker brief contract).

## Pre-flight checklist (run from the integration worktree)

Run each step from `/home/shan/projects/homematch-v2`. None of these mutate the integration branch or the worker branch.

1. [ ] Confirm you are in the integration worktree and on the integration branch:
   - `pwd` returns `/home/shan/projects/homematch-v2`
   - `git rev-parse --show-toplevel` returns the same path
   - `git branch --show-current` returns `autonomy/6h-business-hardening`
2. [ ] Confirm the integration tree is clean: `git status --short` is empty. If not, stop and resolve in-flight changes first; do not stash worker-recovery work on top of unrelated edits.
3. [ ] Confirm the worker branch exists locally: `git rev-parse --verify autonomy/hm-d{NN}-<slug>`. If only the worktree exists but the branch is missing in the integration repo's branch list, the worker may have used a detached HEAD or a non-`autonomy/` name; treat that as a blocker and record it in the worker log instead of guessing.
4. [ ] Identify which worktree currently owns the worker branch: `git worktree list`. The worker branch's worktree path must be the worker's own slug directory, not the integration worktree. If the worker worktree has been deleted but the branch still exists, you may proceed — `git cherry` and read-only diffing do not require an active worktree for the branch.
5. [ ] Diff scope sanity (read-only):
   - `git log --oneline autonomy/6h-business-hardening..autonomy/hm-d{NN}-<slug>` — should show the bounded set of new commits (typically 1).
   - `git diff --stat autonomy/6h-business-hardening...autonomy/hm-d{NN}-<slug>` — confirms files touched are inside expected directories (usually only `reports/home-match-revival/`, `__tests__/`, and/or narrowly named `src/` files declared in the worker brief).
6. [ ] Confirm the worker's commit already passes the docs-only verification gate (see "Docs-only verification" below) before you ever stage anything.

## `git cherry` interpretation

`git cherry [-v] <upstream> <head>` answers a single question: **which commits on `<head>` are not yet equivalent to anything on `<upstream>`?**

For worker-to-integration recovery:
- `<upstream>` = `autonomy/6h-business-hardening` (the integration branch you want to land into).
- `<head>` = `autonomy/hm-d{NN}-<slug>` (the worker branch).

Run from the integration worktree:

```sh
git cherry -v autonomy/6h-business-hardening autonomy/hm-d{NN}-<slug>
```

Read the output one line at a time:

- `+ <sha> <subject>` — the commit on the worker branch has **no equivalent** on integration. This is what you will recover. Confirm subject and sha match the worker's brief and the worker log entry.
- `- <sha> <subject>` — the commit's diff is **already present** on integration (e.g., an earlier sibling lane already landed equivalent text, or the worker re-derived a doc that integration already merged via another path). Do **not** cherry-pick. Recording the `-` in the recovery log is enough; the work is preserved on integration through the equivalent commit.
- Empty output — nothing on the worker branch is novel relative to integration. Either the worker rebased/cleaned up to nothing, or sibling lanes already covered the work. Treat as "no recovery action" and log accordingly.
- Multiple `+` lines for a worker that was supposed to produce exactly one commit — the worker over-scoped or accidentally piggy-backed prior work. Stop and reconcile against the worker brief before any cherry-pick. Do not blanket-pick.

`git cherry` compares patches modulo whitespace and line numbers, so it will correctly mark a sibling lane's docs commit as equivalent even if integration applied it under a slightly different sha. Trust the `-` marker; verify with `git diff` only when the file paths overlap with another worker's known scope.

When you are reading multi-commit ranges, prefer `git log --oneline --left-right --cherry-mark autonomy/6h-business-hardening...autonomy/hm-d{NN}-<slug>` for a symmetric view: `=` means equivalent, `>` means only on the worker side, `<` means only on integration.

## Same-worktree collision avoidance

The collisions to prevent are:
- Two workers checking out the same branch in different worktrees (git refuses this, but a confused operator can still try).
- A worker recovering its own commit by `cd`-ing into the integration worktree and running `git cherry-pick` there while the integration worktree is dirty or on a different branch.
- Two recovery attempts running concurrently against the integration worktree from different shells.
- A worker writing to `reports/home-match-revival/` in its own worktree while a sibling lane is writing to the same path in another worktree, then both landing later — silent merge surprise.

Rules:
1. [ ] Recovery happens **only in the integration worktree**, not in the worker worktree.
2. [ ] The worker worktree is treated as read-only during recovery. Do not run `git pull`, `git rebase`, `git fetch --prune`, or any branch-creating command inside the worker worktree while recovery is in flight.
3. [ ] Never `git checkout autonomy/6h-business-hardening` inside a worker worktree. The worker's branch must remain checked out in its own worktree until it is confirmed retired.
4. [ ] Only one recovery flow may be in progress in the integration worktree at a time. If `git status` shows in-flight cherry-pick state (`CHERRY_PICK_HEAD` present), finish or abort it before starting another.
5. [ ] If two workers wrote to the same `reports/home-match-revival/<file>.md`, recover the older `+` first, then re-run `git cherry` for the second worker before touching it — its `+`/`-` may have flipped, or it may now produce a textual conflict that requires the worker brief to be re-examined rather than auto-resolved.
6. [ ] After successful recovery, the worker worktree may be retired by the integration owner via `git worktree remove <path>` followed by `git branch -d autonomy/hm-d{NN}-<slug>` (only if `git cherry` shows zero `+` lines remaining). Do not delete the worker branch while it still has unrecovered `+` commits.

## Docs-only verification (per worker commit)

For docs-only worker commits (markdown/report text, no code, no tests, no schema, no config), the verification gate is intentionally minimal — broad test runs are out of scope and waste resource budget. From the integration worktree, before staging anything:

1. [ ] `git diff --stat autonomy/6h-business-hardening...autonomy/hm-d{NN}-<slug>` shows only files under `reports/home-match-revival/` (and possibly `docs/`). If any `src/`, `supabase/`, `package.json`, `pnpm-lock.yaml`, `next.config.*`, `__tests__/`, or `scripts/` paths appear, this is **not** a docs-only commit; escalate to the integration owner and stop.
2. [ ] `git diff --check autonomy/6h-business-hardening...autonomy/hm-d{NN}-<slug>` is silent (no whitespace errors, no conflict markers).
3. [ ] Visually skim the diff for: a single dated filename (`*-YYYY-MM-DD.md`), correct frontmatter/heading style consistent with sibling reports, no embedded secrets, no real user data, no production URLs that should be templated, no paid API responses pasted verbatim.
4. [ ] Confirm crosslinks: every `reports/home-match-revival/<other>.md` referenced by the new file already exists on integration (`git ls-tree -r --name-only autonomy/6h-business-hardening reports/home-match-revival/ | grep <basename>`), or is itself part of the same recovery wave.
5. [ ] Confirm the new file is referenced from at least one canonical index it claims to extend (typically `p0-p1-blocker-evidence-index-*.md`, `phase0-phase1-closure-matrix.md`, `p1-decision-needed-register-*.md`). If not, recovery may proceed but the indexer worker should be queued next so the artifact does not become orphaned.
6. [ ] No `pnpm test`, `pnpm run check`, `pnpm run build`, or Docker/Supabase commands needed for a verified docs-only commit. If those are required, the commit was misclassified — re-run this checklist as a code-change recovery instead.

For mixed commits (docs + code/tests), this checklist does **not** authorize the additional verification — escalate to the integration owner; this checklist's gate is docs-only.

## After recovery (handoff, not action for this checklist)

The actual `git cherry-pick -x <sha>` (or `git merge --ff-only` for trivially fast-forwardable cases) is performed by the integration owner in the integration worktree, not by this checklist and not by the worker. After it lands:
- Re-run `git cherry -v autonomy/6h-business-hardening autonomy/hm-d{NN}-<slug>` and confirm the `+` line is now `-`.
- Update the worker log entry to reference the new integration sha.
- If any sibling lane's `git cherry` output flipped from `+` to `-` as a side effect of this landing, record that in their respective worker logs as well.

## What this checklist does NOT do

- Does not perform any cherry-pick, merge, push, branch creation, or branch deletion.
- Does not advance Phase 0/1 closure; recovery only lands artifacts that already exist on a worker branch.
- Does not authorize broad test runs, Docker resets, Supabase mutations, paid API calls, browser swarms, dashboard mutations, or secret handling.
- Does not replace the integration owner's judgment on whether a given worker's output should land at all.
