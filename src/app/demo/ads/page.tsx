import { requireInternalPreviewAccess } from '@/lib/routing/internal-preview'
import { Metadata } from 'next'
import { AdMonetizationMockup } from '@/components/marketing/AdMonetizationMockup'

export const metadata: Metadata = {
  title: 'Ads preview (internal) | HomeMatch',
  description: 'Internal preview page for ad placements.',
  robots: { index: false, follow: false },
}

export default function AdsPreviewPage() {
  requireInternalPreviewAccess()
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <AdMonetizationMockup />
      </div>
    </div>
  )
}
