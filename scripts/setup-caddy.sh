#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-dev.homematch.pro}"
BACKEND_HOST="${2:-127.0.0.1}"
BACKEND_PORT="${3:-3000}"
ADMIN_EMAIL="${CADDY_ADMIN_EMAIL:-shan@homematch.pro}"

if [[ -z "${DOMAIN}" ]]; then
  echo "Usage: $0 <domain> [backend_host] [backend_port]"
  exit 1
fi

echo "[caddy] installing prerequisites..."
sudo apt-get update
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg

sudo install -d -m 0755 /etc/apt/keyrings

echo "[caddy] refreshing repository key..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
  sudo gpg --dearmor -o /etc/apt/keyrings/caddy-stable.gpg
sudo chmod go+r /etc/apt/keyrings/caddy-stable.gpg

echo "[caddy] adding repository source..."
sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null <<'EOF'
deb [signed-by=/etc/apt/keyrings/caddy-stable.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main
EOF

echo "[caddy] installing caddy..."
sudo apt-get update
sudo apt-get install -y caddy

echo "[caddy] writing /etc/caddy/Caddyfile for ${DOMAIN} -> ${BACKEND_HOST}:${BACKEND_PORT}..."
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
{
  email ${ADMIN_EMAIL}
}

${DOMAIN} {
  encode zstd gzip
  reverse_proxy ${BACKEND_HOST}:${BACKEND_PORT}
}
EOF

echo "[caddy] enabling and restarting service..."
sudo systemctl enable caddy
sudo systemctl restart caddy

echo "[caddy] done. verify with: curl -I https://${DOMAIN}"
