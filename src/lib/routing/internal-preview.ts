import { notFound } from 'next/navigation'

export function isInternalPreviewEnabled(): boolean {
  return process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW === 'true'
}

export function requireInternalPreviewAccess(): void {
  if (!isInternalPreviewEnabled()) {
    notFound()
  }
}
