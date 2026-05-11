import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Liked Properties | HomeMatch',
  description: 'Browse the homes you and your household have liked.',
})

export default function LikedPropertiesPage() {
  return <InteractionsListPage type="liked" title="Liked Properties" />
}
