# D7 Disputed Route Email/Profile Exposure Closure — 2026-05-08

## Scope

Closed decision-needed item D7 for `/api/couples/disputed` with the smallest repo-local safe slice.

## Decision

Use option B from the D7 register: email is not required for the current disputed-properties UX, so the route now restricts partner profile data to user id and display name.

## File-level keep/remove outcome

- `src/app/api/couples/disputed/route.ts`
  - Keep: partner `user_id`, `user_name`, interaction type, interaction timestamp, score data, and notes.
  - Remove: partner `user_email` from the exported response type and JSON payload.
  - Limit: household member service-role query now selects only `id, display_name`.
  - Limit: current-user profile query now selects only `household_id`.
- `src/components/couples/DisputedPropertiesView.tsx`
  - No change needed. The component renders partner `user_name`, interaction data, and notes; it does not read partner email.
- `src/components/couples/DisputedPropertiesAlert.tsx`
  - No change needed. The alert only reads the disputed-properties count.
- `__tests__/unit/app/api/couples/disputed/route.test.ts`
  - Added focused assertions that GET responses do not include `user_email` or test email strings and that the two profile selects remain limited.

## Risk analysis

- Privacy/security risk reduced: the service-role route no longer fetches or returns household partner email addresses for disputed property rendering.
- UX risk is low: searched route consumers and the disputed view only require display name, interaction metadata, and notes. Missing display names fall back to `Household member` instead of email.
- Compatibility risk is bounded to the typed `DisputedProperty` contract imported by current consumers. Type-check passed after removing `user_email` from the interface.

## Verification

RED before implementation:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/api/couples/disputed/route.test.ts --runInBand
```

Failed as expected because `partner1.user_email` was still present.

GREEN after implementation:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/api/couples/disputed/route.test.ts --runInBand
```

Passed: 7/7 tests.

Production-code type-check:

```bash
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check
```

Passed.

## Remaining follow-up

No product/security follow-up is required for the repo-local D7 closure unless the product later decides that partner email must be displayed in the disputed-properties UX. If that happens, re-open D7 and implement a scoped explicit contract, preferably via a narrow RPC or route DTO with documented purpose and tests.
