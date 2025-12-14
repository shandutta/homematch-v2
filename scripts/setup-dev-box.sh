#!/usr/bin/env bash

set -euo pipefail

PNPM_VERSION="10.23.0"
NODE_MIN_MAJOR=24
TARGET_NODE_VERSION="${TARGET_NODE_VERSION:-24}"
SUPABASE_VERSION="2.58.5"
INSTALL_OS_DEPS=false
INSTALL_PLAYWRIGHT=true
INSTALL_SUPABASE=true
INSTALL_DOCKER=false
INSTALL_CADDY=false
CONFIGURE_CADDY=false
SETUP_CRON_AUTOCOMMIT=false
CADDY_DOMAIN="${CADDY_DOMAIN:-dev.homematch.pro}"
CADDY_EMAIL="${CADDY_EMAIL:-}"
OPENROUTER_KEY_FILE="${OPENROUTER_KEY_FILE:-$HOME/.config/openrouter.key}"

usage() {
  cat <<'EOF'
Usage: scripts/setup-dev-box.sh [options]

Environments:
  - WSL2: systemd services (Docker, Caddy) are skipped automatically; run with --install-os-deps and desired flags, but skip Docker/Caddy.
  - Linux VPS (systemd): you can enable --install-docker, --install-caddy, and --configure-caddy (requires --caddy-domain/--caddy-email).
  - macOS: no systemd; Docker/Caddy installs are best done manually; script covers Node/pnpm/Supabase/Playwright/env/hooks/cron.

Options:
  --install-os-deps      Attempt to install missing tools via apt/brew/pacman/yum
  --install-docker       Attempt to install Docker + compose plugin (apt/brew)
  --install-caddy        Attempt to install Caddy (apt/brew)
  --configure-caddy      Write /etc/caddy/Caddyfile (uses --caddy-domain/--caddy-email)
  --caddy-domain <host>  Domain for Caddy reverse proxy (default: $CADDY_DOMAIN)
  --caddy-email <email>  Email for ACME/Let’s Encrypt (required if configuring Caddy)
  --setup-cron-auto-commit  Install user cron for pnpm auto:commit (15m)
  --openrouter-key-file <path>  Path to OpenRouter key for cron (default: $OPENROUTER_KEY_FILE)
  --node-version <ver>   Target Node.js version (default: $TARGET_NODE_VERSION)
  --skip-playwright      Skip installing Playwright browsers
  --skip-supabase        Skip Supabase CLI check/installation
  -h, --help             Show this help
EOF
}

log() { echo "[setup] $1"; }
warn() { echo "[setup][warn] $1"; }
fail() { echo "[setup][error] $1" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-os-deps) INSTALL_OS_DEPS=true ;;
    --install-docker) INSTALL_DOCKER=true ;;
    --install-caddy) INSTALL_CADDY=true ;;
    --configure-caddy) CONFIGURE_CADDY=true ;;
    --caddy-domain)
      shift
      CADDY_DOMAIN="$1"
      ;;
    --caddy-email)
      shift
      CADDY_EMAIL="$1"
      ;;
    --setup-cron-auto-commit) SETUP_CRON_AUTOCOMMIT=true ;;
    --openrouter-key-file)
      shift
      OPENROUTER_KEY_FILE="$1"
      ;;
    --node-version)
      shift
      TARGET_NODE_VERSION="$1"
      ;;
    --skip-playwright) INSTALL_PLAYWRIGHT=false ;;
    --skip-supabase) INSTALL_SUPABASE=false ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
  shift
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OS_FAMILY="unknown"
PACKAGE_MANAGER="none"
IS_WSL=false
HAS_SYSTEMD=false

detect_os() {
  case "$(uname -s)" in
    Linux*) OS_FAMILY="linux" ;;
    Darwin*) OS_FAMILY="macos" ;;
    *) OS_FAMILY="unknown" ;;
  esac

  if command -v brew >/dev/null 2>&1; then
    PACKAGE_MANAGER="brew"
  elif command -v apt-get >/dev/null 2>&1; then
    PACKAGE_MANAGER="apt"
  elif command -v pacman >/dev/null 2>&1; then
    PACKAGE_MANAGER="pacman"
  elif command -v yum >/dev/null 2>&1; then
    PACKAGE_MANAGER="yum"
  fi
}

