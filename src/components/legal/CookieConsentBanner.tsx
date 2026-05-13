'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
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
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  const [isOpen, setIsOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [draft, setDraft] = useState<CookieConsentDraft>(getDefaultConsent())
  const manageSettingsButtonRef = useRef<HTMLButtonElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)

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

  // Reserve vertical space so the fixed banner doesn't overlap page content
  // (QA ISSUE-008: banner covered the "Not a brokerage" card on /about and
  // the "Review favorites" / "Household hub" cards on mobile dashboard).
  // We use a CSS variable + body padding rather than a placeholder div so
  // it works regardless of which page layout is mounted.
  //
  // /review L4: stash the prior body padding before overriding so we
  // restore the host app's value on cleanup instead of clobbering it.
  // (Today nothing else sets body.style.paddingBottom — this is defensive
  // for future code that might.)
  const previousBodyPaddingBottom = useRef<string | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isOpen) {
      // ~80px covers the desktop and mobile banner heights with breathing room.
      root.style.setProperty('--cookie-banner-offset', '5rem')
      if (previousBodyPaddingBottom.current === null) {
        previousBodyPaddingBottom.current = document.body.style.paddingBottom
      }
      document.body.style.paddingBottom = 'var(--cookie-banner-offset)'
    } else {
      root.style.removeProperty('--cookie-banner-offset')
      document.body.style.paddingBottom =
        previousBodyPaddingBottom.current ?? ''
      previousBodyPaddingBottom.current = null
    }
    return () => {
      root.style.removeProperty('--cookie-banner-offset')
      if (previousBodyPaddingBottom.current !== null) {
        document.body.style.paddingBottom = previousBodyPaddingBottom.current
        previousBodyPaddingBottom.current = null
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (showDetails) {
      settingsPanelRef.current?.focus()
    }
  }, [showDetails])

  const adSenseEnabled =
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== 'false' &&
    process.env.NODE_ENV === 'production'

  const handleToggle =
    (key: keyof CookieConsentDraft) => (checked: boolean) => {
      setDraft((current) => ({ ...current, [key]: checked }))
    }

  const closeDetailsAndReturnFocus = () => {
    setShowDetails(false)
    requestAnimationFrame(() => manageSettingsButtonRef.current?.focus())
  }

  const handleDetailsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDetailsAndReturnFocus()
    }
  }

  const handleSave = async (nextDraft: CookieConsentDraft) => {
    saveCookieConsent(nextDraft)
    setIsOpen(false)
    setShowDetails(false)

    if (nextDraft.analytics) {
      const { initPerformanceTracker } =
        await import('@/lib/utils/performance-tracker')
      initPerformanceTracker()
    }
  }

  const advertisingDescription = useMemo(() => {
    if (!adSenseEnabled) {
      return `${categoryCopy.advertising.description} Ads are currently off.`
    }
    return categoryCopy.advertising.description
  }, [adSenseEnabled])

  if (isTestMode || !isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto mb-1 w-full max-w-3xl px-2 sm:mb-2 sm:px-4">
        <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:px-4 sm:py-2">
          {/* Mobile: compact one-line layout (text + action buttons stay
              under ~64px tall so the banner never covers the auth form
              CTA at 393x852). Desktop: full layout with policy links. */}
          <div className="flex items-center gap-2 sm:flex-row sm:justify-between">
            <p className="hidden flex-1 text-xs text-slate-700 sm:flex sm:items-center sm:gap-3">
              <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-slate-600 uppercase">
                Cookies
              </span>
              <span>
                We use essential cookies. Optional cookies improve performance
                and ads. See the{' '}
                <Link href="/cookies" className="text-sky-600 underline">
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-sky-600 underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </p>
            <p className="flex-1 text-xs text-slate-700 sm:hidden">
              Cookies?{' '}
              <Link href="/cookies" className="text-sky-600 underline">
                Learn more
              </Link>
            </p>
            {/* M4: CTA hierarchy now treats Reject and Accept as equal weight
                (both share the outline variant). Prior state used variant="primary"
                on "Accept all" only, nudging users toward broad consent — a GDPR
                dark-pattern concern flagged in the audit. */}
            <div className="flex shrink-0 gap-1 sm:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-h-0 px-2 text-xs sm:h-9 sm:px-3"
                onClick={() => handleSave(getDefaultConsent())}
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-h-0 px-2 text-xs sm:h-9 sm:px-3"
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
                ref={manageSettingsButtonRef}
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 min-h-0 px-2 text-xs sm:h-9"
                onClick={() => setShowDetails((current) => !current)}
                aria-expanded={showDetails}
                aria-controls="cookie-banner-settings"
              >
                <span className="hidden sm:inline">
                  {showDetails ? 'Hide settings' : 'Manage settings'}
                </span>
                <span className="sm:hidden" aria-label="Manage settings">
                  ⋮
                </span>
              </Button>
            </div>
          </div>

          {showDetails ? (
            <div
              id="cookie-banner-settings"
              ref={settingsPanelRef}
              role="group"
              aria-label="Cookie settings"
              tabIndex={-1}
              onKeyDown={handleDetailsKeyDown}
              className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"
            >
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
                  onClick={closeDetailsAndReturnFocus}
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
