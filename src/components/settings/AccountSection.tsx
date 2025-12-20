'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LogOut,
  Trash2,
  AlertTriangle,
  Shield,
  RotateCcw,
  Mail,
  Key,
  Calendar,
  User as UserIcon,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useResetInteractions } from '@/hooks/useInteractions'
import { motion, AnimatePresence } from 'framer-motion'

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

  const accountInfo = [
    {
      label: 'Email Address',
      value: user.email || 'Not set',
      icon: Mail,
      color: 'text-sky-400',
    },
    {
      label: 'Account ID',
      value: user.id,
      icon: Key,
      color: 'text-violet-400',
      mono: true,
    },
    {
      label: 'Account Created',
      value: user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown',
      icon: Calendar,
      color: 'text-emerald-400',
    },
    {
      label: 'Auth Provider',
      value: user.app_metadata?.provider || 'Email',
      icon: UserIcon,
      color: 'text-amber-400',
      capitalize: true,
    },
  ]

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-300">
                {successMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Information */}
      <div className="space-y-4" id="account-info">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Shield className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Account Information
            </h2>
            <p className="text-hm-stone-500 text-sm">Your account details</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {accountInfo.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <p className="text-hm-stone-500 text-xs font-medium tracking-wide uppercase">
                    {item.label}
                  </p>
                </div>
                <p
                  className={`text-hm-stone-200 mt-2 truncate text-sm ${item.mono ? 'font-mono text-xs' : ''} ${item.capitalize ? 'capitalize' : ''}`}
                  title={item.value}
                >
                  {item.value}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <LogOut className="text-hm-stone-400 h-5 w-5" />
          </div>
          <div>
            <h3 className="text-hm-stone-200 font-medium">
              Session Management
            </h3>
            <p className="text-hm-stone-500 text-xs">
              Sign out from your current session
            </p>
          </div>
        </div>

        <Button
          onClick={handleSignOut}
          disabled={loading || isSigningOut}
          variant="outline"
          className="text-hm-stone-300 w-full border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </>
          )}
        </Button>
      </div>

      {/* Reset Stats */}
      <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <RotateCcw className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-amber-200">Reset Stats</h3>
            <p className="text-xs text-amber-300/70">
              Clear all likes, passes, and views
            </p>
          </div>
        </div>

        <p className="text-sm text-amber-300/80">
          Clear all your likes, passes, and viewed properties to start fresh.
          This will allow you to see all properties again as if you were a new
          user.
        </p>

        <Button
          onClick={handleResetStats}
          disabled={loading || resetInteractions.isPending}
          variant="outline"
          className="w-full border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10"
        >
          {resetInteractions.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All Stats
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-medium text-red-200">Danger Zone</h3>
            <p className="text-xs text-red-300/70">
              Irreversible account actions
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3">
          <p className="text-sm text-red-300/80">
            Deleting your account is permanent and cannot be undone. All your
            data, including properties, preferences, and household information
            will be permanently deleted.
          </p>
        </div>

        <Button
          onClick={handleDeleteAccount}
          disabled={loading}
          variant="outline"
          className="w-full border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </div>
    </div>
  )
}
