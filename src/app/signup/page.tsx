// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { SignupForm } from '@/components/features/auth/SignupForm'

export const metadata = createPublicRouteMetadata({
  title: 'Sign Up | HomeMatch',
  description:
    'Create a HomeMatch account to save homes, invite your household, and decide together.',
  path: '/signup',
})

export default function SignupPage() {
  return (
    <AuthPageShell
      title="HomeMatch"
      subtitle="Create your account"
      maxWidthClassName="max-w-md"
    >
      <div className="space-y-6">
        <SignupForm />

        <p className="text-muted-foreground text-center text-sm">
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </p>
      </div>
    </AuthPageShell>
  )
}
