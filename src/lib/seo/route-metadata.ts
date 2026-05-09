import type { Metadata } from 'next'

export const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

const defaultOpenGraphImage = `${siteUrl}/og-image.jpg`
const defaultTwitterImage = `${siteUrl}/twitter-image.jpg`

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630
const SITE_NAME = 'HomeMatch'
const SITE_LOCALE = 'en_US'

type PublicRouteMetadataInput = {
  title: string
  description: string
  path?: string
  imageUrl?: string
  imageAlt?: string
  ogType?: 'website' | 'article'
}

export function createPublicRouteMetadata({
  title,
  description,
  path = '',
  imageUrl,
  imageAlt,
  ogType = 'website',
}: PublicRouteMetadataInput): Metadata {
  const canonical = `${siteUrl}${path}`
  const ogImage = imageUrl ?? defaultOpenGraphImage
  const twImage = imageUrl ?? defaultTwitterImage
  const altText = imageAlt ?? `${SITE_NAME} — ${title}`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: altText,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twImage],
    },
  }
}

type NoindexRouteMetadataInput = {
  title: string
  description: string
}

export function createNoindexRouteMetadata({
  title,
  description,
}: NoindexRouteMetadataInput): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  }
}

export function createWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: siteUrl,
    name: SITE_NAME,
    description:
      'HomeMatch helps households swipe, match, and find a home together with collaborative search.',
  }
}

export function createOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
  }
}

type BreadcrumbInput = {
  name: string
  path: string
}

export function createBreadcrumbJsonLd(items: BreadcrumbInput[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  }
}

type PropertyJsonLdInput = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet?: number | null
  propertyType?: string | null
  description?: string | null
  images?: string[] | null
  yearBuilt?: number | null
}

export function createPropertyJsonLd(property: PropertyJsonLdInput) {
  const url = `${siteUrl}/properties/${property.id}`
  const images =
    property.images && property.images.length > 0
      ? property.images
      : [defaultOpenGraphImage]

  const floorSize =
    typeof property.squareFeet === 'number' && property.squareFeet > 0
      ? {
          '@type': 'QuantitativeValue',
          value: property.squareFeet,
          unitCode: 'FTK',
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'SingleFamilyResidence',
    '@id': url,
    url,
    name: property.address,
    description:
      property.description ??
      `${property.bedrooms} bed, ${property.bathrooms} bath home in ${property.city}, ${property.state}.`,
    image: images,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.zipCode,
      addressCountry: 'US',
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    ...(floorSize ? { floorSize } : {}),
    ...(property.yearBuilt ? { yearBuilt: property.yearBuilt } : {}),
    ...(property.propertyType
      ? { additionalType: property.propertyType }
      : {}),
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url,
    },
  }
}
