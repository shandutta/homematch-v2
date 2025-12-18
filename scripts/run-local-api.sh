#!/usr/bin/env bash
# Start a local Next.js server, hit a given POST endpoint, then shut down.
# Usage: PORT=3000 ./scripts/run-local-api.sh "http://127.0.0.1:3000/api/admin/status-refresh?cron_secret=..."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT_FROM_ENV="${PORT-}"
PORT="${PORT_FROM_ENV:-3000}"
ENDPOINT="${1:-}"
ENV_FILE="${ENV_FILE:-.env.local}"
MODE="${MODE:-prod}" # prod | dev
CURL_TIMEOUT="${CURL_TIMEOUT:-600}" # 10 minute timeout for long-running API calls
RETRIES="${RETRIES:-5}"
RETRY_DELAY="${RETRY_DELAY:-20}" # seconds between retries
SHOW_SERVER_LOG_ON_ERROR="${SHOW_SERVER_LOG_ON_ERROR:-1}"
NEXT_DIST_DIR_FROM_ENV="${NEXT_DIST_DIR-}"

timestamp() {
  date -u "+%Y-%m-%d %H:%M:%S UTC"
}

finish() {
  local exit_code="${1:-1}"
  local status="${2:-error}"
  echo "[run-local-api] EXIT_CODE=$exit_code STATUS=$status"
  exit "$exit_code"
}

redact_endpoint() {
  local endpoint="$1"
  # Redact cron secrets from logs (helps keep cron emails safe)
  echo "$endpoint" | sed -E 's/(cron_secret=)[^& ]+/\1***REDACTED***/g'
}

redact_response_body() {
  local body="$1"
  local secret="${2:-}"
  # Redact any cron_secret query params
  local redacted
  redacted="$(printf '%s' "$body" | sed -E 's/(cron_secret=)[^&\" ]+/\1***REDACTED***/g')"
  # Redact the extracted secret value if it somehow appears elsewhere
  if [[ -n "$secret" ]]; then
    redacted="${redacted//$secret/***REDACTED***}"
  fi
  printf '%s' "$redacted"
}

port_in_use() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

has_turbopack_runtime_reference() {
  local dist_dir="${1:-$NEXT_DIST_DIR}"
  local document_file="$ROOT/$dist_dir/server/pages/_document.js"
  if [[ ! -f "$document_file" ]]; then
    return 1
  fi
  grep -q '\[turbopack\]_runtime' "$document_file" 2>/dev/null
}

