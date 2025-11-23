'use client'

import { useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserServiceClient } from '@/lib/services/users-client'
import { PROPERTY_TYPE_VALUES } from '@/lib/schemas/property'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface PreferencesSectionProps {
  user: User
  profile: UserProfile
  onProfileUpdate?: (profile: UserProfile) => void
}

type PropertyTypeKey = (typeof PROPERTY_TYPE_VALUES)[number]
type PropertyTypeLegacyKey = 'house' | 'townhouse'
type PropertyTypePreferences = Partial<
  Record<PropertyTypeKey | PropertyTypeLegacyKey, boolean>
>
type MustHaveKey = 'parking' | 'pool' | 'gym' | 'petFriendly'

const PROPERTY_TYPE_LABELS: Record<
  PropertyTypeKey,
  { label: string; helper: string }
> = {
  single_family: {
    label: 'Single Family Home',
    helper: 'Detached homes & standalone properties',
  },
  condo: {
    label: 'Condo/Apartment',
    helper: 'Condo towers & multi-family buildings',
  },
  townhome: {
    label: 'Townhome',
    helper: 'Attached homes with multiple floors',
  },
  multi_family: {
    label: 'Multi-family / Duplex',
    helper: 'Duplexes, triplexes, and small multi-unit homes',
  },
  manufactured: {
    label: 'Manufactured / Mobile',
    helper: 'Mobile, prefab, and manufactured homes',
  },
  land: {
    label: 'Land / Lots',
    helper: 'Empty lots and build-ready parcels',
  },
  other: {
    label: 'Other / Unique',
    helper: 'Mixed-use, investment, or unique spaces',
  },
}

const defaultPropertyTypes: Record<PropertyTypeKey, boolean> =
  PROPERTY_TYPE_VALUES.reduce((acc, type) => {
    acc[type] = true
    return acc
  }, {} as Record<PropertyTypeKey, boolean>)

