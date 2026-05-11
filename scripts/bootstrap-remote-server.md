# Shan Vibecoding Dev Box (Hetzner)

This is a small Ubuntu server on Hetzner Cloud used as a remote dev environment for vibecoding from my Mac via VS Code + 1Password SSH agent.

---

## How to connect

From my Mac:

1. 1Password is configured as the SSH agent, with the Hetzner SSH key loaded.
2. `~/.ssh/config` contains:

   Host hetzner-dev  
       HostName 77.42.27.28  
       User shan  
       IdentityAgent ~/Library/Group\ Containers/2BUA8C4S2C.com.1password/t/agent.sock  

3. To connect:

   ssh hetzner-dev  

4. To become root when needed:

   sudo -i  

Root SSH logins and password logins are disabled; only key-based SSH as user `shan` is allowed.

---

## Where things live

Home directory:

- User: `shan`
- Home: `/home/shan`

Projects:

- Main project: `/home/shan/homematch-v2`
- VS Code Remote-SSH opens: `/home/shan/homematch-v2` as the workspace

Typical commands from inside `homematch-v2`:

- Install deps: `pnpm install`
- Run dev server or scripts: `pnpm dev` (or other `pnpm` scripts defined in `package.json`)

---

## Node / pnpm bootstrap script

I used a bootstrap script to set up Node via `nvm`, set Node 24 as default, and enable corepack (for pnpm).

The script is saved at:

- `/home/shan/bootstrap-node.sh`

Script contents:

```bash
set -euo pipefail

# 1) Install nvm if not present
if [ ! -d "$HOME/.nvm" ]; then
  echo "[bootstrap] Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
else
  echo "[bootstrap] nvm already installed, skipping."
fi

# 2) Load nvm into this shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 3) Install Node (LTS-ish) and set default
NODE_VERSION=24

if ! nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
  echo "[bootstrap] Installing Node $NODE_VERSION..."
  nvm install "$NODE_VERSION"
fi

echo "[bootstrap] Setting default Node to $NODE_VERSION..."
nvm alias default "$NODE_VERSION"
nvm use default

# 4) Enable corepack (gives pnpm, yarn, etc.)
echo "[bootstrap] Enabling corepack..."
corepack enable

# 5) Make sure new shells load nvm automatically
if ! grep -q 'NVM_DIR="$HOME/.nvm"' "$HOME/.bashrc"; then
  echo "[bootstrap] Updating ~/.bashrc..."
  cat << 'RC' >> "$HOME/.bashrc"

# nvm + Node setup
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
RC
else
  echo "[bootstrap] ~/.bashrc already has nvm config."
fi

echo "[bootstrap] Done. Open a new shell or 'source ~/.bashrc' to pick up changes."
