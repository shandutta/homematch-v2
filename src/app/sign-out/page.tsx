'use client'

import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Clerk-aware sign-out page. The server signOut() action redirects here
 * when a Clerk session is detected. Calls Clerk's client SDK to clear the
 * session, then sends the user home.
 *
 * For users who reach this page directly (no session), it just redirects
 * home — Clerk's signOut() is a no-op in that case.
 */
export default function SignOutPage() {
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    void (async () => {
      try {
        await signOut(() => router.push('/'))
      } catch {
        router.push('/')
      }
    })()
  }, [signOut, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12 text-white">
      <p className="text-sm">Signing you out…</p>
    </main>
  )
}
