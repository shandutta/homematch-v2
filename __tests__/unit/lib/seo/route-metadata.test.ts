/**
 * @jest-environment node
 */
// Phase 0/1 closure: P0-accessibility-core-flow

// Phase 0/1 closure: P0-accessibility-core-flow
const SITE_URL = 'https://example.com'

describe('route-metadata helpers', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_BASE_URL = `${SITE_URL}/`
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('emits a SingleFamilyResidence JSON-LD with offer, address, and floor size', async () => {
    const { createPropertyJsonLd } =
      await import('../../../../src/lib/seo/route-metadata')

    const ld = createPropertyJsonLd({
      id: 'prop-123',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      price: 525000,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1850,
      propertyType: 'single_family',
      description: 'A cheerful family home with a garden.',
      images: ['https://cdn.example.com/img1.jpg'],
      yearBuilt: 1992,
    })

    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'SingleFamilyResidence',
      '@id': `${SITE_URL}/properties/prop-123`,
      url: `${SITE_URL}/properties/prop-123`,
      name: '742 Evergreen Terrace',
      description: 'A cheerful family home with a garden.',
      image: ['https://cdn.example.com/img1.jpg'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: '742 Evergreen Terrace',
        addressLocality: 'Springfield',
        addressRegion: 'IL',
        postalCode: '62704',
        addressCountry: 'US',
      },
      numberOfBedrooms: 3,
      numberOfBathroomsTotal: 2,
      floorSize: {
        '@type': 'QuantitativeValue',
        value: 1850,
        unitCode: 'FTK',
      },
      yearBuilt: 1992,
      additionalType: 'single_family',
      offers: {
        '@type': 'Offer',
        price: 525000,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/properties/prop-123`,
      },
    })
  })

  it('falls back to default OG image and synthesized description when fields are missing', async () => {
    const { createPropertyJsonLd } =
      await import('../../../../src/lib/seo/route-metadata')

    const ld = createPropertyJsonLd({
      id: 'prop-empty',
      address: '1 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      price: 400000,
      bedrooms: 2,
      bathrooms: 1,
    })

    expect(ld.image).toEqual([`${SITE_URL}/og-image.jpg`])
    expect(ld.description).toBe('2 bed, 1 bath home in Austin, TX.')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((ld as Record<string, unknown>).floorSize).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((ld as Record<string, unknown>).yearBuilt).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((ld as Record<string, unknown>).additionalType).toBeUndefined()
  })

  it('emits an ordered BreadcrumbList JSON-LD anchored to siteUrl', async () => {
    const { createBreadcrumbJsonLd } =
      await import('../../../../src/lib/seo/route-metadata')

    const ld = createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Properties', path: '/properties' },
      { name: '742 Evergreen Terrace', path: '/properties/prop-123' },
    ])

    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Properties',
          item: `${SITE_URL}/properties`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: '742 Evergreen Terrace',
          item: `${SITE_URL}/properties/prop-123`,
        },
      ],
    })
  })

  it('emits an Organization JSON-LD anchored to siteUrl', async () => {
    const { createOrganizationJsonLd } =
      await import('../../../../src/lib/seo/route-metadata')

    expect(createOrganizationJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'HomeMatch',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.ico`,
      sameAs: ['https://twitter.com/homematch'],
    })
  })

  it('threads custom OG image url and alt text through public route metadata', async () => {
    const { createPublicRouteMetadata } =
      await import('../../../../src/lib/seo/route-metadata')

    const metadata = createPublicRouteMetadata({
      title: 'Custom Page',
      description: 'A custom description.',
      path: '/custom',
      imageUrl: 'https://cdn.example.com/custom.jpg',
      imageAlt: 'Custom alt text',
    })

    expect(metadata.openGraph).toMatchObject({
      images: [
        {
          url: 'https://cdn.example.com/custom.jpg',
          width: 1200,
          height: 630,
          alt: 'Custom alt text',
        },
      ],
    })
    expect(metadata.twitter).toMatchObject({
      images: ['https://cdn.example.com/custom.jpg'],
    })
  })
})
