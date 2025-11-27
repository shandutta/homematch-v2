'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2, RefreshCw, Sparkles, DollarSign, Clock } from 'lucide-react'
import Image from 'next/image'

interface PropertyVibesData {
  id: string
  property_id: string
  tagline: string
  vibe_statement: string
  feature_highlights: Array<{
    feature: string
    location?: string
    appealFactor: string
  }>
  lifestyle_fits: Array<{
    category: string
    score: number
    reason: string
  }>
  suggested_tags: string[]
  emotional_hooks: string[]
  primary_vibes: Array<{
    name: string
    intensity: number
    source: string
  }>
  aesthetics: {
    lightingQuality: string
    colorPalette: string[]
    architecturalStyle: string
    overallCondition: string
  } | null
  model_used: string
  images_analyzed: string[]
  generation_cost_usd: number
  confidence: number
  properties: {
    id: string
    address: string
    city: string
    state: string
    price: number
    bedrooms: number
    bathrooms: number
    square_feet: number | null
    property_type: string
    images: string[]
  }
}

interface GenerateResponse {
  ok: boolean
  summary?: {
    total: number
    success: number
    failed: number
    totalCostUsd: number
    totalTimeMs: number
  }
  error?: string
}

export default function VibesTestPage() {
  const [cronSecret, setCronSecret] = useState('')
  const queryClient = useQueryClient()

  // Fetch existing vibes
  const { data: vibesData, isLoading: vibesLoading } = useQuery({
    queryKey: ['property-vibes-test'],
    queryFn: async () => {
      const response = await fetch('/api/properties/vibes?limit=20')
      if (!response.ok) throw new Error('Failed to fetch vibes')
      return response.json() as Promise<{ data: PropertyVibesData[] }>
    },
  })

  // Generate vibes mutation
  const generateMutation = useMutation({
    mutationFn: async (params: { count: number; diverse: boolean }) => {
      const response = await fetch(
        `/api/admin/generate-vibes?count=${params.count}&diverse=${params.diverse}&cron_secret=${cronSecret}`,
        { method: 'POST' }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate vibes')
      }
      return response.json() as Promise<GenerateResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-vibes-test'] })
    },
  })

  const vibes = vibesData?.data || []
  const totalCost = vibes.reduce(
    (sum, v) => sum + (v.generation_cost_usd || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vibes Test Page</h1>
          <p className="text-slate-400">
            Review LLM-generated property vibes before production rollout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-slate-300">
            {vibes.length} properties with vibes
          </Badge>
          {totalCost > 0 && (
            <Badge variant="outline" className="text-green-400">
              <DollarSign className="mr-1 h-3 w-3" />
              {totalCost.toFixed(4)} total cost
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Generate Vibes</CardTitle>
          <CardDescription>
            Generate vibes for properties using GPT-4o-mini vision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="password"
              placeholder="Cron Secret"
              value={cronSecret}
              onChange={(e) => setCronSecret(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={() =>
                generateMutation.mutate({ count: 20, diverse: true })
              }
              disabled={generateMutation.isPending || !cronSecret}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 20 Diverse
                </>
              )}
            </Button>
            <Button
              onClick={() =>
                generateMutation.mutate({ count: 5, diverse: false })
              }
              disabled={generateMutation.isPending || !cronSecret}
              variant="outline"
              className="border-slate-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Quick Test (5)
            </Button>
          </div>

          {generateMutation.isSuccess && generateMutation.data.summary && (
            <div className="rounded-md bg-green-900/30 p-3 text-green-300">
              Generated {generateMutation.data.summary.success} vibes
              {generateMutation.data.summary.failed > 0 && (
                <span className="text-yellow-400">
                  {' '}
                  ({generateMutation.data.summary.failed} failed)
                </span>
              )}
              <span className="ml-2 text-slate-400">
                Cost: ${generateMutation.data.summary.totalCostUsd.toFixed(4)} |
                Time:{' '}
                {(generateMutation.data.summary.totalTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}

          {generateMutation.isError && (
            <div className="rounded-md bg-red-900/30 p-3 text-red-300">
              Error: {generateMutation.error.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vibes Grid */}
      {vibesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : vibes.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-500" />
            <p className="text-slate-400">
              No vibes generated yet. Enter your cron secret and click generate.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {vibes.map((vibe) => (
            <VibesCard key={vibe.id} vibe={vibe} />
          ))}
        </div>
      )}
    </div>
  )
}

function VibesCard({ vibe }: { vibe: PropertyVibesData }) {
  const property = vibe.properties
  const heroImage = vibe.images_analyzed?.[0] || property?.images?.[0]

  return (
    <Card className="overflow-hidden border-slate-700 bg-slate-800/50">
      {/* Property Image */}
      <div className="relative h-48 bg-slate-700">
        {heroImage && (
          <Image
            src={heroImage}
            alt={property?.address || 'Property'}
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-sm text-slate-300">
            {property?.address}, {property?.city}
          </p>
          <p className="text-lg font-bold text-white">
            ${property?.price?.toLocaleString()} • {property?.bedrooms}bd{' '}
            {property?.bathrooms}ba
          </p>
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        {/* Tagline */}
        <div>
          <h3 className="text-lg font-semibold text-white">{vibe.tagline}</h3>
          <p className="text-sm text-slate-400 italic">{vibe.vibe_statement}</p>
        </div>

        {/* Primary Vibes */}
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            Primary Vibes
          </p>
          <div className="flex flex-wrap gap-2">
            {vibe.primary_vibes?.slice(0, 4).map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-slate-700/50 px-3 py-1"
              >
                <span className="text-sm text-white">{v.name}</span>
                <span className="text-xs text-slate-400">
                  (
                  {v.source === 'both'
                    ? '↔'
                    : v.source === 'interior'
                      ? '🏠'
                      : '🌳'}
                  )
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Tags */}
        <div className="flex flex-wrap gap-1">
          {vibe.suggested_tags?.map((tag) => (
            <Badge key={tag} className="bg-purple-600/50 text-purple-200">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Notable Features */}
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            Notable Features
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {vibe.feature_highlights?.slice(0, 3).map((f, i) => (
              <li key={i}>
                <span className="font-medium text-white">{f.feature}</span>
                {f.location && (
                  <span className="text-slate-500"> ({f.location})</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Emotional Hooks */}
        {vibe.emotional_hooks && vibe.emotional_hooks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Lifestyle Moments
            </p>
            <ul className="space-y-1 text-sm text-slate-400 italic">
              {vibe.emotional_hooks.slice(0, 2).map((hook, i) => (
                <li key={i}>&quot;{hook}&quot;</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {vibe.generation_cost_usd?.toFixed(4) || '0.0000'}
          </span>
          <span>{vibe.model_used}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {vibe.images_analyzed?.length || 0} images
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
