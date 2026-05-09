/**
 * @jest-environment node
 *
 * Verifies the launch gate used by /demo/ads, /sponsor-mockups,
 * /validation, and /dashboard/vibes-test.
 * The routes stay unavailable by default and require an explicit local
 * HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true override to render preview content.
 */
// Phase 0/1 closure: P1-internal-demo-gate

import * as fs from 'node:fs'
import * as path from 'node:path'

const notFoundMock = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  notFound: (...args: unknown[]) => notFoundMock(...args),
}))

describe('demo surface production gate', () => {
  const originalPreview = process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW

  beforeEach(() => {
    // Jest config sets resetMocks: true which restores notFoundMock to a
    // no-op between tests, so re-establish the throwing implementation that
    // mirrors next/navigation's real notFound() control-flow throw here.
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  afterEach(() => {
    jest.resetModules()
    if (originalPreview === undefined) {
      delete process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW
    } else {
      process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW = originalPreview
    }
  })

  it('keeps internal preview disabled by default', async () => {
    delete process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW

    const { isInternalPreviewEnabled } = await import(
      '@/lib/routing/internal-preview'
    )

    expect(isInternalPreviewEnabled()).toBe(false)
  })

  it('allows internal preview access only when explicitly enabled', async () => {
    process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW = 'true'

    const { isInternalPreviewEnabled } = await import(
      '@/lib/routing/internal-preview'
    )

    expect(isInternalPreviewEnabled()).toBe(true)
  })

  it.each([
    ['TRUE'],
    ['True'],
    ['1'],
    ['yes'],
    ['on'],
    ['false'],
    [''],
    [' true '],
  ])(
    'rejects non-canonical env value %p — only the literal string "true" enables preview',
    async (value) => {
      process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW = value

      const { isInternalPreviewEnabled } = await import(
        '@/lib/routing/internal-preview'
      )

      expect(isInternalPreviewEnabled()).toBe(false)
    }
  )

  it('requireInternalPreviewAccess invokes notFound() when the gate is disabled', async () => {
    delete process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW

    const { requireInternalPreviewAccess } = await import(
      '@/lib/routing/internal-preview'
    )

    expect(() => requireInternalPreviewAccess()).toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('requireInternalPreviewAccess is a no-op when the gate is explicitly enabled', async () => {
    process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW = 'true'

    const { requireInternalPreviewAccess } = await import(
      '@/lib/routing/internal-preview'
    )

    expect(() => requireInternalPreviewAccess()).not.toThrow()
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('uses notFound() in the internal preview access guard', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/routing/internal-preview.ts'),
      'utf8'
    )

    expect(source).toContain("from 'next/navigation'")
    expect(source).toContain('notFound()')
  })

  it.each([
    ['src/app/demo/ads/page.tsx', '/demo/ads'],
    ['src/app/sponsor-mockups/page.tsx', '/sponsor-mockups'],
    ['src/app/validation/page.tsx', '/validation'],
  ])(
    '%s actually invokes the internal preview access guard for %s',
    (relativePath) => {
      const source = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        'utf8'
      )

      expect(source).toMatch(/from ['"]@\/lib\/routing\/internal-preview['"]/)
      expect(source).toMatch(/requireInternalPreviewAccess\s*\(\s*\)/)
      expect(source).not.toContain('process.env.NODE_ENV')
    }
  )

  it('src/app/dashboard/vibes-test/layout.tsx invokes the gate for the /dashboard/vibes-test subtree', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/dashboard/vibes-test/layout.tsx'),
      'utf8'
    )

    expect(source).toMatch(/from ['"]@\/lib\/routing\/internal-preview['"]/)
    expect(source).toMatch(/requireInternalPreviewAccess\s*\(\s*\)/)
    expect(source).not.toContain('process.env.NODE_ENV')
  })

  it('keeps no internal-preview surface relying on NODE_ENV for gating', () => {
    const gateSurfaces = [
      'src/app/demo/ads/page.tsx',
      'src/app/sponsor-mockups/page.tsx',
      'src/app/validation/page.tsx',
      'src/app/dashboard/vibes-test/layout.tsx',
    ]

    for (const relativePath of gateSurfaces) {
      const source = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        'utf8'
      )
      expect(source).not.toContain("process.env.NODE_ENV === 'production'")
    }
  })

  it.each([
    ['src/app/demo/ads/page.tsx'],
    ['src/app/sponsor-mockups/page.tsx'],
  ])(
    '%s declares noindex/nofollow metadata as defense-in-depth',
    (relativePath) => {
      const source = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        'utf8'
      )

      // Page-level robots metadata is a defense-in-depth layer behind the
      // requireInternalPreviewAccess() runtime gate so crawlers that hit the
      // route while the env gate is open (local dev) still see noindex.
      // /validation is already covered by middleware-protected paths and the
      // /dashboard subtree by the /dashboard robots disallow rule.
      expect(source).toMatch(/robots:\s*\{[^}]*index:\s*false/)
      expect(source).toMatch(/robots:\s*\{[^}]*follow:\s*false/)
    }
  )
})
