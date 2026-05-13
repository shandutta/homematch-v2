import { randomUUID } from 'crypto'
import { describe, expect, test } from 'vitest'
import { IntegrationTestHelper } from '../../utils/integration-test-helper'

/**
 * S7 (2026-05-13 audit): stress test for sync_household_user_count.
 *
 * Background: the trigger was hot-fixed twice in quick succession in
 * December 2025 (20251218103000 race, 20251218111000 deadlock). Two
 * fixes within 8 minutes is a smell. The audit recommended a stress
 * test that actually hammers the trigger to surface any remaining
 * snapshot-stale or deadlock paths.
 *
 * Strategy: drive concurrency at integer values higher than the
 * existing 2-user smoke tests (N=20 for joins, N=10 swaps repeated 3x
 * for deadlock pressure). Each test creates and tears down its own
 * test rows so it can run in parallel with the rest of the suite.
 */

const STRESS_TIMEOUT_MS = 120_000
const JOIN_FANOUT = 20
const SWAP_FANOUT = 10
const SWAP_ITERATIONS = 3

type Pool = {
  ids: string[]
  cleanup: () => Promise<void>
}

const createUserPool = async (
  serviceClient: ReturnType<IntegrationTestHelper['getServiceClient']>,
  count: number
): Promise<Pool> => {
  // user_profiles.id still FKs auth.users.id on the test DB (some
  // historic profile inserts skipped the FK on prod via a Clerk-aware
  // bootstrap, but the FK is still enforced in supabase/migrations).
  // Create real auth.users via admin API so the synthetic pool can
  // hold user_profiles rows without tripping the constraint.
  const ids: string[] = []
  const runId = randomUUID().slice(0, 8)
  for (let i = 0; i < count; i += 1) {
    const email = `stress-${runId}-${i}@trigger-stress.invalid`
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(
        `[stress-pool] failed to create auth user ${email}: ${error?.message ?? 'no user returned'}`
      )
    }
    ids.push(data.user.id)
  }

  const rows = ids.map((id, i) => ({
    id,
    email: `stress-${runId}-${i}@trigger-stress.invalid`,
    display_name: `stress-${i}`,
    onboarding_completed: false,
    preferences: {},
  }))

  const { error } = await serviceClient.from('user_profiles').insert(rows)
  if (error) {
    throw new Error(
      `[stress-pool] failed to seed ${count} user_profiles: ${error.message}`
    )
  }

  return {
    ids,
    cleanup: async () => {
      await serviceClient
        .from('user_profiles')
        .update({ household_id: null })
        .in('id', ids)
      await serviceClient.from('user_profiles').delete().in('id', ids)
      // Tear down the auth.users rows too so back-to-back test runs
      // don't accumulate stress-* users in the local Supabase.
      await Promise.all(
        ids.map((id) => serviceClient.auth.admin.deleteUser(id))
      )
    },
  }
}

