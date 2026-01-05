# Auto-commit (OpenRouter)

The repo includes `scripts/auto-commit.js` which stages local changes, runs the pre-commit checks (with optional Codex auto-fix), asks OpenRouter for a short Conventional Commit title, commits, and optionally pushes.

## Requirements

- Node.js 18+ (uses the built-in `fetch` API)
- An OpenRouter API key

## Environment Variables

| Variable                          | Required | Description                                                 |
| --------------------------------- | -------- | ----------------------------------------------------------- |
| `OPENROUTER_API_KEY`              | yes      | OpenRouter API key (preferred source)                       |
| `OPENROUTER_KEY_FILE`             | no       | Fallback key file path (default `~/.config/openrouter.key`) |
| `AUTO_COMMIT_MODEL`               | no       | Override model (default `google/gemini-2.0-flash-exp:free`) |
| `AUTO_COMMIT_FALLBACK_MODELS`     | no       | Comma-separated fallback models                             |
| `AUTO_COMMIT_PUSH`                | no       | Set to `false` to skip `git push`                           |
| `AUTO_COMMIT_MAX_TOKENS`          | no       | Max tokens for the commit title (default 80)                |
| `AUTO_COMMIT_RETRY_ATTEMPTS`      | no       | Retry count for OpenRouter calls (default 2)                |
| `AUTO_COMMIT_RETRY_BASE_DELAY_MS` | no       | Base delay for retries (default 1200ms)                     |
| `OPENROUTER_REFERER`              | no       | Optional Referer header (OpenRouter recommendation)         |
| `OPENROUTER_TITLE`                | no       | Optional Title header (OpenRouter recommendation)           |

## Usage

```bash
OPENROUTER_API_KEY=sk-or-v1-... pnpm auto:commit
```

If `OPENROUTER_API_KEY` is not set, the script falls back to `OPENROUTER_KEY_FILE`.

## Cron Example

```cron
*/15 * * * * cd /home/shan/homematch-v2 && OPENROUTER_API_KEY=sk-or-v1-... pnpm auto:commit >> /home/shan/homematch-v2/.logs/auto-commit.log 2>&1
```

Tip: start with `AUTO_COMMIT_PUSH=false` until you are confident in the flow.
