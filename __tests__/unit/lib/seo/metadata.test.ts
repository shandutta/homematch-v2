/**
 * @jest-environment node
 */
// Phase 0/1 closure: P0-accessibility-core-flow

// Phase 0/1 closure: P0-accessibility-core-flow
const SITE_URL = 'https://example.com'

describe('SEO metadata polish', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_BASE_URL = `${SITE_URL}/`
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  describe('createPublicRouteMetadata', () => {
    it('attaches Twitter site and creator handles for richer cards', async () => {
      const { createPublicRouteMetadata } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const metadata = createPublicRouteMetadata({
        title: 'Acquisition Page',
        description: 'Description.',
        path: '/acquire',
      })

      expect(metadata.twitter).toMatchObject({
        card: 'summary_large_image',
        site: '@homematch',
        creator: '@homematch',
      })
    })

    it('emits an absolute canonical URL anchored to NEXT_PUBLIC_BASE_URL', async () => {
      const { createPublicRouteMetadata } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const metadata = createPublicRouteMetadata({
        title: 'About',
        description: 'About description.',
        path: '/about',
      })

      expect(metadata.alternates).toEqual({ canonical: `${SITE_URL}/about` })
      expect(metadata.openGraph).toMatchObject({
        url: `${SITE_URL}/about`,
        siteName: 'HomeMatch',
        locale: 'en_US',
      })
    })

    it('canonicalizes the root by stripping trailing slashes', async () => {
      const { createPublicRouteMetadata } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const rootMeta = createPublicRouteMetadata({
        title: 'Root',
        description: 'Root description.',
      })
      const trailingMeta = createPublicRouteMetadata({
        title: 'Trailing',
        description: 'Trailing description.',
        path: '/about/',
      })

      expect(rootMeta.alternates).toEqual({ canonical: SITE_URL })
      expect(trailingMeta.alternates).toEqual({
        canonical: `${SITE_URL}/about`,
      })
    })

    it('serves home-search keyword targets by default and accepts overrides', async () => {
      const { createPublicRouteMetadata, SEO_KEYWORDS } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const defaults = createPublicRouteMetadata({
        title: 'Default keywords',
        description: 'Default description.',
        path: '/keywords',
      })

      expect(defaults.keywords).toBe(SEO_KEYWORDS.join(', '))
      expect(defaults.keywords).toContain('home search')
      expect(defaults.keywords).toContain('couples home search')

      const custom = createPublicRouteMetadata({
        title: 'Custom keywords',
        description: 'Custom description.',
        path: '/custom',
        keywords: ['a', 'b'],
      })
      expect(custom.keywords).toBe('a, b')
    })
  })

  describe('Organization JSON-LD', () => {
    it('links the organization to its public Twitter profile via sameAs', async () => {
      const { createOrganizationJsonLd } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const ld = createOrganizationJsonLd()
      expect(ld['@context']).toBe('https://schema.org')
      expect(ld['@type']).toBe('Organization')
      expect(ld.sameAs).toEqual(['https://twitter.com/homematch'])
    })
  })

  describe('WebApplication JSON-LD', () => {
    it('describes HomeMatch as a free LifestyleApplication anchored to siteUrl', async () => {
      const { createWebApplicationJsonLd } = await import(
        '../../../../src/lib/seo/route-metadata'
      )

      const ld = createWebApplicationJsonLd()

      expect(ld).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'HomeMatch',
        url: SITE_URL,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: 0,
          priceCurrency: 'USD',
        },
        publisher: {
          '@type': 'Organization',
          name: 'HomeMatch',
          url: SITE_URL,
        },
      })
      expect(ld.description).toMatch(/collaborative home search/i)
    })
  })

  describe('Public page metadata wiring', () => {
    type RouteCase = {
      route: string
      importPath: string
      canonical: string
      keywordRegex: RegExp
    }

    const publicCases: RouteCase[] = [
      {
        route: '/',
        importPath: '@/app/page',
        canonical: SITE_URL,
        keywordRegex: /home search|home matching/i,
      },
      {
        route: '/about',
        importPath: '@/app/about/page',
        canonical: `${SITE_URL}/about`,
        keywordRegex: /home search|find a home/i,
      },
      {
        route: '/signup',
        importPath: '@/app/signup/page',
        canonical: `${SITE_URL}/signup`,
        keywordRegex: /collaborative home search|home search/i,
      },
    ]

    it.each(publicCases)(
      '$route exposes canonical URL, OG image, Twitter card, and keyword-targeted description',
      async ({ importPath, canonical, keywordRegex }) => {
        const mod = await import(importPath)

        expect(mod.metadata.alternates).toEqual({ canonical })
        expect(mod.metadata.description).toMatch(keywordRegex)

        expect(mod.metadata.openGraph).toMatchObject({
          url: canonical,
          siteName: 'HomeMatch',
          locale: 'en_US',
          type: 'website',
          images: [
            {
              url: `${SITE_URL}/og-image.jpg`,
              width: 1200,
              height: 630,
            },
          ],
        })

        expect(mod.metadata.twitter).toMatchObject({
          card: 'summary_large_image',
          site: '@homematch',
          creator: '@homematch',
          images: [`${SITE_URL}/twitter-image.jpg`],
        })
      }
    )

    it('login is noindex with token-safe metadata and exposes no canonical', async () => {
      const mod = await import('@/app/login/page')

      expect(mod.metadata).toMatchObject({
        title: 'Log In | HomeMatch',
        robots: {
          index: false,
          follow: false,
          nocache: true,
        },
      })
      expect(mod.metadata.alternates).toBeUndefined()
      expect(mod.metadata.openGraph).toBeUndefined()
      expect(mod.metadata.twitter).toBeUndefined()
    })
  })
})