detect_environment() {
  detect_os
  if grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
  fi
  if [[ "$(ps -o comm= -p 1 2>/dev/null)" == "systemd" ]]; then
    HAS_SYSTEMD=true
  fi
  log "Detected OS: $OS_FAMILY (package manager: $PACKAGE_MANAGER, wsl=$IS_WSL, systemd=$HAS_SYSTEMD)"
}

run_sudo() {
  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

ensure_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return
  fi
  if ! $INSTALL_OS_DEPS; then
    warn "nvm not found; rerun with --install-os-deps to auto-install or install nvm manually."
    return
  fi
  log "Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
}

install_node_with_nvm() {
  ensure_nvm
  if command -v nvm >/dev/null 2>&1; then
    log "Installing Node.js ${TARGET_NODE_VERSION} via nvm..."
    nvm install "$TARGET_NODE_VERSION"
    nvm use "$TARGET_NODE_VERSION"
    return 0
  fi
  return 1
}

install_node_pkg() {
  case "$PACKAGE_MANAGER" in
    brew) brew install node ;;
    apt)
      run_sudo apt-get update
      run_sudo apt-get install -y ca-certificates curl gnupg
      curl -fsSL https://deb.nodesource.com/setup_24.x | run_sudo bash -
      run_sudo apt-get install -y nodejs
      ;;
    pacman) run_sudo pacman -Sy --noconfirm nodejs npm ;;
    yum) run_sudo yum install -y nodejs npm ;;
    *) fail "No supported package manager found to install Node.js" ;;
  esac
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    log "Node.js not found; installing target ${TARGET_NODE_VERSION}..."
    install_node_with_nvm || {
      if $INSTALL_OS_DEPS; then
        install_node_pkg
      else
        fail "Node.js is required. Install Node ${NODE_MIN_MAJOR}+ or rerun with --install-os-deps."
      fi
    }
  fi

  local version major
  version="$(node -v)"
  if [[ $version =~ ^v([0-9]+) ]]; then
    major="${BASH_REMATCH[1]}"
    if (( major < NODE_MIN_MAJOR )); then
      fail "Node.js $version detected. Please use Node ${NODE_MIN_MAJOR}+."
    fi
  fi
  # Align to target version if possible and not already matched.
  if [[ -n "${TARGET_NODE_VERSION}" && "$version" != "v${TARGET_NODE_VERSION}" ]]; then
    if install_node_with_nvm; then
      version="v${TARGET_NODE_VERSION}"
    else
      warn "Node.js is $version (target v${TARGET_NODE_VERSION}). Skipping change; install nvm or rerun with --install-os-deps to align."
    fi
  fi
  log "Node.js $(node -v) ready."
}

install_pnpm() {
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare "pnpm@${PNPM_VERSION}" --activate
    return
  fi

  if $INSTALL_OS_DEPS && command -v npm >/dev/null 2>&1; then
    log "Corepack missing; installing pnpm globally."
    run_sudo npm install -g "pnpm@${PNPM_VERSION}"
  elif command -v pnpm >/dev/null 2>&1; then
    warn "Corepack missing; using existing pnpm at $(command -v pnpm)."
  else
    fail "pnpm is required. Install Node with corepack support or rerun with --install-os-deps."
  fi
}

ensure_pnpm() {
  install_pnpm
  if ! command -v pnpm >/dev/null 2>&1; then
    fail "pnpm is unavailable after installation attempt."
  fi
  log "pnpm $(pnpm --version) ready (target ${PNPM_VERSION})."
}

install_supabase_cli() {
  local os arch url tmp
  case "$OS_FAMILY" in
    macos) os="macos" ;;
    linux) os="linux" ;;
    *) fail "Unsupported OS for Supabase CLI install: $OS_FAMILY" ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="amd64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) fail "Unsupported architecture for Supabase CLI install: $(uname -m)" ;;
  esac

  url="https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_${SUPABASE_VERSION}_${os}_${arch}.tar.gz"
  tmp="$(mktemp)"
  log "Downloading Supabase CLI ${SUPABASE_VERSION} from ${url}..."
  if ! curl -fL "$url" -o "$tmp"; then
    rm -f "$tmp"
    fail "Failed to download Supabase CLI from ${url}"
  fi
  tar -xzf "$tmp" -C /tmp
  run_sudo mv /tmp/supabase /usr/local/bin/supabase
  run_sudo chmod +x /usr/local/bin/supabase
  rm -f "$tmp"
}

