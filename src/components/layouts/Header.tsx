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
    <header className="bg-purple-900/10 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-white font-bold text-xl">
              HomeMatch
            </Link>
          </div>
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <Link href="/dashboard/liked" className="text-purple-300 hover:text-white transition-colors flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Liked</span>
            </Link>
            <Link href="/dashboard/viewed" className="text-purple-300 hover:text-white transition-colors flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Viewed</span>
            </Link>
            <Link href="/dashboard/passed" className="text-purple-300 hover:text-white transition-colors flex items-center space-x-2">
              <X className="h-5 w-5" />
              <span>Passed</span>
            </Link>
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors">
                  <User className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-purple-900/95 border-purple-500/20">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer text-purple-200 hover:text-white">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer text-purple-200 hover:text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-purple-500/20" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center cursor-pointer text-purple-200 hover:text-white"
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
