# Secrets Scanning (git-secrets)

This repo uses [awslabs/git-secrets](https://github.com/awslabs/git-secrets) to prevent committing secrets and to scan the repository in CI.

## One-line setup

Run once inside the repo:

```bash
./scripts/setup-git-secrets.sh --scan
```

This installs git-secrets (if needed), registers AWS patterns, installs hooks, loads custom patterns, and scans the working tree.

## Custom patterns

Add one regex per line in `.git-secrets-patterns` (comments and blank lines are ignored). Example:

```text
# SECRET_[A-Z]+
```

## Local scans

Working tree scan (tracked + untracked):

```bash
./scripts/secrets-scan.sh
```

History scan (if supported by your git-secrets version):

```bash
./scripts/secrets-scan.sh --scan-history
```

You can also enable history scans via env:

```bash
SECRETS_SCAN_HISTORY=1 ./scripts/secrets-scan.sh
```

Note: The scripts use `git secrets --scan --untracked` to avoid scanning `.git/` (recursive scans can falsely match the patterns stored in git config).

## CI enforcement

CI runs `git secrets --scan --untracked` on every push and pull request. This prevents bypassing hooks with `--no-verify`.

History scanning is enabled by default. To override it, set the repo variable `SECRETS_SCAN_HISTORY` to `1`/`true` (enable) or `0`/`false` (disable).
