#!/usr/bin/env bash
# Start a local Next.js server, hit a given POST endpoint, then shut down.
# Usage: PORT=3000 ./scripts/run-local-api.sh "http://127.0.0.1:3000/api/admin/status-refresh?cron_secret=..."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"
ENDPOINT="${1:-}"
ENV_FILE="${ENV_FILE:-.env.local}"
MODE="${MODE:-prod}" # prod | dev
CURL_TIMEOUT="${CURL_TIMEOUT:-600}" # 10 minute timeout for long-running API calls
RETRIES="${RETRIES:-5}"
RETRY_DELAY="${RETRY_DELAY:-20}" # seconds between retries

timestamp() {
  date -u "+%Y-%m-%d %H:%M:%S UTC"
}

ensure_routes_manifest_defaults() {
  local manifest="$ROOT/.next/routes-manifest.json"
  if [[ ! -f "$manifest" ]]; then
    return
  fi

  node - "$manifest" <<'NODE'
const fs = require('fs')
const manifestPath = process.argv[2]
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
let changed = false

if (!Array.isArray(manifest.dataRoutes)) {
  manifest.dataRoutes = []
  changed = true
}
if (!Array.isArray(manifest.dynamicRoutes)) {
  manifest.dynamicRoutes = []
  changed = true
}

if (changed) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  console.log('[run-local-api] Patched routes-manifest.json with default route arrays')
}
NODE
}

if [[ -z "$ENDPOINT" ]]; then
  echo "Usage: PORT=3000 $0 \"http://127.0.0.1:3000/api/...\""
  echo "Optional: ENV_FILE=.env.prod MODE=dev CURL_TIMEOUT=600"
  exit 1
fi

echo "[run-local-api] [$(timestamp)] Starting..."

cd "$ROOT"

# Kill any existing process on the port to prevent conflicts
existing_pid=$(lsof -ti:"$PORT" 2>/dev/null || true)
if [[ -n "$existing_pid" ]]; then
  echo "[run-local-api] [$(timestamp)] Killing existing process on port $PORT (PID: $existing_pid)"
  kill "$existing_pid" 2>/dev/null || true
  sleep 2
fi

# Load environment (defaults to .env.local; override with ENV_FILE=/path/to/env)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "[run-local-api] Warning: env file '$ENV_FILE' not found; relying on current environment"
fi

if [[ "$MODE" == "dev" ]]; then
  echo "[run-local-api] [$(timestamp)] Starting dev server on port $PORT..."
  HOSTNAME=127.0.0.1 PORT="$PORT" node_modules/.bin/next dev --turbopack -H 0.0.0.0 -p "$PORT" \
    >/tmp/homematch-local-server.log 2>&1 &
else
  if [[ "${FORCE_REBUILD:-0}" == "1" || ! -f ".next/BUILD_ID" ]]; then
    echo "[run-local-api] [$(timestamp)] Building Next.js app..."
    pnpm build >/tmp/homematch-local-build.log 2>&1
  else
    echo "[run-local-api] [$(timestamp)] Reusing existing build in .next (set FORCE_REBUILD=1 to rebuild)..."
  fi
  ensure_routes_manifest_defaults
  echo "[run-local-api] [$(timestamp)] Starting prod server on port $PORT..."
  HOSTNAME=127.0.0.1 pnpm exec next start -H 0.0.0.0 -p "$PORT" \
    >/tmp/homematch-local-server.log 2>&1 &
fi

SERVER_PID=$!

cleanup() {
  if ps -p "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
  echo "[run-local-api] Server failed to start on port $PORT"
  exit 1
fi

attempt=1
curl_exit=1
http_status=""
response_file=""
while (( attempt <= RETRIES )); do
  echo "[run-local-api] [$(timestamp)] Hitting endpoint (attempt $attempt/$RETRIES): $ENDPOINT"
  response_file=$(mktemp)
  set +e
  http_status=$(curl -sS --fail-with-body -X POST --max-time "$CURL_TIMEOUT" -w '%{http_code}' -o "$response_file" "$ENDPOINT")
  curl_exit=$?
  set -e
  response_body="$(cat "$response_file")"
  rm -f "$response_file"

  if [[ $curl_exit -eq 0 && -z "${response_body//[[:space:]]/}" ]]; then
    echo "[run-local-api] Empty response body; treating as failure"
    curl_exit=52
  fi

  echo "$response_body"
  echo

  if [[ $curl_exit -eq 0 ]]; then
    break
  fi
  if (( attempt < RETRIES )); then
    echo "[run-local-api] curl failed (status: ${http_status:-unknown}, exit: $curl_exit); retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  fi
  ((attempt++))
done

if [[ $curl_exit -eq 0 ]]; then
  echo "[run-local-api] [$(timestamp)] Done (success)."
  echo "[run-local-api] EXIT_CODE=0 STATUS=success"
  exit 0
else
  echo "[run-local-api] [$(timestamp)] Done (curl exit code: $curl_exit)."
  echo "[run-local-api] EXIT_CODE=$curl_exit STATUS=error"
  exit "$curl_exit"
fi
