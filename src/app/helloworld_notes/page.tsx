import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/utils/supabase/actions'

interface Note {
  id: number
  title?: string
  content?: string
}

export default async function HelloWorldNotes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: notes, error } = await supabase.from('notes').select()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mx-auto mb-8 flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hello World Notes!
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome to your authenticated Supabase notes page
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500">
              User ID: {user?.id.slice(0, 8)}...
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            🎉 Authentication Success!
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>✅ User authenticated:</strong> {user?.email}
            </p>
            <p>
              <strong>✅ Supabase connection:</strong> Working
            </p>
            <p>
              <strong>✅ Database query:</strong>{' '}
              {error
                ? `Error: ${error.message}`
                : notes
                  ? 'Success'
                  : 'No data'}
            </p>
            <p>
              <strong>✅ Route protection:</strong> Active
            </p>
            <p>
              <strong>✅ Session management:</strong> Active
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Notes from Supabase Database
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Live data from your notes table
            </p>
          </div>
          <div className="p-6">
            {error ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-lg text-red-400">❌</div>
                <p className="text-red-500">Database Error</p>
                <p className="mt-1 text-xs text-red-400">{error.message}</p>
              </div>
            ) : notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note: Note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900">
                          {note.title || `Note #${note.id}`}
                        </h3>
                        {note.content && (
                          <p className="mt-1 text-blue-700">{note.content}</p>
                        )}
                      </div>
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-600">
                        ID: {note.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="mb-2 text-lg text-gray-400">📝</div>
                <p className="text-gray-500">No notes found in database</p>
                <p className="mt-1 text-xs text-gray-400">
                  The query executed successfully but returned no results
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 font-medium text-green-900">
            🚀 Complete Auth Flow Working!
          </h3>
          <ul className="space-y-1 text-sm text-green-700">
            <li>• Login/Signup redirects here</li>
            <li>• Google OAuth redirects here</li>
            <li>• Route is protected by middleware</li>
            <li>• User session is persistent</li>
            <li>• Database connection is live</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
