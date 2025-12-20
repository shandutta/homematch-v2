'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Neighborhood, UserProfile, UserPreferences } from '@/types/database'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserServiceClient } from '@/lib/services/users-client'
import {
  LocationsClient,
  type CityOption,
} from '@/lib/services/locations-client'
import { PROPERTY_TYPE_VALUES } from '@/lib/schemas/property'
import {
  DEFAULT_BATHROOMS,
  DEFAULT_BEDROOMS,
  DEFAULT_PRICE_RANGE,
  DEFAULT_SEARCH_RADIUS,
} from '@/lib/constants/preferences'
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
  onSaveStateChange?: (state: SaveState) => void
}

type PropertyTypeKey = (typeof PROPERTY_TYPE_VALUES)[number]
type PropertyTypeLegacyKey = 'house' | 'townhouse'
type PropertyTypePreferences = Partial<
  Record<PropertyTypeKey | PropertyTypeLegacyKey, boolean>
>
type MustHaveKey = 'parking' | 'pool' | 'gym' | 'petFriendly'

type SaveState = {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt?: Date | null
}

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

const MUST_HAVE_LABELS: Record<MustHaveKey, string> = {
  parking: 'Parking',
  pool: 'Pool',
  gym: 'Gym',
  petFriendly: 'Pet Friendly',
}

const defaultPropertyTypes: Record<PropertyTypeKey, boolean> =
  PROPERTY_TYPE_VALUES.reduce(
    (acc, type) => {
      acc[type] = true
      return acc
    },
    {} as Record<PropertyTypeKey, boolean>
  )

const cityKey = (city: CityOption) =>
  `${city.city.toLowerCase()}|${city.state.toLowerCase()}`

