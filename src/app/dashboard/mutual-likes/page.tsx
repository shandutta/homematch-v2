import type { Metadata } from 'next'
import { MutualLikesListPage } from '@/components/dashboard/MutualLikesListPage'

export const metadata: Metadata = {
  title: 'Mutual Likes - HomeMatch',
  description: 'Explore homes you and your partner both liked.',
}

export default function MutualLikesPage() {
  return <MutualLikesListPage />
}
