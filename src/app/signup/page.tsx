// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { SignupForm } from '@/components/features/auth/SignupForm'

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
