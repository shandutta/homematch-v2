import type { Metadata } from 'next'
import { HouseholdActivityPage } from '@/components/dashboard/HouseholdActivityPage'

export const metadata: Metadata = {
  title: 'Activity - HomeMatch',
  description: 'See your household’s latest property activity.',
}

export default function ActivityPage() {
  return <HouseholdActivityPage />
}
