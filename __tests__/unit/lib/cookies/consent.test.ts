import {
  clearCookieConsent,
  getConsentEventName,
  getCookieConsent,
  getDefaultConsent,
  saveCookieConsent,
} from '@/lib/cookies/consent'

describe('cookie consent storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('defaults optional categories to off for privacy-first loading', () => {
    expect(getDefaultConsent()).toEqual({
      preferences: false,
      analytics: false,
      advertising: false,
    })
  })

  test('persists explicit choices and emits a consent update event', () => {
    const listener = jest.fn()
    window.addEventListener(getConsentEventName(), listener)

    const consent = saveCookieConsent({
      preferences: true,
      analytics: true,
      advertising: false,
    })

    expect(getCookieConsent()).toEqual(consent)
    expect(consent).toMatchObject({
      version: 1,
      preferences: true,
      analytics: true,
      advertising: false,
    })
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ detail: consent })
    )

    window.removeEventListener(getConsentEventName(), listener)
  })

  test('ignores stale or malformed stored consent instead of enabling scripts', () => {
    window.localStorage.setItem(
      'hm_cookie_consent_v1',
      JSON.stringify({
        version: 0,
        preferences: true,
        analytics: true,
        advertising: true,
      })
    )
    expect(getCookieConsent()).toBeNull()

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    window.localStorage.setItem('hm_cookie_consent_v1', 'not-json')
    expect(getCookieConsent()).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read cookie consent',
      expect.any(SyntaxError)
    )
    warnSpy.mockRestore()
  })

  test('clear removes consent and emits a null update event', () => {
    const listener = jest.fn()
    saveCookieConsent({
      preferences: true,
      analytics: false,
      advertising: false,
    })
    window.addEventListener(getConsentEventName(), listener)

    clearCookieConsent()

    expect(getCookieConsent()).toBeNull()
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ detail: null })
    )

    window.removeEventListener(getConsentEventName(), listener)
  })
})
