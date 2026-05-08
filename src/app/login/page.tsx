// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { LoginForm } from '@/components/features/auth/LoginForm'

export const metadata = createNoindexRouteMetadata({
  title: 'Log In | HomeMatch',
  description: 'Sign in to your HomeMatch account.',
})

export default function LoginPage() {
  return (
    <AuthPageShell title="HomeMatch" subtitle="Sign in to your account">
      <div className="space-y-6">
        <LoginForm />

        <p className="text-muted-foreground text-center text-sm">
          Have a verification code?{' '}
          <AuthLink href="/verify-email">Verify email</AuthLink>
        </p>

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{' '}
          <AuthLink href="/signup">Sign up</AuthLink>
        </p>
      </div>
    </AuthPageShell>
  )
}
