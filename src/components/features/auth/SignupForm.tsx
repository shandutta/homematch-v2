'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { SignupSchema, type SignupData } from '@/lib/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { buildBrowserRedirectUrl } from '@/lib/utils/site-url'
import Link from 'next/link'

export function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [lastEmail, setLastEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  )
  const [resendError, setResendError] = useState<string | null>(null)
  const supabase = createClient()

  const form = useValidatedForm(SignupSchema, {
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  })

  const handleSignup = async (data: SignupData) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: buildBrowserRedirectUrl(),
        data: {
          display_name: data.displayName,
        },
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setLastEmail(data.email)
      setResendStatus('idle')
      setResendError(null)
      setSuccess(true)
    }

    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildBrowserRedirectUrl(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!lastEmail) {
      setResendError('Enter your email above first.')
      return
    }

    setResendError(null)
    setResendStatus('sending')

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: lastEmail,
      options: {
        emailRedirectTo: buildBrowserRedirectUrl(),
      },
    })

    if (error) {
      setResendError(error.message)
      setResendStatus('idle')
    } else {
      setResendStatus('sent')
    }
  }

  if (success) {
    const verificationLink = lastEmail
      ? `/verify-email?email=${encodeURIComponent(lastEmail)}`
      : '/verify-email'

    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="space-y-4 pt-6">
          <Alert>
            <AlertDescription>
              {lastEmail
                ? `Check ${lastEmail} for a verification link to complete your account setup.`
                : 'Check your email for a verification link to complete your account setup.'}{' '}
              If your email includes a 6-digit code, you can enter it using the
              button below. If it does not arrive within a minute, you can
              resend it below.
            </AlertDescription>
          </Alert>

          {resendError && (
            <Alert variant="destructive">
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}

          {resendStatus === 'sent' && !resendError && (
            <Alert>
              <AlertDescription>
                Verification email resent. Check your inbox or spam folder.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href={verificationLink}>Enter verification code</Link>
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending'}
            >
              {resendStatus === 'sending' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Resend verification email
            </Button>

            <Button variant="secondary" className="w-full" asChild>
              <Link href="/login">Return to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">
          Create Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSignup)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter your display name"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      disabled={loading}
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
                (!form.formState.isValid &&
                  // In test mode, bypass client-side validity gating to avoid disabled submit flakiness
                  process.env.NEXT_PUBLIC_TEST_MODE !== 'true')
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Google
        </Button>
      </CardContent>
    </Card>
  )
}
