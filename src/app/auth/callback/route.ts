import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('OAuth callback received:', {
    code: code ? 'present' : 'missing',
    error_param,
    error_description,
    origin,
    next
  })

  if (error_param) {
    console.error('OAuth error from provider:', error_param, error_description)
    return redirect('/auth/auth-code-error')
  }

  if (code) {
    const supabase = await createClient()
    console.log('Attempting to exchange code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Session exchange error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      })
    } else {
      console.log('Session exchange successful:', {
        user: data.user?.id,
        session: data.session ? 'present' : 'missing'
      })
    }
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return redirect(`https://${forwardedHost}${next}`)
      } else {
        return redirect(`${origin}${next}`)
      }
    }
  }

  console.error('OAuth callback failed - no code received or session exchange failed')
  // return the user to an error page with instructions
  return redirect('/auth/auth-code-error')
}
