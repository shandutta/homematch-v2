// Force dynamic rendering to capture search params for defaults
export const dynamic = 'force-dynamic'

import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12 sm:px-8 lg:px-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">HomeMatch</h1>
          <p className="text-gray-600">
            Enter your verification code to activate your account.
          </p>
        </div>

        <VerifyEmailForm />

        <div className="text-center text-sm text-gray-600">
          Need a new email?{' '}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Return to sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
