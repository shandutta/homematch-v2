import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/api/',
        '/auth/',
        '/settings/',
        '/household/',
        '/couples/',
        '/verify-email/',
        '/reset-password/',
        '/invite/',
        '/profile/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
