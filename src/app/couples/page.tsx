import { CouplesPageClient } from '@/components/couples/CouplesPageClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface CouplesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CouplesPage({ searchParams }: CouplesPageProps) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const params = new URLSearchParams()

    const redirectParams = new URLSearchParams()
    Object.entries(resolvedSearchParams ?? {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        redirectParams.set(key, value)
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => redirectParams.append(key, item))
      }
    })

    const redirectTo = redirectParams.toString()
      ? `/couples?${redirectParams.toString()}`
      : '/couples'

    params.set('redirectTo', redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  return <CouplesPageClient />
}
