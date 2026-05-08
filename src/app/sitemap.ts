import type { MetadataRoute } from 'next'
import { SEO_PUBLIC_ROUTES, siteUrl } from '../lib/seo/route-policy'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return SEO_PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
