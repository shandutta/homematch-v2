'use client'

import { useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
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
import {
  Loader2,
  Save,
  DollarSign,
  Bed,
  Bath,
  MapPin,
  Home,
  Car,
  Waves,
  Dumbbell,
  PawPrint,
} from 'lucide-react'
import { motion } from 'framer-motion'

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
  PROPERTY_TYPE_VALUES.reduce(
    (acc, type) => {
      acc[type] = true
      return acc
    },
    {} as Record<PropertyTypeKey, boolean>
  )

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
    icon: typeof Car
  }> = [
    {
      key: 'parking',
      label: 'Parking',
      helper: 'Garage or assigned space',
      icon: Car,
    },
    {
      key: 'pool',
      label: 'Pool',
      helper: 'Community or private pool access',
      icon: Waves,
    },
    {
      key: 'gym',
      label: 'Gym/Fitness Center',
      helper: 'On-site fitness amenities',
      icon: Dumbbell,
    },
    {
      key: 'petFriendly',
      label: 'Pet Friendly',
      helper: 'Allows pets and has pet amenities',
      icon: PawPrint,
    },
  ]

  const toPersistedPropertyTypes = (
    types: Record<PropertyTypeKey, boolean>
  ): PropertyTypePreferences => {
    const canonicalTypes = PROPERTY_TYPE_VALUES.reduce<PropertyTypePreferences>(
      (acc, type) => {
        acc[type] = Boolean(types[type])
        return acc
      },
      {}
    )

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
    <div className="space-y-8">
      {/* Search Preferences */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Search Preferences
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Adjust budget, rooms, and distance limits
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-hm-stone-300 flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Price Range
              </Label>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                ${priceRange[0].toLocaleString()} - $
                {priceRange[1].toLocaleString()}
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
              className="[&_.relative]:bg-white/10 [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-gradient-to-r [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:from-emerald-500 [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:to-emerald-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:bg-white"
            />
            <p className="text-hm-stone-500 text-xs">
              Drag both handles to narrow your match budget
            </p>
          </div>

          {/* Bedrooms and Bathrooms */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-hm-stone-300 flex items-center gap-2 text-sm">
                <Bed className="h-4 w-4 text-sky-400" />
                Minimum Bedrooms
              </Label>
              <Select
                value={bedrooms.toString()}
                onValueChange={(v) => setBedrooms(Number(v))}
              >
                <SelectTrigger
                  className="text-hm-stone-200 w-full rounded-xl border-white/10 bg-white/5"
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
              <Label className="text-hm-stone-300 flex items-center gap-2 text-sm">
                <Bath className="h-4 w-4 text-violet-400" />
                Minimum Bathrooms
              </Label>
              <Select
                value={bathrooms.toString()}
                onValueChange={(v) => setBathrooms(Number(v))}
              >
                <SelectTrigger
                  className="text-hm-stone-200 w-full rounded-xl border-white/10 bg-white/5"
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

          {/* Search Radius */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-hm-stone-300 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-amber-400" />
                Search Radius
              </Label>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                {searchRadius} {searchRadius === 1 ? 'mile' : 'miles'}
              </span>
            </div>
            <Slider
              value={[searchRadius]}
              onValueChange={([value]) => setSearchRadius(value)}
              min={1}
              max={50}
              step={1}
              className="[&_.relative]:bg-white/10 [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-gradient-to-r [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:from-amber-500 [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:to-amber-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:bg-white"
            />
            <p className="text-hm-stone-500 text-xs">
              Higher radius expands nearby cities and suburbs
            </p>
          </div>
        </div>
      </div>

      {/* Property Types and Must-Haves */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Types */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
              <Home className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-hm-stone-200 font-medium">Property Types</h3>
              <p className="text-hm-stone-500 text-xs">
                Choose building styles that suit you
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {propertyTypeOptions.map(({ key, label, helper }) => (
              <motion.div
                key={key}
                whileHover={{ x: 2 }}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <Label
                    htmlFor={key}
                    className="text-hm-stone-200 cursor-pointer text-sm font-medium"
                  >
                    {label}
                  </Label>
                  <p className="text-hm-stone-500 mt-0.5 truncate text-xs">
                    {helper}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={Boolean(propertyTypes[key])}
                  onCheckedChange={(checked) =>
                    setPropertyTypes((prev) => ({ ...prev, [key]: checked }))
                  }
                  aria-label={label}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Must-Have Features */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Car className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-hm-stone-200 font-medium">
                Must-have Features
              </h3>
              <p className="text-hm-stone-500 text-xs">
                Lock in specific amenities
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {mustHaveOptions.map(({ key, label, helper, icon: Icon }) => (
              <motion.div
                key={key}
                whileHover={{ x: 2 }}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                    <Icon className="text-hm-stone-400 h-4 w-4" />
                  </div>
                  <div>
                    <Label
                      htmlFor={`must-${key}`}
                      className="text-hm-stone-200 cursor-pointer text-sm font-medium"
                    >
                      {label}
                    </Label>
                    <p className="text-hm-stone-500 text-xs">{helper}</p>
                  </div>
                </div>
                <Switch
                  id={`must-${key}`}
                  checked={Boolean(mustHaves[key])}
                  onCheckedChange={(checked) =>
                    setMustHaves((prev) => ({ ...prev, [key]: checked }))
                  }
                  aria-label={label}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-hm-stone-200 font-medium">Save and sync</p>
          <p className="text-hm-stone-500 text-sm">
            Updating preferences immediately refreshes dashboard matches
          </p>
        </div>
        <Button
          onClick={savePreferences}
          disabled={loading}
          className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 disabled:opacity-50"
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