describe('DB (stress): sync_household_user_count under concurrent load', () => {
  test(
    `converges to N under ${JOIN_FANOUT}-way concurrent join`,
    async () => {
      const helper = new IntegrationTestHelper()
      const serviceClient = helper.getServiceClient()
      // households.created_by still FKs auth.users — use a real test worker
      // for that field. The N pool members write to user_profiles only and
      // can use synthetic UUIDs (PR #35 dropped user_profiles.id → auth.users).
      const creator = await helper.getTestUser('test-worker-1@example.com')
      const householdId = randomUUID()
      const pool = await createUserPool(serviceClient, JOIN_FANOUT)

      try {
        const { error: householdError } = await serviceClient
          .from('households')
          .insert({
            id: householdId,
            name: `Stress Join ${householdId.slice(0, 8)}`,
            created_by: creator.id,
            user_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        expect(householdError).toBeNull()

        // Fire all N updates at once. Each transaction acquires the
        // households row lock then recomputes COUNT(*). If the trigger
        // is correct the final value is N exactly; snapshot-stale
        // implementations land somewhere in [1, N).
        const results = await Promise.all(
          pool.ids.map((id) =>
            serviceClient
              .from('user_profiles')
              .update({ household_id: householdId })
              .eq('id', id)
          )
        )

        for (const r of results) expect(r.error).toBeNull()

        const { data, error } = await serviceClient
          .from('households')
          .select('user_count')
          .eq('id', householdId)
          .single()

        expect(error).toBeNull()
        expect(data?.user_count).toBe(JOIN_FANOUT)
      } finally {
        await pool.cleanup()
        await serviceClient.from('households').delete().eq('id', householdId)
      }
    },
    STRESS_TIMEOUT_MS
  )

  test(
    `survives ${SWAP_FANOUT}-way concurrent swap across two households (${SWAP_ITERATIONS} iterations)`,
    async () => {
      const helper = new IntegrationTestHelper()
      const serviceClient = helper.getServiceClient()
      const creator = await helper.getTestUser('test-worker-1@example.com')
      const householdA = randomUUID()
      const householdB = randomUUID()
      const pool = await createUserPool(serviceClient, SWAP_FANOUT)

      try {
        for (const [id, name] of [
          [householdA, `Stress Swap A ${householdA.slice(0, 8)}`],
          [householdB, `Stress Swap B ${householdB.slice(0, 8)}`],
        ] as const) {
          const { error } = await serviceClient.from('households').insert({
            id,
            name,
            created_by: creator.id,
            user_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          expect(error).toBeNull()
        }

        // Seed: place all users in A. Sequential to keep setup deterministic.
        const { error: seedError } = await serviceClient
          .from('user_profiles')
          .update({ household_id: householdA })
          .in('id', pool.ids)
        expect(seedError).toBeNull()

        for (let iter = 0; iter < SWAP_ITERATIONS; iter += 1) {
          const [from, to] =
            iter % 2 === 0 ? [householdA, householdB] : [householdB, householdA]

          // Fire all swaps at once. The deadlock fix (20251218111000)
          // sorts the two affected households by id before locking, so
          // the lock order is the same regardless of swap direction.
          // Without that fix this is where the original deadlock fired.
          const results = await Promise.all(
            pool.ids.map((id) =>
              serviceClient
                .from('user_profiles')
                .update({ household_id: to })
                .eq('id', id)
                .eq('household_id', from)
            )
          )

          for (const r of results) {
            // Allow PostgreSQL's 40P01 deadlock to surface visibly — the
            // assertion is `null` so any error means the trigger needs more work.
            expect(r.error).toBeNull()
          }

          const { data: fromRow } = await serviceClient
            .from('households')
            .select('user_count')
            .eq('id', from)
            .single()
          const { data: toRow } = await serviceClient
            .from('households')
            .select('user_count')
            .eq('id', to)
            .single()

          expect(fromRow?.user_count).toBe(0)
          expect(toRow?.user_count).toBe(SWAP_FANOUT)
        }
      } finally {
        await pool.cleanup()
        await serviceClient
          .from('households')
          .delete()
          .in('id', [householdA, householdB])
      }
    },
    STRESS_TIMEOUT_MS
  )

  test(
    `converges correctly with mixed concurrent inserts + deletes`,
    async () => {
      const helper = new IntegrationTestHelper()
      const serviceClient = helper.getServiceClient()
      const creator = await helper.getTestUser('test-worker-1@example.com')
      const householdId = randomUUID()
      const pool = await createUserPool(serviceClient, JOIN_FANOUT)
      const removeIds = pool.ids.slice(0, JOIN_FANOUT / 2)

      try {
        const { error: householdError } = await serviceClient
          .from('households')
          .insert({
            id: householdId,
            name: `Stress Mixed ${householdId.slice(0, 8)}`,
            created_by: creator.id,
            user_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        expect(householdError).toBeNull()

        // First: join all N, sequentially. (We're testing the trigger's
        // response to concurrent ops, not its response to setup.)
        const { error: joinError } = await serviceClient
          .from('user_profiles')
          .update({ household_id: householdId })
          .in('id', pool.ids)
        expect(joinError).toBeNull()

        // Fire N/2 concurrent "leave" updates. Final count must be N/2.
        const leaveResults = await Promise.all(
          removeIds.map((id) =>
            serviceClient
              .from('user_profiles')
              .update({ household_id: null })
              .eq('id', id)
          )
        )
        for (const r of leaveResults) expect(r.error).toBeNull()

        const { data, error } = await serviceClient
          .from('households')
          .select('user_count')
          .eq('id', householdId)
          .single()

        expect(error).toBeNull()
        expect(data?.user_count).toBe(JOIN_FANOUT - removeIds.length)
      } finally {
        await pool.cleanup()
        await serviceClient.from('households').delete().eq('id', householdId)
      }
    },
    STRESS_TIMEOUT_MS
  )
})
