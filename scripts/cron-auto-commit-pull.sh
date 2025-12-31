#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ts() { date -u +"[%Y-%m-%dT%H:%M:%SZ]"; }
log() { echo "$(ts) [cron-pull] $*"; }

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$branch" != "main" ]]; then
  log "Skipping: on branch $branch"
  log "exit_code=0 status=success"
  exit 0
fi

if [[ -f .git/MERGE_HEAD ]] || [[ -d .git/rebase-apply ]] || [[ -d .git/rebase-merge ]]; then
  log "Skipping: merge/rebase in progress"
  log "exit_code=0 status=success"
  exit 0
fi

if git ls-files -u | grep -q .; then
  log "Skipping: unmerged files"
  log "exit_code=0 status=success"
  exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
  log "Skipping: working tree dirty"
  log "exit_code=0 status=success"
  exit 0
fi

if git pull --rebase --autostash origin main; then
  log "exit_code=0 status=success"
else
  log "exit_code=1 status=error"
  exit 1
fi
