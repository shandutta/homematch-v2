# d14 Local Live Probe Readiness Wrapper — Evidence Strengthening

Generated: 2026-05-08
Scope: bounded Phase 0 closure slice for the local no-auth live probe readiness wrapper.
Worktree: `homematch-v2.claude-workers/d14-local-live-probe-readiness-1738`

## What changed

- Refactored `scripts/run-no-auth-live-probes.js` to expose its pure helpers
  (`assertLocalBaseUrl`, `isLocalServerReady`, `runMain`) via `module.exports`,
  while preserving the original CLI behavior when invoked as a script
  (`require.main === module`).
- Added `__tests__/unit/scripts/run-no-auth-live-probes.test.ts`, a Jest unit
  guard that exercises the wrapper's documented invariants without spawning
  any server, browser, or network call.

No production behavior changed. The wrapper still:

- Defaults to `http://127.0.0.1:3000`.
- Refuses any base URL whose hostname is not `127.0.0.1`, `localhost`, or `::1`.
- Probes `/api/health` with a 2s timeout (overridable via
  `NO_AUTH_LIVE_PROBES_READY_TIMEOUT_MS`) and treats `>=500` or any error as
  "not ready".
- Exits 0 with an explicit `SKIP` log when no local server responds.
- Spawns `pnpm exec vitest run __tests__/integration/routing/no-auth-live-probe.spec.ts`
  only when the local server is reachable, with `NO_AUTH_LIVE_PROBES_RUN=1`
  and the validated `NO_AUTH_LIVE_PROBES_BASE_URL` injected into the child env.

## Invariants now covered by the unit guard

The new `__tests__/unit/scripts/run-no-auth-live-probes.test.ts` asserts:

1. The documented default is `http://127.0.0.1:3000` and the local-only
   allow-list is exactly `['127.0.0.1', 'localhost', '::1']`.
2. `assertLocalBaseUrl` accepts every documented local URL form, including
   the alternate `:3100` port (`http://127.0.0.1:3100`,
   `http://localhost:3100`, `http://[::1]:3100`).
3. `assertLocalBaseUrl` refuses non-local URLs with an explicit
   "Refusing no-auth live probes against non-local URL" error, including:
   - Public hosts (`https://example.com`, `https://homematch.pro`,
     `https://app.homematch.pro:3000`).
   - LAN-style hosts (`http://10.0.0.1:3000`, `http://192.168.1.10:3100`).
   - Resolvable non-local hostnames (`http://prod-server:3000`).
   - Suffix-bypass lookalikes (`http://127.0.0.1.evil.example:3000`,
     `http://localhost.evil.example:3000`).
4. `isLocalServerReady` returns `false` when fetch rejects (no server up),
   `true` on a non-5xx response, and `false` on a 5xx response. The probe
   target is `<baseUrl>/api/health` with `redirect: 'manual'`, GET, and
   `accept: application/json`.
5. `runMain` exits **1** and logs an explicit `[p0-no-auth-live-probes] ERROR`
   message when the base URL is non-local, **without** invoking the readiness
   check or spawning vitest.
6. `runMain` exits **0** with an explicit
   `[p0-no-auth-live-probes] SKIP: no local app server responded at <url>; start the local app before running live probes.`
   when the readiness check fails, **without** spawning vitest.
7. `runMain` spawns vitest only when the base URL is local **and** the
   readiness check resolves true, and propagates `NO_AUTH_LIVE_PROBES_RUN=1`
   plus the validated `NO_AUTH_LIVE_PROBES_BASE_URL` into the child env.

These tests run with no real fetch, no spawned process, and no real env
mutation — they pass arguments through the existing dependency-injection
surface (`logger`, `exit`, `spawn`, `readyCheck`, `fetchImpl`).

## How to run safely against local port 3100

The wrapper accepts any local-only URL, so an alternate port (e.g. 3100,
useful when 3000 is held by another worktree) is supported as long as you
never point it at a non-local target.

1. Start the local app on port 3100 yourself (do **not** ask Claude to start
   servers):

   ```bash
   PORT=3100 pnpm run dev
   ```

2. From a separate shell, run the wrapper against that port:

   ```bash
   NO_AUTH_LIVE_PROBES_BASE_URL=http://127.0.0.1:3100 \
     pnpm test:no-auth-live-probes
   ```

   Optional: lengthen the readiness timeout if your dev server is still
   compiling on the first probe:

   ```bash
   NO_AUTH_LIVE_PROBES_BASE_URL=http://127.0.0.1:3100 \
   NO_AUTH_LIVE_PROBES_READY_TIMEOUT_MS=5000 \
     pnpm test:no-auth-live-probes
   ```

3. If the local app is **not** up, the wrapper still exits 0 with an explicit
   `SKIP` log — you do not need to babysit it. CI/agents can call this
   wrapper unconditionally and treat exit-0 as "harness OK".

4. The wrapper will refuse any non-local URL, including:

   ```bash
   # All of these exit 1 with an explicit refusal message and never spawn vitest.
   NO_AUTH_LIVE_PROBES_BASE_URL=https://homematch.pro pnpm test:no-auth-live-probes
   NO_AUTH_LIVE_PROBES_BASE_URL=http://10.0.0.1:3100 pnpm test:no-auth-live-probes
   NO_AUTH_LIVE_PROBES_BASE_URL=http://prod-server:3000 pnpm test:no-auth-live-probes
   ```

5. The live spec itself (`__tests__/integration/routing/no-auth-live-probe.spec.ts`)
   has a parallel `assertLocalBaseUrl` test that re-validates locality from
   inside Vitest, so the local-only invariant is enforced in two places.

## Out of scope (intentionally)

- No browser swarms, no external URLs, no paid APIs.
- No new probe routes — the public/protected route matrix in the spec is
  unchanged.
- No dev server is started by the wrapper or its tests; readiness is
  detection-only.
- No live Supabase, cron, or auth mutations.
- No documentation rewrite — only this evidence/usage report is added.

## Verification (to be run from this worktree)

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm exec jest __tests__/unit/scripts/run-no-auth-live-probes.test.ts --runInBand

systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm test:no-auth-live-probes  # still exits 0 with SKIP since no local app is running

systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm run type-check
```

Results are captured in the commit message and worker run log.
