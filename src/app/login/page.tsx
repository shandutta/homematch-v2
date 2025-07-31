'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import LoginForm to prevent SSR issues with React hooks
const LoginForm = dynamic(
  () => import('@/components/features/auth/LoginForm').then(mod => ({ default: mod.LoginForm })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
  }
)

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">HomeMatch</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <LoginForm />

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
