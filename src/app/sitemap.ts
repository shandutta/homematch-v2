import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

const staticRoutes = [
  '/',
  '/login',
  '/signup',
  '/sponsor-mockups',
  '/demo/ads',
  '/privacy',
  '/terms',
  '/cookies',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return staticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1.0 : 0.6,
  }))
}
