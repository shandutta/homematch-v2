'use client'

import { useEffect, useState } from 'react'
import {
  CookieConsent,
  getConsentEventName,
  getCookieConsent,
} from '@/lib/cookies/consent'

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    setConsent(getCookieConsent())

    const handleCustomEvent = (event: Event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : null
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null
      const isCookieConsent = (value: unknown): value is CookieConsent =>
        isRecord(value) &&
        typeof value.updatedAt === 'string' &&
        typeof value.preferences === 'boolean' &&
        typeof value.analytics === 'boolean' &&
        typeof value.advertising === 'boolean' &&
        typeof value.version === 'number'
      setConsent(isCookieConsent(detail) ? detail : getCookieConsent())
    }

    const handleStorage = () => {
      setConsent(getCookieConsent())
    }

    const eventName = getConsentEventName()
    window.addEventListener(eventName, handleCustomEvent)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(eventName, handleCustomEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return {
    consent,
    hasConsent: Boolean(consent),
  }
}
