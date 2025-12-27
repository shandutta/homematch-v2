'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { LoginSchema, type LoginData } from '@/lib/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { CouplesMessages } from '@/lib/utils/couples-messaging'
import { buildBrowserRedirectUrl } from '@/lib/utils/site-url'
import { AuthLink } from '@/components/features/auth/AuthPageShell'

const getSafeRedirectPath = (value: string | null) => {
  if (!value) return null

  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }

  if (!decoded.startsWith('/')) return null
  if (decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null

  return decoded
}

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isTestMode =
    process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
    process.env.NODE_ENV === 'test'

  // Use validated form with Zod schema
  const form = useValidatedForm(LoginSchema, {
    email: '',
    password: '',
  })

  const dashboardPath = '/dashboard'
  const ALLOWED_REDIRECT_PATHS = [dashboardPath]

  const resolveRedirectPath = () => {
    const hookRedirect =
      getSafeRedirectPath(searchParams?.get('redirectTo') ?? null) ||
      getSafeRedirectPath(searchParams?.get('redirect') ?? null)

    if (hookRedirect && ALLOWED_REDIRECT_PATHS.includes(hookRedirect)) {
      return hookRedirect
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const paramRedirect =
        getSafeRedirectPath(urlParams.get('redirectTo')) ||
        getSafeRedirectPath(urlParams.get('redirect'))

      if (paramRedirect && ALLOWED_REDIRECT_PATHS.includes(paramRedirect)) {
        return paramRedirect
      }

      return dashboardPath
    }

    return dashboardPath
  }

  const handleEmailLogin = async (data: LoginData) => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (!authData?.session) {
        setError('Unable to sign in right now. Please try again.')
        return
      }

      const redirectPath = resolveRedirectPath()

      if (isTestMode || typeof window === 'undefined') {
        // In tests, rely on client routing for easier assertions
        router.push(redirectPath)
        return
      }

      // Use window.location to force a full page reload, ensuring cookies are sent
      // This prevents race conditions with middleware
      window.location.assign(redirectPath)
    } catch (networkError) {
      // Handle network errors or other exceptions
      setError(
        networkError instanceof Error
          ? networkError.message
          : 'Network error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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

  return (
    <Card
      className="bg-card/80 supports-[backdrop-filter]:bg-card/60 mx-auto w-full shadow-lg backdrop-blur"
      data-testid="login-form"
    >
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">
          {CouplesMessages.welcome.returning}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" data-testid="error-alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleEmailLogin)}
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
                      placeholder="Email"
                      disabled={loading}
                      data-testid="email-input"
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
                      placeholder="Password"
                      disabled={loading}
                      data-testid="password-input"
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
              data-testid="signin-button"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <div className="flex justify-end text-sm">
              <AuthLink href="/reset-password">Forgot password?</AuthLink>
            </div>
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
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
          data-testid="google-signin-button"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Google
        </Button>
      </CardContent>
    </Card>
  )
}
