// Force dynamic rendering to capture Supabase session from URL fragments or codes
export const dynamic = 'force-dynamic'

import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12 sm:px-8 lg:px-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">HomeMatch</h1>
          <p className="text-gray-600">
            We&apos;ll help you reset your password securely.
          </p>
        </div>

        <ResetPasswordForm />

        <div className="text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
