#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCAN_HISTORY=false

usage() {
  cat <<'USAGE'
Usage: scripts/secrets-scan.sh [--scan-history]

Options:
  --scan-history    Scan full git history (if supported)
  -h, --help        Show this help

Environment:
  SECRETS_SCAN_HISTORY=1  Enable history scan
USAGE
}

log() {
  echo "[$SCRIPT_NAME] $*"
}

warn() {
  echo "[$SCRIPT_NAME] WARNING: $*" >&2
}

die() {
  echo "[$SCRIPT_NAME] ERROR: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scan-history)
      SCAN_HISTORY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
  shift
done

if [[ "${SECRETS_SCAN_HISTORY:-}" == "1" || "${SECRETS_SCAN_HISTORY:-}" == "true" ]]; then
  SCAN_HISTORY=true
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "Run this script inside a git repository."
fi

if ! git secrets --version >/dev/null 2>&1; then
  die "git-secrets is not available. Run scripts/setup-git-secrets.sh first."
fi

log "Scanning working tree..."
git secrets --scan --untracked

if $SCAN_HISTORY; then
  log "Scanning git history..."
  if git secrets --help 2>&1 | grep -q -- '--scan-history'; then
    git secrets --scan-history
  else
    warn "git-secrets does not support --scan-history in this version; skipping history scan."
  fi
fi
