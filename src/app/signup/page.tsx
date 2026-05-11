// Phase C of Clerk migration: /signup redirects to Clerk's /sign-up.
// The legacy SignupForm at @/components/features/auth/SignupForm.tsx is
// retained but unhooked — it can be removed after Phase E (user migration).
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface SignupPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolved = await searchParams
  const redirectTo = (() => {
    const v = resolved?.redirectTo ?? resolved?.redirect
    if (typeof v === 'string') return v
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
    return null
  })()

  const target = new URLSearchParams()
  if (redirectTo) {
    target.set('redirect_url', redirectTo)
  }
  const query = target.toString()
  redirect(query ? `/sign-up?${query}` : '/sign-up')
}
