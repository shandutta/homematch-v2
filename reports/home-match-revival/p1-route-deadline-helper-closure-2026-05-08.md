# P1 route-deadline helper closure — 2026-05-08

## Scope

Closed the Phase 1 open item for a shared route-deadline helper on long Supabase-heavy APIs.

## Code changes

- Added `src/lib/api/route-deadline.ts` with `withRouteDeadline(label, timeoutMs, handler)`.
- The helper returns the shared `ApiErrorHandler.gatewayTimeout(...)` 504 response when a handler exceeds its deadline and logs the route label/budget.
- Adopted the helper on the audited long Supabase-heavy route families:
  - `src/app/api/users/search/route.ts` — `users:search`, 2s budget.
  - `src/app/api/couples/disputed/route.ts` GET — `couples:disputed`, 4s budget.
  - `src/app/api/users/avatar/route.ts` POST/DELETE — 10s upload budget, 8s delete budget.
- Added `__tests__/unit/lib/api/route-deadline.test.ts` for behavior and static adoption coverage.
- Updated the existing disputed-route test mock so `NextResponse.json` responses include mutable headers required by `noStoreJson(...)`; this also re-establishes the implementation in `beforeEach` because project Jest resetMocks clears module-level `jest.fn` implementations.

## Verification

RED:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/lib/api/route-deadline.test.ts --runInBand
```

Failed before implementation because `@/lib/api/route-deadline` did not exist and the three target routes did not import/use it.

GREEN:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/lib/api/route-deadline.test.ts __tests__/unit/app/api/users/avatar/route.test.ts __tests__/unit/app/api/couples/disputed/route.test.ts --runInBand
```

Passed: 3 suites / 15 tests.

Type-check:

```bash
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check
```

Passed.

Formatting:

```bash
pnpm exec prettier --write src/lib/api/route-deadline.ts src/app/api/users/search/route.ts src/app/api/couples/disputed/route.ts src/app/api/users/avatar/route.ts __tests__/unit/lib/api/route-deadline.test.ts __tests__/unit/app/api/couples/disputed/route.test.ts
```

Completed successfully.
