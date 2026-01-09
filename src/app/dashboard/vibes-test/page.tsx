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
import {
  Loader2,
  RefreshCw,
  Sparkles,
  DollarSign,
  Clock,
  ExternalLink,
} from 'lucide-react'
import Image from 'next/image'

interface ZillowVibesResponse {
  ok: boolean
  property?: {
    zpid: string
    address: string
    city: string
    state: string
    price: number
    bedrooms: number
    bathrooms: number
    squareFeet: number | null
    propertyType: string
    images: string[]
  }
  vibes?: {
    tagline: string
    vibeStatement: string
    primaryVibes: Array<{ name: string; intensity: number; source: string }>
    lifestyleFits: Array<{ category: string; score: number; reason: string }>
    notableFeatures: Array<{
      feature: string
      location?: string
      appealFactor: string
    }>
    aesthetics: {
      lightingQuality: string
      colorPalette: string[]
      architecturalStyle: string
      overallCondition: string
    }
    emotionalHooks: string[]
    suggestedTags: string[]
  }
  imagesAnalyzed?: Array<{ url: string; category: string }>
  usage?: {
    estimatedCostUsd: number
    inputTokens: number
    outputTokens: number
  }
  processingTimeMs?: number
  error?: string
}

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
    skipped?: number
    totalCostUsd: number
    totalTimeMs: number
  }
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isPropertyVibesData = (value: unknown): value is PropertyVibesData =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.property_id === 'string'

const isGenerateResponse = (value: unknown): value is GenerateResponse =>
  isRecord(value) && typeof value.ok === 'boolean'

const isZillowVibesResponse = (value: unknown): value is ZillowVibesResponse =>
  isRecord(value) && typeof value.ok === 'boolean'

