/**
 * @jest-environment node
 */

import type { Metadata } from 'next'

type RouteMetadataModule = {
  metadata: Metadata
}

const siteUrl = 'https://example.com'

const publicMetadataCases = [
  {
    route: '/',
    importPath: '@/app/page',
    title: 'HomeMatch - Swipe. Match. Move In.',
    description:
      'House hunting just became your favorite shared activity. Find a home that works for your household with AI that learns what you care about.',
    canonical: siteUrl,
  },
  {
    route: '/about',
    importPath: '@/app/about/page',
    title: 'About | HomeMatch',
    description:
      'Learn what HomeMatch is building for households who want a calmer way to find a home together.',
    canonical: `${siteUrl}/about`,
  },
  {
    route: '/contact',
    importPath: '@/app/contact/page',
    title: 'Contact | HomeMatch',
    description:
      'Get in touch with HomeMatch for support, privacy requests, or legal questions.',
    canonical: `${siteUrl}/contact`,
  },
  {
    route: '/signup',
    importPath: '@/app/signup/page',
    title: 'Sign Up | HomeMatch',
    description:
      'Create a HomeMatch account to save homes, invite your household, and decide together.',
    canonical: `${siteUrl}/signup`,
  },
  {
    route: '/privacy',
    importPath: '@/app/privacy/page',
    title: 'Privacy Policy | HomeMatch',
    description:
      'Learn how HomeMatch collects, uses, and protects your data while helping you find the right home together.',
    canonical: `${siteUrl}/privacy`,
  },
  {
    route: '/terms',
    importPath: '@/app/terms/page',
    title: 'Terms of Service | HomeMatch',
    description:
      'Understand the terms that govern the use of HomeMatch for collaborative home search.',
    canonical: `${siteUrl}/terms`,
  },
  {
    route: '/cookies',
    importPath: '@/app/cookies/page',
    title: 'Cookie Policy | HomeMatch',
    description:
      'Understand how cookies and similar technologies are used by HomeMatch and how you can manage preferences.',
    canonical: `${siteUrl}/cookies`,
  },
]

const noindexMetadataCases = [
  {
    route: '/login',
    importPath: '@/app/login/page',
    title: 'Log In | HomeMatch',
    description: 'Sign in to your HomeMatch account.',
  },
  {
    route: '/reset-password',
    importPath: '@/app/reset-password/page',
    title: 'Reset Password | HomeMatch',
    description: 'Reset your HomeMatch password securely.',
  },
  {
    route: '/verify-email',
    importPath: '@/app/verify-email/page',
    title: 'Verify Email | HomeMatch',
    description: 'Verify your HomeMatch email address securely.',
  },
  {
    route: '/auth/auth-code-error',
    importPath: '@/app/auth/auth-code-error/page',
    title: 'Authentication Error | HomeMatch',
    description: 'Authentication failed. Request a new HomeMatch sign-in link.',
  },
  {
    route: '/invite/[token]',
    importPath: '@/app/invite/[token]/page',
    title: 'Household Invite | HomeMatch',
    description: 'Open your private HomeMatch household invitation.',
  },
  {
    route: '/properties/[id]',
    importPath: '@/app/properties/[id]/page',
    title: 'Property Details | HomeMatch',
    description:
      'View the full details of a HomeMatch property listing inside your private household workspace.',
  },
  {
    route: '/dashboard/liked',
    importPath: '@/app/dashboard/liked/page',
    title: 'Liked Properties | HomeMatch',
    description: 'Browse the homes you and your household have liked.',
  },
  {
    route: '/dashboard/passed',
    importPath: '@/app/dashboard/passed/page',
    title: 'Passed Properties | HomeMatch',
    description: 'Review the homes you have skipped while swiping.',
  },
  {
    route: '/dashboard/viewed',
    importPath: '@/app/dashboard/viewed/page',
    title: 'Viewed Properties | HomeMatch',
    description: 'See every home you have opened, grouped by household.',
  },
  {
    route: '/dashboard/activity',
    importPath: '@/app/dashboard/activity/page',
    title: 'Activity | HomeMatch',
    description: 'See your household’s latest property activity.',
  },
  {
    route: '/dashboard/mutual-likes',
    importPath: '@/app/dashboard/mutual-likes/page',
    title: 'Mutual Likes | HomeMatch',
    description: 'Explore homes every member of your household liked.',
  },
  {
    route: '/couples/decisions',
    importPath: '@/app/couples/decisions/page',
    title: 'Property Decisions | HomeMatch',
    description: 'Resolve property disagreements with your household.',
  },
]

describe('metadata routes', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_BASE_URL = `${siteUrl}/`
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('keeps private and API surfaces out of robots indexing', async () => {
    const { default: robots } = await import('@/app/robots')

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/profile',
          '/household',
          '/settings',
          '/validation',
          '/couples',
          '/properties',
          '/account',
          '/admin',
          '/api',
          '/api/',
          '/auth',
          '/auth/',
          '/invite',
          '/invite/',
          '/demo',
          '/demo/',
          '/sponsor-mockups',
          '/sponsor-mockups/',
          '/supabase',
          '/supabase/',
        ],
      },
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
    })
  })

  it('publishes only canonical public acquisition/legal pages in the sitemap', async () => {
    const { default: sitemap } = await import('@/app/sitemap')

    const entries = sitemap()
    expect(entries.map((entry) => entry.url)).toEqual([
      `${siteUrl}/`,
      `${siteUrl}/about`,
      `${siteUrl}/contact`,
      `${siteUrl}/signup`,
      `${siteUrl}/privacy`,
      `${siteUrl}/terms`,
      `${siteUrl}/cookies`,
    ])
    expect(entries.map((entry) => entry.url)).not.toContain(`${siteUrl}/login`)
    expect(entries[0]).toMatchObject({
      changeFrequency: 'daily',
      priority: 1,
    })
  })

  it.each(publicMetadataCases)(
    'publishes canonical OpenGraph and Twitter metadata for $route',
    async ({ importPath, title, description, canonical }) => {
      const mod: RouteMetadataModule = await import(importPath)

      expect(mod.metadata).toMatchObject({
        title,
        description,
        alternates: { canonical },
        openGraph: {
          title,
          description,
          url: canonical,
          type: 'website',
          siteName: 'HomeMatch',
          locale: 'en_US',
          images: [
            {
              url: `${siteUrl}/og-image.jpg`,
              width: 1200,
              height: 630,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [`${siteUrl}/twitter-image.jpg`],
        },
      })
      expect(mod.metadata.robots).toBeUndefined()
    }
  )

  it.each(noindexMetadataCases)(
    'marks auth and token route $route as noindex with token-safe metadata',
    async ({ importPath, title, description }) => {
      const mod: RouteMetadataModule = await import(importPath)

      expect(mod.metadata).toMatchObject({
        title,
        description,
        robots: {
          index: false,
          follow: false,
          nocache: true,
        },
      })
      expect(mod.metadata.alternates).toBeUndefined()
      expect(mod.metadata.openGraph).toBeUndefined()
      expect(mod.metadata.twitter).toBeUndefined()
    }
  )

  it('does not advertise a WebSite SearchAction until a public search route exists', async () => {
    const { websiteJsonLd } = await import('@/app/page')

    expect(websiteJsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: siteUrl,
      name: 'HomeMatch',
      description:
        'HomeMatch helps households swipe, match, and find a home together with collaborative search.',
    })
    expect(JSON.stringify(websiteJsonLd)).not.toContain('SearchAction')
    expect(JSON.stringify(websiteJsonLd)).not.toContain('/search')
  })
})
