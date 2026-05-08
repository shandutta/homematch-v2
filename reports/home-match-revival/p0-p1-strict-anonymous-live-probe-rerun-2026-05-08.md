# P0/P1 strict anonymous protected-route live probe rerun — dashboard/couples

Generated: 2026-05-08T16:13:40Z

## Scope

Strict Phase 0/1 live-evidence rerun for only:

- `/dashboard`
- `/couples`

Goal: confirm anonymous no-cookie HTTP requests return an HTTP 302/303/307/308 redirect to `/login` with `redirectTo` preserving the original route.

No browser swarm, full build, install, paid/external API probe, dashboard, real user data, credential print, or Phase 2+ work was run.

## Required preflight

```text
pwd
/home/shan/projects/homematch-v2

git rev-parse --show-toplevel
/home/shan/projects/homematch-v2

git branch --show-current
autonomy/6h-business-hardening

git status --short
<clean>

free -m
Mem: total 15613, used 1774, free 9522, shared 5, buff/cache 4662, available 13839
Swap: total 2047, used 0, free 2047

uptime
16:09:39 up 50 min, 0 user, load average: 0.33, 0.27, 0.41
```

## Local app/server selection

- `http://127.0.0.1:3000/api/health` responded `200`, but the body was Hermes Workspace HTML, not HomeMatch, so port 3000 was not used.
- `http://127.0.0.1:3100/api/health` did not respond.
- Port 3101 was free, so a bounded local HomeMatch dev server was started with:

```text
SKIP_SUPABASE_GUARD=true NEXT_TELEMETRY_DISABLED=1 pnpm exec next dev --hostname 127.0.0.1 --port 3101
```

Readiness check:

```text
curl --max-time 10 --max-redirs 0 http://127.0.0.1:3101/api/health
```

Result: HTTP 200 JSON health response for HomeMatch V2; database reported connected. No secrets were printed.

The local dev server was stopped after the probe.

## Probe commands

The probe used anonymous `curl` requests without cookies and with redirects disabled:

```text
curl -sS -D /tmp/hm-strict-anon-dashboard.headers -o /tmp/hm-strict-anon-dashboard.body --max-time 30 --max-redirs 0 http://127.0.0.1:3101/dashboard
curl -sS -D /tmp/hm-strict-anon-couples.headers -o /tmp/hm-strict-anon-couples.body --max-time 30 --max-redirs 0 http://127.0.0.1:3101/couples
```

## Results

| Route        | Expected closure-grade result                            | Observed HTTP result                    | Redirect evidence in body                                                                                                                                                                  | Verdict                                        |
| ------------ | -------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `/dashboard` | HTTP 302/303/307/308 to `/login?redirectTo=%2Fdashboard` | `HTTP/1.1 200 OK`, no `Location` header | RSC body contained `NEXT_REDIRECT;replace;/login?redirectTo=%2Fdashboard;307;` and `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?redirectTo=%2Fdashboard"/>` | Failed closure-grade HTTP redirect requirement |
| `/couples`   | HTTP 302/303/307/308 to `/login?redirectTo=%2Fcouples`   | `HTTP/1.1 200 OK`, no `Location` header | RSC body contained `NEXT_REDIRECT;replace;/login?redirectTo=%2Fcouples;307;` and `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?redirectTo=%2Fcouples"/>`     | Failed closure-grade HTTP redirect requirement |

Additional signal: local HomeMatch responses did not include the middleware-applied `X-Frame-Options` security header during this dev-server run, including `/api/health`. That is consistent with the HTTP probe not being intercepted before page rendering, but this report does not claim root cause beyond the observed live evidence.

## Follow-up repo-local fix and rerun — 2026-05-08T16:28:04Z

Root cause: the app uses `src/app`, but the protected-route middleware lived only at repo root (`middleware.ts`). Local Next 15.5 dev did not discover that root file for the `src/app` tree, which is why the original rerun saw no middleware security headers and fell through to page-rendered RSC/meta redirects.

Smallest repo-local fix: add `src/middleware.ts` as a thin re-export of the existing root middleware implementation/config so the existing protected-route guard runs before `src/app` page rendering without broadening auth behavior.

Targeted RED/GREEN test evidence:

```text
RED  NODE_ENV=test pnpm exec jest __tests__/unit/middleware.test.ts -t 'Next src-directory middleware entrypoint' --runInBand
     failed: Cannot find module '../../src/middleware'

GREEN NODE_ENV=test pnpm exec jest __tests__/unit/middleware.test.ts -t 'Next src-directory middleware entrypoint' --runInBand
      passed: 1/1 targeted test

GREEN NODE_ENV=test pnpm exec jest __tests__/unit/middleware.test.ts --runInBand
      passed: 14/14 middleware tests
```

Local live rerun evidence after restarting HomeMatch dev on `127.0.0.1:3101` with `SKIP_SUPABASE_GUARD=true NEXT_TELEMETRY_DISABLED=1 pnpm exec next dev --hostname 127.0.0.1 --port 3101`:

| Route                  | Expected closure-grade result                                          | Observed HTTP result                                                                                             | Verdict |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| `/dashboard`           | HTTP 302/303/307/308 to `/login?redirectTo=%2Fdashboard`               | `HTTP/1.1 307 Temporary Redirect`; `location: http://localhost:3101/login?redirectTo=%2Fdashboard`               | Pass    |
| `/couples`             | HTTP 302/303/307/308 to `/login?redirectTo=%2Fcouples`                 | `HTTP/1.1 307 Temporary Redirect`; `location: http://localhost:3101/login?redirectTo=%2Fcouples`                 | Pass    |
| `/dashboard?tab=liked` | HTTP 302/303/307/308 to `/login?redirectTo=%2Fdashboard%3Ftab%3Dliked` | `HTTP/1.1 307 Temporary Redirect`; `location: http://localhost:3101/login?redirectTo=%2Fdashboard%3Ftab%3Dliked` | Pass    |

Additional middleware-discovery signal after the fix: `/api/health` included middleware-applied headers including `x-frame-options: DENY`, `cross-origin-opener-policy: same-origin`, and `cross-origin-resource-policy: same-origin`.

## Conclusion

Original rerun result: failed closure-grade HTTP redirect requirement because anonymous `/dashboard` and `/couples` returned `200 OK` RSC/meta redirects.

Follow-up fix/rerun result: closure-grade local HTTP redirect evidence now passes for anonymous no-cookie `/dashboard` and `/couples`, with `redirectTo` preserved before page rendering.

## Verification / artifacts

- Evidence files were temporary non-secret local artifacts under `/tmp/hm-strict-anon-*.headers` and `/tmp/hm-strict-anon-*.body` during the run.
- Persistent evidence is this report plus the closure matrix update.
- Active-writer collision check found a concurrently running Claude worker in `/home/shan/projects/homematch-v2.claude-workers/p0-live-probes` with overlapping P0 live-probe scope, so no code changes were attempted in this task.
