/**
 * @jest-environment node
 *
 * Verifies the launch gate used by /demo/ads, /sponsor-mockups,
 * /validation, and /dashboard/vibes-test.
 * The routes stay unavailable by default and require an explicit local
 * HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true override to render preview content.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

describe('demo surface production gate', () => {
  const originalPreview = process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW

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
  ])('%s uses the internal preview access guard for %s', (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')

    expect(source).toContain('requireInternalPreviewAccess')
    expect(source).not.toContain('process.env.NODE_ENV')
  })

  it('src/app/dashboard/vibes-test/layout.tsx gates the /dashboard/vibes-test subtree', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/dashboard/vibes-test/layout.tsx'),
      'utf8'
    )

    expect(source).toContain('requireInternalPreviewAccess')
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
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
      expect(source).not.toContain("process.env.NODE_ENV === 'production'")
    }
  })
})
