/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unused-vars */
'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { m, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Check,
  Sparkles,
  Home,
  TreePine,
  Zap,
  Waves,
  Building2,
  Mountain,
} from 'lucide-react'

export interface TasteProfileValues {
  aesthetics: string[]
  lifestyle: Record<string, number>
}

interface TasteProfileCollectorProps {
  onSave: (values: TasteProfileValues) => Promise<void>
  initialValues?: TasteProfileValues
}

const AESTHETIC_STYLES = [
  {
    id: 'Modern Minimalist',
    label: 'Modern Minimalist',
    description: 'Clean lines, open spaces, neutral palette',
    icon: Zap,
    gradient: 'from-slate-500/30 to-slate-700/10',
    accentColor: 'text-slate-300',
    borderActive: 'border-slate-400/60',
    checkColor: 'bg-slate-400',
  },
  {
    id: 'Cozy Cottage',
    label: 'Cozy Cottage',
    description: 'Warm textures, charming nooks, storybook feel',
    icon: Home,
    gradient: 'from-amber-600/30 to-amber-800/10',
    accentColor: 'text-amber-300',
    borderActive: 'border-amber-400/60',
    checkColor: 'bg-amber-400',
  },
  {
    id: 'Urban Industrial',
    label: 'Urban Industrial',
    description: 'Exposed brick, metal accents, loft feel',
    icon: Building2,
    gradient: 'from-zinc-500/30 to-zinc-700/10',
    accentColor: 'text-zinc-300',
    borderActive: 'border-zinc-400/60',
    checkColor: 'bg-zinc-400',
  },
  {
    id: 'Classic Colonial',
    label: 'Classic Colonial',
    description: 'Symmetry, columns, timeless American heritage',
    icon: Mountain,
    gradient: 'from-sky-500/30 to-sky-700/10',
    accentColor: 'text-sky-300',
    borderActive: 'border-sky-400/60',
    checkColor: 'bg-sky-400',
  },
  {
    id: 'Mid-Century Modern',
    label: 'Mid-Century Modern',
    description: 'Retro angles, organic forms, bold accents',
    icon: Sparkles,
    gradient: 'from-orange-500/30 to-orange-700/10',
    accentColor: 'text-orange-300',
    borderActive: 'border-orange-400/60',
    checkColor: 'bg-orange-400',
  },
  {
    id: 'Rustic Farmhouse',
    label: 'Rustic Farmhouse',
    description: 'Shiplap, barn doors, cozy and grounded',
    icon: TreePine,
    gradient: 'from-emerald-600/30 to-emerald-800/10',
    accentColor: 'text-emerald-300',
    borderActive: 'border-emerald-400/60',
    checkColor: 'bg-emerald-400',
  },
] as const

type AestheticId = (typeof AESTHETIC_STYLES)[number]['id']

const LIFESTYLE_SLIDERS: ReadonlyArray<{
  key: string
  label: string
  lowLabel: string
  highLabel: string
}> = [
  {
    key: 'walkability',
    label: 'Walkability',
    lowLabel: 'Car-dependent',
    highLabel: 'Walk everywhere',
  },
  {
    key: 'schoolQuality',
    label: 'School Quality',
    lowLabel: 'Not a priority',
    highLabel: 'Top-rated schools',
  },
  {
    key: 'quietNeighborhood',
    label: 'Quiet Neighborhood',
    lowLabel: 'Vibrant & busy',
    highLabel: 'Peaceful & quiet',
  },
  {
    key: 'modernFinishes',
    label: 'Modern Finishes',
    lowLabel: 'Charming & original',
    highLabel: 'Fully updated',
  },
  {
    key: 'budgetSensitivity',
    label: 'Budget Sensitivity',
    lowLabel: 'Best in class',
    highLabel: 'Best value',
  },
]

const DEFAULT_LIFESTYLE: Record<string, number> = {
  walkability: 5,
  schoolQuality: 5,
  quietNeighborhood: 5,
  modernFinishes: 5,
  budgetSensitivity: 5,
}

export function TasteProfileCollector({
  onSave,
  initialValues,
}: TasteProfileCollectorProps) {
  const [selectedAesthetics, setSelectedAesthetics] = useState<
    Set<AestheticId>
  >(new Set((initialValues?.aesthetics ?? []) as AestheticId[]))
  const [lifestyle, setLifestyle] = useState<Record<string, number>>(
    initialValues?.lifestyle ?? { ...DEFAULT_LIFESTYLE }
  )
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const toggleAesthetic = useCallback((id: AestheticId) => {
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

  const handleSliderChange = useCallback((key: string, value: number[]) => {
    setLifestyle((prev) => ({ ...prev, [key]: value[0] }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave({
        aesthetics: Array.from(selectedAesthetics),
        lifestyle,
      })
      setSavedAt(new Date())
    } finally {
      setIsSaving(false)
    }
  }, [onSave, selectedAesthetics, lifestyle])

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-5">
          <h3 className="text-hm-ink text-base font-semibold">
            Your aesthetic
          </h3>
          <p className="text-hm-muted mt-1 text-sm">
            Pick the home styles that speak to you. Select as many as you like.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <AnimatePresence>
                  {isSelected && (
                    <m.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 20,
                      }}
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
                <p className="text-hm-muted mt-0.5 text-xs leading-relaxed">
                  {style.description}
                </p>
              </m.button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h3 className="text-hm-ink text-base font-semibold">
            Lifestyle priorities
          </h3>
          <p className="text-hm-muted mt-1 text-sm">
            Rate each factor from 1 to 10 based on how much it matters to you.
          </p>
        </div>

        <div className="space-y-7">
          {LIFESTYLE_SLIDERS.map((slider) => {
            const value = lifestyle[slider.key] ?? 5
            return (
              <div key={slider.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-hm-ink text-sm font-medium">
                    {slider.label}
                  </p>
                  <span className="text-hm-muted ml-4 min-w-[2ch] text-right text-sm tabular-nums">
                    {value}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[value]}
                  onValueChange={(v) => handleSliderChange(slider.key, v)}
                  aria-label={slider.label}
                  className="w-full"
                />
                <div className="flex justify-between">
                  <span className="text-hm-faint text-[11px]">
                    {slider.lowLabel}
                  </span>
                  <span className="text-hm-faint text-[11px]">
                    {slider.highLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-white/5 pt-6">
        <p className="text-hm-muted text-xs">
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
