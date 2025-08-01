export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-4xl font-bold">404 - Page Not Found</h2>
        <p className="mb-4 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go back home
        </a>
      </div>
    </div>
  )
}
