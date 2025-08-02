'use client'

import Link from 'next/link'
import { Home, Heart, Eye, X, Settings } from 'lucide-react'

export function Header() {
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
            <button className="p-2 rounded-full text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors">
              <Settings className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