ensure_supabase_cli() {
  if ! $INSTALL_SUPABASE; then
    warn "Supabase CLI check skipped."
    return
  fi

  if command -v supabase >/dev/null 2>&1; then
    log "Supabase CLI $(supabase --version) ready."
    return
  fi

  if $INSTALL_OS_DEPS; then
    log "Supabase CLI not found; installing..."
    install_supabase_cli
  else
    warn "Supabase CLI not found. Install it manually or rerun with --install-os-deps."
  fi
}

install_docker() {
  case "$PACKAGE_MANAGER" in
    brew)
      brew install docker docker-compose
      ;;
    apt)
      run_sudo apt-get update
      run_sudo apt-get install -y ca-certificates curl gnupg lsb-release
      if ! command -v docker >/dev/null 2>&1; then
        log "Installing Docker Engine (apt)..."
        run_sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        run_sudo chmod a+r /etc/apt/keyrings/docker.gpg
        # shellcheck disable=SC2046
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | run_sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
        run_sudo apt-get update
        run_sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        run_sudo usermod -aG docker "${USER}"
      else
        log "Docker already installed; skipping."
      fi
      ;;
    pacman)
      run_sudo pacman -Sy --noconfirm docker docker-compose
      run_sudo usermod -aG docker "${USER}"
      ;;
    yum)
      run_sudo yum install -y docker docker-compose
      run_sudo usermod -aG docker "${USER}"
      ;;
    *)
      warn "Docker install not supported for package manager: $PACKAGE_MANAGER"
      ;;
  esac
}

ensure_docker() {
  if ! $INSTALL_DOCKER; then
    return
  fi
  if command -v docker >/dev/null 2>&1; then
    log "Docker $(docker --version | head -n1) present."
    return
  fi
  log "Installing Docker..."
  install_docker
}

install_caddy() {
  case "$PACKAGE_MANAGER" in
    brew) brew install caddy ;;
    apt)
      run_sudo apt-get update
      run_sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
      if ! [[ -f /etc/apt/trusted.gpg.d/caddy-fury.gpg ]]; then
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | run_sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/caddy-fury.gpg
      fi
      if ! [[ -f /etc/apt/sources.list.d/caddy-fury.list ]]; then
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | run_sudo tee /etc/apt/sources.list.d/caddy-fury.list >/dev/null
      fi
      run_sudo apt-get update
      run_sudo apt-get install -y caddy
      ;;
    pacman) run_sudo pacman -Sy --noconfirm caddy ;;
    yum) run_sudo yum install -y caddy || warn "Caddy install on yum may require manual steps." ;;
    *)
      warn "Caddy install not supported for package manager: $PACKAGE_MANAGER"
      ;;
  esac
}

ensure_caddy() {
  if ! $INSTALL_CADDY; then
    return
  fi
  if command -v caddy >/dev/null 2>&1; then
    log "Caddy $(caddy version 2>/dev/null | head -n1 || true) present."
    return
  fi
  log "Installing Caddy..."
  install_caddy
}

configure_caddyfile() {
  if ! $CONFIGURE_CADDY; then
    return
  fi
  if [[ -z "$CADDY_DOMAIN" ]]; then
    fail "Caddy domain not provided. Use --caddy-domain."
  fi
  if [[ -z "$CADDY_EMAIL" ]]; then
    fail "Caddy email not provided. Use --caddy-email for ACME."
  fi

  log "Writing /etc/caddy/Caddyfile for $CADDY_DOMAIN..."
  run_sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
{
  email $CADDY_EMAIL
}

$CADDY_DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000 {
    header_up Host {http.request.host}
    header_up X-Real-IP {http.request.remote}
    header_up X-Forwarded-For {http.request.remote}
    header_up X-Forwarded-Host {http.request.host}
    header_up X-Forwarded-Proto {http.request.scheme}
  }
}
EOF
  run_sudo systemctl enable --now caddy
  run_sudo systemctl reload caddy || true
}

