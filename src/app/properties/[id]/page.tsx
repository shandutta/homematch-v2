import { PropertyDetailRouteModal } from '@/components/property/PropertyDetailRouteModal'
import { createClient } from '@/lib/supabase/server'
import { getServerUserContext } from '@/lib/auth/server-context'
import { notFound, redirect } from 'next/navigation'
import {
  createBreadcrumbJsonLd,
  createNoindexRouteMetadata,
  createPropertyJsonLd,
} from '@/lib/seo/route-metadata'

export const dynamic = 'force-dynamic'

export const metadata = createNoindexRouteMetadata({
  title: 'Property Details | HomeMatch',
  description:
    'View the full details of a HomeMatch property listing inside your private household workspace.',
})

interface PropertyPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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

  const userCtx = await getServerUserContext()

  if (!userCtx) {
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

  // Detect input shape: UUID (canonical id column) vs. anything else
  // (treat as zpid for back-compat with Zillow-style identifiers).
  // Without this guard, a non-UUID id sends Postgres a 22P02 error and
  // crashes the page through the error boundary.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const lookupColumn = UUID_RE.test(resolvedParams.id) ? 'id' : 'zpid'

  const supabase = await createClient()
  // A5 (2026-05-13 audit): TODO ship a `PropertyDetailView` type narrower
  // than `PropertyWithNeighborhood` so we can drop the unused
  // `neighborhood.bounds` polygon (~several KB per request) and ingest-only
  // property fields. Type refactor blocked the inline projection — see
  // audit doc for status.
  const { data: property, error } = await supabase
    .from('properties')
    .select('*, neighborhood:neighborhoods(*)')
    .eq(lookupColumn, resolvedParams.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[PropertyPage] Failed to load property', {
      propertyId: resolvedParams.id,
      lookupColumn,
      error,
    })
    notFound()
  }

  if (!property) {
    notFound()
  }

  const propertyJsonLd = createPropertyJsonLd({
    id: property.id,
    address: property.address,
    city: property.city,
    state: property.state,
    zipCode: property.zip_code,
    price: property.price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareFeet: property.square_feet,
    propertyType: property.property_type,
    description: property.description,
    images: property.images,
    yearBuilt: property.year_built,
  })

  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: 'HomeMatch', path: '/' },
    { name: 'Properties', path: '/dashboard' },
    {
      name: `${property.address}, ${property.city}`,
      path: `/properties/${property.id}`,
    },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PropertyDetailRouteModal
        property={property}
        returnTo={returnTo ?? undefined}
      />
    </>
  )
}
