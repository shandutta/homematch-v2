export type CookieConsent = {
  version: number
  updatedAt: string
  preferences: boolean
  analytics: boolean
  advertising: boolean
}

export type CookieConsentDraft = Omit<CookieConsent, 'version' | 'updatedAt'>

const CONSENT_STORAGE_KEY = 'hm_cookie_consent_v1'
const CONSENT_VERSION = 1
const CONSENT_EVENT = 'hm:cookie-consent'

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookieConsent

    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== CONSENT_VERSION) return null

    return {
      version: CONSENT_VERSION,
      updatedAt: parsed.updatedAt,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      advertising: Boolean(parsed.advertising),
    }
  } catch (error) {
    console.warn('Failed to read cookie consent', error)
    return null
  }
}

export function saveCookieConsent(draft: CookieConsentDraft): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    preferences: Boolean(draft.preferences),
    analytics: Boolean(draft.analytics),
    advertising: Boolean(draft.advertising),
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }))
    } catch (error) {
      console.warn('Failed to save cookie consent', error)
    }
  }

  return consent
}

export function clearCookieConsent() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))
  } catch (error) {
    console.warn('Failed to clear cookie consent', error)
  }
}

export function getConsentEventName() {
  return CONSENT_EVENT
}

export function getDefaultConsent(): CookieConsentDraft {
  return {
    preferences: false,
    analytics: false,
    advertising: false,
  }
}
