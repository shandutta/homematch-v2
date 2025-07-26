import Link from 'next/link'

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            An error occurred. Please try again later.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
