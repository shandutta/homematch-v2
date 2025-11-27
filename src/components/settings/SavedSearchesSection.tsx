'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
      })
    }
    if (filters.priceMin || filters.priceMax) {
      const price = `$${filters.priceMin || 0} - $${filters.priceMax || '∞'}`
      parts.push({
        icon: DollarSign,
        text: price,
        key: 'price',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
      })
    }
    if (filters.bedrooms) {
      parts.push({
        icon: Bed,
        text: `${filters.bedrooms}+ beds`,
        key: 'bedrooms',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
      })
    }
    if (filters.propertyType) {
      parts.push({
        icon: Home,
        text: `${filters.propertyType}`,
        key: 'propertyType',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
      })
    }
    return parts
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Search className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Saved Searches
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Manage your search alerts
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-hm-stone-400 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading saved searches...</span>
          </div>
        </div>
      </div>
    )
  }

  if (savedSearches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Search className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Saved Searches
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Manage your search alerts
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Search className="text-hm-stone-500 mx-auto h-10 w-10" />
          <p className="text-hm-stone-300 mt-4">
            You haven&apos;t saved any searches yet.
          </p>
          <p className="text-hm-stone-500 mt-2 text-sm">
            Dial in filters on the dashboard and tap &ldquo;Save search&rdquo;
            to keep getting alerts here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Search className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Saved Searches
            </h2>
            <p className="text-hm-stone-500 text-sm">
              {savedSearches.length} saved{' '}
              {savedSearches.length === 1 ? 'search' : 'searches'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadSavedSearches}
          className="text-hm-stone-300 border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh list
        </Button>
      </div>

      {/* Searches list */}
      <AnimatePresence>
        <div className="space-y-4">
          {savedSearches.map((search, index) => {
            const filters = search.filters as Record<string, unknown>
            const hasNotifications = filters.notifications !== false

            return (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-hm-stone-200 text-lg font-semibold">
                      {search.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formatFilters(filters).map((filter) => {
                        const IconComponent = filter.icon
                        return (
                          <span
                            key={filter.key}
                            className={`flex items-center gap-1.5 rounded-full border border-white/5 px-2.5 py-1 text-xs ${filter.bg}`}
                          >
                            <IconComponent
                              className={`h-3 w-3 ${filter.color}`}
                            />
                            <span className="text-hm-stone-300">
                              {filter.text}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                    <div className="text-hm-stone-500 flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      Created{' '}
                      {new Date(search.created_at!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={
                        hasNotifications
                          ? `Disable notifications for ${search.name}`
                          : `Enable notifications for ${search.name}`
                      }
                      onClick={() =>
                        toggleNotifications(search.id, hasNotifications)
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                        hasNotifications
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'text-hm-stone-500 hover:text-hm-stone-300 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {hasNotifications ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      aria-label={`Delete saved search ${search.name}`}
                      onClick={() => deleteSearch(search.id)}
                      className="text-hm-stone-500 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>
    </div>
  )
}
