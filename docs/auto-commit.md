## Auto-commit Flow (OpenRouter)

This repository now contains a helper script that can automatically stage, summarize, and commit local changes with a short AI-generated Conventional Commit title. It can optionally push the commit, making it suitable for unattended cron jobs or background automation.

### Requirements

1. Node.js 18+ (for the built-in `fetch` API).
2. An [OpenRouter](https://openrouter.ai/) API key with access to `gpt-oss-20b` (or any other inexpensive model you prefer).

### Environment variables

| Variable             | Required | Description                                                  |
| -------------------- | -------- | ------------------------------------------------------------ |
| `OPENROUTER_API_KEY` | ✅       | API key used to call OpenRouter.                             |
| `AUTO_COMMIT_MODEL`  | ❌       | Override model name (defaults to `openai/gpt-oss-20b:free`). |
| `AUTO_COMMIT_PUSH`   | ❌       | Set to `false` to skip `git push` (default pushes).          |
| `OPENROUTER_REFERER` | ❌       | Optional Referer header recommended by OpenRouter.           |
| `OPENROUTER_TITLE`   | ❌       | Optional Title header recommended by OpenRouter.             |

### Usage

Run manually:

```bash
OPENROUTER_API_KEY=sk-or-v1-... pnpm auto:commit
```

Or drop the key into a local env file (ignored by git) and just run the script:

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_REFERER=https://your.domain
OPENROUTER_TITLE="Auto Commit Bot"

pnpm auto:commit
```

If there are no pending changes, the script exits quietly. Otherwise it:

1. Collects `git status`, `git diff --stat`, and the full diff.
2. Calls OpenRouter for a ≤65 character Conventional Commit title.
3. Runs `git add -A`, `git commit -m "<ai message>"`, and (unless disabled) `git push`.

### Cron example (every 5 minutes)

```cron
*/5 * * * * cd /home/shan/homematch-v2 && \
OPENROUTER_API_KEY=sk-or-v1-... \
OPENROUTER_REFERER=https://your.domain \
OPENROUTER_TITLE="Auto Commit Bot" \
pnpm auto:commit >> /home/shan/auto-commit.log 2>&1
```

Adjust the Referer/Title values to match your own site or GitHub profile as recommended by OpenRouter.

> **Tip:** Start with `AUTO_COMMIT_PUSH=false` until you are confident in the flow. You can also combine this script with git hooks or CI checks to improve safety.
