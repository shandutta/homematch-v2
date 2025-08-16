'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { LoginSchema, type LoginData } from '@/lib/schemas/auth'
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
import { CouplesMessages } from '@/lib/utils/couples-messaging'

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Use validated form with Zod schema
  const form = useValidatedForm(LoginSchema, {
    email: '',
    password: '',
  })

  const handleEmailLogin = async (data: LoginData) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } catch (networkError) {
      // Handle network errors or other exceptions
      setError(networkError instanceof Error ? networkError.message : 'Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full" data-testid="login-form">
      <CardHeader>
        <CardTitle className="text-2xl text-center font-bold">
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
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="text-xs relative flex justify-center uppercase">
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
