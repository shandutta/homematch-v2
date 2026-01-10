import { EnhancedDashboardPageImpl } from '@/components/dashboard/EnhancedDashboardPageImpl'
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary'
import {
  DASHBOARD_PROPERTY_SELECT,
  loadDashboardData,
  type DashboardPreferences,
} from '@/lib/data/loader'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserService } from '@/lib/services/users'
import type { Json } from '@/types/database'

interface DashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({
  searchParams: _searchParams,
}: DashboardPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
    error: _authError,
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  try {
    const userService = new UserService()
    const userProfile = await userService.getUserProfile(user.id)
    const dashboardPreferences = parseDashboardPreferences(
      userProfile?.preferences ?? null
    )
    const dashboardData = await loadDashboardData({
      userPreferences: dashboardPreferences,
      includeNeighborhoods: false,
      includeCount: false,
      propertySelect: DASHBOARD_PROPERTY_SELECT,
      useCache: true,
      cacheKey: user.id,
    })

    // TODO: Re-enable onboarding flow once onboarding page is implemented
    // if (!finalUserData?.onboarding_completed) {
    //   redirect('/onboarding');
    // }

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
          userId={user.id}
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
