'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PropertyImage } from '@/components/ui/property-image'
import { X } from 'lucide-react'
import { dashboardTokens } from '@/lib/styles/dashboard-tokens'

export interface CompareLike {
  property_id: string
  liked_by_count: number
  last_liked_at: string
  property?: {
    address?: string
    price?: number
    bedrooms?: number
    bathrooms?: number
    square_feet?: number
    images?: string[]
    image_urls?: string[]
  }
}

interface MutualLikesComparePanelProps {
  selected: CompareLike[]
  onRemove: (propertyId: string) => void
  onClose: () => void
}

const formatPrice = (price?: number) =>
  typeof price === 'number' ? `$${Math.round(price / 1000)}k` : '—'

const formatNumber = (value?: number, suffix = '') =>
  typeof value === 'number' ? `${value.toLocaleString()}${suffix}` : '—'

const RowLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-hm-faint text-xs tracking-wide uppercase">
    {children}
  </div>
)

const valueClass = (
  numbers: Array<number | undefined>,
  current: number | undefined,
  prefer: 'low' | 'high'
) => {
  const filtered = numbers.filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n)
  )
  if (filtered.length < 2 || typeof current !== 'number') {
    return 'text-hm-ink'
  }
  const target =
    prefer === 'low' ? Math.min(...filtered) : Math.max(...filtered)
  return current === target
    ? 'text-couples-primary font-semibold'
    : 'text-hm-ink'
}

export function MutualLikesComparePanel({
  selected,
  onRemove,
  onClose,
}: MutualLikesComparePanelProps) {
  if (selected.length === 0) return null

  const prices = selected.map((like) => like.property?.price)
  const beds = selected.map((like) => like.property?.bedrooms)
  const baths = selected.map((like) => like.property?.bathrooms)
  const sqfts = selected.map((like) => like.property?.square_feet)
  const likedByCounts = selected.map((like) => like.liked_by_count)

  return (
    <Card
      className="border-white/10"
      data-testid="mutual-likes-compare-panel"
      style={{
        backgroundColor: dashboardTokens.colors.background.cardDark,
        borderColor: dashboardTokens.colors.secondary[700],
      }}
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-hm-ink text-base font-semibold">
              Comparing {selected.length}{' '}
              {selected.length === 1 ? 'home' : 'homes'}
            </h2>
            <p className="text-hm-faint text-xs">
              Best value highlighted per row.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-hm-ink-soft hover:text-white"
            onClick={onClose}
            data-testid="compare-panel-close"
          >
            Close
          </Button>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))`,
          }}
        >
          {selected.map((like) => (
            <div
              key={like.property_id}
              className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3"
              data-testid={`compare-card-${like.property_id}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-white/10">
                  <PropertyImage
                    src={like.property?.images || like.property?.image_urls}
                    alt={like.property?.address || 'Property'}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/properties/${like.property_id}?returnTo=/dashboard/mutual-likes`}
                    className="text-hm-ink block truncate text-sm font-semibold hover:underline"
                  >
                    {like.property?.address ||
                      `Property ${like.property_id.slice(0, 8)}`}
                  </Link>
                  <p className="text-hm-faint text-xs">
                    {like.liked_by_count} likes
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${
                    like.property?.address || 'property'
                  } from comparison`}
                  className="text-hm-muted rounded-md p-1 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => onRemove(like.property_id)}
                  data-testid={`compare-remove-${like.property_id}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <RowLabel>Price</RowLabel>
                  <div
                    className={valueClass(prices, like.property?.price, 'low')}
                  >
                    {formatPrice(like.property?.price)}
                  </div>
                </div>
                <div>
                  <RowLabel>Beds</RowLabel>
                  <div
                    className={valueClass(
                      beds,
                      like.property?.bedrooms,
                      'high'
                    )}
                  >
                    {formatNumber(like.property?.bedrooms)}
                  </div>
                </div>
                <div>
                  <RowLabel>Baths</RowLabel>
                  <div
                    className={valueClass(
                      baths,
                      like.property?.bathrooms,
                      'high'
                    )}
                  >
                    {formatNumber(like.property?.bathrooms)}
                  </div>
                </div>
                <div>
                  <RowLabel>Sqft</RowLabel>
                  <div
                    className={valueClass(
                      sqfts,
                      like.property?.square_feet,
                      'high'
                    )}
                  >
                    {formatNumber(like.property?.square_feet)}
                  </div>
                </div>
                <div>
                  <RowLabel>Likes</RowLabel>
                  <div
                    className={valueClass(
                      likedByCounts,
                      like.liked_by_count,
                      'high'
                    )}
                  >
                    {like.liked_by_count}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
