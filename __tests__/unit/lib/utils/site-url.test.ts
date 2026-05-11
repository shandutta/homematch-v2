import {
  DEFAULT_APP_URL,
  buildBrowserRedirectUrl,
  getBrowserAppUrl,
  getEnvAppUrl,
  normalizeOrigin,
} from '@/lib/utils/site-url'

const ORIGINAL_ENV = { ...process.env }

describe('site-url utilities', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  describe('normalizeOrigin', () => {
    it('returns null for null/undefined/empty', () => {
      expect(normalizeOrigin(null)).toBeNull()
      expect(normalizeOrigin(undefined)).toBeNull()
      expect(normalizeOrigin('')).toBeNull()
    })

    it('strips trailing slash and trims whitespace', () => {
      expect(normalizeOrigin('https://example.com/')).toBe(
        'https://example.com'
      )
      expect(normalizeOrigin('  https://example.com/  ')).toBe(
        'https://example.com'
      )
    })

    it('returns the url unchanged when no trailing slash exists', () => {
      expect(normalizeOrigin('https://example.com')).toBe('https://example.com')
    })

    it('does not alter url with multiple trailing characters', () => {
      // Only one trailing slash is stripped
      expect(normalizeOrigin('https://example.com//')).toBe(
        'https://example.com/'
      )
    })
  })

  describe('getEnvAppUrl', () => {
    it('returns NEXT_PUBLIC_APP_URL when set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://prod.example.com/'
      delete process.env.APP_URL
      expect(getEnvAppUrl()).toBe('https://prod.example.com')
    })

    it('falls back to APP_URL when NEXT_PUBLIC_APP_URL missing', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      process.env.APP_URL = 'https://staging.example.com'
      expect(getEnvAppUrl()).toBe('https://staging.example.com')
    })

    it('returns DEFAULT_APP_URL when neither env var is set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.APP_URL
      expect(getEnvAppUrl()).toBe(DEFAULT_APP_URL)
    })

    it('exports DEFAULT_APP_URL as localhost', () => {
      expect(DEFAULT_APP_URL).toBe('http://localhost:3000')
    })
  })

  describe('getBrowserAppUrl', () => {
    it('returns the runtime origin from window.location', () => {
      // jsdom default origin is http://localhost
      const result = getBrowserAppUrl()
      expect(result).toMatch(/^https?:\/\//)
      expect(result.endsWith('/')).toBe(false)
    })
  })

  describe('buildBrowserRedirectUrl', () => {
    it('uses default /auth/callback when no path given', () => {
      const url = buildBrowserRedirectUrl()
      expect(url.endsWith('/auth/callback')).toBe(true)
    })

    it('prepends a leading slash when missing', () => {
      const url = buildBrowserRedirectUrl('dashboard')
      expect(url.endsWith('/dashboard')).toBe(true)
    })

    it('preserves leading slash when present', () => {
      const url = buildBrowserRedirectUrl('/profile')
      expect(url.endsWith('/profile')).toBe(true)
      // No double slash
      expect(url.includes('//profile')).toBe(false)
    })

    it('builds a complete URL with origin and path', () => {
      const url = buildBrowserRedirectUrl('/foo')
      expect(url).toMatch(/^https?:\/\/[^/]+\/foo$/)
    })
  })
})
