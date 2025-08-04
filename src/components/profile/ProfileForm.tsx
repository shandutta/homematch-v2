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
import { UserService } from '@/lib/services/users'
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
  const userService = new UserService()

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-purple-200">Display Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your display name"
                    className="border-purple-500/20 bg-white/10 text-white placeholder:text-purple-300/50"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-purple-200">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    placeholder="(123) 456-7890"
                    className="border-purple-500/20 bg-white/10 text-white placeholder:text-purple-300/50"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-purple-200">Email</p>
          <p className="text-white">{user.email}</p>
          <p className="mt-1 text-xs text-purple-300/60">
            Email cannot be changed
          </p>
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-purple-200">Bio</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full resize-none rounded-md border border-purple-500/20 bg-white/10 px-3 py-2 text-white placeholder:text-purple-300/50 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={loading}
          className="bg-purple-600 text-white hover:bg-purple-700"
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
