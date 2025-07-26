export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sorry, we could not authenticate you. Please try again.
          </p>
          <div className="mt-4">
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
