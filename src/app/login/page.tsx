// Phase 4 (Supabase-auth elim, 2026-05-13): /login is a redirect-only
// stub now — LoginForm + ResetPasswordForm + VerifyEmailForm and the
// /reset-password + /verify-email + /auth/* pages were retired with
// the Supabase session machinery. This page survives so existing
// `/login` links in marketing + nav components continue to work; it
// just translates the legacy `redirectTo` param to Clerk's
// `redirect_url` and forwards to /sign-in.
import { redirect } from 'next/navigation'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const dynamic = 'force-dynamic'

export const metadata = createNoindexRouteMetadata({
  title: 'Log In | HomeMatch',
  description: 'Sign in to your HomeMatch account.',
})

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = await searchParams
  const redirectTo = (() => {
    const v = resolved?.redirectTo ?? resolved?.redirect
    if (typeof v === 'string') return v
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
    return null
  })()

  const target = new URLSearchParams()
  if (redirectTo) {
    // Clerk expects redirect_url for post-sign-in destination.
    target.set('redirect_url', redirectTo)
  }
  const query = target.toString()
  redirect(query ? `/sign-in?${query}` : '/sign-in')
}
