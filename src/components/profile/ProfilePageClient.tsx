'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, Household } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from './ProfileForm'
import { HouseholdSection } from './HouseholdSection'
import { ActivityStats } from './ActivityStats'
import { User as UserIcon, Home, Activity, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
// import { useRouter } from 'next/navigation'

interface ProfilePageClientProps {
  user: User
  profile: UserProfile & { household?: Household | null }
  activitySummary: {
    likes: number
    dislikes: number
    views: number
    saved_searches: number
    total_interactions: number
  }
}

export function ProfilePageClient({
  user,
  profile,
  activitySummary,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState('profile')
  // const router = useRouter()

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-purple-900/10 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-purple-300 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold">My Profile</h1>
            </div>
            <Link href="/settings">
              <Button
                variant="outline"
                className="border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:text-white"
              >
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="border border-purple-500/20 bg-purple-900/20">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="household" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Household
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="card-glassmorphism-style">
              <CardHeader>
                <CardTitle className="text-2xl text-white">
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileForm user={user} profile={profile} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="household" className="space-y-6">
            <HouseholdSection profile={profile} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivityStats summary={activitySummary} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
