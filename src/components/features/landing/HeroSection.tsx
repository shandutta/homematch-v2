'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function HeroSection() {
  const router = useRouter()
  const [notificationIndex, setNotificationIndex] = useState(0)
  
  const notifications = [
    'Invite your partner and earn a badge!',
    'Household created! 🎉',
    'Get ready to swipe and match! 🔥'
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationIndex((prev) => (prev + 1) % notifications.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [notifications.length])

  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-teal-50 min-h-[75vh] flex items-center justify-center text-center relative overflow-hidden pt-24">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-white/50 to-teal-100/50"></div>
      
      <div className="relative z-10 max-w-4xl px-4">
        <motion.h1 
          className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Find Your <span className="text-teal-600">Dream Home</span><br />
          <em className="text-4xl md:text-5xl">Together</em>
        </motion.h1>
        
        <motion.p 
          className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Stop the endless debates. Find your dream home together in minutes, not months.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button 
            className="bg-teal-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transform transition hover:bg-teal-600"
            onClick={() => router.push('/signup')}
          >
            Start Matching Together
          </Button>
          <Button 
            variant="outline"
            className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-gray-400 transition-all"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Watch Demo
          </Button>
        </motion.div>
      </div>

      {/* Notifications - Fixed positioning */}
      <div className="absolute top-20 right-6 flex flex-col items-end space-y-2 z-50">
        <motion.div
          key={notificationIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.5 }}
          className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg min-w-[200px] text-sm text-gray-800"
        >
          {notifications[notificationIndex]}
        </motion.div>
      </div>
    </section>
  )
}