export function PreferencesSection({
  user,
  profile,
  onProfileUpdate,
}: PreferencesSectionProps) {
  const userService = UserServiceClient
  type LocalPreferences = UserPreferences & {
    priceRange?: [number, number]
    bedrooms?: number
    bathrooms?: number
    propertyTypes?: PropertyTypePreferences
    mustHaves?: Record<string, boolean>
    searchRadius?: number
  }

  const preferences = useMemo(
    () => (profile.preferences || {}) as LocalPreferences,
    [profile.preferences]
  )

  const [loading, setLoading] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>(
    preferences.priceRange || [200000, 800000]
  )
  const [bedrooms, setBedrooms] = useState(preferences.bedrooms || 2)
  const [bathrooms, setBathrooms] = useState(preferences.bathrooms || 2)
  const normalizePropertyTypes = (
    existing?: PropertyTypePreferences
  ): Record<PropertyTypeKey, boolean> => {
    return PROPERTY_TYPE_VALUES.reduce<Record<PropertyTypeKey, boolean>>(
      (acc, type) => {
        const legacyValue =
          type === 'single_family'
            ? existing?.house
            : type === 'townhome'
              ? existing?.townhouse
              : undefined

        acc[type] =
          (existing?.[type] as boolean | undefined) ??
          legacyValue ??
          defaultPropertyTypes[type]
        return acc
      },
      {} as Record<PropertyTypeKey, boolean>
    )
  }

  const [propertyTypes, setPropertyTypes] = useState<
    Record<PropertyTypeKey, boolean>
  >(normalizePropertyTypes(preferences.propertyTypes))
  const [mustHaves, setMustHaves] = useState<Record<MustHaveKey, boolean>>(
    preferences.mustHaves || {
      parking: false,
      pool: false,
      gym: false,
      petFriendly: false,
    }
  )
  const [searchRadius, setSearchRadius] = useState(
    preferences.searchRadius || 10
  )

  const propertyTypeOptions: Array<{
    key: PropertyTypeKey
    label: string
    helper: string
  }> = PROPERTY_TYPE_VALUES.map((type) => ({
    key: type,
    label: PROPERTY_TYPE_LABELS[type].label,
    helper: PROPERTY_TYPE_LABELS[type].helper,
  }))

  const mustHaveOptions: Array<{
    key: MustHaveKey
    label: string
    helper: string
  }> = [
    { key: 'parking', label: 'Parking', helper: 'Garage or assigned space' },
    { key: 'pool', label: 'Pool', helper: 'Community or private pool access' },
    {
      key: 'gym',
      label: 'Gym/Fitness Center',
      helper: 'On-site fitness amenities',
    },
    {
      key: 'petFriendly',
      label: 'Pet Friendly',
      helper: 'Allows pets and has pet amenities',
    },
  ]

  const toPersistedPropertyTypes = (
    types: Record<PropertyTypeKey, boolean>
  ): PropertyTypePreferences => {
    const canonicalTypes = PROPERTY_TYPE_VALUES.reduce<
      PropertyTypePreferences
    >((acc, type) => {
      acc[type] = Boolean(types[type])
      return acc
    }, {})

    return {
      ...canonicalTypes,
      // Legacy compatibility keys
      house: canonicalTypes.single_family,
      townhouse: canonicalTypes.townhome,
    }
  }

  const savePreferences = async () => {
    setLoading(true)
    try {
      const propertyTypesPayload = toPersistedPropertyTypes(propertyTypes)

      const updatedProfile = await userService.updateUserProfile(user.id, {
        preferences: {
          ...preferences,
          priceRange,
          bedrooms,
          bathrooms,
          propertyTypes: propertyTypesPayload,
          mustHaves,
          searchRadius,
        },
      })
      if (updatedProfile && onProfileUpdate) {
        onProfileUpdate(updatedProfile)
      }
      toast.success('Preferences saved successfully')
    } catch (_error) {
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">
            Search Preferences
          </CardTitle>
          <p className="text-sm text-white/70">
            Adjust budget, rooms, and distance limits. These settings power your
            discovery feed instantly.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
              <Label className="text-white/80">
                Price Range: ${priceRange[0].toLocaleString()} - $
                {priceRange[1].toLocaleString()}
              </Label>
              <span className="text-xs text-white/50">
                Drag both handles to narrow your match budget
              </span>
            </div>
            <Slider
              value={priceRange}
              onValueChange={(value) =>
                setPriceRange(value as [number, number])
              }
              min={50000}
              max={2000000}
              step={25000}
              className="[&_[role=slider]]:bg-white"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-white/80">Minimum Bedrooms</Label>
              <Select
                value={bedrooms.toString()}
                onValueChange={(v) => setBedrooms(Number(v))}
              >
                <SelectTrigger
                  className="w-full border-white/20 bg-white/5 text-white"
                  aria-label="Minimum Bedrooms"
                >
                  <SelectValue placeholder="Select bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}+ {num === 1 ? 'Bedroom' : 'Bedrooms'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-white/80">Minimum Bathrooms</Label>
              <Select
                value={bathrooms.toString()}
                onValueChange={(v) => setBathrooms(Number(v))}
              >
                <SelectTrigger
                  className="w-full border-white/20 bg-white/5 text-white"
                  aria-label="Minimum Bathrooms"
                >
                  <SelectValue placeholder="Select bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}+ {num === 1 ? 'Bathroom' : 'Bathrooms'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
              <Label className="text-white/80">
                Search Radius: {searchRadius}{' '}
                {searchRadius === 1 ? 'mile' : 'miles'}
              </Label>
              <span className="text-xs text-white/50">
                Higher radius expands nearby cities and suburbs
              </span>
            </div>
            <Slider
              value={[searchRadius]}
              onValueChange={([value]) => setSearchRadius(value)}
              min={1}
              max={50}
              step={1}
              className="[&_[role=slider]]:bg-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-glassmorphism-style border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">
              Property Types
            </CardTitle>
            <p className="text-sm text-white/70">
              Choose the building styles that suit your lifestyle.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {propertyTypeOptions.map(({ key, label, helper }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
              >
                <div className="space-y-1">
                  <Label
                    htmlFor={key}
                    className="cursor-pointer text-sm font-medium text-white"
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-white/60">{helper}</p>
                </div>
                <Switch
                  id={key}
                  checked={Boolean(propertyTypes[key])}
                  onCheckedChange={(checked) =>
                    setPropertyTypes((prev) => ({ ...prev, [key]: checked }))
                  }
                  aria-label={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-glassmorphism-style border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">
              Must-have Features
            </CardTitle>
            <p className="text-sm text-white/70">
              Lock specific amenities so we only surface qualifying homes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {mustHaveOptions.map(({ key, label, helper }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
              >
                <div className="space-y-1">
                  <Label
                    htmlFor={`must-${key}`}
                    className="cursor-pointer text-sm font-medium text-white"
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-white/60">{helper}</p>
                </div>
                <Switch
                  id={`must-${key}`}
                  checked={Boolean(mustHaves[key])}
                  onCheckedChange={(checked) =>
                    setMustHaves((prev) => ({ ...prev, [key]: checked }))
                  }
                  aria-label={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 shadow-inner backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold">Save and sync</p>
          <p className="text-sm text-white/60">
            Updating preferences immediately refreshes dashboard matches and
            saved searches.
          </p>
        </div>
        <Button
          onClick={savePreferences}
          disabled={loading}
          variant="primary"
          className="px-8 md:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