export function PreferencesSection({
  user,
  profile,
  onProfileUpdate,
  onSaveStateChange,
}: PreferencesSectionProps) {
  const userService = UserServiceClient
  type LocalPreferences = UserPreferences & {
    priceRange?: [number, number]
    bedrooms?: number
    bathrooms?: number
    propertyTypes?: PropertyTypePreferences
    mustHaves?: Record<string, boolean>
    searchRadius?: number
    cities?: CityOption[]
    neighborhoods?: string[]
  }

  const preferences = useMemo(
    () => (profile.preferences || {}) as LocalPreferences,
    [profile.preferences]
  )

  const [loading, setLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false)
  const [availableCities, setAvailableCities] = useState<CityOption[]>([])
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<
    Neighborhood[]
  >([])
  const [citySearch, setCitySearch] = useState('')
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>(
    preferences.priceRange || DEFAULT_PRICE_RANGE
  )
  const [bedrooms, setBedrooms] = useState(
    preferences.bedrooms || DEFAULT_BEDROOMS
  )
  const [bathrooms, setBathrooms] = useState(
    preferences.bathrooms || DEFAULT_BATHROOMS
  )
  const normalizePropertyTypes = useCallback(
    (existing?: PropertyTypePreferences): Record<PropertyTypeKey, boolean> => {
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
    },
    []
  )

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
    preferences.searchRadius || DEFAULT_SEARCH_RADIUS
  )
  const [selectedCities, setSelectedCities] = useState<CityOption[]>(
    preferences.cities || []
  )
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    preferences.neighborhoods || []
  )
  const [showSelectedCitiesOnly, setShowSelectedCitiesOnly] = useState(false)
  const [showSelectedNeighborhoodsOnly, setShowSelectedNeighborhoodsOnly] =
    useState(false)
  const [savedSearchName, setSavedSearchName] = useState('')
  const [savingSearch, setSavingSearch] = useState(false)

  const autoSelectedCitiesRef = useRef<Set<string>>(new Set())

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

  useEffect(() => {
    let cancelled = false

    const loadCities = async () => {
      setCitiesLoading(true)
      try {
        const cities = await LocationsClient.getCities()
        if (!cancelled) setAvailableCities(cities)
      } catch (_error) {
        toast.error('Failed to load cities')
      } finally {
        if (!cancelled) setCitiesLoading(false)
      }
    }

    void loadCities()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadNeighborhoods = async () => {
      if (selectedCities.length === 0) {
        setAvailableNeighborhoods([])
        setSelectedNeighborhoods([])
        autoSelectedCitiesRef.current.clear()
        return
      }

      setNeighborhoodsLoading(true)
      try {
        const neighborhoods =
          await LocationsClient.getNeighborhoodsForCities(selectedCities)
        if (cancelled) return

        setAvailableNeighborhoods(neighborhoods)
        setSelectedNeighborhoods((prev) => {
          const allowed = new Set(neighborhoods.map((n) => n.id))
          return prev.filter((id) => allowed.has(id))
        })
      } catch (_error) {
        toast.error('Failed to load neighborhoods')
      } finally {
        if (!cancelled) setNeighborhoodsLoading(false)
      }
    }

    void loadNeighborhoods()

    return () => {
      cancelled = true
    }
  }, [selectedCities])

  useEffect(() => {
    if (!availableNeighborhoods.length || selectedCities.length === 0) return

    const selectedCityKeys = new Set(selectedCities.map(cityKey))
    autoSelectedCitiesRef.current.forEach((key) => {
      if (!selectedCityKeys.has(key)) {
        autoSelectedCitiesRef.current.delete(key)
      }
    })

    const newlySelectedKeys = selectedCities
      .map(cityKey)
      .filter((key) => !autoSelectedCitiesRef.current.has(key))

    if (newlySelectedKeys.length === 0) return

    const neighborhoodsByCity = new Map<string, string[]>()
    availableNeighborhoods.forEach((neighborhood) => {
      const key = cityKey({
        city: neighborhood.city,
        state: neighborhood.state,
      })
      const bucket = neighborhoodsByCity.get(key)
      if (bucket) {
        bucket.push(neighborhood.id)
      } else {
        neighborhoodsByCity.set(key, [neighborhood.id])
      }
    })

    const neighborhoodsToAdd = availableNeighborhoods
      .filter((neighborhood) =>
        newlySelectedKeys.includes(
          cityKey({ city: neighborhood.city, state: neighborhood.state })
        )
      )
      .map((neighborhood) => neighborhood.id)

    if (neighborhoodsToAdd.length > 0) {
      setSelectedNeighborhoods((prev) => {
        const merged = new Set([...prev, ...neighborhoodsToAdd])
        return Array.from(merged)
      })
    }

    newlySelectedKeys
      .filter((key) => (neighborhoodsByCity.get(key) || []).length > 0)
      .forEach((key) => autoSelectedCitiesRef.current.add(key))
  }, [availableNeighborhoods, selectedCities])

  const toggleCity = (city: CityOption) => {
    setSelectedCities((prev) => {
      const key = cityKey(city)
      if (prev.some((item) => cityKey(item) === key)) {
        return prev.filter((item) => cityKey(item) !== key)
      }
      return [...prev, city]
    })
  }

  const toggleNeighborhood = (neighborhoodId: string) => {
    setSelectedNeighborhoods((prev) => {
      if (prev.includes(neighborhoodId)) {
        return prev.filter((id) => id !== neighborhoodId)
      }
      return [...prev, neighborhoodId]
    })
  }

  const selectAllCities = () => {
    setSelectedCities(availableCities)
  }

  const clearAllCities = () => {
    setSelectedCities([])
  }

  const selectAllNeighborhoods = () => {
    setSelectedNeighborhoods(availableNeighborhoods.map((n) => n.id))
  }

  const selectNeighborhoodGroup = (group: Neighborhood[]) => {
    setSelectedNeighborhoods((prev) => {
      const merged = new Set(prev)
      group.forEach((neighborhood) => merged.add(neighborhood.id))
      return Array.from(merged)
    })
  }

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase()
    const baseCities = showSelectedCitiesOnly ? selectedCities : availableCities
    if (!query) return baseCities

    return baseCities.filter((city) => {
      const label = `${city.city}, ${city.state}`.toLowerCase()
      return label.includes(query)
    })
  }, [availableCities, citySearch, selectedCities, showSelectedCitiesOnly])

  const filteredNeighborhoods = useMemo(() => {
    const query = neighborhoodSearch.trim().toLowerCase()
    const baseNeighborhoods = showSelectedNeighborhoodsOnly
      ? availableNeighborhoods.filter((neighborhood) =>
          selectedNeighborhoods.includes(neighborhood.id)
        )
      : availableNeighborhoods

    if (!query) return baseNeighborhoods

    return baseNeighborhoods.filter((neighborhood) =>
      `${neighborhood.name} ${neighborhood.city} ${neighborhood.state}`
        .toLowerCase()
        .includes(query)
    )
  }, [
    availableNeighborhoods,
    neighborhoodSearch,
    selectedNeighborhoods,
    showSelectedNeighborhoodsOnly,
  ])

  const neighborhoodGroups = useMemo(() => {
    const grouped = new Map<string, { label: string; items: Neighborhood[] }>()
    for (const neighborhood of filteredNeighborhoods) {
      const key = `${neighborhood.city.toLowerCase()}|${neighborhood.state.toLowerCase()}`
      const label = `${neighborhood.city}, ${neighborhood.state}`
      const existing = grouped.get(key) || { label, items: [] }
      existing.items.push(neighborhood)
      grouped.set(key, existing)
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    )
  }, [filteredNeighborhoods])

  const normalizeSnapshot = useCallback(
    (values: {
      priceRange?: [number, number]
      bedrooms?: number
      bathrooms?: number
      searchRadius?: number
      propertyTypes?: Record<PropertyTypeKey, boolean>
      mustHaves?: Record<MustHaveKey, boolean>
      cities?: CityOption[]
      neighborhoods?: string[]
    }) => {
      const normalizedCities = [...(values.cities || [])].sort((a, b) =>
        cityKey(a).localeCompare(cityKey(b))
      )
      const normalizedNeighborhoods = Array.from(
        new Set(values.neighborhoods || [])
      ).sort()
      const normalizedPropertyTypes = PROPERTY_TYPE_VALUES.reduce(
        (acc, type) => {
          acc[type] = Boolean(values.propertyTypes?.[type])
          return acc
        },
        {} as Record<PropertyTypeKey, boolean>
      )
      const normalizedMustHaves = (
        ['parking', 'pool', 'gym', 'petFriendly'] as MustHaveKey[]
      ).reduce<Record<MustHaveKey, boolean>>(
        (acc, key) => {
          acc[key] = Boolean(values.mustHaves?.[key])
          return acc
        },
        {} as Record<MustHaveKey, boolean>
      )

      return {
        priceRange: values.priceRange || DEFAULT_PRICE_RANGE,
        bedrooms: values.bedrooms || DEFAULT_BEDROOMS,
        bathrooms: values.bathrooms || DEFAULT_BATHROOMS,
        searchRadius: values.searchRadius || DEFAULT_SEARCH_RADIUS,
        propertyTypes: normalizedPropertyTypes,
        mustHaves: normalizedMustHaves,
        cities: normalizedCities,
        neighborhoods: normalizedNeighborhoods,
      }
    },
    []
  )

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

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const buildPreferencesPayload = useCallback(() => {
    const propertyTypesPayload = toPersistedPropertyTypes(propertyTypes)
    return {
      ...preferences,
      priceRange,
      bedrooms,
      bathrooms,
      propertyTypes: propertyTypesPayload,
      mustHaves,
      searchRadius,
      cities: selectedCities,
      neighborhoods: selectedNeighborhoods,
    }
  }, [
    bathrooms,
    bedrooms,
    mustHaves,
    preferences,
    priceRange,
    propertyTypes,
    searchRadius,
    selectedCities,
    selectedNeighborhoods,
  ])

  const savePreferences = useCallback(
    async (options?: { silent?: boolean }) => {
      if (loading) return
      setLoading(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      try {
        const updatedProfile = await userService.updateUserProfile(user.id, {
          preferences: buildPreferencesPayload(),
        })
        if (updatedProfile && onProfileUpdate) {
          onProfileUpdate(updatedProfile)
        }
        setLastSavedAt(new Date())
        if (!options?.silent) {
          toast.success('Preferences saved successfully')
        }
      } catch (_error) {
        if (!options?.silent) {
          toast.error('Failed to save preferences')
        }
      } finally {
        setLoading(false)
      }
    },
    [buildPreferencesPayload, loading, onProfileUpdate, user.id, userService]
  )

  const storedSnapshot = useMemo(
    () =>
      normalizeSnapshot({
        priceRange: preferences.priceRange,
        bedrooms: preferences.bedrooms,
        bathrooms: preferences.bathrooms,
        searchRadius: preferences.searchRadius,
        propertyTypes: normalizePropertyTypes(preferences.propertyTypes),
        mustHaves: (preferences.mustHaves || {
          parking: false,
          pool: false,
          gym: false,
          petFriendly: false,
        }) as Record<MustHaveKey, boolean>,
        cities: preferences.cities || [],
        neighborhoods: preferences.neighborhoods || [],
      }),
    [normalizePropertyTypes, normalizeSnapshot, preferences]
  )

  const currentSnapshot = useMemo(
    () =>
      normalizeSnapshot({
        priceRange,
        bedrooms,
        bathrooms,
        searchRadius,
        propertyTypes,
        mustHaves,
        cities: selectedCities,
        neighborhoods: selectedNeighborhoods,
      }),
    [
      bathrooms,
      bedrooms,
      mustHaves,
      normalizeSnapshot,
      priceRange,
      propertyTypes,
      searchRadius,
      selectedCities,
      selectedNeighborhoods,
    ]
  )

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(storedSnapshot) !== JSON.stringify(currentSnapshot),
    [currentSnapshot, storedSnapshot]
  )

  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    if (!hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      return
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      void savePreferences({ silent: true })
    }, 900)
  }, [currentSnapshot, hasUnsavedChanges, savePreferences])

  useEffect(() => {
    if (!onSaveStateChange) return
    onSaveStateChange({
      isSaving: loading,
      hasUnsavedChanges,
      lastSavedAt,
    })
  }, [hasUnsavedChanges, lastSavedAt, loading, onSaveStateChange])

  const buildLocationLabel = useCallback(() => {
    if (selectedNeighborhoods.length > 0) {
      return `${selectedNeighborhoods.length} neighborhoods`
    }
    if (selectedCities.length === 0) {
      return 'Anywhere'
    }

    const cityNames = selectedCities
      .slice(0, 2)
      .map((city) => `${city.city}, ${city.state}`)
      .join(', ')
    const remaining = selectedCities.length - 2
    return remaining > 0 ? `${cityNames} +${remaining}` : cityNames
  }, [selectedCities, selectedNeighborhoods.length])

  const generateSearchName = useCallback(() => {
    const parts = [
      buildLocationLabel(),
      `$${Math.round(priceRange[0] / 1000)}k-$${Math.round(
        priceRange[1] / 1000
      )}k`,
      `${bedrooms}+ bed`,
      `${bathrooms}+ bath`,
    ]
    return parts.filter(Boolean).join(' | ')
  }, [bathrooms, bedrooms, buildLocationLabel, priceRange])

  const saveSearch = useCallback(async () => {
    if (savingSearch) return
    setSavingSearch(true)
    try {
      const name = savedSearchName.trim() || generateSearchName()
      if (!name) {
        toast.error('Add a name for this search')
        return
      }

      const selectedPropertyTypes = PROPERTY_TYPE_VALUES.filter(
        (type) => propertyTypes[type]
      )
      const selectedAmenities = Object.entries(mustHaves)
        .filter(([_, selected]) => selected)
        .map(([key]) => MUST_HAVE_LABELS[key as MustHaveKey] || key)

      const filters = {
        location: buildLocationLabel(),
        cities: selectedCities,
        neighborhoods: selectedNeighborhoods,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        bedrooms,
        bathrooms,
        propertyTypes: selectedPropertyTypes,
        mustHaves: selectedAmenities,
        radius: searchRadius,
      }

      const saved = await userService.createSavedSearch({
        user_id: user.id,
        household_id: profile.household_id || null,
        name,
        filters,
        is_active: true,
      })

      if (!saved) {
        toast.error('Failed to save search')
        return
      }

      setSavedSearchName('')
      toast.success('Saved search created')
    } catch (_error) {
      toast.error('Failed to save search')
    } finally {
      setSavingSearch(false)
    }
  }, [
    bathrooms,
    bedrooms,
    buildLocationLabel,
    generateSearchName,
    mustHaves,
    priceRange,
    profile.household_id,
    propertyTypes,
    savedSearchName,
    savingSearch,
    searchRadius,
    selectedCities,
    selectedNeighborhoods,
    user.id,
    userService,
  ])

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

        <div
          className="space-y-6 rounded-xl border border-white/5 bg-white/[0.02] p-5"
          id="search-preferences"
        >
          {/* Location Preferences */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-hm-stone-300 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-amber-400" />
                Locations
              </Label>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/80">
                {selectedCities.length}{' '}
                {selectedCities.length === 1 ? 'city' : 'cities'} ·{' '}
                {selectedNeighborhoods.length}{' '}
                {selectedNeighborhoods.length === 1
                  ? 'neighborhood'
                  : 'neighborhoods'}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-hm-stone-400 text-xs font-medium tracking-[0.12em] uppercase">
                      Cities
                    </p>
                    <div className="text-hm-stone-500 flex items-center gap-2 text-xs">
                      <span>Selected only</span>
                      <Switch
                        checked={showSelectedCitiesOnly}
                        onCheckedChange={setShowSelectedCitiesOnly}
                        aria-label="Show selected cities only"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllCities}
                      className="text-hm-stone-500 hover:text-hm-stone-200 transition-colors disabled:opacity-40"
                      disabled={availableCities.length === 0 || citiesLoading}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={clearAllCities}
                      className="text-hm-stone-500 hover:text-hm-stone-200 transition-colors disabled:opacity-40"
                      disabled={selectedCities.length === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <Input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search cities…"
                  aria-label="Search cities"
                  data-testid="city-search"
                  className="text-hm-stone-200 rounded-xl border-white/10 bg-white/5"
                />

                <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  {citiesLoading ? (
                    <div className="text-hm-stone-500 flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading cities…
                    </div>
                  ) : filteredCities.length === 0 ? (
                    <p className="text-hm-stone-500 text-sm">
                      {showSelectedCitiesOnly && selectedCities.length === 0
                        ? 'No cities selected'
                        : 'No cities found'}
                    </p>
                  ) : (
                    filteredCities.map((city) => {
                      const key = cityKey(city)
                      const checked = selectedCities.some(
                        (item) => cityKey(item) === key
                      )
                      const testIdKey = key
                        .replace(/[^a-z0-9|]/g, '-')
                        .replace(/\|/g, '--')
                      return (
                        <div
                          key={key}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                          onClick={() => toggleCity(city)}
                          data-testid={`city-option-${testIdKey}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleCity(city)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`${city.city}, ${city.state}`}
                          />
                          <span className="text-hm-stone-200 text-sm">
                            {city.city}, {city.state}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-hm-stone-400 text-xs font-medium tracking-[0.12em] uppercase">
                      Neighborhoods
                    </p>
                    <div className="text-hm-stone-500 flex items-center gap-2 text-xs">
                      <span>Selected only</span>
                      <Switch
                        checked={showSelectedNeighborhoodsOnly}
                        onCheckedChange={setShowSelectedNeighborhoodsOnly}
                        aria-label="Show selected neighborhoods only"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllNeighborhoods}
                      className="text-hm-stone-500 hover:text-hm-stone-200 transition-colors disabled:opacity-40"
                      disabled={
                        availableNeighborhoods.length === 0 ||
                        neighborhoodsLoading
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNeighborhoods([])}
                      className="text-hm-stone-500 hover:text-hm-stone-200 transition-colors disabled:opacity-40"
                      disabled={selectedNeighborhoods.length === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <Input
                  value={neighborhoodSearch}
                  onChange={(e) => setNeighborhoodSearch(e.target.value)}
                  placeholder={
                    selectedCities.length === 0
                      ? 'Select a city first…'
                      : 'Search neighborhoods…'
                  }
                  aria-label="Search neighborhoods"
                  data-testid="neighborhood-search"
                  disabled={selectedCities.length === 0}
                  className="text-hm-stone-200 rounded-xl border-white/10 bg-white/5 disabled:opacity-50"
                />

                <div className="max-h-64 space-y-3 overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  {selectedCities.length === 0 ? (
                    <p className="text-hm-stone-500 text-sm">
                      Choose one or more cities to see neighborhoods.
                    </p>
                  ) : neighborhoodsLoading ? (
                    <div className="text-hm-stone-500 flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading neighborhoods…
                    </div>
                  ) : neighborhoodGroups.length === 0 ? (
                    <p className="text-hm-stone-500 text-sm">
                      {showSelectedNeighborhoodsOnly &&
                      selectedNeighborhoods.length === 0
                        ? 'No neighborhoods selected'
                        : 'No neighborhoods found'}
                    </p>
                  ) : (
                    neighborhoodGroups.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-hm-stone-500 text-xs font-medium tracking-[0.1em] uppercase">
                            {group.label}
                          </p>
                          <button
                            type="button"
                            onClick={() => selectNeighborhoodGroup(group.items)}
                            className="text-hm-stone-500 hover:text-hm-stone-200 text-xs transition-colors"
                          >
                            Select all
                          </button>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((neighborhood) => (
                            <div
                              key={neighborhood.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                              onClick={() =>
                                toggleNeighborhood(neighborhood.id)
                              }
                              data-testid={`neighborhood-option-${neighborhood.id}`}
                            >
                              <Checkbox
                                checked={selectedNeighborhoods.includes(
                                  neighborhood.id
                                )}
                                onCheckedChange={() =>
                                  toggleNeighborhood(neighborhood.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                aria-label={neighborhood.name}
                              />
                              <span className="text-hm-stone-200 text-sm">
                                {neighborhood.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="text-hm-stone-500 text-xs">
              Neighborhood picks override city-level matching.
            </p>
          </div>

          {/* Price Range */}
          <div className="space-y-4" id="price-range">
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
          <div className="space-y-4" id="search-radius">
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
              Radius is saved now and will power geo filtering next.
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
            Updates auto-save and refresh dashboard matches
          </p>
        </div>
        <Button
          onClick={() => void savePreferences()}
          disabled={loading || !hasUnsavedChanges}
          className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 disabled:opacity-50"
          data-testid="save-preferences"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasUnsavedChanges ? 'Save now' : 'All changes saved'}
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div>
          <p className="text-hm-stone-200 font-medium">Save this search</p>
          <p className="text-hm-stone-500 text-sm">
            Give it a name and reuse it from Saved Searches.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={savedSearchName}
            onChange={(e) => setSavedSearchName(e.target.value)}
            placeholder={generateSearchName()}
            aria-label="Saved search name"
            className="text-hm-stone-200 rounded-xl border-white/10 bg-white/5"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSavedSearchName(generateSearchName())}
              className="text-hm-stone-200 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            >
              Auto-name
            </Button>
            <Button
              type="button"
              onClick={() => void saveSearch()}
              disabled={savingSearch}
              className="bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {savingSearch ? 'Saving...' : 'Save search'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
