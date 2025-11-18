import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerAppUrl } from '@/lib/utils/server-url'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(({ name }) => name)
  const verifierCookie = allCookies.find((cookie) =>
    cookie.name.endsWith('code-verifier')
  )

  console.log('OAuth callback received:', {
    code: code ? 'present' : 'missing',
    error_param,
    error_description,
    origin,
    next,
    cookies: cookieNames,
    verifierCookiePresent: Boolean(verifierCookie),
    verifierCookieLength: verifierCookie?.value?.length ?? 0,
  })

  if (error_param) {
    console.error('OAuth error from provider:', error_param, error_description)
    return redirect('/auth/auth-code-error')
  }

  if (code) {
    const supabase = await createClient()
    const originalFetch = globalThis.fetch

    const stringifyBody = (body: BodyInit | null | undefined) => {
      if (!body) return ''
      if (typeof body === 'string') return body
      if (body instanceof URLSearchParams) return body.toString()
      if (Buffer.isBuffer(body)) return body.toString()
      if (body instanceof ArrayBuffer) return Buffer.from(body).toString()
      if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer).toString()
      if (body instanceof FormData) return '[form-data body]'
      if (body instanceof Blob) return '[blob body]'
      return '[unreadable body]'
    }

    const patchedFetch: typeof globalThis.fetch = async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : ''

      if (requestUrl.includes('/auth/v1/token') && init?.body) {
        try {
          const parsedBody = stringifyBody(init.body)
          console.log('[debug] exchange request body:', parsedBody)
        } catch {
          console.log('[debug] exchange request body: [unreadable]')
        }
      }
      return originalFetch(input, init)
    }

    globalThis.fetch = patchedFetch
    console.log('Attempting to exchange code for session...')
    let data, error
    try {
      ;({ data, error } = await supabase.auth.exchangeCodeForSession(code))
    } finally {
      globalThis.fetch = originalFetch
    }

    if (error) {
      console.error('Session exchange error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error,
      })
    } else {
      console.log('Session exchange successful:', {
        user: data.user?.id,
        session: data.session ? 'present' : 'missing',
      })
    }

    if (!error) {
      const baseUrl = await getServerAppUrl()
      if (verifierCookie) {
        cookieStore.set(verifierCookie.name, '', {
          path: '/',
          maxAge: 0,
        })
      }
      return redirect(`${baseUrl}${next}`)
    }
  }

  console.error(
    'OAuth callback failed - no code received or session exchange failed'
  )
  // return the user to an error page with instructions
  return redirect('/auth/auth-code-error')
}
