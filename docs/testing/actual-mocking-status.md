# ACTUAL Test Mocking Status - Reality Check

## What Actually Exists (and Works)

### Centralized Mock Setup

- **Location**: `__tests__/setupSupabaseMock.ts`
- **Loaded by**: `jest.setup.ts` via `require('./__tests__/setupSupabaseMock')`
- **Status**: ✅ WORKING

This file provides centralized mocks for:

- `@supabase/supabase-js`
- `@/lib/supabase/server`
- `@/lib/supabase/client`
- `next/navigation`

### How It Actually Works

1. **jest.setup.ts** runs before all tests
2. It requires `setupSupabaseMock.ts`
3. `setupSupabaseMock.ts` calls `jest.mock()` for common modules
4. All tests automatically get these mocks

### Integration Test Pattern

Tests DON'T need explicit `jest.mock()` calls because they're already centralized.

Example:

```typescript
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

describe('My Test', () => {
  beforeEach(() => {
    // Mocks are already available - just customize them
    ;(createClient as jest.Mock)
      .mockReturnValue({
        auth: {
          /* custom auth mock */
        },
      })(useRouter as jest.Mock)
      .mockReturnValue({
        push: jest.fn(),
      })
  })
})
```

## What Was Attempted (and Failed)

### ❌ Attempt 1: **mocks** Directory with moduleNameMapper

- Created `__mocks__` directory structure
- Added moduleNameMapper to jest.config.js
- **Why it failed**: moduleNameMapper doesn't automatically load mocks, just remaps paths
- **Result**: Mocks weren't being used

### ❌ Attempt 2: Duplicate Mock Setup

- Created `__tests__/setup/mock-modules.ts`
- **Why it failed**: Conflicted with existing `setupSupabaseMock.ts`
- **Result**: Duplicate mock definitions

## What Actually Needs to Be Done

### 1. Remove Duplicate jest.mock() Calls

Many integration tests have:

```typescript
jest.mock('@/lib/supabase/client')
jest.mock('next/navigation')
```

These are REDUNDANT - the mocks are already set up centrally.

### 2. Update Tests to Use Existing Mocks

Instead of calling `jest.mock()`, tests should just customize the existing mocks in `beforeEach`.

### 3. Document the Existing System

The existing `setupSupabaseMock.ts` works but isn't well documented.

## Current Issues

1. **Tests timing out**: The login-flow test times out, likely because LoginForm component doesn't exist or has issues
2. **Duplicate mock calls**: Integration tests have redundant `jest.mock()` calls
3. **No helper utilities**: While mocks exist, there are no helper functions to make customization easier

## Real Improvements Made

### ✅ Created mock-helpers.ts

Location: `__tests__/utils/mock-helpers.ts`

- Provides utility functions for customizing mocks
- Can be used with the existing setup

### ✅ Updated Documentation

- Created this reality check document
- Identified actual vs claimed functionality

## Recommendations

1. **Keep the existing `setupSupabaseMock.ts`** - it works
2. **Remove duplicate `jest.mock()` calls** from integration tests
3. **Use mock-helpers.ts** for easier mock customization
4. **Fix the actual test failures** (components not found, etc.)
5. **Don't try to reinvent the wheel** - the current system works

## Test Status Summary

Check current status in CI or by running `pnpm test` locally.

The mocking system itself is not the primary bottleneck; focus on the specific failing tests.
