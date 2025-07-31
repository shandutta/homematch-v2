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
    'Get ready to swipe and match! 🔥',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationIndex((prev) => (prev + 1) % notifications.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [notifications.length])

  return (
    <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-teal-50 pt-24 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-white/50 to-teal-100/50"></div>

      <div className="relative z-10 max-w-4xl px-4">
        <motion.h1
          className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Find Your <span className="text-teal-600">Dream Home</span>
          <br />
          <em className="text-4xl md:text-5xl">Together</em>
        </motion.h1>

        <motion.p
          className="mx-auto mb-8 max-w-3xl text-xl text-gray-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Stop the endless debates. Find your dream home together in minutes,
          not months.
        </motion.p>

        <motion.div
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            className="transform rounded-full bg-teal-500 px-8 py-4 text-lg font-semibold text-white transition hover:scale-105 hover:bg-teal-600"
            onClick={() => router.push('/signup')}
          >
            Start Matching Together
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-gray-400"
            onClick={() =>
              document
                .getElementById('how-it-works')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Watch Demo
          </Button>
        </motion.div>
      </div>

      {/* Notifications - Fixed positioning */}
      <div className="absolute top-20 right-6 z-50 flex flex-col items-end space-y-2">
        <motion.div
          key={notificationIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.5 }}
          className="min-w-[200px] rounded-lg border border-gray-200 bg-white/95 p-3 text-sm text-gray-800 shadow-lg backdrop-blur-sm"
        >
          {notifications[notificationIndex]}
        </motion.div>
      </div>
    </section>
  )
}
