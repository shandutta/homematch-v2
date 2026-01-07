#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCAN=false
SCAN_HISTORY=false
GLOBAL_TEMPLATE=false
TEMPLATE_DIR="${HOME}/.git-templates/git-secrets"
GIT_SECRETS_TMPDIR=""

usage() {
  cat <<'USAGE'
Usage: scripts/setup-git-secrets.sh [--scan] [--scan-history] [--global-template]

Options:
  --scan            Run a working tree scan after setup
  --scan-history    Run a history scan after setup (if supported)
  --global-template Install hooks into a global git template dir and set init.templateDir
  -h, --help        Show this help
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
    --scan)
      SCAN=true
      ;;
    --scan-history)
      SCAN_HISTORY=true
      ;;
    --global-template)
      GLOBAL_TEMPLATE=true
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

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "Run this script inside a git repository."
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

have_git_secrets() {
  if command -v git-secrets >/dev/null 2>&1; then
    return 0
  fi
  if git secrets --version >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

install_git_secrets_linux() {
  if ! command -v git >/dev/null 2>&1; then
    die "git is required to install git-secrets."
  fi
  if ! command -v make >/dev/null 2>&1; then
    die "make is required to install git-secrets."
  fi

  local tmpdir
  tmpdir="$(mktemp -d)"
  GIT_SECRETS_TMPDIR="$tmpdir"
  trap '[[ -n "${GIT_SECRETS_TMPDIR:-}" ]] && rm -rf "${GIT_SECRETS_TMPDIR}"' EXIT

  log "Installing git-secrets from source..."
  git clone --depth 1 https://github.com/awslabs/git-secrets.git "$tmpdir"

  if command -v sudo >/dev/null 2>&1; then
    if sudo make -C "$tmpdir" install; then
      return 0
    fi
    warn "sudo install failed; falling back to user-local install."
  fi

  local prefix
  prefix="${HOME}/.local"
  make -C "$tmpdir" install PREFIX="$prefix"

  if [[ ":${PATH}:" != *":${prefix}/bin:"* ]]; then
    warn "git-secrets installed to ${prefix}/bin but PATH does not include it."
    warn "Add this to your shell profile: export PATH=\"${prefix}/bin:\$PATH\""
  fi
}

install_git_secrets_darwin() {
  if command -v brew >/dev/null 2>&1; then
    log "Installing git-secrets via Homebrew..."
    brew install git-secrets
  else
    die "git-secrets not found and Homebrew is not available. Please install git-secrets manually."
  fi
}

ensure_git_secrets() {
  if have_git_secrets; then
    return 0
  fi

  case "$(uname -s)" in
    Darwin)
      install_git_secrets_darwin
      ;;
    Linux)
      install_git_secrets_linux
      ;;
    *)
      die "Unsupported OS: $(uname -s)"
      ;;
  esac

  if ! have_git_secrets; then
    die "git-secrets installation failed or git-secrets is not on PATH."
  fi
}

register_aws_patterns() {
  if git secrets --list 2>/dev/null | grep -E 'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}' >/dev/null 2>&1; then
    log "AWS patterns already registered."
    return 0
  fi

  log "Registering AWS patterns..."
  git secrets --register-aws
}

load_custom_patterns() {
  local patterns_file="${REPO_ROOT}/.git-secrets-patterns"
  if [[ ! -f "$patterns_file" ]]; then
    log "No .git-secrets-patterns file found; skipping custom patterns."
    return 0
  fi

  log "Loading custom patterns from .git-secrets-patterns"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    if git secrets --list 2>/dev/null | grep -F -- "$line" >/dev/null 2>&1; then
      continue
    fi

    git secrets --add "$line"
  done < "$patterns_file"
}

run_scan_history() {
  if git secrets --help 2>&1 | grep -q -- '--scan-history'; then
    git secrets --scan-history
  else
    warn "git-secrets does not support --scan-history in this version; skipping history scan."
  fi
}

ensure_git_secrets

install_repo_hooks() {
  if git secrets --install; then
    return 0
  fi

  local hooks_dir="${REPO_ROOT}/.git/hooks"
  local has_git_secrets=true
  local hook

  for hook in pre-commit commit-msg; do
    if [[ -f "${hooks_dir}/${hook}" ]]; then
      if ! grep -q "git secrets" "${hooks_dir}/${hook}"; then
        has_git_secrets=false
      fi
    else
      has_git_secrets=false
    fi
  done

  if $has_git_secrets; then
    log "git-secrets hooks already present."
    return 0
  fi

  warn "Existing hooks detected without git-secrets; backing up and forcing install."
  for hook in pre-commit commit-msg; do
    if [[ -f "${hooks_dir}/${hook}" ]]; then
      cp "${hooks_dir}/${hook}" "${hooks_dir}/${hook}.bak"
    fi
  done

  git secrets --install -f
}

log "Installing git-secrets hooks in this repo..."
install_repo_hooks

if $GLOBAL_TEMPLATE; then
  log "Installing git-secrets hooks into template dir ${TEMPLATE_DIR}"
  mkdir -p "$TEMPLATE_DIR"
  git secrets --install "$TEMPLATE_DIR"
  git config --global init.templateDir "$TEMPLATE_DIR"
fi

register_aws_patterns
load_custom_patterns

if $SCAN; then
  log "Scanning working tree..."
  git secrets --scan --untracked
fi

if $SCAN_HISTORY; then
  log "Scanning git history..."
  run_scan_history
fi

log "git-secrets setup complete."
