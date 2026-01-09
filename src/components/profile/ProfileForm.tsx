'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences, Json } from '@/types/database'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Loader2,
  Save,
  User as UserIcon,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Camera,
} from 'lucide-react'
import { z } from 'zod'
import { UserServiceClient } from '@/lib/services/users-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AvatarPicker } from '@/components/profile/AvatarPicker'
import { AvatarData } from '@/lib/constants/avatars'

// US phone format: (XXX) XXX-XXXX
const US_PHONE_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/

/**
 * Format a string of digits into US phone format: (XXX) XXX-XXXX
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // Limit to 10 digits
  const truncated = digits.slice(0, 10)

  // Format based on length
  if (truncated.length === 0) return ''
  if (truncated.length <= 3) return `(${truncated}`
  if (truncated.length <= 6)
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`
}

const ProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || US_PHONE_REGEX.test(val), {
      message: 'Please enter a valid US phone number: (XXX) XXX-XXXX',
    }),
  bio: z.string().max(500).optional(),
})

type ProfileData = z.infer<typeof ProfileSchema>

interface ProfileFormProps {
  user: User
  profile: UserProfile
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false)
  const router = useRouter()
  const userService = UserServiceClient

  // Extract preferences or use defaults
  type ProfilePreferences = UserPreferences & {
    display_name?: string
    phone?: string
    bio?: string
    avatar?: AvatarData
  }
  const isJsonRecord = (value: Json): value is Record<string, Json> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  const basePreferences: Json = profile.preferences ?? {}
  const preferenceRecord = isJsonRecord(basePreferences) ? basePreferences : {}
  const isAvatarData = (value: unknown): value is AvatarData =>
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'preset' || value.type === 'custom') &&
    'value' in value &&
    typeof value.value === 'string'
  const preferences: Partial<ProfilePreferences> = {
    ...preferenceRecord,
    avatar: isAvatarData(preferenceRecord.avatar)
      ? preferenceRecord.avatar
      : undefined,
  }

  const toAvatarJson = (value: AvatarData | null): Json =>
    value ? { type: value.type, value: value.value } : null

  // Avatar state - separate from form since it updates immediately
  const [avatar, setAvatar] = useState<AvatarData | null>(
    preferences.avatar ?? null
  )

  const form = useValidatedForm(ProfileSchema, {
    display_name: preferences.display_name || user.email?.split('@')[0] || '',
    phone: preferences.phone ? formatPhoneNumber(preferences.phone) : '',
    bio: preferences.bio || '',
  })

  const handleAvatarSelect = async (newAvatar: AvatarData | null) => {
    setAvatar(newAvatar)
    // Save avatar immediately when selected
    try {
      const nextPreferences: Json = {
        ...preferenceRecord,
        avatar: toAvatarJson(newAvatar),
      }
      await userService.updateUserProfile(user.id, {
        preferences: nextPreferences,
      })
      toast.success('Avatar updated')
      router.refresh()
    } catch (err) {
      console.error('Failed to update avatar:', err)
      toast.error('Failed to update avatar')
      // Revert on error
      setAvatar(preferences.avatar ?? null)
    }
  }

  const onSubmit = async (data: ProfileData) => {
    setLoading(true)
    setError(null)

    try {
      const nextPreferences: Json = {
        ...preferenceRecord,
        ...data,
        avatar: toAvatarJson(avatar),
      }
      const updatedProfile = await userService.updateUserProfile(user.id, {
        preferences: nextPreferences,
        onboarding_completed: true,
      })

      if (!updatedProfile) {
        throw new Error('Failed to update profile')
      }

      toast.success('Profile updated successfully')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const inputStyles =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-hm-stone-200 placeholder:text-hm-stone-500 transition-all focus:border-amber-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-500/20'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Avatar Section */}
        <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <UserAvatar
            displayName={form.watch('display_name')}
            email={user.email}
            avatar={avatar}
            size="lg"
          />
          <div className="flex-1">
            <p className="text-hm-stone-400 text-xs font-medium tracking-wide uppercase">
              Profile Picture
            </p>
            <p className="text-hm-stone-500 mt-1 text-xs">
              Choose an avatar or use your initials
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAvatarPickerOpen(true)}
            className="text-hm-stone-300 border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <Camera className="mr-2 h-4 w-4" />
            Change
          </Button>
        </div>

        <AvatarPicker
          isOpen={isAvatarPickerOpen}
          onClose={() => setIsAvatarPickerOpen(false)}
          onSelect={handleAvatarSelect}
          currentAvatar={avatar}
          enableUpload
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-hm-stone-400 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <UserIcon className="h-3.5 w-3.5" />
                  Display Name
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    placeholder="Enter your display name"
                    className={inputStyles}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-hm-stone-400 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="tel"
                    placeholder="(123) 456-7890"
                    className={inputStyles}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      field.onChange(formatted)
                    }}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2">
            <Mail className="text-hm-stone-500 h-3.5 w-3.5" />
            <p className="text-hm-stone-400 text-xs font-medium tracking-wide uppercase">
              Email Address
            </p>
          </div>
          <p className="text-hm-stone-200 mt-2 text-sm">{user.email}</p>
          <p className="text-hm-stone-500 mt-1 text-xs">
            Email is managed by your authentication provider
          </p>
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-hm-stone-400 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                <FileText className="h-3.5 w-3.5" />
                Bio
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  placeholder="Tell us a bit about yourself and what you're looking for in a home..."
                  className={`${inputStyles} resize-none`}
                />
              </FormControl>
              <div className="flex items-center justify-between">
                <FormMessage className="text-xs text-red-400" />
                <p className="text-hm-stone-500 text-xs">
                  {field.value?.length || 0}/500
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="text-hm-stone-400 hover:text-hm-stone-200 border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5"
          >
            Reset
          </Button>
          <Button
            type="submit"
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
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
