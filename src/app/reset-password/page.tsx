// Force dynamic rendering to capture Supabase session from URL fragments or codes
export const dynamic = 'force-dynamic'

import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="HomeMatch"
      subtitle="We’ll help you reset your password securely."
    >
      <div className="space-y-6">
        <ResetPasswordForm />

        <p className="text-muted-foreground text-center text-sm">
          Remembered it? <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      </div>
    </AuthPageShell>
  )
}