ensure_log_dir() {
  mkdir -p "$HOME/.logs"
}

ensure_cron_line() {
  local line="$1"
  local tmp
  tmp="$(mktemp)"
  (crontab -l 2>/dev/null || true) >"$tmp"
  if grep -F -q "$line" "$tmp"; then
    rm -f "$tmp"
    return
  fi
  echo "$line" >>"$tmp"
  crontab "$tmp"
  rm -f "$tmp"
}

configure_cron_auto_commit() {
  if ! $SETUP_CRON_AUTOCOMMIT; then
    return
  fi

  local node_bin pnpm_bin cron_line env_local key_env key_source
  env_local="$ROOT_DIR/.env.local"
  key_env=""
  key_source=""

  if [[ -f "$env_local" ]] && grep -Eq '^OPENROUTER_API_KEY=' "$env_local"; then
    key_source="$env_local"
    # No need to inline the key; dotenv in auto-commit will load it.
  elif [[ -f "$OPENROUTER_KEY_FILE" ]]; then
    key_source="$OPENROUTER_KEY_FILE"
    key_env="OPENROUTER_API_KEY=$(cat "$OPENROUTER_KEY_FILE")"
  else
    warn "OpenRouter API key not found in $env_local or $OPENROUTER_KEY_FILE; skipping auto-commit cron."
    return
  fi

  node_bin="$(command -v node || true)"
  pnpm_bin="$(command -v pnpm || true)"
  if [[ -z "$node_bin" || -z "$pnpm_bin" ]]; then
    warn "Node or pnpm not found; skipping auto-commit cron."
    return
  fi
  ensure_log_dir

  cron_line="*/15 * * * * cd $ROOT_DIR && PATH=$(dirname "$node_bin"):/usr/bin:/bin COREPACK_HOME=$ROOT_DIR/.corepack-cache ${key_env:+$key_env }$pnpm_bin auto:commit >> $HOME/auto-commit.log 2>&1"
  ensure_cron_line "$cron_line"
  log "Installed auto-commit cron (15m) using OpenRouter key from ${key_source}."
}

copy_env_file() {
  local source_file="$1"
  local target_file="$2"

  if [[ -f "$target_file" ]]; then
    log "Keeping existing $target_file"
  elif [[ -f "$source_file" ]]; then
    cp "$source_file" "$target_file"
    log "Created $target_file from $source_file (update with your secrets)."
  else
    warn "$source_file not found; create $target_file manually."
  fi
}

install_dependencies() {
  log "Installing project dependencies..."
  pnpm install --frozen-lockfile
}

setup_git_hooks() {
  if [[ -f package.json ]]; then
    log "Configuring git hooks via simple-git-hooks..."
    pnpm run prepare
  fi
}

install_playwright_browsers() {
  if ! $INSTALL_PLAYWRIGHT; then
    warn "Playwright browser install skipped."
    return
  fi

  if command -v pnpm >/dev/null 2>&1; then
    if [[ "$OS_FAMILY" == "linux" && $INSTALL_OS_DEPS == true ]]; then
      pnpm exec playwright install --with-deps
    else
      pnpm exec playwright install
    fi
    log "Playwright browsers installed."
  else
    warn "pnpm not available for Playwright install."
  fi
}

detect_os
detect_environment

# Auto-skip systemd services on WSL
if $IS_WSL; then
  if $INSTALL_DOCKER; then
    warn "WSL detected: skipping Docker install (systemd not available)."
    INSTALL_DOCKER=false
  fi
  if $INSTALL_CADDY || $CONFIGURE_CADDY; then
    warn "WSL detected: skipping Caddy install/config (systemd not available)."
    INSTALL_CADDY=false
    CONFIGURE_CADDY=false
  fi
fi

ensure_node
ensure_pnpm
ensure_supabase_cli
ensure_docker
ensure_caddy
configure_caddyfile

copy_env_file ".env.example" ".env.local"
copy_env_file ".env.example" ".env.test.local"

install_dependencies
setup_git_hooks
install_playwright_browsers
configure_cron_auto_commit

log "Setup complete. Next steps:"
echo "1) Fill in secrets in .env.local (and .env.test.local if you run tests)."
echo "2) Start local Supabase (optional): pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime"
echo "3) Run the dev server: pnpm dev"
