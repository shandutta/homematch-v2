'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogOut, Trash2, AlertTriangle, Shield, RotateCcw } from 'lucide-react'
import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useResetInteractions } from '@/hooks/useInteractions'

interface AccountSectionProps {
  user: User
}

export function AccountSection({ user }: AccountSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSigningOut, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const resetInteractions = useResetInteractions()

  const handleSignOut = () => {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    startTransition(async () => {
      try {
        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          throw signOutError
        }

        router.push('/login')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sign out')
        setLoading(false)
        return
      }

      router.refresh()
      setLoading(false)
    })
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
    )

    if (!confirmed) return

    const doubleConfirmed = confirm(
      'This is your last chance to cancel. Are you absolutely sure you want to delete your account?'
    )

    if (!doubleConfirmed) return

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // In a real app, you would call an API endpoint that handles account deletion
      // For now, we'll just show an error message
      throw new Error(
        'Account deletion is not yet implemented. Please contact support.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const handleResetStats = async () => {
    const confirmed = confirm(
      'Are you sure you want to reset all your stats? This will clear all your likes, passes, and viewed properties. You will see all properties again as if starting fresh.'
    )

    if (!confirmed) return

    setError(null)
    setSuccessMessage(null)

    try {
      const result = await resetInteractions.mutateAsync()
      setSuccessMessage(
        `Successfully reset ${result.count} interaction${result.count === 1 ? '' : 's'}. You can now start fresh!`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset stats')
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500/20 bg-green-500/10">
          <AlertDescription className="text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <Card className="card-glassmorphism-style border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Shield className="h-6 w-6" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-white/60">Email Address</p>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-white/60">Account ID</p>
            <p className="font-mono text-sm text-white">{user.id}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-white/60">Account Created</p>
            <p className="text-white">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-white/60">
              Authentication Provider
            </p>
            <p className="text-white capitalize">
              {user.app_metadata?.provider || 'Email'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style border-white/10">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            Session Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Sign out from your current session on this device.
          </p>
          <Button
            onClick={handleSignOut}
            disabled={loading || isSigningOut}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-amber-200">
            <RotateCcw className="h-5 w-5" />
            Reset Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Clear all your likes, passes, and viewed properties to start fresh.
            This will allow you to see all properties again as if you were a new
            user.
          </p>
          <Button
            onClick={handleResetStats}
            disabled={loading || resetInteractions.isPending}
            variant="outline"
            className="w-full border-amber-500/40 bg-transparent text-amber-200 hover:bg-amber-500/10"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {resetInteractions.isPending ? 'Resetting...' : 'Reset All Stats'}
          </Button>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style border-destructive/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-red-200">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-destructive/20 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              Deleting your account is permanent and cannot be undone. All your
              data, including properties, preferences, and household information
              will be permanently deleted.
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleDeleteAccount}
            disabled={loading}
            variant="outline"
            className="border-destructive/40 hover:bg-destructive/10 w-full bg-transparent text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
