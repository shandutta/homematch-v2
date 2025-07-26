import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/utils/supabase/actions'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">HomeMatch</h1>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <a
              href="/login"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Sign in
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold">Welcome to HomeMatch</h2>
          <p className="mb-8 text-gray-600">
            Find your perfect home with AI-powered matching
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Smart Property Search</h3>
            <p className="text-sm text-gray-600">
              Use natural language to find properties that match your
              preferences
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Household Management</h3>
            <p className="text-sm text-gray-600">
              Share and collaborate with family members on property searches
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">ML-Powered Scoring</h3>
            <p className="text-sm text-gray-600">
              Get personalized property recommendations based on your behavior
            </p>
          </div>
        </div>

        {user && (
          <div className="mt-8 text-center">
            <a
              href="/notes"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              View Notes (Test Supabase)
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
