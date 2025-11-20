'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { buildBrowserRedirectUrl } from '@/lib/utils/site-url'

type ResetPhase = 'request' | 'reset'

const RequestSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

const UpdateSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be at most 64 characters'),
})

const parseFragmentTokens = () => {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash || !hash.startsWith('#')) return null
  const params = new URLSearchParams(hash.slice(1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (access_token && refresh_token) {
    return { access_token, refresh_token }
  }
  return null
}

export function ResetPasswordForm() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()

  const [phase, setPhase] = useState<ResetPhase>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  const requestForm = useValidatedForm(RequestSchema, { email: '' })
  const updateForm = useValidatedForm(UpdateSchema, { password: '' })

  useEffect(() => {
    const maybeCode = searchParams.get('code')
    const fragmentTokens = parseFragmentTokens()

    if (!maybeCode && !fragmentTokens) return

    const hydrateSession = async () => {
      setPhase('reset')
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        if (maybeCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(maybeCode)
          if (exchangeError) {
            setError(exchangeError.message)
            return
          }
        } else if (fragmentTokens) {
          const { error: setErrorResult } = await supabase.auth.setSession({
            access_token: fragmentTokens.access_token,
            refresh_token: fragmentTokens.refresh_token,
          })
          if (setErrorResult) {
            setError(setErrorResult.message)
            return
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          setError(sessionError.message)
          return
        }

        if (data.session) {
          setSessionReady(true)
          setSuccess('Session verified. You can set a new password below.')
          // Clean up the hash so it doesn't leak tokens in the UI/history
          if (typeof window !== 'undefined' && window.location.hash) {
            const url = new URL(window.location.href)
            url.hash = ''
            window.history.replaceState(null, '', url.toString())
          }
        } else {
          setError('Reset link is expired or invalid. Request a new one.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()
  }, [searchParams, supabase])

  const handleSendLink = async (values: z.infer<typeof RequestSchema>) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      values.email,
      {
        redirectTo: buildBrowserRedirectUrl('/reset-password'),
      }
    )

    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccess('Check your email for a reset link.')
    }

    setLoading(false)
  }

  const handleUpdatePassword = async (values: z.infer<typeof UpdateSchema>) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Password updated. You can now sign in.')
      router.push('/login')
    }

    setLoading(false)
  }

  const isRequestPhase = phase === 'request'
  const showResetForm = phase === 'reset' && sessionReady

  return (
    <Card className="mx-auto w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          {isRequestPhase ? 'Reset your password' : 'Set a new password'}
        </CardTitle>
        <CardDescription>
          {isRequestPhase
            ? 'We will email you a secure link to reset your password.'
            : 'Enter your new password to complete the reset.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" data-testid="reset-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert data-testid="reset-success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {isRequestPhase && (
          <Form {...requestForm}>
            <form
              className="space-y-4"
              onSubmit={requestForm.handleSubmit(handleSendLink)}
            >
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={loading}
                        data-testid="reset-email-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  (!requestForm.formState.isValid &&
                    process.env.NEXT_PUBLIC_TEST_MODE !== 'true')
                }
                data-testid="reset-submit"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          </Form>
        )}

        {!isRequestPhase && (
          <div className="space-y-4">
            {!showResetForm && (
              <p className="text-sm text-muted-foreground">
                Verifying your reset link…
              </p>
            )}

            {showResetForm && (
              <Form {...updateForm}>
                <form
                  className="space-y-4"
                  onSubmit={updateForm.handleSubmit(handleUpdatePassword)}
                >
                  <FormField
                    control={updateForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter a new password"
                            disabled={loading}
                            data-testid="reset-password-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      loading ||
                      (!updateForm.formState.isValid &&
                        process.env.NEXT_PUBLIC_TEST_MODE !== 'true')
                    }
                    data-testid="reset-password-submit"
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update password
                  </Button>
                </form>
              </Form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
