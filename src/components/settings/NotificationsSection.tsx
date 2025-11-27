'use client'

import React from 'react'
import { useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { Loader2, Save, Mail, Bell, Smartphone } from 'lucide-react'

interface NotificationsSectionProps {
  user: User
  profile: UserProfile
  onProfileUpdate?: (profile: UserProfile) => void
}

export function NotificationsSection({
  user,
  profile,
  onProfileUpdate,
}: NotificationsSectionProps) {
  const userService = UserServiceClient
  type NotificationPreferences = {
    email?: Record<string, boolean>
    push?: Record<string, boolean>
    sms?: Record<string, boolean>
  }

  const preferences = useMemo(
    () =>
      (profile.preferences || {}) as UserPreferences & {
        notifications?: NotificationPreferences
      },
    [profile.preferences]
  )
  const notifications = preferences.notifications || {}

  const [loading, setLoading] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState<
    Record<string, boolean>
  >(
    notifications.email || {
      newMatches: true,
      priceDrops: true,
      savedSearches: true,
      weeklyDigest: false,
    }
  )
  const [pushNotifications, setPushNotifications] = useState<
    Record<string, boolean>
  >(
    notifications.push || {
      newMatches: false,
      priceDrops: false,
      messages: true,
    }
  )
  const [smsNotifications, setSmsNotifications] = useState<
    Record<string, boolean>
  >(
    notifications.sms || {
      urgentAlerts: false,
      viewingReminders: false,
    }
  )

  const saveNotifications = async () => {
    setLoading(true)
    try {
      const updatedProfile = await userService.updateUserProfile(user.id, {
        preferences: {
          ...preferences,
          notifications: {
            email: emailNotifications,
            push: pushNotifications,
            sms: smsNotifications,
          },
        },
      })
      if (updatedProfile && onProfileUpdate) {
        onProfileUpdate(updatedProfile)
      }
      toast.success('Notification preferences saved')
    } catch (_error) {
      toast.error('Failed to save notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const notificationGroups: Array<{
    key: 'email' | 'push' | 'sms'
    title: string
    icon: React.ReactElement
    description: string
    options: Array<{ key: string; label: string; helper: string }>
  }> = [
    {
      key: 'email',
      title: 'Email Notifications',
      icon: <Mail className="h-6 w-6 text-white/80" />,
      description: `Sent to ${user.email}`,
      options: [
        {
          key: 'newMatches',
          label: 'New property matches',
          helper: 'Emails when fresh inventory matches your filters',
        },
        {
          key: 'priceDrops',
          label: 'Price drops',
          helper: 'We alert you if saved homes lower their price',
        },
        {
          key: 'savedSearches',
          label: 'Saved search updates',
          helper: 'Daily digest for saved dashboards',
        },
        {
          key: 'weeklyDigest',
          label: 'Weekly digest',
          helper: 'One email summarizing the week',
        },
      ],
    },
    {
      key: 'push',
      title: 'Push Notifications',
      icon: <Bell className="h-5 w-5 text-white/80" />,
      description: 'Instant nudges on your devices',
      options: [
        {
          key: 'newMatches',
          label: 'New matches',
          helper: 'Be first to know when inventory hits your filters',
        },
        {
          key: 'priceDrops',
          label: 'Price drops',
          helper: 'Live alerts as prices fall on liked homes',
        },
        {
          key: 'messages',
          label: 'Household messages',
          helper: 'Updates from roommates or partners',
        },
      ],
    },
    {
      key: 'sms',
      title: 'SMS Notifications',
      icon: <Smartphone className="h-5 w-5 text-white/80" />,
      description: 'High-signal texts for urgent updates',
      options: [
        {
          key: 'urgentAlerts',
          label: 'Urgent alerts',
          helper: 'Time-sensitive recommendations and drops',
        },
        {
          key: 'viewingReminders',
          label: 'Viewing reminders',
          helper: 'Day-of reminders for scheduled tours',
        },
      ],
    },
  ]

  const renderSwitch = (
    group: 'email' | 'push' | 'sms',
    optionKey: string,
    label: string,
    helper: string
  ) => {
    const stateMap =
      group === 'email'
        ? emailNotifications
        : group === 'push'
          ? pushNotifications
          : smsNotifications

    const setter =
      group === 'email'
        ? setEmailNotifications
        : group === 'push'
          ? setPushNotifications
          : setSmsNotifications

    return (
      <div
        key={`${group}-${optionKey}`}
        className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
      >
        <div className="space-y-1">
          <Label
            htmlFor={`${group}-${optionKey}`}
            className="cursor-pointer text-sm font-medium text-white"
          >
            {label}
          </Label>
          <p className="text-xs text-white/60">{helper}</p>
        </div>
        <Switch
          id={`${group}-${optionKey}`}
          checked={Boolean(stateMap[optionKey])}
          onCheckedChange={(checked) =>
            setter((prev) => ({
              ...prev,
              [optionKey]: checked,
            }))
          }
          aria-label={`Toggle ${label}`}
        />
      </div>
    )
  }

  const smsNeedsNumber =
    smsNotifications.urgentAlerts || smsNotifications.viewingReminders

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {notificationGroups.map(
          ({ key, title, icon, description, options }) => (
            <Card
              key={key}
              className="card-glassmorphism-style border-white/10"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  {icon}
                  <span className="text-xl font-semibold">{title}</span>
                </CardTitle>
                <p className="text-sm text-white/70">{description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option) =>
                  renderSwitch(key, option.key, option.label, option.helper)
                )}
                {key === 'sms' && smsNeedsNumber && (
                  <p className="text-xs text-white/60">
                    Add a phone number in your profile to receive SMS alerts.
                  </p>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 shadow-inner backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold">Alert preferences</p>
          <p className="text-sm text-white/60">
            Mix channels to match your responsiveness. We’ll only message you
            when the toggles above are on.
          </p>
        </div>
        <Button
          onClick={saveNotifications}
          disabled={loading}
          className="text-primary bg-white font-semibold hover:bg-white/90 md:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Notification Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
