# CI and Integration Testing

This document describes how CI runs tests and how to reproduce CI failures locally.

## CI Pipeline Overview

The main pipeline lives in `.github/workflows/ci.yml` and runs on pushes to `main`/`develop` and on pull requests:

1. Lint + type-check
2. Unit tests (Jest)
3. Integration tests (Vitest + local Supabase)

Integration tests only run for non-fork PRs to avoid exposing secrets.

## Local Reproduction

```bash
pnpm lint
pnpm type-check
pnpm test:unit
pnpm test:integration
```

If you need the CI setup script locally:

```bash
pnpm ci:setup
```

## Supabase in CI

The integration job:

- Installs the Supabase CLI
- Starts a local Supabase stack
- Exports env values from `supabase status -o env`
- Runs `pnpm test:integration`

## CI Environment Variables

CI reads secrets for optional integrations. Common examples:

- `GOOGLE_MAPS_SERVER_API_KEY`
- `RAPIDAPI_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_ALLOWED_DEV_ORIGINS`
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_BASE_URL`

Check `.github/workflows/ci.yml` for the current list.

## Failure Analysis

When the main pipeline fails, `.github/workflows/ai-repair.yml` can post an LLM-based summary (if `OPENROUTER_API_KEY` is configured). This is a helper and does not change the required fix path.
