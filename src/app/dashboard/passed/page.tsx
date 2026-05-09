import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Passed Properties | HomeMatch',
  description: 'Review the homes you have skipped while swiping.',
})

export default function PassedPropertiesPage() {
  return <InteractionsListPage type="skip" title="Passed Properties" />
}
