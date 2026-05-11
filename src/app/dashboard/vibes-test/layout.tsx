import { ReactNode } from 'react'
import { requireInternalPreviewAccess } from '@/lib/routing/internal-preview'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Vibes test (internal) | HomeMatch',
  description: 'Internal preview of LLM-generated property vibes.',
})

export default function VibesTestLayout({ children }: { children: ReactNode }) {
  requireInternalPreviewAccess()
  return children
}
