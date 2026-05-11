import type { MetadataRoute } from 'next'
import { SEO_PUBLIC_ROUTES, siteUrl } from '../lib/seo/route-policy'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return SEO_PUBLIC_ROUTES.map(
    ({ path, changeFrequency, priority, lastModified }) => ({
      url: `${siteUrl}${path}`,
      lastModified: lastModified ? new Date(lastModified) : now,
      changeFrequency,
      priority,
    })
  )
}
