import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

const PRIVATE_ROUTES = [
  '/api/',
  '/auth/',
  '/dashboard/',
  '/account/',
  '/admin/',
  '/invite/',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVATE_ROUTES,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
