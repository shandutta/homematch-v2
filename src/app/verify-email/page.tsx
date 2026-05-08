// Force dynamic rendering to capture search params for defaults
export const dynamic = 'force-dynamic'

import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm'

export const metadata = createNoindexRouteMetadata({
  title: 'Verify Email | HomeMatch',
  description: 'Verify your HomeMatch email address securely.',
})

export default function VerifyEmailPage() {
  return (
    <AuthPageShell
      title="HomeMatch"
      subtitle="Enter your verification code to activate your account."
    >
      <div className="space-y-6">
        <VerifyEmailForm />

        <p className="text-muted-foreground text-center text-sm">
          Need a new email?{' '}
          <AuthLink href="/signup">Return to sign up</AuthLink>
        </p>
      </div>
    </AuthPageShell>
  )
}
