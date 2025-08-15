import type { Metadata } from 'next'
import { DisputedPropertiesView } from '@/components/couples/DisputedPropertiesView'

export const metadata: Metadata = {
  title: 'Property Decisions - HomeMatch',
  description: 'Resolve property disagreements with your partner',
}

export default function DecisionsPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <DisputedPropertiesView />
    </div>
  )
}
