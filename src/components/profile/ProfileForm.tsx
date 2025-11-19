'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Save } from 'lucide-react'
import { z } from 'zod'
import { UserServiceClient } from '@/lib/services/users-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  phone: z.string().optional(),
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
  const router = useRouter()
  const userService = UserServiceClient

  // Extract preferences or use defaults
  const preferences = (profile.preferences || {}) as Partial<
    UserPreferences & {
      display_name?: string
      phone?: string
      bio?: string
    }
  >

  const form = useValidatedForm(ProfileSchema, {
    display_name: preferences.display_name || user.email?.split('@')[0] || '',
    phone: preferences.phone || '',
    bio: preferences.bio || '',
  })

  const onSubmit = async (data: ProfileData) => {
    setLoading(true)
    setError(null)

    try {
      const updatedProfile = await userService.updateUserProfile(user.id, {
        preferences: {
          ...preferences,
          ...data,
        },
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-token-lg">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="gap-token-lg grid grid-cols-1 md:grid-cols-2">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600">Display Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your display name"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </FormControl>
                <FormMessage className="text-token-error-light" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    placeholder="(123) 456-7890"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </FormControl>
                <FormMessage className="text-token-error-light" />
              </FormItem>
            )}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Email</p>
          <p className="text-slate-900">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-600">Bio</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                />
              </FormControl>
              <FormMessage className="text-token-error-light" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white hover:bg-slate-800"
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
      </form>
    </Form>
  )
}
