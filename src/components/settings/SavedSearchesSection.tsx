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
      <Card className="card-glassmorphism-style">
        <CardContent className="py-8">
          <p className="text-primary/40 text-center">
            Loading saved searches...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (savedSearches.length === 0) {
    return (
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-2xl">
            <Search className="h-6 w-6" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-primary/40 py-8 text-center">
            You haven&apos;t saved any searches yet.
          </p>
          <p className="text-primary/60/60 text-center text-sm">
            Save searches from the main dashboard to get notified about new
            matches!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-2xl">
            <Search className="h-6 w-6" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-primary/40 text-sm">
            Manage your saved searches and notification preferences
          </p>
        </CardContent>
      </Card>

      {savedSearches.map((search) => {
        const filters = search.filters as Record<string, unknown>
        const hasNotifications = filters.notifications !== false

        return (
          <Card key={search.id} className="card-glassmorphism-style">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-primary-foreground mb-2 text-lg font-semibold">
                    {search.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formatFilters(filters).map((filter) => {
                      const IconComponent = filter.icon
                      return (
                        <span
                          key={filter.key}
                          className="bg-primary/20 text-primary/40 flex items-center gap-1 rounded px-2 py-1 text-sm"
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
                    onClick={() =>
                      toggleNotifications(search.id, hasNotifications)
                    }
                    className={
                      hasNotifications
                        ? 'text-green-400'
                        : 'text-muted-foreground/80'
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
                    onClick={() => deleteSearch(search.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-primary/60/60 text-xs">
                Created {new Date(search.created_at!).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
