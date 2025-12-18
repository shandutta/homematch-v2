'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { VerifyEmailSchema, type VerifyEmailData } from '@/lib/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AuthLink } from '@/components/features/auth/AuthPageShell'

export function VerifyEmailForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const defaultEmail = searchParams?.get('email') ?? ''
  const nextPath = useMemo(() => {
    const next = searchParams?.get('next')
    if (!next) return '/dashboard'
    return next.startsWith('/') ? next : `/${next}`
  }, [searchParams])

  const form = useValidatedForm(VerifyEmailSchema, {
    email: defaultEmail,
    token: '',
  })

  const handleVerify = async (values: VerifyEmailData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: values.email,
      token: values.token,
      type: 'signup',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    let session = data?.session ?? null

    if (!session) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }
      session = sessionData.session
    }

    if (session) {
      setSuccess('Email verified! Redirecting…')
      router.replace(nextPath)
      router.refresh()
    } else {
      setSuccess('Email verified. You can now sign in with your password.')
    }

    setLoading(false)
  }

  return (
    <Card className="bg-card/80 supports-[backdrop-filter]:bg-card/60 mx-auto w-full shadow-lg backdrop-blur">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your email to finish setting up your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" data-testid="verify-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert data-testid="verify-success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleVerify)}
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
                      placeholder="Email you used to sign up"
                      autoComplete="email"
                      disabled={loading}
                      data-testid="verify-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit code"
                      disabled={loading}
                      data-testid="verify-code-input"
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
                  process.env.NEXT_PUBLIC_TEST_MODE !== 'true')
              }
              data-testid="verify-submit"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify and continue
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground text-center text-sm">
          Already confirmed? <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      </CardContent>
    </Card>
  )
}
