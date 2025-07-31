import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import SignupForm to prevent SSR issues with React hooks
const SignupForm = dynamic(
  () => import('@/components/features/auth/SignupForm').then(mod => ({ default: mod.SignupForm })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
  }
)

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">HomeMatch</h1>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <SignupForm />

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
