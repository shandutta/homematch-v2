'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  CookieConsentDraft,
  getDefaultConsent,
  saveCookieConsent,
} from '@/lib/cookies/consent'
import { useCookieConsent } from '@/lib/cookies/use-cookie-consent'

const categoryCopy = {
  essential: {
    title: 'Essential',
    description:
      'Required for login, security, load balancing, and core site functionality.',
  },
  preferences: {
    title: 'Preferences',
    description: 'Remember choices like saved filters and UI settings.',
  },
  analytics: {
    title: 'Analytics & performance',
    description:
      'Help us understand feature usage and improve reliability (Vercel Speed Insights, performance metrics).',
  },
  advertising: {
    title: 'Advertising',
    description:
      'Allow ad partners (like Google AdSense) to measure and personalize ads when ads are enabled.',
  },
}

interface CookiePreferencesPanelProps {
  compact?: boolean
  onSaved?: (consent: CookieConsentDraft) => void
}

export function CookiePreferencesPanel({
  compact = false,
  onSaved,
}: CookiePreferencesPanelProps) {
  const { consent } = useCookieConsent()
  const [draft, setDraft] = useState<CookieConsentDraft>(getDefaultConsent())
  const [hasSaved, setHasSaved] = useState(false)

  useEffect(() => {
    if (consent) {
      setDraft({
        preferences: consent.preferences,
        analytics: consent.analytics,
        advertising: consent.advertising,
      })
    }
  }, [consent])

  const handleToggle =
    (key: keyof CookieConsentDraft) => (checked: boolean) => {
      setDraft((current) => ({ ...current, [key]: checked }))
    }

  const handleSave = (nextDraft: CookieConsentDraft) => {
    saveCookieConsent(nextDraft)
    setHasSaved(true)
    onSaved?.(nextDraft)
  }

  const hasConsent = Boolean(consent)
  const adSenseEnabled =
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== 'false' &&
    process.env.NODE_ENV === 'production'

  const advertisingDescription = useMemo(() => {
    if (!adSenseEnabled) {
      return `${categoryCopy.advertising.description} Ads are currently disabled.`
    }
    return categoryCopy.advertising.description
  }, [adSenseEnabled])

  return (
    <div
      className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 ${
        compact ? 'space-y-4' : 'space-y-6'
      }`}
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Cookie settings</h2>
        <p className="text-sm text-slate-600">
          Manage optional cookies here. Essential cookies are always on.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {categoryCopy.essential.title}
            </p>
            <p className="text-xs text-slate-600">
              {categoryCopy.essential.description}
            </p>
          </div>
          <Switch checked disabled aria-label="Essential cookies enabled" />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {categoryCopy.preferences.title}
            </p>
            <p className="text-xs text-slate-600">
              {categoryCopy.preferences.description}
            </p>
          </div>
          <Switch
            checked={draft.preferences}
            onCheckedChange={handleToggle('preferences')}
            aria-label="Preferences cookies"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {categoryCopy.analytics.title}
            </p>
            <p className="text-xs text-slate-600">
              {categoryCopy.analytics.description}
            </p>
          </div>
          <Switch
            checked={draft.analytics}
            onCheckedChange={handleToggle('analytics')}
            aria-label="Analytics cookies"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {categoryCopy.advertising.title}
            </p>
            <p className="text-xs text-slate-600">{advertisingDescription}</p>
          </div>
          <Switch
            checked={draft.advertising}
            onCheckedChange={handleToggle('advertising')}
            aria-label="Advertising cookies"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="primary"
          onClick={() => handleSave(draft)}
        >
          Save preferences
        </Button>
        <Button
          type="button"
          variant="outline"
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
          onClick={() => handleSave(getDefaultConsent())}
        >
          Reject non-essential
        </Button>
        {hasConsent && hasSaved ? (
          <span className="text-xs text-slate-500">Preferences saved.</span>
        ) : null}
      </div>
    </div>
  )
}
