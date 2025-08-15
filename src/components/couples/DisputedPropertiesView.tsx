'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  X,
  MessageSquare,
  Calendar,
  Save,
  UserCircle,
  DollarSign,
  Home,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/utils/toast'
import type { DisputedProperty } from '@/app/api/couples/disputed/route'

interface DisputedPropertiesViewProps {
  className?: string
}

export function DisputedPropertiesView({
  className,
}: DisputedPropertiesViewProps) {
  const [disputedProperties, setDisputedProperties] = useState<
    DisputedProperty[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null)
  const [resolutionLoading, setResolutionLoading] = useState<string | null>(
    null
  )

  const fetchDisputedProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.authRequired()
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/couples/disputed', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch disputed properties')
      }

      const data = await response.json()
      setDisputedProperties(data.disputedProperties || [])
    } catch (err) {
      console.error('Error fetching disputed properties:', err)
      setError('Failed to load disputed properties')
      toast.error('Failed to load disputed properties')
    } finally {
      setLoading(false)
    }
  }

  const handleResolution = async (
    propertyId: string,
    resolutionType: string
  ) => {
    try {
      setResolutionLoading(propertyId)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.authRequired()
        return
      }

      const response = await fetch('/api/couples/disputed', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          resolution_type: resolutionType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update resolution')
      }

      // Remove the resolved property from the list
      setDisputedProperties((prev) =>
        prev.filter((p) => p.property_id !== propertyId)
      )

      // Show appropriate success message
      const messages = {
        discussion_needed: 'Marked for discussion',
        scheduled_viewing: 'Scheduled viewing',
        saved_for_later: 'Saved for later',
        final_pass: 'Agreed to skip this property',
      }

      toast.success(
        messages[resolutionType as keyof typeof messages] || 'Resolution saved'
      )
    } catch (error) {
      console.error('Error updating resolution:', error)
      toast.error('Failed to save resolution')
    } finally {
      setResolutionLoading(null)
    }
  }

  useEffect(() => {
    fetchDisputedProperties()
  }, [])

  const getInteractionIcon = (type: 'like' | 'dislike' | 'skip') => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 fill-current text-green-500" />
      case 'dislike':
        return <X className="h-5 w-5 text-red-500" />
      case 'skip':
        return <ChevronDown className="h-5 w-5 text-gray-500" />
    }
  }

  const getInteractionBadgeColor = (type: 'like' | 'dislike' | 'skip') => {
    switch (type) {
      case 'like':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'dislike':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'skip':
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="py-8 text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground mt-4">
            Loading disputed properties...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <X className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h3 className="mb-2 text-lg font-semibold text-red-700">
            Error Loading Properties
          </h3>
          <p className="mb-4 text-red-600">{error}</p>
          <Button
            onClick={fetchDisputedProperties}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (disputedProperties.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Heart className="mx-auto mb-4 h-16 w-16 text-green-400" />
          <h3 className="text-primary mb-2 text-xl font-semibold">
            No Disputed Properties
          </h3>
          <p className="text-muted-foreground">
            Great news! You and your partner are in agreement on all the
            properties you&apos;ve viewed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Properties to Discuss
          </h2>
          <p className="text-muted-foreground">
            {disputedProperties.length} propert
            {disputedProperties.length === 1 ? 'y' : 'ies'} with different
            reactions
          </p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {disputedProperties.map((property, index) => (
          <MotionDiv
            key={property.property_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card className="overflow-hidden border-2 border-orange-200 bg-gradient-to-r from-orange-50/50 to-red-50/50">
              {/* Property Header */}
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2 text-lg font-semibold">
                      {property.property.address}
                    </CardTitle>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />$
                        {property.property.price.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        {property.property.bedrooms}bd /{' '}
                        {property.property.bathrooms}ba
                      </div>
                      {property.property.square_feet && (
                        <span>
                          {property.property.square_feet.toLocaleString()} sqft
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedProperty(
                        expandedProperty === property.property_id
                          ? null
                          : property.property_id
                      )
                    }
                  >
                    {expandedProperty === property.property_id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Split-Screen Partner Comparison */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Partner 1 Side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                      <UserCircle className="h-6 w-6 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-blue-700">
                          {property.partner1.user_name}
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          {new Date(
                            property.partner1.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getInteractionIcon(property.partner1.interaction_type)}
                      <Badge
                        variant="secondary"
                        className={getInteractionBadgeColor(
                          property.partner1.interaction_type
                        )}
                      >
                        {property.partner1.interaction_type
                          .charAt(0)
                          .toUpperCase() +
                          property.partner1.interaction_type.slice(1)}
                      </Badge>
                    </div>

                    {property.partner1.notes && (
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="mb-1 text-sm font-medium text-blue-700">
                          Notes:
                        </p>
                        <p className="text-sm text-blue-600">
                          {property.partner1.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 transform bg-gradient-to-b from-transparent via-gray-300 to-transparent md:block" />

                  {/* Partner 2 Side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                      <UserCircle className="h-6 w-6 text-purple-500" />
                      <div>
                        <h4 className="font-medium text-purple-700">
                          {property.partner2.user_name}
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          {new Date(
                            property.partner2.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getInteractionIcon(property.partner2.interaction_type)}
                      <Badge
                        variant="secondary"
                        className={getInteractionBadgeColor(
                          property.partner2.interaction_type
                        )}
                      >
                        {property.partner2.interaction_type
                          .charAt(0)
                          .toUpperCase() +
                          property.partner2.interaction_type.slice(1)}
                      </Badge>
                    </div>

                    {property.partner2.notes && (
                      <div className="rounded-lg bg-purple-50 p-3">
                        <p className="mb-1 text-sm font-medium text-purple-700">
                          Notes:
                        </p>
                        <p className="text-sm text-purple-600">
                          {property.partner2.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedProperty === property.property_id && (
                    <MotionDiv
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6 overflow-hidden"
                    >
                      {/* Property Images */}
                      {property.property.images &&
                        property.property.images.length > 0 && (
                          <div className="mb-4">
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              {property.property.images
                                .slice(0, 4)
                                .map((image, idx) => (
                                  <div
                                    key={idx}
                                    className="aspect-video overflow-hidden rounded-lg bg-gray-200"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={image}
                                      alt={`Property image ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                    </MotionDiv>
                  )}
                </AnimatePresence>

                {/* Resolution Actions */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-muted-foreground mb-3 text-sm font-medium">
                    How would you like to resolve this disagreement?
                  </p>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleResolution(
                          property.property_id,
                          'discussion_needed'
                        )
                      }
                      disabled={resolutionLoading === property.property_id}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Discuss
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleResolution(
                          property.property_id,
                          'scheduled_viewing'
                        )
                      }
                      disabled={resolutionLoading === property.property_id}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Tour
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleResolution(
                          property.property_id,
                          'saved_for_later'
                        )
                      }
                      disabled={resolutionLoading === property.property_id}
                      className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save for Later
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleResolution(property.property_id, 'final_pass')
                      }
                      disabled={resolutionLoading === property.property_id}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Skip Property
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionDiv>
        ))}
      </AnimatePresence>
    </div>
  )
}
