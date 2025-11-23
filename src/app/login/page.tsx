// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { LoginForm } from '@/components/features/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12 sm:px-8 lg:px-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">HomeMatch</h1>
          <p className="mt-3 text-gray-600">Sign in to your account</p>
        </div>

        <LoginForm />

        <div className="text-center text-sm text-gray-600">
          Have a verification code?{' '}
          <Link
            href="/verify-email"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Verify email
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