export default function VibesTestPage() {
  const [cronSecret, setCronSecret] = useState('')
  const [zillowInput, setZillowInput] = useState('')
  const [propertyIdInput, setPropertyIdInput] = useState('')
  const [zillowResult, setZillowResult] = useState<ZillowVibesResponse | null>(
    null
  )
  const queryClient = useQueryClient()

  // Fetch existing vibes
  const { data: vibesData, isLoading: vibesLoading } = useQuery({
    queryKey: ['property-vibes-test'],
    queryFn: async () => {
      const response = await fetch('/api/properties/vibes?limit=20')
      if (!response.ok) throw new Error('Failed to fetch vibes')
      const data: unknown = await response.json()
      const items =
        isRecord(data) && Array.isArray(data.data)
          ? data.data.filter(isPropertyVibesData)
          : []
      return { data: items }
    },
  })

  // Generate vibes mutation
  const generateMutation = useMutation({
    mutationFn: async (params: {
      count?: number
      diverse?: boolean
      propertyIds?: string[]
      force?: boolean
    }) => {
      const searchParams = new URLSearchParams()
      if (params.count) searchParams.set('count', params.count.toString())
      if (params.diverse != null)
        searchParams.set('diverse', params.diverse.toString())
      if (params.force) searchParams.set('force', 'true')
      searchParams.set('cron_secret', cronSecret)

      const body = params.propertyIds
        ? JSON.stringify({
            propertyIds: params.propertyIds,
            force: params.force,
          })
        : undefined

      const response = await fetch(
        `/api/admin/generate-vibes?${searchParams.toString()}`,
        {
          method: 'POST',
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body,
        }
      )
      if (!response.ok) {
        const errorData: unknown = await response.json()
        const message =
          isRecord(errorData) && typeof errorData.error === 'string'
            ? errorData.error
            : 'Failed to generate vibes'
        throw new Error(message)
      }
      const data: unknown = await response.json()
      return isGenerateResponse(data)
        ? data
        : { ok: false, error: 'Invalid response' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-vibes-test'] })
    },
  })

  // Generate vibes from Zillow listing
  const zillowMutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await fetch(
        `/api/admin/generate-vibes-zillow?cron_secret=${cronSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zillowUrl: input }),
        }
      )
      const data: unknown = await response.json()
      const parsed = isZillowVibesResponse(data)
        ? data
        : { ok: false, error: 'Invalid response' }
      if (!response.ok) {
        throw new Error(parsed.error || 'Failed to generate vibes from Zillow')
      }
      return parsed
    },
    onSuccess: (data) => {
      setZillowResult(data)
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
          <CardDescription className="text-slate-300">
            Generate vibes for properties using Qwen 3 VL vision (cheap, high
            quality)
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

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Property ID to regenerate"
              value={propertyIdInput}
              onChange={(e) => setPropertyIdInput(e.target.value)}
              className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={() =>
                generateMutation.mutate({
                  propertyIds: [propertyIdInput.trim()],
                  force: true,
                })
              }
              disabled={
                generateMutation.isPending ||
                !cronSecret ||
                !propertyIdInput.trim()
              }
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
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
              {generateMutation.data.summary.skipped ? (
                <span className="text-slate-400">
                  {' '}
                  ({generateMutation.data.summary.skipped} skipped)
                </span>
              ) : null}
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

      {/* Zillow Testing */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ExternalLink className="h-5 w-5" />
            Test with Real Zillow Listing
          </CardTitle>
          <CardDescription className="text-slate-300">
            Paste a Zillow URL or zpid to generate vibes from a real listing
            (preview only, not saved)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Zillow URL or zpid (e.g., 12345678 or https://zillow.com/...)"
              value={zillowInput}
              onChange={(e) => setZillowInput(e.target.value)}
              className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={() => zillowMutation.mutate(zillowInput)}
              disabled={
                zillowMutation.isPending || !cronSecret || !zillowInput.trim()
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {zillowMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Vibes
                </>
              )}
            </Button>
          </div>

          {zillowMutation.isError && (
            <div className="rounded-md bg-red-900/30 p-3 text-red-300">
              Error: {zillowMutation.error.message}
            </div>
          )}

          {zillowResult && zillowResult.ok && (
            <ZillowResultCard result={zillowResult} />
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

function ZillowResultCard({ result }: { result: ZillowVibesResponse }) {
  const { property, vibes, imagesAnalyzed, usage, processingTimeMs } = result
  if (!property || !vibes) return null

  return (
    <div className="space-y-4 rounded-lg border border-blue-600/30 bg-slate-900/50 p-4">
      {/* Property Header */}
      <div className="flex gap-4">
        {property.images?.[0] && (
          <div className="relative h-32 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-slate-700">
            <Image
              src={property.images[0]}
              alt={property.address}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs text-blue-400">zpid: {property.zpid}</p>
          <h3 className="text-lg font-bold text-white">{property.address}</h3>
          <p className="text-slate-400">
            {property.city}, {property.state}
          </p>
          <p className="mt-1 text-white">
            ${property.price?.toLocaleString()} • {property.bedrooms}bd{' '}
            {property.bathrooms}ba
            {property.squareFeet &&
              ` • ${property.squareFeet.toLocaleString()} sqft`}
          </p>
          <p className="text-sm text-slate-500">{property.propertyType}</p>
        </div>
      </div>

      {/* Generated Vibes */}
      <div className="space-y-3 border-t border-slate-700 pt-4">
        <h4 className="text-lg font-semibold text-blue-400">{vibes.tagline}</h4>
        <p className="text-sm text-slate-400 italic">{vibes.vibeStatement}</p>

        {/* Primary Vibes */}
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            Primary Vibes
          </p>
          <div className="flex flex-wrap gap-2">
            {vibes.primaryVibes?.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-blue-900/30 px-3 py-1"
              >
                <span className="text-sm text-blue-200">{v.name}</span>
                <span className="text-xs text-blue-400">
                  {Math.round(v.intensity * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Tags */}
        <div className="flex flex-wrap gap-1">
          {vibes.suggestedTags?.map((tag) => (
            <Badge key={tag} className="bg-blue-600/50 text-blue-200">
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
            {vibes.notableFeatures?.slice(0, 4).map((f, i) => (
              <li key={i}>
                <span className="font-medium text-white">{f.feature}</span>
                {f.location && (
                  <span className="text-slate-500"> ({f.location})</span>
                )}
                <span className="text-slate-400"> — {f.appealFactor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Lifestyle Fits */}
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            Lifestyle Fits
          </p>
          <div className="grid grid-cols-2 gap-2">
            {vibes.lifestyleFits?.slice(0, 4).map((fit, i) => (
              <div key={i} className="rounded bg-slate-800/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {fit.category}
                  </span>
                  <span className="text-xs text-blue-400">
                    {Math.round(fit.score * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">{fit.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emotional Hooks */}
        {vibes.emotionalHooks && vibes.emotionalHooks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Lifestyle Moments
            </p>
            <ul className="space-y-1 text-sm text-slate-400 italic">
              {vibes.emotionalHooks.map((hook, i) => (
                <li key={i}>&quot;{hook}&quot;</li>
              ))}
            </ul>
          </div>
        )}

        {/* Aesthetics */}
        {vibes.aesthetics && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Aesthetics
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                {vibes.aesthetics.architecturalStyle}
              </span>
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                {vibes.aesthetics.lightingQuality.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                {vibes.aesthetics.overallCondition.replace(/_/g, ' ')}
              </span>
              {vibes.aesthetics.colorPalette?.map((color, i) => (
                <span
                  key={i}
                  className="rounded bg-slate-800 px-2 py-1 text-slate-300"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Images Analyzed */}
        {imagesAnalyzed && imagesAnalyzed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Images Analyzed ({imagesAnalyzed.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imagesAnalyzed.map((img, i) => (
                <div
                  key={i}
                  className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-slate-700"
                >
                  <Image
                    src={img.url}
                    alt={img.category}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute right-0 bottom-0 left-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                    {img.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-500">
          {usage && (
            <>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />$
                {usage.estimatedCostUsd.toFixed(4)}
              </span>
              <span>{usage.inputTokens + usage.outputTokens} tokens</span>
            </>
          )}
          {processingTimeMs && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(processingTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
