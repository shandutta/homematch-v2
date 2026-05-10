'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserProfile } from '@/types/database'
import { UserServiceClient } from '@/lib/services/users-client'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { m, AnimatePresence } from 'framer-motion'
import { Loader2, Check, Sparkles, Home, TreePine, Zap, Waves, Building2, Mountain } from 'lucide-react'
import { toast } from 'sonner'

interface TasteProfileCollectorProps {
  userId: string
  profile: UserProfile
  onProfileUpdate?: (profile: UserProfile) => void
}

interface TasteProfileData {
  aesthetics: string[]
  lifestyle: {
    walkability: number
    schools: number
    quiet: number
    modern: number
    budget: number
  }
  updatedAt?: string
}

const AESTHETIC_STYLES = [
  {
    id: 'modern-minimalist',
    label: 'Modern Minimalist',
    description: 'Clean lines, open spaces, neutral palette',
    icon: Zap,
    gradient: 'from-slate-500/30 to-slate-700/10',
    accentColor: 'text-slate-300',
    borderActive: 'border-slate-400/60',
    checkColor: 'bg-slate-400',
  },
  {
    id: 'traditional-craftsman',
    label: 'Traditional Craftsman',
    description: 'Exposed beams, warm wood, timeless details',
    icon: Home,
    gradient: 'from-amber-600/30 to-amber-800/10',
    accentColor: 'text-amber-300',
    borderActive: 'border-amber-400/60',
    checkColor: 'bg-amber-400',
  },
  {
    id: 'coastal-breezy',
    label: 'Coastal Breezy',
    description: 'Light, airy, natural textures and blues',
    icon: Waves,
    gradient: 'from-sky-500/30 to-sky-700/10',
    accentColor: 'text-sky-300',
    borderActive: 'border-sky-400/60',
    checkColor: 'bg-sky-400',
  },
  {
    id: 'industrial-urban',
    label: 'Industrial Urban',
    description: 'Exposed brick, metal accents, loft feel',
    icon: Building2,
    gradient: 'from-zinc-500/30 to-zinc-700/10',
    accentColor: 'text-zinc-300',
    borderActive: 'border-zinc-400/60',
    checkColor: 'bg-zinc-400',
  },
  {
    id: 'mid-century-modern',
    label: 'Mid-Century Modern',
    description: 'Retro angles, organic forms, bold accents',
    icon: Sparkles,
    gradient: 'from-orange-500/30 to-orange-700/10',
    accentColor: 'text-orange-300',
    borderActive: 'border-orange-400/60',
    checkColor: 'bg-orange-400',
  },
  {
    id: 'rustic-farmhouse',
    label: 'Rustic Farmhouse',
    description: 'Shiplap, barn doors, cozy and grounded',
    icon: TreePine,
    gradient: 'from-emerald-600/30 to-emerald-800/10',
    accentColor: 'text-emerald-300',
    borderActive: 'border-emerald-400/60',
    checkColor: 'bg-emerald-400',
  },
  {
    id: 'mountain-retreat',
    label: 'Mountain Retreat',
    description: 'Stone, cedar, panoramic views, rugged luxury',
    icon: Mountain,
    gradient: 'from-violet-500/30 to-violet-700/10',
    accentColor: 'text-violet-300',
    borderActive: 'border-violet-400/60',
    checkColor: 'bg-violet-400',
  },
] as const

const LIFESTYLE_SLIDERS = [
  {
    key: 'walkability' as const,
    label: 'Walkability',
    lowLabel: 'Car-dependent',
    highLabel: 'Walk everywhere',
    description: 'How important is being able to walk to shops, cafes, and transit?',
  },
  {
    key: 'schools' as const,
    label: 'School District',
    lowLabel: 'Not a priority',
    highLabel: 'Top-rated schools',
    description: 'How much weight do you place on local school ratings?',
  },
  {
    key: 'quiet' as const,
    label: 'Neighborhood Quiet',
    lowLabel: 'Vibrant & busy',
    highLabel: 'Peaceful & quiet',
    description: 'Do you prefer a lively street scene or a tranquil setting?',
  },
  {
    key: 'modern' as const,
    label: 'Modern Amenities',
    lowLabel: 'Charming & original',
    highLabel: 'Fully updated',
    description: 'Would you rather have original character or modern upgrades?',
  },
  {
    key: 'budget' as const,
    label: 'Budget Focus',
    lowLabel: 'Best in class',
    highLabel: 'Best value',
    description: 'Are you chasing quality or maximizing square footage per dollar?',
  },
] as const

