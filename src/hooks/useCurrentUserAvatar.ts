/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Cast on /api/users/me JSON; the endpoint is owned in this repo and its
// response shape is enforced by the route's own typing.
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvatarData } from '@/lib/constants/avatars'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAvatarData = (value: unknown): value is AvatarData =>
  isRecord(value) &&
  (value.type === 'preset' || value.type === 'custom') &&
  typeof value.value === 'string'

// user_profiles.id is a UUID. /api/users/me may return a Clerk-userId
// fallback (`user_...`) when profile bootstrap is mid-flight; skip the
// Supabase query in that case to avoid Postgres 22P02 errors.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface UserAvatarState {
  displayName: string | null
  email: string | null
  avatar: AvatarData | null
  isLoading: boolean
}

/**
 * Hook to get the current user's avatar data for display in Header and
 * other components.
 *
 * Hits /api/users/me for the identity bits (works with both Clerk cookies
 * and the legacy Supabase Bearer flow), then falls back to a direct
 * Supabase profile lookup for the avatar JSON.
 *
 * Previously this called `supabase.auth.getUser()` directly. That returns
 * null for Clerk-authenticated users (the dominant auth path), which caused
 * the header avatar to render a literal "?" glyph instead of the user's
 * initials (QA ISSUE-010).
 */
export function useCurrentUserAvatar(): UserAvatarState {
  const [state, setState] = useState<UserAvatarState>({
    displayName: null,
    email: null,
    avatar: null,
    isLoading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchUserAvatar() {
      try {
        const meRes = await fetch('/api/users/me', {
          credentials: 'same-origin',
        })
        if (!meRes.ok) {
          if (!cancelled)
            setState({
              displayName: null,
              email: null,
              avatar: null,
              isLoading: false,
            })
          return
        }
        const me = (await meRes.json()) as {
          id: string
          email: string | null
          display_name: string | null
          household_id: string | null
        }

        // Avatar JSON lives on user_profiles.preferences — fetch it
        // separately so /api/users/me stays a thin identity endpoint.
        // Skip the query if `me.id` is the Clerk-userId fallback shape
        // (`user_...`) that /api/users/me returns while a profile bootstrap
        // is mid-flight. Passing a non-UUID into `.eq('id', ...)` triggers
        // Postgres 22P02 (invalid_text_representation), which would force
        // the warning path on every mount until the webhook arrives.
        let avatar: AvatarData | null = null
        let preferencesDisplayName: string | null = null
        if (UUID_PATTERN.test(me.id)) {
          try {
            const supabase = await createClient()
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('preferences')
              .eq('id', me.id)
              .maybeSingle()
            const preferences = isRecord(profile?.preferences)
              ? profile.preferences
              : {}
            if (isAvatarData(preferences.avatar)) avatar = preferences.avatar
            if (typeof preferences.display_name === 'string') {
              preferencesDisplayName = preferences.display_name
            }
          } catch (e) {
            // Non-fatal — initials fallback still renders correctly.
            console.warn(
              'useCurrentUserAvatar: avatar preferences lookup failed:',
              e
            )
          }
        }

        if (cancelled) return
        setState({
          displayName:
            me.display_name ||
            preferencesDisplayName ||
            me.email?.split('@')[0] ||
            null,
          email: me.email,
          avatar,
          isLoading: false,
        })
      } catch (error) {
        console.error('Failed to fetch user avatar:', error)
        if (!cancelled) setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchUserAvatar()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
