/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Webhook payload narrowing from Svix's WebhookEvent union requires casts.
/**
 * Clerk webhook handler — Phase C.2.4 of the Clerk migration.
 *
 * Receives lifecycle events from Clerk (user.created, user.updated,
 * user.deleted) and keeps our `user_profiles` table in sync.
 *
 * Setup (one-time):
 * 1. Dashboard → Webhooks → Add Endpoint → https://<host>/api/webhooks/clerk
 * 2. Subscribe to: user.created, user.updated, user.deleted
 * 3. Copy the signing secret into CLERK_WEBHOOK_SIGNING_SECRET env var.
 *
 * Verification uses Clerk's verifyWebhook helper (Svix-based) — invalid
 * signatures throw and return 400.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserJSON } from '@clerk/nextjs/server'

// Service client with explicit approved capability — webhook is verified
// upstream by Svix signature so no per-request authz gate is needed.
const getWebhookSupabase = () =>
  createServiceClient({ approvedCapability: 'clerk-webhook' })

// Webhooks must NEVER be cached or gated by middleware auth.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function primaryEmailFromUserJSON(data: UserJSON): string | null {
  const primaryId = data.primary_email_address_id
  if (!primaryId) return data.email_addresses?.[0]?.email_address ?? null

  const match = data.email_addresses?.find(
    (e: { id: string }) => e.id === primaryId
  )
  return match?.email_address ?? data.email_addresses?.[0]?.email_address ?? null
}

function displayNameFromUserJSON(data: UserJSON): string | null {
  const parts = [data.first_name, data.last_name]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (parts.length) return parts.join(' ')
  return data.username ?? null
}

async function handleUserCreated(data: UserJSON) {
  const supabase = await getWebhookSupabase()
  const email = primaryEmailFromUserJSON(data)
  const displayName = displayNameFromUserJSON(data)

  // Upsert by clerk_user_id so retries are idempotent.
  // For brand-new users we generate a fresh UUID for user_profiles.id.
  // For users who already exist via the legacy Supabase path and have
  // their clerk_user_id backfilled (Phase E), this upsert should match
  // and update their email/display_name from Clerk.
  const { error: existingError, data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', data.id)
    .maybeSingle()

  if (existingError) {
    console.error(
      '[ClerkWebhook][user.created] Failed to query existing profile:',
      existingError
    )
    return { ok: false, error: existingError.message }
  }

  if (existing) {
    // Profile already linked — update fields from Clerk.
    const { error } = await supabase
      .from('user_profiles')
      .update({
        email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error(
        '[ClerkWebhook][user.created] Failed to update existing profile:',
        error
      )
      return { ok: false, error: error.message }
    }
    return { ok: true, action: 'updated' }
  }

  // Brand-new user — create the profile row.
  const newProfileId = crypto.randomUUID()
  const { error } = await supabase
    .from('user_profiles')
    .insert({
      id: newProfileId,
      clerk_user_id: data.id,
      email,
      display_name: displayName,
      onboarding_completed: false,
      preferences: {},
    })

  if (error) {
    console.error(
      '[ClerkWebhook][user.created] Failed to insert profile:',
      error
    )
    return { ok: false, error: error.message }
  }

  return { ok: true, action: 'created', profileId: newProfileId }
}

async function handleUserUpdated(data: UserJSON) {
  const supabase = await getWebhookSupabase()
  const email = primaryEmailFromUserJSON(data)
  const displayName = displayNameFromUserJSON(data)

  const { error } = await supabase
    .from('user_profiles')
    .update({
      email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', data.id)

  if (error) {
    console.error(
      '[ClerkWebhook][user.updated] Failed to update profile:',
      error
    )
    return { ok: false, error: error.message }
  }

  return { ok: true, action: 'updated' }
}

async function handleUserDeleted(data: { id?: string }) {
  if (!data.id) return { ok: false, error: 'missing clerk user id' }
  const supabase = await getWebhookSupabase()

  // We do NOT cascade-delete the user_profiles row — it's the FK target for
  // many other tables and the user may have shared content with their
  // household. Instead, null out clerk_user_id and mark email-suffix to
  // signal "deleted in Clerk".
  const { error } = await supabase
    .from('user_profiles')
    .update({
      clerk_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', data.id)

  if (error) {
    console.error(
      '[ClerkWebhook][user.deleted] Failed to unlink profile:',
      error
    )
    return { ok: false, error: error.message }
  }

  return { ok: true, action: 'unlinked' }
}

export async function POST(request: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(request)
  } catch (err) {
    console.error('[ClerkWebhook] Signature verification failed:', err)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const result = await handleUserCreated(evt.data)
        return NextResponse.json(result, { status: result.ok ? 200 : 500 })
      }
      case 'user.updated': {
        const result = await handleUserUpdated(evt.data)
        return NextResponse.json(result, { status: result.ok ? 200 : 500 })
      }
      case 'user.deleted': {
        const result = await handleUserDeleted(evt.data as { id?: string })
        return NextResponse.json(result, { status: result.ok ? 200 : 500 })
      }
      default:
        // Ignore other event types — not subscribed.
        return NextResponse.json({ ok: true, ignored: evt.type })
    }
  } catch (err) {
    console.error('[ClerkWebhook] Handler error:', err)
    return new NextResponse('Handler error', { status: 500 })
  }
}
