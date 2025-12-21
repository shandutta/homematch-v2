/**
 * Couples invite edge cases E2E
 *
 * Minimal mocking: uses real Next.js UI + real Supabase via service role for setup/verification.
 *
 * Covers:
 * - Expired invites: no accept CTA, no sign-in CTA
 * - Non-pending invites (revoked/accepted): no accept CTA, no sign-in CTA
 * - Already-in-household safeguard: invited user cannot accept into a different household
 * - Invalid token: 404
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { createAuthHelper } from '../utils/auth-helper'
import { getWorkerTestUser } from '../fixtures/test-data'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function createServiceRoleClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54200'
  const serviceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getAuthUserIdByEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string
): Promise<string> {
  const perPage = 200
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) throw new Error(error.message)

    const user = data.users.find((u) => u.email === email)
    if (user) return user.id

    if (data.users.length < perPage) break
  }

  throw new Error(`Test user not found in auth: ${email}`)
}

const getInviterUser = (workerIndex: number) =>
  getWorkerTestUser((workerIndex + 2) % 8)
const getInviteeUser = (workerIndex: number) =>
  getWorkerTestUser((workerIndex + 6) % 8)

test.describe('Couples invites (edge cases)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.addInitScript(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore
      }
    })
  })

  test('expired invite shows disabled state and hides sign-in CTA', async ({
    page,
  }, testInfo) => {
    const service = createServiceRoleClient()
    const inviter = getInviterUser(testInfo.workerIndex)
    const inviterId = await getAuthUserIdByEmail(service, inviter.email)

    const householdId = crypto.randomUUID()
    const token = crypto.randomUUID()
    const now = new Date()

    const cleanupFailures: string[] = []
    const safeCleanup = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (err) {
        cleanupFailures.push(
          `${label}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    await service.from('households').insert({
      id: householdId,
      name: `PW Invite Expired ${householdId.slice(0, 8)}`,
      created_by: inviterId,
      user_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    await service.from('household_invitations').insert({
      household_id: householdId,
      created_by: inviterId,
      token,
      invited_email: 'expired-invite@example.com',
      status: 'pending',
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    try {
      await page.goto(`/invite/${token}`, { waitUntil: 'domcontentloaded' })

      await expect(page.getByText(/^join /i)).toBeVisible()

      await expect(page.getByText(/invitation status/i)).toBeVisible()
      await expect(page.getByText(/^expired$/i)).toBeVisible()

      const disabledButton = page.getByRole('button', {
        name: /this invitation has expired/i,
      })
      await expect(disabledButton).toBeVisible()
      await expect(disabledButton).toBeDisabled()

      await expect(
        page.getByRole('link', { name: /sign in to accept/i })
      ).toHaveCount(0)
    } finally {
      await safeCleanup('delete invite', async () => {
        await service
          .from('household_invitations')
          .delete()
          .eq('household_id', householdId)
      })
      await safeCleanup('delete household', async () => {
        await service.from('households').delete().eq('id', householdId)
      })

      if (cleanupFailures.length) {
        console.warn(
          '[Couples Invite Expired] Cleanup warnings:\n' +
            cleanupFailures.join('\n')
        )
      }
    }
  })

  for (const status of ['revoked', 'accepted'] as const) {
    test(`${status} invite hides accept CTA and sign-in CTA`, async ({
      page,
    }, testInfo) => {
      const service = createServiceRoleClient()
      const inviter = getInviterUser(testInfo.workerIndex)
      const inviterId = await getAuthUserIdByEmail(service, inviter.email)

      const householdId = crypto.randomUUID()
      const token = crypto.randomUUID()
      const now = new Date()

      const cleanupFailures: string[] = []
      const safeCleanup = async (label: string, fn: () => Promise<void>) => {
        try {
          await fn()
        } catch (err) {
          cleanupFailures.push(
            `${label}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }

      await service.from('households').insert({
        id: householdId,
        name: `PW Invite ${status} ${householdId.slice(0, 8)}`,
        created_by: inviterId,
        user_count: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })

      await service.from('household_invitations').insert({
        household_id: householdId,
        created_by: inviterId,
        token,
        invited_email: `${status}-invite@example.com`,
        status,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })

      try {
        await page.goto(`/invite/${token}`, { waitUntil: 'domcontentloaded' })

        await expect(page.getByText(/invitation status/i)).toBeVisible()
        await expect(
          page.getByText(new RegExp(`^${status}$`, 'i'))
        ).toBeVisible()

        const disabledButton = page.getByRole('button', {
          name: /invitation already used/i,
        })
        await expect(disabledButton).toBeVisible()
        await expect(disabledButton).toBeDisabled()

        await expect(
          page.getByRole('link', { name: /sign in to accept/i })
        ).toHaveCount(0)
      } finally {
        await safeCleanup('delete invite', async () => {
          await service
            .from('household_invitations')
            .delete()
            .eq('household_id', householdId)
        })
        await safeCleanup('delete household', async () => {
          await service.from('households').delete().eq('id', householdId)
        })

        if (cleanupFailures.length) {
          console.warn(
            `[Couples Invite ${status}] Cleanup warnings:\n` +
              cleanupFailures.join('\n')
          )
        }
      }
    })
  }

  test('cannot accept invite into a different household when already linked', async ({
    page,
  }, testInfo) => {
    const service = createServiceRoleClient()

    const inviter = getInviterUser(testInfo.workerIndex)
    const invitee = getInviteeUser(testInfo.workerIndex)

    const [inviterId, inviteeId] = await Promise.all([
      getAuthUserIdByEmail(service, inviter.email),
      getAuthUserIdByEmail(service, invitee.email),
    ])

    const { data: startingProfiles, error: startingProfilesError } =
      await service
        .from('user_profiles')
        .select('id, household_id, preferences')
        .in('id', [inviterId, inviteeId])

    if (startingProfilesError || !startingProfiles) {
      throw new Error(
        startingProfilesError?.message || 'Failed to load user profiles'
      )
    }

    const startingProfileById = new Map(
      startingProfiles.map((profile) => [profile.id, profile])
    )

    const householdA = crypto.randomUUID()
    const householdB = crypto.randomUUID()
    const token = crypto.randomUUID()
    const now = new Date()

    const auth = createAuthHelper(page)

    const cleanupFailures: string[] = []
    const safeCleanup = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (err) {
        cleanupFailures.push(
          `${label}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    try {
      await service.from('households').insert([
        {
          id: householdA,
          name: `PW Existing ${householdA.slice(0, 8)}`,
          created_by: inviteeId,
          user_count: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          id: householdB,
          name: `PW Invited ${householdB.slice(0, 8)}`,
          created_by: inviterId,
          user_count: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ])

      await service
        .from('user_profiles')
        .update({ household_id: householdB })
        .eq('id', inviterId)

      await service
        .from('user_profiles')
        .update({ household_id: householdA })
        .eq('id', inviteeId)

      await service.from('household_invitations').insert({
        household_id: householdB,
        created_by: inviterId,
        token,
        invited_email: invitee.email.toLowerCase(),
        status: 'pending',
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })

      await auth.login({
        email: invitee.email,
        password: invitee.password,
      })

      await page.goto(`/invite/${token}`, { waitUntil: 'domcontentloaded' })

      const acceptButton = page.getByRole('button', {
        name: /accept invitation/i,
      })
      await expect(acceptButton).toBeVisible({ timeout: 30000 })
      await expect(acceptButton).toBeEnabled()
      await page.waitForTimeout(200)
      await acceptButton.click()

      const errorNotice = page.getByText(
        /leave your current household before accepting/i
      )
      try {
        await expect(errorNotice).toBeVisible({ timeout: 5000 })
      } catch {
        await acceptButton.click()
      }
      await expect(errorNotice).toBeVisible({ timeout: 15000 })
      await expect(page).toHaveURL(new RegExp(`/invite/${token}`))

      const { data: inviteeProfile } = await service
        .from('user_profiles')
        .select('household_id')
        .eq('id', inviteeId)
        .maybeSingle()

      expect(inviteeProfile?.household_id).toBe(householdA)

      const { data: inviteRecord } = await service
        .from('household_invitations')
        .select('status, accepted_by')
        .eq('token', token)
        .maybeSingle()

      expect(inviteRecord?.status).toBe('pending')
      expect(inviteRecord?.accepted_by).toBeNull()
    } finally {
      await safeCleanup('restore inviter profile', async () => {
        const profile = startingProfileById.get(inviterId)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', inviterId)
      })

      await safeCleanup('restore invitee profile', async () => {
        const profile = startingProfileById.get(inviteeId)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', inviteeId)
      })

      await safeCleanup('delete invitations', async () => {
        await service
          .from('household_invitations')
          .delete()
          .in('household_id', [householdA, householdB])
      })

      await safeCleanup('delete households', async () => {
        await service
          .from('households')
          .delete()
          .in('id', [householdA, householdB])
      })

      if (cleanupFailures.length) {
        console.warn(
          '[Couples Invite Linked] Cleanup warnings:\n' +
            cleanupFailures.join('\n')
        )
      }
    }
  })

  test('invalid invite token returns 404', async ({ page }) => {
    const token = crypto.randomUUID()
    await page.goto(`/invite/${token}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(/404 - page not found/i)).toBeVisible()
  })
})
