import { HouseholdActivityPage } from '@/components/dashboard/HouseholdActivityPage'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Activity | HomeMatch',
  description: 'See your household’s latest property activity.',
})

export default function ActivityPage() {
  return <HouseholdActivityPage />
}
