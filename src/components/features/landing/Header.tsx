'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <h1 className="text-2xl font-bold text-gray-900">HomeMatch</h1>
        <div className="flex items-center gap-4">
          <a
            href="#how-it-works"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            How it Works
          </a>
          <Button
            className="transform rounded-lg bg-teal-500 px-4 py-2 text-sm text-white transition hover:scale-105"
            onClick={() => router.push('/signup')}
          >
            Start Matching
          </Button>
        </div>
      </div>
    </nav>
  )
}
