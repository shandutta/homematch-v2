'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import {
  MotionDiv,
  fadeInUp,
  normalTransition,
} from '@/components/ui/motion-components'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquareMore, Users, ArrowRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DisputedPropertiesAlertProps {
  className?: string
}

export function DisputedPropertiesAlert({
  className,
}: DisputedPropertiesAlertProps) {
  const [disputedCount, setDisputedCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchDisputedCount = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/couples/disputed', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setDisputedCount(data.disputedProperties?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching disputed properties count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDisputedCount()
  }, [])

  // Don't show if loading, no disputed properties, or dismissed
  if (loading || disputedCount === 0 || dismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <MotionDiv
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          ...normalTransition,
          duration: 0.4,
          type: 'spring',
          stiffness: 300,
        }}
        className={className}
      >
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left Content */}
              <div className="flex flex-1 items-center gap-3">
                <MotionDiv
                  className="flex-shrink-0"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <MessageSquareMore className="h-5 w-5 text-orange-600" />
                  </div>
                </MotionDiv>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-orange-800">
                      Properties Need Discussion
                    </h3>
                    <Badge
                      variant="secondary"
                      className="border-orange-300 bg-orange-200 text-orange-800"
                    >
                      {disputedCount}
                    </Badge>
                  </div>

                  <p className="text-sm text-orange-700">
                    Your household has different reactions to {disputedCount}{' '}
                    propert{disputedCount === 1 ? 'y' : 'ies'}. Let&apos;s
                    review them together!
                  </p>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <Link href="/couples/decisions">
                  <Button
                    size="sm"
                    className="bg-orange-600 text-white hover:bg-orange-700"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Resolve
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissed(true)}
                  className="text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionDiv>
    </AnimatePresence>
  )
}
