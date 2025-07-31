'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const [user, setUser] = useState<unknown>(null)
  const router = useRouter()

  useEffect(() => {
    // Simple check for auth state without supabase client
    const checkUser = async () => {
      // For now, we'll use a simple check - can be enhanced later
      setUser(null)
    }
    checkUser()
  }, [])

  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <h1 className="text-2xl font-bold text-gray-900">HomeMatch</h1>
        <div className="flex items-center gap-4">
          <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm">
            How it Works
          </a>
          <Button 
            className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:scale-105 transform transition"
            onClick={() => router.push('/signup')}
          >
            Start Matching
          </Button>
        </div>
      </div>
    </nav>
  )
}
