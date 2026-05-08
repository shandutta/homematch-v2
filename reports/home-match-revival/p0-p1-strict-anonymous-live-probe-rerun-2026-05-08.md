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

| Route | Expected closure-grade result | Observed HTTP result | Redirect evidence in body | Verdict |
| --- | --- | --- | --- | --- |
| `/dashboard` | HTTP 302/303/307/308 to `/login?redirectTo=%2Fdashboard` | `HTTP/1.1 200 OK`, no `Location` header | RSC body contained `NEXT_REDIRECT;replace;/login?redirectTo=%2Fdashboard;307;` and `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?redirectTo=%2Fdashboard"/>` | Failed closure-grade HTTP redirect requirement |
| `/couples` | HTTP 302/303/307/308 to `/login?redirectTo=%2Fcouples` | `HTTP/1.1 200 OK`, no `Location` header | RSC body contained `NEXT_REDIRECT;replace;/login?redirectTo=%2Fcouples;307;` and `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?redirectTo=%2Fcouples"/>` | Failed closure-grade HTTP redirect requirement |

Additional signal: local HomeMatch responses did not include the middleware-applied `X-Frame-Options` security header during this dev-server run, including `/api/health`. That is consistent with the HTTP probe not being intercepted before page rendering, but this report does not claim root cause beyond the observed live evidence.

## Conclusion

The rerun produced real local-live evidence, but it does **not** close the strict anonymous protected-route live evidence gap. Both scoped routes preserved `redirectTo` inside the rendered RSC redirect payload/meta refresh, but neither route returned a closure-grade HTTP redirect status or `Location` header to an anonymous no-cookie request.

The Phase 0/1 closure matrix should continue to require a follow-up fix or approved server/deployment rerun that proves HTTP-level redirects for `/dashboard` and `/couples`.

## Verification / artifacts

- Evidence files were temporary non-secret local artifacts under `/tmp/hm-strict-anon-*.headers` and `/tmp/hm-strict-anon-*.body` during the run.
- Persistent evidence is this report plus the closure matrix update.
- Active-writer collision check found a concurrently running Claude worker in `/home/shan/projects/homematch-v2.claude-workers/p0-live-probes` with overlapping P0 live-probe scope, so no code changes were attempted in this task.
