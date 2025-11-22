#!/usr/bin/env bash
# Start a local Next.js server, hit a given POST endpoint, then shut down.
# Usage: PORT=3000 ./scripts/run-local-api.sh "http://127.0.0.1:3000/api/admin/status-refresh?cron_secret=..."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"
ENDPOINT="${1:-}"
ENV_FILE="${ENV_FILE:-.env.local}"
MODE="${MODE:-prod}" # prod | dev

if [[ -z "$ENDPOINT" ]]; then
  echo "Usage: PORT=3000 $0 \"http://127.0.0.1:3000/api/...\""
  echo "Optional: ENV_FILE=.env.prod MODE=dev"
  exit 1
fi

cd "$ROOT"

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
  echo "[run-local-api] Starting dev server on port $PORT..."
  HOSTNAME=127.0.0.1 PORT="$PORT" node_modules/.bin/next dev --turbopack -H 0.0.0.0 -p "$PORT" \
    >/tmp/homematch-local-server.log 2>&1 &
else
  if [[ "${FORCE_REBUILD:-0}" == "1" || ! -f ".next/BUILD_ID" ]]; then
    echo "[run-local-api] Building Next.js app..."
    pnpm build >/tmp/homematch-local-build.log 2>&1
  else
    echo "[run-local-api] Reusing existing build in .next (set FORCE_REBUILD=1 to rebuild)..."
  fi
  echo "[run-local-api] Starting prod server on port $PORT..."
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

echo "[run-local-api] Hitting endpoint: $ENDPOINT"
curl -sS -X POST "$ENDPOINT"

echo
echo "[run-local-api] Done."
