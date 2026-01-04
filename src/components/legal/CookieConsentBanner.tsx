'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  CookieConsentDraft,
  getCookieConsent,
  getDefaultConsent,
  saveCookieConsent,
} from '@/lib/cookies/consent'

const categoryCopy = {
  preferences: {
    title: 'Preferences',
    description: 'Remember saved filters and UI choices.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Measure feature usage and performance.',
  },
  advertising: {
    title: 'Advertising',
    description: 'Enable ad personalization when ads are on.',
  },
}

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [draft, setDraft] = useState<CookieConsentDraft>(getDefaultConsent())

  useEffect(() => {
    const stored = getCookieConsent()
    if (stored) {
      setDraft({
        preferences: stored.preferences,
        analytics: stored.analytics,
        advertising: stored.advertising,
      })
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }, [])

  const adSenseEnabled =
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== 'false' &&
    process.env.NODE_ENV === 'production'

  const handleToggle = (key: keyof CookieConsentDraft) => (checked: boolean) => {
    setDraft((current) => ({ ...current, [key]: checked }))
  }

  const handleSave = async (nextDraft: CookieConsentDraft) => {
    saveCookieConsent(nextDraft)
    setIsOpen(false)
    setShowDetails(false)

    if (nextDraft.analytics) {
      const { initPerformanceTracker } = await import(
        '@/lib/utils/performance-tracker'
      )
      initPerformanceTracker()
    }
  }

  const advertisingDescription = useMemo(() => {
    if (!adSenseEnabled) {
      return `${categoryCopy.advertising.description} Ads are currently off.`
    }
    return categoryCopy.advertising.description
  }, [adSenseEnabled])

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto mb-4 w-full max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
                Cookie notice
              </p>
              <p className="text-sm text-slate-700">
                We use essential cookies to run HomeMatch. Optional cookies help
                us improve performance and show ads if enabled. Learn more in
                the{' '}
                <Link href="/cookies" className="text-sky-600 underline">
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-sky-600 underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(getDefaultConsent())}
              >
                Reject non-essential
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  handleSave({
                    preferences: true,
                    analytics: true,
                    advertising: adSenseEnabled,
                  })
                }
              >
                Accept all
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDetails((current) => !current)}
              >
                {showDetails ? 'Hide settings' : 'Manage settings'}
              </Button>
            </div>
          </div>

          {showDetails ? (
            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {categoryCopy.preferences.title}
                  </p>
                  <p className="text-slate-600">
                    {categoryCopy.preferences.description}
                  </p>
                </div>
                <Switch
                  checked={draft.preferences}
                  onCheckedChange={handleToggle('preferences')}
                  aria-label="Preferences cookies"
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {categoryCopy.analytics.title}
                  </p>
                  <p className="text-slate-600">
                    {categoryCopy.analytics.description}
                  </p>
                </div>
                <Switch
                  checked={draft.analytics}
                  onCheckedChange={handleToggle('analytics')}
                  aria-label="Analytics cookies"
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {categoryCopy.advertising.title}
                  </p>
                  <p className="text-slate-600">{advertisingDescription}</p>
                </div>
                <Switch
                  checked={draft.advertising}
                  onCheckedChange={handleToggle('advertising')}
                  aria-label="Advertising cookies"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSave(draft)}
                >
                  Save settings
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
