'use client'

import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import {
  Loader2,
  Save,
  Mail,
  Bell,
  Smartphone,
  AlertCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface NotificationsSectionProps {
  user: User
  profile: UserProfile
  onProfileUpdate?: (profile: UserProfile) => void
  onSaveStateChange?: (state: SaveState) => void
}

type SaveState = {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt?: Date | null
}

const DEFAULT_EMAIL_NOTIFICATIONS = {
  newMatches: true,
  priceDrops: true,
  savedSearches: true,
  weeklyDigest: false,
}

const DEFAULT_PUSH_NOTIFICATIONS = {
  newMatches: false,
  priceDrops: false,
  messages: true,
}

const DEFAULT_SMS_NOTIFICATIONS = {
  urgentAlerts: false,
  viewingReminders: false,
}

export function NotificationsSection({
  user,
  profile,
  onProfileUpdate,
  onSaveStateChange,
}: NotificationsSectionProps) {
  const userService = UserServiceClient
  type NotificationPreferences = {
    email?: Record<string, boolean>
    push?: Record<string, boolean>
    sms?: Record<string, boolean>
  }
  type NotificationSnapshot = {
    email: Record<string, boolean>
    push: Record<string, boolean>
    sms: Record<string, boolean>
  }

  const preferences = useMemo(
    () =>
      (profile.preferences || {}) as UserPreferences & {
        notifications?: NotificationPreferences
      },
    [profile.preferences]
  )
  const notifications = preferences.notifications ?? undefined

  const buildSnapshot = useCallback(
    (source?: NotificationPreferences): NotificationSnapshot => ({
      email: source?.email || DEFAULT_EMAIL_NOTIFICATIONS,
      push: source?.push || DEFAULT_PUSH_NOTIFICATIONS,
      sms: source?.sms || DEFAULT_SMS_NOTIFICATIONS,
    }),
    []
  )

  const [loading, setLoading] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])
  const [emailNotifications, setEmailNotifications] = useState<
    Record<string, boolean>
  >(notifications?.email || DEFAULT_EMAIL_NOTIFICATIONS)
  const [pushNotifications, setPushNotifications] = useState<
    Record<string, boolean>
  >(notifications?.push || DEFAULT_PUSH_NOTIFICATIONS)
  const [smsNotifications, setSmsNotifications] = useState<
    Record<string, boolean>
  >(notifications?.sms || DEFAULT_SMS_NOTIFICATIONS)
  const [storedSnapshot, setStoredSnapshot] = useState<NotificationSnapshot>(
    () => buildSnapshot(notifications)
  )

  const saveNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (loading) return
      setLoading(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
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
        setStoredSnapshot({
          email: emailNotifications,
          push: pushNotifications,
          sms: smsNotifications,
        })
        setLastSavedAt(new Date())
        if (!options?.silent) {
          toast.success('Notification preferences saved')
        }
      } catch (_error) {
        if (!options?.silent) {
          toast.error('Failed to save notification preferences')
        }
      } finally {
        setLoading(false)
      }
    },
    [
      emailNotifications,
      loading,
      onProfileUpdate,
      preferences,
      pushNotifications,
      smsNotifications,
      user.id,
      userService,
    ]
  )

  useEffect(() => {
    setStoredSnapshot(buildSnapshot(notifications))
  }, [buildSnapshot, notifications])

  const currentSnapshot = useMemo(
    () => ({
      email: emailNotifications,
      push: pushNotifications,
      sms: smsNotifications,
    }),
    [emailNotifications, pushNotifications, smsNotifications]
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
      void saveNotifications({ silent: true })
    }, 900)
  }, [currentSnapshot, hasUnsavedChanges, saveNotifications])

  useEffect(() => {
    if (!onSaveStateChange) return
    onSaveStateChange({
      isSaving: loading,
      hasUnsavedChanges,
      lastSavedAt,
    })
  }, [hasUnsavedChanges, lastSavedAt, loading, onSaveStateChange])

  const notificationGroups: Array<{
    key: 'email' | 'push' | 'sms'
    title: string
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    description: string
    options: Array<{ key: string; label: string; helper: string }>
  }> = [
    {
      key: 'email',
      title: 'Email Notifications',
      icon: <Mail className="h-5 w-5" />,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-400',
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
      icon: <Bell className="h-5 w-5" />,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      description: 'Instant nudges on your devices',
      options: [
        {
          key: 'newMatches',
          label: 'New listing matches',
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
          helper: 'Updates from household members',
        },
      ],
    },
    {
      key: 'sms',
      title: 'SMS Notifications',
      icon: <Smartphone className="h-5 w-5" />,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
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
      <motion.div
        key={`${group}-${optionKey}`}
        whileHover={{ x: 2 }}
        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
      >
        <div className="min-w-0 flex-1 pr-3">
          <Label
            htmlFor={`${group}-${optionKey}`}
            className="text-hm-stone-200 cursor-pointer text-sm font-medium"
          >
            {label}
          </Label>
          <p className="text-hm-stone-500 mt-0.5 text-xs">{helper}</p>
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
      </motion.div>
    )
  }

  const smsNeedsNumber =
    smsNotifications.urgentAlerts || smsNotifications.viewingReminders

  return (
    <div className="space-y-6" id="notification-preferences">
      <div className="grid gap-6 lg:grid-cols-3">
        {notificationGroups.map(
          ({ key, title, icon, iconBg, iconColor, description, options }) => (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                >
                  <span className={iconColor}>{icon}</span>
                </div>
                <div>
                  <h3 className="text-hm-stone-200 font-medium">{title}</h3>
                  <p className="text-hm-stone-500 text-xs">{description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {options.map((option) =>
                  renderSwitch(key, option.key, option.label, option.helper)
                )}
                {key === 'sms' && smsNeedsNumber && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-xs text-amber-300">
                      Add a phone number in your profile to receive SMS alerts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Save button */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-hm-stone-200 font-medium">Alert preferences</p>
          <p className="text-hm-stone-500 text-sm">
            Updates auto-save as you make changes
          </p>
        </div>
        <Button
          onClick={() => void saveNotifications()}
          disabled={loading || !hasUnsavedChanges}
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
              {hasUnsavedChanges ? 'Save now' : 'All changes saved'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
