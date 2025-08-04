'use client'

import Link from 'next/link'
import { Heart, Eye, X, Settings, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-purple-900/10 backdrop-blur-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              HomeMatch
            </Link>
          </div>
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <Link
              href="/dashboard/liked"
              className="flex items-center space-x-2 text-purple-300 transition-colors hover:text-white"
            >
              <Heart className="h-5 w-5" />
              <span>Liked</span>
            </Link>
            <Link
              href="/dashboard/viewed"
              className="flex items-center space-x-2 text-purple-300 transition-colors hover:text-white"
            >
              <Eye className="h-5 w-5" />
              <span>Viewed</span>
            </Link>
            <Link
              href="/dashboard/passed"
              className="flex items-center space-x-2 text-purple-300 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
              <span>Passed</span>
            </Link>
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full p-2 text-purple-300 transition-colors hover:bg-purple-500/20 hover:text-white">
                  <User className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-purple-500/20 bg-purple-900/95"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex cursor-pointer items-center text-purple-200 hover:text-white"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center text-purple-200 hover:text-white"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-purple-500/20" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex cursor-pointer items-center text-purple-200 hover:text-white"
                >
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  )
}
