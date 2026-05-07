/**
 * @jest-environment node
 */

describe('metadata routes', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com/'
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
          '/api/',
          '/auth/',
          '/dashboard/',
          '/account/',
          '/admin/',
          '/invite/',
        ],
      },
      sitemap: 'https://example.com/sitemap.xml',
      host: 'https://example.com',
    })
  })

  it('publishes only canonical public acquisition/legal pages in the sitemap', async () => {
    const { default: sitemap } = await import('@/app/sitemap')

    const entries = sitemap()
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/contact',
      'https://example.com/signup',
      'https://example.com/privacy',
      'https://example.com/terms',
      'https://example.com/cookies',
    ])
    expect(entries.map((entry) => entry.url)).not.toContain(
      'https://example.com/login'
    )
    expect(entries[0]).toMatchObject({
      changeFrequency: 'daily',
      priority: 1,
    })
  })
})
