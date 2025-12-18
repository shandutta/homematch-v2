import { PropertyDetailRouteModal } from '@/components/property/PropertyDetailRouteModal'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PropertyPageProps {
  params: { id: string } | Promise<{ id: string }>
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
}

const getSafeRedirectPath = (value: string | null) => {
  if (!value) return null

  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }

  if (!decoded.startsWith('/')) return null
  if (decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null

  return decoded
}

export default async function PropertyPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const params = new URLSearchParams()

    const redirectParams = new URLSearchParams()
    Object.entries(resolvedSearchParams ?? {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        redirectParams.set(key, value)
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => redirectParams.append(key, item))
      }
    })

    const redirectTo = redirectParams.toString()
      ? `/properties/${resolvedParams.id}?${redirectParams.toString()}`
      : `/properties/${resolvedParams.id}`

    params.set('redirectTo', redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  const returnToRaw =
    typeof resolvedSearchParams?.returnTo === 'string'
      ? resolvedSearchParams.returnTo
      : null
  const returnTo = getSafeRedirectPath(returnToRaw)

  const { data: property, error } = await supabase
    .from('properties')
    .select('*, neighborhood:neighborhoods(*)')
    .eq('id', resolvedParams.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[PropertyPage] Failed to load property', {
      propertyId: resolvedParams.id,
      error,
    })
  }

  if (!property) {
    notFound()
  }

  return (
    <PropertyDetailRouteModal
      property={property}
      returnTo={returnTo ?? undefined}
    />
  )
}
