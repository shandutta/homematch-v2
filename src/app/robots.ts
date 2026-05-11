import type { MetadataRoute } from 'next'
import { ROBOTS_DISALLOW_PATHS, siteUrl } from '../lib/seo/route-policy'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ROBOTS_DISALLOW_PATHS,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
