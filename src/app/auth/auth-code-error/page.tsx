export const dynamic = 'force-dynamic'

import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'

export const metadata = createNoindexRouteMetadata({
  title: 'Authentication Error | HomeMatch',
  description: 'Authentication failed. Request a new HomeMatch sign-in link.',
})

export default function AuthCodeError() {
  return (
    <AuthPageShell
      title="HomeMatch"
      subtitle="We couldn’t authenticate you. Please try again."
      maxWidthClassName="max-w-md"
    >
      <div className="bg-card/80 rounded-token-xl border-border/60 p-token-lg text-center shadow-lg backdrop-blur">
        <h2 className="text-2xl font-semibold tracking-tight">
          Authentication error
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The login link may have expired or already been used.
        </p>
        <div className="mt-6">
          <AuthLink href="/login">Back to login</AuthLink>
        </div>
      </div>
    </AuthPageShell>
  )
}
