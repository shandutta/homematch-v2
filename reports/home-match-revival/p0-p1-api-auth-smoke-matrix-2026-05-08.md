# P0/P1 API Auth Smoke Matrix

Generated: 2026-05-08T08:51:03Z
Task: `t_6191cbdf`
Repo: `/home/shan/projects/homematch-v2`

## Verdict

Implemented the bounded handler-level API auth smoke matrix as `__tests__/integration/api/auth-smoke-matrix.spec.ts`.

Execution is still blocked for closure-grade proof because this worker has no approved local/non-production bearer token in `API_AUTH_SMOKE_TOKEN` and no local app server is listening on `127.0.0.1:3000`. The checked-in smoke test intentionally refuses non-local targets unless `ALLOW_REMOTE_API_AUTH_SMOKE=1` is explicitly set for an approved non-production target.

## Bounded read-only protected route matrix

| Route                                               | Anonymous expected | Authenticated expected | Reason                                                                                           |
| --------------------------------------------------- | ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `/api/couples/activity?limit=1&offset=0`            | 401                | 200                    | Read-only household activity list; a seeded user with no activity should receive an empty array. |
| `/api/couples/mutual-likes?includeProperties=false` | 401                | 200                    | Read-only mutual-like list; `includeProperties=false` avoids extra property enrichment work.     |
| `/api/couples/stats`                                | 401                | 200 or 404             | Read-only household stats; 404 is acceptable for a seeded user without household stats.          |

## Explicit skips

| Route/family                    | Skip reason                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `/api/maps/geocode`             | Paid/external Maps route; skipped to avoid paid Google API calls.                      |
| `/api/maps/places/autocomplete` | Paid/external Places route; skipped to avoid paid Google API calls.                    |
| `/api/maps/script`              | External Maps script route; not part of handler-level auth proof.                      |
| `/api/maps/proxy-script`        | External Maps script proxy; not part of handler-level auth proof.                      |
| `/api/properties/vibes`         | AI/external-generation route; skipped to avoid paid LLM/API calls.                     |
| `/api/neighborhoods/vibes`      | AI/external-generation route; skipped to avoid paid LLM/API calls.                     |
| `/api/admin/*`                  | Admin/service-secret route family; requires separate admin-secret authorization proof. |
| `/api/interactions`             | Mutating interaction route; not safe for read-only smoke matrix.                       |
| `/api/interactions/reset`       | Destructive reset route; not safe for read-only smoke matrix.                          |
| `/api/users/avatar`             | Avatar upload/delete route; mutating and storage-backed.                               |
| `/api/couples/notify`           | Notification route; may trigger side effects.                                          |

## Commands run

1. Documentation/static smoke shape only:

```bash
pnpm exec vitest run __tests__/integration/api/auth-smoke-matrix.spec.ts
```

Result: passed 2 assertions, skipped the live auth probe because `API_AUTH_SMOKE_RUN` was not set.

2. Closure-grade live probe gate check:

```bash
API_AUTH_SMOKE_RUN=1 TEST_API_URL=http://127.0.0.1:3000 pnpm exec vitest run __tests__/integration/api/auth-smoke-matrix.spec.ts
```

Result: failed before network calls with the intended prerequisite error: `API_AUTH_SMOKE_TOKEN is required. Use only an approved local seeded/non-production test-user bearer token.`

3. Local server preflight:

```bash
ss -ltnp | awk 'NR==1 || /:3000|:54200|:54321|:54322/'
```

Result: no local app/Supabase listener was present on the checked ports.

## Closure command once prerequisites exist

Use this only after a local seeded test user/session exists and an approved non-production bearer token is available:

```bash
API_AUTH_SMOKE_RUN=1 \
API_AUTH_SMOKE_TOKEN='<approved local/non-production test-user access token>' \
TEST_API_URL=http://127.0.0.1:3000 \
pnpm exec vitest run __tests__/integration/api/auth-smoke-matrix.spec.ts
```

Do not run this against production. For an explicitly approved remote-test environment, set `ALLOW_REMOTE_API_AUTH_SMOKE=1` and point `TEST_API_URL` at that non-production target.
