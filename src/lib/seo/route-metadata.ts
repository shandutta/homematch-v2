import type { Metadata } from 'next'

export const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

const defaultOpenGraphImage = `${siteUrl}/og-image.jpg`
const defaultTwitterImage = `${siteUrl}/twitter-image.jpg`

type PublicRouteMetadataInput = {
  title: string
  description: string
  path?: string
}

export function createPublicRouteMetadata({
  title,
  description,
  path = '',
}: PublicRouteMetadataInput): Metadata {
  const canonical = `${siteUrl}${path}`

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
      type: 'website',
      siteName: 'HomeMatch',
      images: [defaultOpenGraphImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [defaultTwitterImage],
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
    name: 'HomeMatch',
    description:
      'HomeMatch helps households swipe, match, and find a home together with collaborative search.',
  }
}
