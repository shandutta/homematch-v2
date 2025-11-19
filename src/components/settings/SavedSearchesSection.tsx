'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserServiceClient } from '@/lib/services/users-client'
import { SavedSearch } from '@/types/database'
import {
  Search,
  Trash2,
  Bell,
  BellOff,
  MapPin,
  DollarSign,
  Bed,
  Home,
} from 'lucide-react'
import { toast } from 'sonner'

interface SavedSearchesSectionProps {
  userId: string
}

export function SavedSearchesSection({ userId }: SavedSearchesSectionProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const userService = useMemo(() => UserServiceClient, [])

  const loadSavedSearches = useCallback(async () => {
    setLoading(true)
    try {
      const searches = await userService.getUserSavedSearches(userId)
      setSavedSearches(searches)
    } catch (_error) {
      toast.error('Failed to load saved searches')
    } finally {
      setLoading(false)
    }
  }, [userId, userService])

  useEffect(() => {
    loadSavedSearches()
  }, [loadSavedSearches])

  const toggleNotifications = async (
    searchId: string,
    currentState: boolean
  ) => {
    try {
      const filters = savedSearches.find((s) => s.id === searchId)
        ?.filters as Record<string, unknown>
      await userService.updateSavedSearch(searchId, {
        filters: {
          ...filters,
          notifications: !currentState,
        },
      })
      toast.success(
        currentState ? 'Notifications disabled' : 'Notifications enabled'
      )
      loadSavedSearches()
    } catch (_error) {
      toast.error('Failed to update notifications')
    }
  }

  const deleteSearch = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return
    }

    try {
      await userService.deleteSavedSearch(searchId)
      toast.success('Saved search deleted')
      loadSavedSearches()
    } catch (_error) {
      toast.error('Failed to delete saved search')
    }
  }

  const formatFilters = (filters: Record<string, unknown>) => {
    const parts = []
    if (filters.location) {
      parts.push({
        icon: MapPin,
        text: `${filters.location}`,
        key: 'location',
      })
    }
    if (filters.priceMin || filters.priceMax) {
      const price = `$${filters.priceMin || 0} - $${filters.priceMax || '∞'}`
      parts.push({
        icon: DollarSign,
        text: price,
        key: 'price',
      })
    }
    if (filters.bedrooms) {
      parts.push({
        icon: Bed,
        text: `${filters.bedrooms}+ beds`,
        key: 'bedrooms',
      })
    }
    if (filters.propertyType) {
      parts.push({
        icon: Home,
        text: `${filters.propertyType}`,
        key: 'propertyType',
      })
    }
    return parts
  }

  if (loading) {
    return (
      <Card className="card-glassmorphism-style border-white/10">
        <CardContent className="py-10 text-center">
          <p className="text-white/70">Loading saved searches...</p>
        </CardContent>
      </Card>
    )
  }

  if (savedSearches.length === 0) {
    return (
      <Card className="card-glassmorphism-style border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Search className="h-6 w-6" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="py-6 text-center text-base text-white/70">
            You haven&apos;t saved any searches yet.
          </p>
          <p className="text-center text-sm text-white/60">
            Dial in filters on the dashboard and tap “Save search” to keep
            getting alerts here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Search className="h-6 w-6" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-white/70">
            Manage notification delivery and clean up searches you no longer
            need.
          </p>
          <Button
            variant="outline"
            onClick={loadSavedSearches}
            className="border-white/30 text-white"
          >
            Refresh list
          </Button>
        </CardContent>
      </Card>

      {savedSearches.map((search) => {
        const filters = search.filters as Record<string, unknown>
        const hasNotifications = filters.notifications !== false

        return (
          <Card
            key={search.id}
            className="card-glassmorphism-style border-white/10"
          >
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-semibold text-white">
                    {search.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formatFilters(filters).map((filter) => {
                      const IconComponent = filter.icon
                      return (
                        <span
                          key={filter.key}
                          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
                        >
                          <IconComponent className="h-3 w-3" />
                          {filter.text}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={
                      hasNotifications
                        ? `Disable notifications for ${search.name}`
                        : `Enable notifications for ${search.name}`
                    }
                    onClick={() =>
                      toggleNotifications(search.id, hasNotifications)
                    }
                    className={
                      hasNotifications
                        ? 'text-green-300 hover:text-green-200'
                        : 'text-white/40 hover:text-white/70'
                    }
                  >
                    {hasNotifications ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete saved search ${search.name}`}
                    onClick={() => deleteSearch(search.id)}
                    className="text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-white/60">
                Created {new Date(search.created_at!).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