kill_port_listeners() {
  local port="$1"
  local pids=()

  mapfile -t pids < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if (( ${#pids[@]} == 0 )); then
    return 0
  fi

  echo "[run-local-api] [$(timestamp)] Killing existing listener(s) on port $port (PID(s): ${pids[*]})"
  kill "${pids[@]}" 2>/dev/null || true
  sleep 2

  mapfile -t pids < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if (( ${#pids[@]} == 0 )); then
    return 0
  fi

  echo "[run-local-api] [$(timestamp)] Force killing remaining listener(s) on port $port (PID(s): ${pids[*]})"
  kill -9 "${pids[@]}" 2>/dev/null || true
  sleep 1
}

get_free_port() {
  node - <<'NODE'
const net = require('net')
const server = net.createServer()
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address()
  server.close(() => process.stdout.write(String(port)))
})
NODE
}

rewrite_endpoint_port() {
  local endpoint="$1"
  local port="$2"
  node - "$endpoint" "$port" <<'NODE'
const endpoint = process.argv[2]
const port = process.argv[3]
const url = new URL(endpoint)
url.port = String(port)
process.stdout.write(url.toString())
NODE
}

ensure_routes_manifest_defaults() {
  local dist_dir="${NEXT_DIST_DIR:-.next}"
  local manifest="$ROOT/$dist_dir/routes-manifest.json"
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
  finish 1 error
fi

echo "[run-local-api] [$(timestamp)] Starting..."

cd "$ROOT"

# If the endpoint specifies a port and PORT wasn't explicitly set, follow it.
endpoint_port="$(node - "$ENDPOINT" <<'NODE'
try {
  const url = new URL(process.argv[2])
  process.stdout.write(url.port || '')
} catch {
  process.stdout.write('')
}
NODE
)"
if [[ -n "$endpoint_port" && -z "$PORT_FROM_ENV" ]]; then
  PORT="$endpoint_port"
fi

# Ensure we're not fooled by an existing process on the port
port_was_in_use=0
if port_in_use "$PORT"; then
  port_was_in_use=1
fi

if ! node scripts/kill-port.js "$PORT"; then
  echo "[run-local-api] [$(timestamp)] Failed to free port $PORT via scripts/kill-port.js"
  finish 1 error
fi

# If the port is still in use, fail loudly (cron should alert instead of silently changing ports).
if port_in_use "$PORT"; then
  echo "[run-local-api] [$(timestamp)] Failed to free port $PORT; refusing to start server on a different port."
  finish 1 error
fi

# Always keep the endpoint port in sync with the server port we start.
ENDPOINT="$(rewrite_endpoint_port "$ENDPOINT" "$PORT")"

# Move cron_secret out of the URL (to avoid leaking secrets in 404/500 HTML pages and logs)
CRON_SECRET_HEADER="$(node - "$ENDPOINT" <<'NODE'
const url = new URL(process.argv[2])
process.stdout.write(url.searchParams.get('cron_secret') || '')
NODE
)"
ENDPOINT="$(node - "$ENDPOINT" <<'NODE'
const url = new URL(process.argv[2])
url.searchParams.delete('cron_secret')
process.stdout.write(url.toString())
NODE
)"

CURL_HEADERS=()
if [[ -n "$CRON_SECRET_HEADER" ]]; then
  CURL_HEADERS+=(-H "x-cron-secret: $CRON_SECRET_HEADER")
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

# Use a dedicated dist directory so cron runs can't accidentally reuse a `.next`
# produced by `next dev --turbopack` (which can serve dev/HMR assets and 404 API routes).
NEXT_DIST_DIR="${NEXT_DIST_DIR_FROM_ENV:-.next-run-local-api}"
export NEXT_DIST_DIR

# Ensure we don't accidentally build or run in test mode.
unset NEXT_PUBLIC_TEST_MODE >/dev/null 2>&1 || true

SERVER_LOG="/tmp/homematch-local-server.log"
BUILD_LOG="/tmp/homematch-local-build.log"

if [[ "$MODE" == "dev" ]]; then
  echo "[run-local-api] [$(timestamp)] Starting dev server on port $PORT..."
  unset NEXT_PUBLIC_TEST_MODE >/dev/null 2>&1 || true
  NODE_ENV=development HOSTNAME=127.0.0.1 PORT="$PORT" node_modules/.bin/next dev --turbopack -H 0.0.0.0 -p "$PORT" \
    >"$SERVER_LOG" 2>&1 &
else
  dist_dir="${NEXT_DIST_DIR:-.next}"
  build_id_file="$dist_dir/BUILD_ID"
  should_rebuild=0

  if [[ "${FORCE_REBUILD:-0}" == "1" ]]; then
    should_rebuild=1
  fi
  # If we had to kill a running server, the existing `.next` output may be
  # from `next dev --turbopack` (or otherwise stale). Prefer a clean build.
  if [[ "$port_was_in_use" == "1" ]]; then
    should_rebuild=1
  fi
  if [[ ! -f "$build_id_file" ]]; then
    should_rebuild=1
  fi
  if has_turbopack_runtime_reference "$dist_dir"; then
    should_rebuild=1
  fi

  if [[ "$should_rebuild" == "1" ]]; then
    echo "[run-local-api] [$(timestamp)] Building Next.js app..."
    pnpm build >"$BUILD_LOG" 2>&1
  else
    echo "[run-local-api] [$(timestamp)] Reusing existing build in $dist_dir (set FORCE_REBUILD=1 to rebuild)..."
  fi
  ensure_routes_manifest_defaults
  echo "[run-local-api] [$(timestamp)] Starting prod server on port $PORT..."
  unset NEXT_PUBLIC_TEST_MODE >/dev/null 2>&1 || true
  NODE_ENV=production HOSTNAME=127.0.0.1 pnpm exec next start -H 0.0.0.0 -p "$PORT" \
    >"$SERVER_LOG" 2>&1 &
fi

SERVER_PID=$!

cleanup() {
  if ps -p "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Detect immediate startup failures (e.g., EADDRINUSE) before probing the port.
sleep 1
if ! ps -p "$SERVER_PID" >/dev/null 2>&1; then
  echo "[run-local-api] Server failed to start (PID $SERVER_PID exited)"
  echo "[run-local-api] Last server log lines:"
  tail -n 50 "$SERVER_LOG" 2>/dev/null || true
  finish 1 error
fi

# Wait for the server to be ready (health endpoint), not just the port.
for _ in $(seq 1 45); do
  if curl -sS --max-time 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  if ! ps -p "$SERVER_PID" >/dev/null 2>&1; then
    echo "[run-local-api] Server exited while waiting for readiness"
    echo "[run-local-api] Last server log lines:"
    tail -n 50 "$SERVER_LOG" 2>/dev/null || true
    finish 1 error
  fi
  sleep 1
done

if ! curl -sS --max-time 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "[run-local-api] Server failed to become ready on port $PORT"
  echo "[run-local-api] Last server log lines:"
  tail -n 50 "$SERVER_LOG" 2>/dev/null || true
  finish 1 error
fi

attempt=1
curl_exit=1
http_status=""
response_file=""
while (( attempt <= RETRIES )); do
  echo "[run-local-api] [$(timestamp)] Hitting endpoint (attempt $attempt/$RETRIES): $(redact_endpoint "$ENDPOINT")"
  response_file=$(mktemp)
  set +e
  http_status=$(curl -sS --fail-with-body "${CURL_HEADERS[@]}" -X POST --max-time "$CURL_TIMEOUT" -w '%{http_code}' -o "$response_file" "$ENDPOINT")
  curl_exit=$?
  set -e
  response_body="$(cat "$response_file")"
  rm -f "$response_file"

  if [[ $curl_exit -eq 0 && -z "${response_body//[[:space:]]/}" ]]; then
    echo "[run-local-api] Empty response body; treating as failure"
    curl_exit=52
  fi

  redact_response_body "$response_body" "$CRON_SECRET_HEADER"
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
  finish 0 success
else
  if [[ "$SHOW_SERVER_LOG_ON_ERROR" == "1" ]]; then
    echo "[run-local-api] Last server log lines:"
    tail -n 120 "$SERVER_LOG" 2>/dev/null || true
  fi
  echo "[run-local-api] [$(timestamp)] Done (curl exit code: $curl_exit)."
  finish "$curl_exit" error
fi