const DEFAULT_LIFESTYLE: TasteProfileData['lifestyle'] = {
  walkability: 50,
  schools: 50,
  quiet: 50,
  modern: 50,
  budget: 50,
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

function parseTasteProfile(preferences: unknown): TasteProfileData {
  if (!isRecord(preferences)) {
    return { aesthetics: [], lifestyle: { ...DEFAULT_LIFESTYLE } }
  }
  const raw = preferences.tasteProfile
  if (!isRecord(raw)) {
    return { aesthetics: [], lifestyle: { ...DEFAULT_LIFESTYLE } }
  }

  const aesthetics = Array.isArray(raw.aesthetics)
    ? (raw.aesthetics as unknown[]).filter((a): a is string => typeof a === 'string')
    : []

  const lsRaw = isRecord(raw.lifestyle) ? raw.lifestyle : {}
  const parseSlider = (v: unknown): number => {
    const n = typeof v === 'number' ? v : 50
    return Math.min(100, Math.max(0, n))
  }
  const lifestyle: TasteProfileData['lifestyle'] = {
    walkability: parseSlider(lsRaw.walkability),
    schools: parseSlider(lsRaw.schools),
    quiet: parseSlider(lsRaw.quiet),
    modern: parseSlider(lsRaw.modern),
    budget: parseSlider(lsRaw.budget),
  }

  return { aesthetics, lifestyle }
}

export function TasteProfileCollector({
  userId,
  profile,
  onProfileUpdate,
}: TasteProfileCollectorProps) {
  const initial = parseTasteProfile(profile.preferences)
  const [selectedAesthetics, setSelectedAesthetics] = useState<Set<string>>(
    new Set(initial.aesthetics)
  )
  const [lifestyle, setLifestyle] = useState<TasteProfileData['lifestyle']>(
    initial.lifestyle
  )
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    const parsed = parseTasteProfile(profile.preferences)
    setSelectedAesthetics(new Set(parsed.aesthetics))
    setLifestyle(parsed.lifestyle)
  }, [profile.preferences])

  const toggleAesthetic = useCallback((id: string) => {
    setSelectedAesthetics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSliderChange = useCallback(
    (key: keyof TasteProfileData['lifestyle'], value: number[]) => {
      setLifestyle((prev) => ({ ...prev, [key]: value[0] }))
    },
    []
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const existingPrefs = isRecord(profile.preferences) ? profile.preferences : {}
      const updatedPreferences = {
        ...existingPrefs,
        tasteProfile: {
          aesthetics: Array.from(selectedAesthetics),
          lifestyle,
          updatedAt: new Date().toISOString(),
        },
      }
      const updated = await UserServiceClient.updateProfile(userId, {
        preferences: updatedPreferences,
      })
      onProfileUpdate?.(updated)
      setSavedAt(new Date())
      toast.success('Taste profile saved')
    } catch {
      toast.error('Failed to save taste profile')
    } finally {
      setIsSaving(false)
    }
  }, [userId, selectedAesthetics, lifestyle, profile.preferences, onProfileUpdate])

  return (
    <div className="space-y-10">
      {/* Aesthetic picker */}
      <section>
        <div className="mb-5">
          <h3 className="text-hm-stone-200 text-base font-semibold">
            Your aesthetic
          </h3>
          <p className="text-hm-stone-500 mt-1 text-sm">
            Pick the home styles that speak to you. Select as many as you like.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {AESTHETIC_STYLES.map((style) => {
            const Icon = style.icon
            const isSelected = selectedAesthetics.has(style.id)
            return (
              <m.button
                key={style.id}
                type="button"
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleAesthetic(style.id)}
                className={[
                  'relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200',
                  `bg-gradient-to-br ${style.gradient}`,
                  isSelected
                    ? `${style.borderActive} shadow-lg`
                    : 'border-white/[0.06] hover:border-white/20',
                ].join(' ')}
                aria-pressed={isSelected}
                aria-label={`${style.label}${isSelected ? ' (selected)' : ''}`}
              >
                {/* Checkmark badge */}
                <AnimatePresence>
                  {isSelected && (
                    <m.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full ${style.checkColor}`}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </m.div>
                  )}
                </AnimatePresence>

                <Icon className={`mb-3 h-6 w-6 ${style.accentColor}`} />
                <p className={`text-sm font-medium ${style.accentColor}`}>
                  {style.label}
                </p>
                <p className="text-hm-stone-500 mt-0.5 text-xs leading-relaxed">
                  {style.description}
                </p>
              </m.button>
            )
          })}
        </div>
      </section>

      {/* Lifestyle ranker */}
      <section>
        <div className="mb-5">
          <h3 className="text-hm-stone-200 text-base font-semibold">
            Lifestyle priorities
          </h3>
          <p className="text-hm-stone-500 mt-1 text-sm">
            Drag each slider to reflect how much that factor matters to you.
          </p>
        </div>

        <div className="space-y-7">
          {LIFESTYLE_SLIDERS.map((slider) => (
            <div key={slider.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-hm-stone-200 text-sm font-medium">
                    {slider.label}
                  </p>
                  <p className="text-hm-stone-500 text-xs">
                    {slider.description}
                  </p>
                </div>
                <span className="text-hm-stone-400 ml-4 min-w-[3ch] text-right text-sm tabular-nums">
                  {lifestyle[slider.key]}
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[lifestyle[slider.key]]}
                onValueChange={(v) => handleSliderChange(slider.key, v)}
                aria-label={slider.label}
                className="w-full"
              />
              <div className="flex justify-between">
                <span className="text-hm-stone-600 text-[11px]">
                  {slider.lowLabel}
                </span>
                <span className="text-hm-stone-600 text-[11px]">
                  {slider.highLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-6">
        <p className="text-hm-stone-500 text-xs">
          {savedAt
            ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Unsaved changes'}
        </p>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="border border-amber-500/25 bg-gradient-to-r from-amber-500/30 to-amber-600/20 px-6 text-amber-100 shadow-md shadow-amber-900/25 backdrop-blur-sm hover:border-amber-400/40 hover:from-amber-500/35 hover:to-amber-600/25"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving…' : 'Save taste profile'}
        </Button>
      </div>
    </div>
  )
}
