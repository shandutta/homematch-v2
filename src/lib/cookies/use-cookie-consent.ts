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
      const customEvent = event as CustomEvent<CookieConsent | null>
      setConsent(customEvent.detail ?? getCookieConsent())
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
