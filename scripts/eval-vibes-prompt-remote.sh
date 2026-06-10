#!/usr/bin/env bash
# Verify wrapper for autoresearch loop.
#
# Pushes the latest local commit on the current branch to devbox, then
# runs the eval there with prod env. Prints exactly one integer score
# on the LAST line of stdout for autoresearch to extract via `tail -1`.
#
# Failures (push, ssh, eval crash) print a fallback score of -99999 so
# the autoresearch loop discards the iteration instead of crashing.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)
SSH_KEY="${DEVBOX_SSH_KEY:-/c/Users/shand/.ssh/devbox_sync_ed25519}"
SSH_CMD="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes devbox"
MODEL="${EVAL_MODEL:-qwen/qwen3-vl-8b-instruct}"
IMAGE_CAP="${EVAL_IMAGE_CAP:-40}"

fail() {
  echo "[verify-wrapper] $1" >&2
  echo "-99999"
  exit 0
}

LOCAL_SHA=$(git -C "$REPO_DIR" rev-parse HEAD)

# Push current branch to devbox (origin is ssh://devbox/...)
GIT_SSH_COMMAND="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes" \
  git -C "$REPO_DIR" push --force-with-lease origin "$BRANCH" 2>&1 >&2 \
  || fail "push failed"

# Ensure devbox working tree matches the just-pushed HEAD. If push to the
# checked-out branch updates the ref but not the working tree, force a
# hard reset to the local SHA we just pushed. The branch is private (this
# experiment branch only) so no concurrent edits will collide.
$SSH_CMD "cd /home/shan/projects/homematch-v2 && git checkout '$BRANCH' && git reset --hard '$LOCAL_SHA'" 2>&1 >&2 \
  || fail "devbox checkout/reset failed"

# Run the eval, capture stdout — last line is the score
SCORE=$($SSH_CMD "cd /home/shan/projects/homematch-v2 && set -a && source .env.vercel.production.local && set +a && pnpm exec tsx scripts/eval-vibes-prompt.ts --model=${MODEL} --imageCap=${IMAGE_CAP} 2>/dev/null | tail -1")

if [[ -z "$SCORE" ]]; then
  fail "empty score from eval"
fi

# Validate integer
if ! [[ "$SCORE" =~ ^-?[0-9]+$ ]]; then
  fail "non-integer score: $SCORE"
fi

echo "$SCORE"
