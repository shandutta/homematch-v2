import { CouplesPageClient } from '@/components/couples/CouplesPageClient'
import { getServerUserContext } from '@/lib/auth/server-context'
import { redirect } from 'next/navigation'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const dynamic = 'force-dynamic'

export const metadata = createNoindexRouteMetadata({
  title: 'Household | HomeMatch',
  description:
    'Manage your household members, invitations, and shared property decisions.',
})

interface CouplesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CouplesPage({ searchParams }: CouplesPageProps) {
  const resolvedSearchParams = await searchParams
  const userCtx = await getServerUserContext()

  if (!userCtx) {
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
