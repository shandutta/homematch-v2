'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Verifying your sign-in…')
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/dashboard'

    if (error) {
      setMessage(error_description || 'Authentication error.')
      router.replace('/auth/auth-code-error')
      return
    }

    const exchange = async () => {
      try {
        const code = searchParams.get('code')
        if (!code) {
          setMessage(
            'Missing authentication code. Please try signing in again.'
          )
          router.replace('/auth/auth-code-error')
          return
        }

        const { error: sessionError } =
          await supabase.auth.exchangeCodeForSession(code)

        if (sessionError) {
          setMessage(sessionError.message || 'Authentication failed.')
          console.error('OAuth callback error', sessionError)
          router.replace('/auth/auth-code-error')
          return
        }

        router.replace(next.startsWith('/') ? next : `/${next}`)
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : 'Authentication failed.'
        )
        console.error('OAuth callback error', err)
        router.replace('/auth/auth-code-error')
      }
    }

    void exchange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Completing sign-in…
        </h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
