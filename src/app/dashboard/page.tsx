import { EnhancedDashboardPageImpl } from '@/components/dashboard/EnhancedDashboardPageImpl'
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary'
import {
  DASHBOARD_PROPERTY_SELECT,
  loadDashboardData,
  type DashboardPreferences,
} from '@/lib/data/loader'
import { getServerUserContext } from '@/lib/auth/server-context'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { redirect } from 'next/navigation'
import { UserService } from '@/lib/services/users'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import type { Json } from '@/types/database'

export const metadata = createNoindexRouteMetadata({
  title: 'Dashboard | HomeMatch',
  description:
    'Swipe through homes, see household activity, and pick up where you left off.',
})

interface DashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({
  searchParams: _searchParams,
}: DashboardPageProps) {
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    const params = new URLSearchParams()
    params.set('redirectTo', buildDashboardRedirectTo(await _searchParams))
    redirect(`/login?${params.toString()}`)
  }

  // For Clerk users without a profile row yet (webhook hasn't fired or is
  // mid-flight), create one just-in-time. Without this we'd redirect to
  // /login which redirects back to /dashboard — an infinite bounce.
  let profileId = userCtx.profileId
  if (!profileId) {
    profileId = await ensureUserProfileForCurrentClerkUser()
  }
  if (!profileId) {
    // /review L3: render an inline error rather than redirecting to /login.
    // Clerk session is valid (userCtx is truthy); sending the user to /login
    // bounces them back through /sign-in to /dashboard, which would hit
    // bootstrap again, fail the same way, and loop. The inline panel breaks
    // that loop and surfaces the actual failure mode (rare: M2 fail-closed
    // when Clerk had no email on the user, or a transient bootstrap insert
    // error).
    return (
      <div className="gradient-grid-bg min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center text-white">
          <h1 className="text-2xl font-semibold">
            We&rsquo;re still setting up your account
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Your sign-up just landed and we&rsquo;re finalizing things. Refresh
            in a few seconds, or reach out at{' '}
            <a
              className="text-cyan-300 underline"
              href="mailto:hello@homematch.pro"
            >
              hello@homematch.pro
            </a>{' '}
            if it sticks.
          </p>
        </div>
      </div>
    )
  }

  try {
    const userService = new UserService()
    const userProfile = await userService.getUserProfile(profileId)

    // ONBOARDING-001: brand-new users with onboarding_completed=false get
    // routed through /onboarding so we can collect a city + price range
    // before the dashboard tries to render personalized recommendations.
    // The recommendation feed has no signal to personalize against
    // otherwise, which is the "random walk of 160 cards" finding from
    // Section 3 of the audit.
    if (userProfile && userProfile.onboarding_completed === false) {
      redirect('/onboarding')
    }

    const dashboardPreferences = parseDashboardPreferences(
      userProfile?.preferences ?? null
    )
    const dashboardData = await loadDashboardData({
      userPreferences: dashboardPreferences,
      includeNeighborhoods: false,
      includeCount: false,
      propertySelect: DASHBOARD_PROPERTY_SELECT,
      useCache: true,
      cacheKey: profileId,
    })

    // const returning = (await searchParams)?.returning === 'true';

    // const swipes = interactions.map((interaction) => ({
    //   ...interaction,
    //   vote: interaction.interaction_type === 'like',
    // }));

    // const swipeStats = {
    //   totalViewed: swipes.length,
    //   totalLiked: swipes.filter((s) => s.vote).length,
    //   totalPassed: swipes.filter((s) => !s.vote).length,
    // };

    return (
      <DashboardErrorBoundary>
        <EnhancedDashboardPageImpl
          initialData={dashboardData}
          userId={profileId}
          // The following props are passed for future use but are currently unused in the client component
          // returning={returning}
          // userProfile={finalUserData}
          // initialSwipeStats={swipeStats}
        />
      </DashboardErrorBoundary>
    )
  } catch (error) {
    console.error('[Dashboard] Error caught:', error)
    // Check if it's a redirect error (NEXT_REDIRECT)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isDatabaseError =
      errorMessage.toLowerCase().includes('database') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('econnrefused') ||
      errorMessage.toLowerCase().includes('timeout')

    if (isDatabaseError) {
      // Throw a specific error that the error boundary can catch and handle
      throw new Error('DATABASE_CONNECTION_ERROR: ' + errorMessage)
    }

    // For non-database errors, redirect to login as before
    redirect('/login')
  }
}

const buildDashboardRedirectTo = (
  searchParams: { [key: string]: string | string[] | undefined } | undefined
) => {
  const redirectParams = new URLSearchParams()
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      redirectParams.set(key, value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => redirectParams.append(key, item))
    }
  })

  const query = redirectParams.toString()
  return query ? `/dashboard?${query}` : '/dashboard'
}

const isRecord = (value: unknown): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: Json): value is number => typeof value === 'number'
const isBoolean = (value: Json): value is boolean => typeof value === 'boolean'
const isString = (value: Json): value is string => typeof value === 'string'

const parseNumber = (value: Json | undefined): number | undefined =>
  value !== undefined && isNumber(value) ? value : undefined

const parseBoolean = (value: Json | undefined): boolean | undefined =>
  value !== undefined && isBoolean(value) ? value : undefined

const parseStringArray = (value: Json | undefined): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const items = value.filter(isString)
  return items.length ? items : undefined
}

const parsePriceRange = (
  value: Json | undefined
): [number, number] | undefined => {
  if (Array.isArray(value) && value.length === 2) {
    const [min, max] = value
    if (isNumber(min) && isNumber(max)) return [min, max]
  }
  if (isRecord(value)) {
    const min = value.min
    const max = value.max
    if (isNumber(min) && isNumber(max)) return [min, max]
  }
  return undefined
}

const parseCityOptions = (
  value: Json | undefined
): DashboardPreferences['cities'] => {
  if (!Array.isArray(value)) return undefined
  const items = value
    .filter(isRecord)
    .map((city) => {
      const cityName = city.city
      const state = city.state
      if (isString(cityName) && isString(state)) {
        return { city: cityName, state }
      }
      return null
    })
    .filter((item): item is { city: string; state: string } => Boolean(item))
  return items.length ? items : undefined
}

const parseBooleanRecord = (
  value: Json | undefined
): Record<string, boolean> | undefined => {
  if (!isRecord(value)) return undefined
  const record: Record<string, boolean> = {}
  let hasValue = false
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue === 'boolean') {
      record[key] = entryValue
      hasValue = true
    }
  }
  return hasValue ? record : undefined
}

function parseDashboardPreferences(
  value: Json | null
): DashboardPreferences | null {
  if (!isRecord(value)) return null

  return {
    priceRange: parsePriceRange(value.priceRange),
    bedrooms: parseNumber(value.bedrooms),
    bathrooms: parseNumber(value.bathrooms),
    propertyTypes: parseBooleanRecord(value.propertyTypes),
    mustHaves: parseBooleanRecord(value.mustHaves),
    searchRadius: parseNumber(value.searchRadius),
    allCities: parseBoolean(value.allCities),
    cities: parseCityOptions(value.cities),
    neighborhoods: parseStringArray(value.neighborhoods),
  }
}
