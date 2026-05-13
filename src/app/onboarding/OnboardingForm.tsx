'use client'

/**
 * ONBOARDING-001: preference-collection form, client side.
 *
 * Stays intentionally lightweight — every field is optional, and the
 * "Skip for now" button still flips onboarding_completed so the dashboard
 * never redirects the user back here. The minimum-viable data we want is
 * a city + a price range; everything else is gravy.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'

type HouseholdType = 'solo' | 'couple' | 'family' | 'roommates'

interface SubmitPayload {
  cities?: Array<{ city: string; state: string }>
  priceRange?: [number, number]
  bedrooms?: number
  bathrooms?: number
  householdType?: HouseholdType
  markCompleted?: boolean
}

const DEFAULT_MIN_PRICE = 250_000
const DEFAULT_MAX_PRICE = 1_500_000
const ABSOLUTE_MAX_PRICE = 5_000_000

const formatPrice = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${Math.round(v / 1000)}k`

const parseCityInput = (
  raw: string
): Array<{ city: string; state: string }> => {
  // Accepts "San Francisco, CA" or "San Francisco, CA; Oakland, CA"
  return raw
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [cityRaw, stateRaw] = part.split(',').map((s) => s.trim())
      if (!cityRaw || !stateRaw) return null
      // Accept the 2-letter code only; if longer, drop.
      const state = stateRaw.toUpperCase().slice(0, 2)
      return state.length === 2 ? { city: cityRaw, state } : null
    })
    .filter((c): c is { city: string; state: string } => Boolean(c))
}

export function OnboardingForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([
    DEFAULT_MIN_PRICE,
    DEFAULT_MAX_PRICE,
  ])
  const [bedrooms, setBedrooms] = useState(2)
  const [bathrooms, setBathrooms] = useState(2)
  const [householdType, setHouseholdType] = useState<HouseholdType>('couple')

  const submit = async (payload: SubmitPayload, label: string) => {
    const res = await fetch('/api/users/preferences', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res
        .json()
        .then((j) => (typeof j?.error === 'string' ? j.error : null))
        .catch(() => null)
      throw new Error(err || `${label} failed: HTTP ${res.status}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const cities = parseCityInput(cityInput)
      await submit(
        {
          ...(cities.length ? { cities } : {}),
          priceRange,
          bedrooms,
          bathrooms,
          householdType,
        },
        'Save'
      )
      toast.success('Got it. Let&rsquo;s find your home.')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'We could not save your preferences. Try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSkipping(true)
    try {
      await submit({ markCompleted: true }, 'Skip')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'We could not skip onboarding. Try again.'
      )
    } finally {
      setSkipping(false)
    }
  }

  const disabled = submitting || skipping

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-[0_25px_90px_rgba(2,10,31,0.5)] backdrop-blur sm:p-8"
    >
      <section className="space-y-2">
        <Label htmlFor="cities" className="text-sm font-medium text-white">
          Where are you searching?
        </Label>
        <Input
          id="cities"
          name="cities"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="San Francisco, CA"
          autoComplete="off"
          disabled={disabled}
          className="bg-white/5 text-white placeholder:text-white/40"
        />
        <p className="text-xs text-white/50">
          One per line, or separate with semicolons.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-white">Budget range</Label>
          <span className="text-xs text-white/70">
            {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
          </span>
        </div>
        <Slider
          min={0}
          max={ABSOLUTE_MAX_PRICE}
          step={25_000}
          value={priceRange}
          onValueChange={(v) => {
            if (v.length === 2) {
              setPriceRange([v[0]!, v[1]!])
            }
          }}
          disabled={disabled}
        />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">
            Bedrooms (min)
          </Label>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBedrooms(n)}
                disabled={disabled}
                aria-pressed={bedrooms === n}
                className={[
                  'h-10 w-10 rounded-full border text-sm transition',
                  bedrooms === n
                    ? 'border-cyan-300 bg-cyan-300/20 text-white'
                    : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]',
                ].join(' ')}
              >
                {n === 5 ? '5+' : n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">
            Bathrooms (min)
          </Label>
          <div className="flex items-center gap-2">
            {[1, 1.5, 2, 2.5, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBathrooms(n)}
                disabled={disabled}
                aria-pressed={bathrooms === n}
                className={[
                  'h-10 rounded-full border px-3 text-sm transition',
                  bathrooms === n
                    ? 'border-cyan-300 bg-cyan-300/20 text-white'
                    : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium text-white">
          Who&rsquo;s searching with you?
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              'solo',
              'couple',
              'family',
              'roommates',
            ] as const satisfies readonly HouseholdType[]
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setHouseholdType(t)}
              disabled={disabled}
              aria-pressed={householdType === t}
              className={[
                'rounded-xl border px-3 py-2 text-sm capitalize transition',
                householdType === t
                  ? 'border-cyan-300 bg-cyan-300/20 text-white'
                  : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]',
              ].join(' ')}
            >
              {t === 'roommates' ? 'Roommates' : t}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={handleSkip}
          className="text-white/70 hover:bg-white/5 hover:text-white"
        >
          {skipping ? 'Skipping…' : 'Skip for now'}
        </Button>
        <Button type="submit" disabled={disabled}>
          {submitting ? 'Saving…' : 'Save and start swiping'}
        </Button>
      </div>
    </form>
  )
}
