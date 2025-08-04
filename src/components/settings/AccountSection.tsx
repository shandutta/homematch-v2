'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2, AlertTriangle, Shield } from 'lucide-react'

interface AccountSectionProps {
  user: User
}

export function AccountSection({ user }: AccountSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setLoading(false)
    }
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

    try {
      // In a real app, you would call an API endpoint that handles account deletion
      // For now, we'll just show an error message
      throw new Error('Account deletion is not yet implemented. Please contact support.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setLoading(false)
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

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-purple-200 mb-1">Email Address</p>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-purple-200 mb-1">Account ID</p>
            <p className="text-white font-mono text-sm">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-purple-200 mb-1">Account Created</p>
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
            <p className="text-sm text-purple-200 mb-1">Authentication Provider</p>
            <p className="text-white capitalize">
              {user.app_metadata?.provider || 'Email'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-xl text-white">Session Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-200">
            Sign out from your current session on this device.
          </p>
          <Button
            onClick={handleSignOut}
            disabled={loading}
            variant="outline"
            className="w-full border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style border-red-500/20">
        <CardHeader>
          <CardTitle className="text-xl text-white">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              Deleting your account is permanent and cannot be undone. All your data,
              including properties, preferences, and household information will be
              permanently deleted.
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleDeleteAccount}
            disabled={loading}
            variant="outline"
            className="w-full border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}