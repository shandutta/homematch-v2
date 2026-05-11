// Phase C of Clerk migration: /login redirects to Clerk's /sign-in.
// The legacy LoginForm at @/components/features/auth/LoginForm.tsx is
// retained but unhooked — it can be removed after Phase E (user migration)
// when no legacy Supabase users remain.
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

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
