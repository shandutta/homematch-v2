// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { SignupForm } from '@/components/features/auth/SignupForm'

export const metadata = createPublicRouteMetadata({
  title: 'Sign Up | HomeMatch — Start Your Collaborative Home Search',
  description:
    'Create a free HomeMatch account to start your collaborative home search — invite your household, save listings, and find a home everyone loves with AI-powered property matching.',
  path: '/signup',
})

export default function SignupPage() {
  return (
    <AuthPageShell
      title="HomeMatch"
      subtitle="Create your account"
      maxWidthClassName="max-w-md"
      valueProp="AI-powered home matching for you and your household"
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
