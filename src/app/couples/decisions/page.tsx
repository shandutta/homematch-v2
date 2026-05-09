import { DisputedPropertiesView } from '@/components/couples/DisputedPropertiesView'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Property Decisions | HomeMatch',
  description: 'Resolve property disagreements with your household.',
})

export default function DecisionsPage() {
  return <DisputedPropertiesView />
}
