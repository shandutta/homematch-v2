import { GroupedViewedPropertiesPage } from '@/components/dashboard/GroupedViewedPropertiesPage'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Viewed Properties | HomeMatch',
  description: 'See every home you have opened, grouped by household.',
})

export default function ViewedPropertiesPage() {
  return <GroupedViewedPropertiesPage />
}
