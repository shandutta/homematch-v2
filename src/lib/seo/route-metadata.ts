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
const TWITTER_HANDLE = '@homematch'
const TWITTER_PROFILE_URL = 'https://twitter.com/homematch'

export const SEO_KEYWORDS = [
  'home search',
  'house hunting',
  'real estate search',
  'collaborative home search',
  'find a home together',
  'couples home search',
  'household home search',
  'AI property matching',
  'property recommendations',
  'shared home shortlist',
] as const

const DEFAULT_KEYWORDS = SEO_KEYWORDS.join(', ')

type PublicRouteMetadataInput = {
  title: string
  description: string
  path?: string
  imageUrl?: string
  imageAlt?: string
  ogType?: 'website' | 'article'
  keywords?: readonly string[]
}

function normalizeCanonicalPath(path: string): string {
  if (!path || path === '/') {
    return ''
  }
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  return withLeadingSlash.replace(/\/+$/, '') || ''
}

export function createPublicRouteMetadata({
  title,
  description,
  path = '',
  imageUrl,
  imageAlt,
  ogType = 'website',
  keywords,
}: PublicRouteMetadataInput): Metadata {
  const canonical = `${siteUrl}${normalizeCanonicalPath(path)}`
  const ogImage = imageUrl ?? defaultOpenGraphImage
  const twImage = imageUrl ?? defaultTwitterImage
  const altText = imageAlt ?? `${SITE_NAME} — ${title}`
  const keywordList = keywords ? keywords.join(', ') : DEFAULT_KEYWORDS

  return {
    title,
    description,
    keywords: keywordList,
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
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
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
    sameAs: [TWITTER_PROFILE_URL],
  }
}

export function createWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern browser.',
    description:
      'HomeMatch is a collaborative home search app that helps couples and households swipe, match, and decide on properties together with AI-powered property matching.',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
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
