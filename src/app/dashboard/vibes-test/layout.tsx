import { ReactNode } from 'react'
import { requireInternalPreviewAccess } from '@/lib/routing/internal-preview'

export default function VibesTestLayout({
  children,
}: {
  children: ReactNode
}) {
  requireInternalPreviewAccess()
  return children
}
