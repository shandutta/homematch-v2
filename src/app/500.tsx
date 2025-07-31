export const dynamic = 'force-dynamic'

export default function Custom500() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-4xl font-bold">500 - Server Error</h2>
        <p className="mb-4 text-gray-600">An error occurred on the server.</p>
        <a href="/" className="text-blue-600 hover:underline">
          Go back home
        </a>
      </div>
    </div>
  )
}