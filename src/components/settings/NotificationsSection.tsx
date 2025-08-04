'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { UserService } from '@/lib/services/users'
import { toast } from 'sonner'
import { Loader2, Save, Mail, Bell, Smartphone } from 'lucide-react'

interface NotificationsSectionProps {
  user: User
  profile: UserProfile
}

export function NotificationsSection({ user, profile }: NotificationsSectionProps) {
  const userService = new UserService()
  
  // Define specific notification types for strong typing
  type NotificationPreferences = {
    email?: Record<string, boolean>
    push?: Record<string, boolean>
    sms?: Record<string, boolean>
  }
  
  const preferences = (profile.preferences || {}) as UserPreferences & {
    notifications?: NotificationPreferences
  }
  const notifications = preferences.notifications || {}

  const [loading, setLoading] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(
    notifications.email || {
      newMatches: true,
      priceDrops: true,
      savedSearches: true,
      weeklyDigest: false,
    }
  )
  const [pushNotifications, setPushNotifications] = useState(
    notifications.push || {
      newMatches: false,
      priceDrops: false,
      messages: true,
    }
  )
  const [smsNotifications, setSmsNotifications] = useState(
    notifications.sms || {
      urgentAlerts: false,
      viewingReminders: false,
    }
  )

  const saveNotifications = async () => {
    setLoading(true)
    try {
      await userService.updateUserProfile(user.id, {
        preferences: {
          ...preferences,
          notifications: {
            email: emailNotifications,
            push: pushNotifications,
            sms: smsNotifications,
          },
        },
      })
      toast.success('Notification preferences saved')
    } catch (_error) {
      toast.error('Failed to save notification preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-200">
            Notifications will be sent to: <span className="text-white">{user.email}</span>
          </p>
          {Object.entries({
            newMatches: 'New property matches',
            priceDrops: 'Price drops on liked properties',
            savedSearches: 'Updates on saved searches',
            weeklyDigest: 'Weekly property digest',
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`email-${key}`} className="text-purple-200 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={`email-${key}`}
                checked={emailNotifications[key]}
                onCheckedChange={(checked) =>
                  setEmailNotifications({ ...emailNotifications, [key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-200">
            Get instant notifications on your device
          </p>
          {Object.entries({
            newMatches: 'New property matches',
            priceDrops: 'Price drops',
            messages: 'Messages from household members',
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`push-${key}`} className="text-purple-200 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={`push-${key}`}
                checked={pushNotifications[key]}
                onCheckedChange={(checked) =>
                  setPushNotifications({ ...pushNotifications, [key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-200">
            Get text messages for important alerts
          </p>
          {Object.entries({
            urgentAlerts: 'Urgent property alerts',
            viewingReminders: 'Property viewing reminders',
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`sms-${key}`} className="text-purple-200 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={`sms-${key}`}
                checked={smsNotifications[key]}
                onCheckedChange={(checked) =>
                  setSmsNotifications({ ...smsNotifications, [key]: checked })
                }
              />
            </div>
          ))}
          {(smsNotifications.urgentAlerts || smsNotifications.viewingReminders) && (
            <p className="text-xs text-purple-300/60">
              Note: Phone number required in your profile for SMS notifications
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={saveNotifications}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
  )
}