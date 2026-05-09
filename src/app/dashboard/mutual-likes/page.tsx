import { MutualLikesListPage } from '@/components/dashboard/MutualLikesListPage'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Mutual Likes | HomeMatch',
  description: 'Explore homes every member of your household liked.',
})

export default function MutualLikesPage() {
  return <MutualLikesListPage />
}
