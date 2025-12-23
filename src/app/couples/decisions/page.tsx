import type { Metadata } from 'next'
import { DisputedPropertiesView } from '@/components/couples/DisputedPropertiesView'

export const metadata: Metadata = {
  title: 'Property Decisions - HomeMatch',
  description: 'Resolve property disagreements with your household',
}

export default function DecisionsPage() {
  return <DisputedPropertiesView />
}
