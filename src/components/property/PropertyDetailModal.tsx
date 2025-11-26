'use client'

import { Property, Neighborhood } from '@/lib/schemas/property'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Bed,
  Bath,
  Square,
  Home,
  ExternalLink,
  MapPin,
  Calendar,
  Heart,
  X,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { PropertyMap } from '@/components/property/PropertyMap'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { useMutualLikes } from '@/hooks/useCouples'
import { InteractionType } from '@/types/app'

interface PropertyDetailModalProps {
  property: Property | null
  neighborhood?: Neighborhood
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecision?: (propertyId: string, type: InteractionType) => void
}

function buildZillowUrl(property: Property): string {
  if (property.zpid) {
    return `https://www.zillow.com/homedetails/${property.zpid}_zpid/`
  }
  const q = encodeURIComponent(
    `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`
  )
  return `https://www.zillow.com/homes/${q}_rb/`
}

export function PropertyDetailModal({
  property,
  neighborhood,
  open,
  onOpenChange,
  onDecision,
}: PropertyDetailModalProps) {
  const { data: mutualLikes = [] } = useMutualLikes()

  if (!property) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatSquareFeet = (sqft: number | null) => {
    if (!sqft) return '—'
    return new Intl.NumberFormat('en-US').format(sqft)
  }

  const formatCount = (value?: number | null) => {
    if (value == null) return '—'
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(1).replace(/\.0$/, '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-slate-900 p-0 text-white">
        <div className="relative aspect-video w-full">
          <PropertyImage
            src={property.images || undefined}
            alt={property.address || 'Property'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

          {property.property_type && (
            <div className="absolute top-4 left-4">
              <Badge
                variant="secondary"
                className="bg-white/90 text-slate-900 backdrop-blur-sm"
              >
                <Home className="mr-1 h-3 w-3" />
                {property.property_type}
              </Badge>
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <MutualLikesIndicator
              propertyId={property.id}
              mutualLikes={mutualLikes}
              variant="compact"
            />
          </div>

          <a
            href={buildZillowUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 backdrop-blur-sm transition-colors hover:bg-white"
            aria-label="View on Zillow"
          >
            <ExternalLink className="h-5 w-5" />
          </a>

          <div className="absolute bottom-4 left-4">
            <p className="text-3xl font-bold text-white">
              {formatPrice(property.price)}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6 pt-2">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-white">
              {property.address}
            </DialogTitle>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="h-4 w-4" />
              <span>
                {neighborhood?.name || property.city}, {property.state}{' '}
                {property.zip_code}
              </span>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
              <Bed className="mx-auto mb-2 h-6 w-6 text-purple-400" />
              <p className="text-2xl font-bold">
                {formatCount(property.bedrooms)}
              </p>
              <p className="text-xs text-slate-400">Beds</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
              <Bath className="mx-auto mb-2 h-6 w-6 text-purple-400" />
              <p className="text-2xl font-bold">
                {formatCount(property.bathrooms)}
              </p>
              <p className="text-xs text-slate-400">Baths</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
              <Square className="mx-auto mb-2 h-6 w-6 text-purple-400" />
              <p className="text-2xl font-bold">
                {formatSquareFeet(property.square_feet)}
              </p>
              <p className="text-xs text-slate-400">Sq Ft</p>
            </div>
          </div>

          {property.year_built && (
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>Built in {property.year_built}</span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-white">About this home</h3>
            <StorytellingDescription
              property={property}
              neighborhood={neighborhood}
              isMutualLike={mutualLikes.some(
                (ml) => ml.property_id === property.id && ml.liked_by_count >= 2
              )}
              variant="full"
              showLifestyleTags={true}
              showFutureVision={true}
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">Location</h3>
            <PropertyMap
              property={property}
              className="h-48 w-full rounded-xl border border-slate-700"
            />
          </div>

          {onDecision && (
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  onDecision(property.id, 'skip')
                  onOpenChange(false)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/80 bg-red-500 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-200/80"
                aria-label="Pass property"
              >
                <X className="h-6 w-6" strokeWidth={2.5} />
                Pass
              </button>
              <button
                onClick={() => {
                  onDecision(property.id, 'liked')
                  onOpenChange(false)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/80 bg-emerald-500 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200/80"
                aria-label="Like property"
                data-testid="like-button"
              >
                <Heart
                  className="h-6 w-6"
                  strokeWidth={2.5}
                  fill="currentColor"
                />
                Like
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
