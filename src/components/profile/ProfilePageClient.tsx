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
import {
  User as UserIcon,
  Home,
  Activity,
  ArrowLeft,
  Mail,
  Phone,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

type ProfilePreferences = Partial<{
  display_name: string
  phone: string
  bio: string
}>

export function ProfilePageClient({
  user,
  profile,
  activitySummary,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState('profile')

  const profilePreferences = (profile.preferences || {}) as ProfilePreferences
  const displayName =
    profilePreferences.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Your Profile'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const phoneNumber = profilePreferences.phone
  const hasHousehold = Boolean(profile.household)

  const heroStats = [
    {
      label: 'Properties liked',
      value: activitySummary.likes,
      accent: 'text-emerald-300',
    },
    {
      label: 'Properties viewed',
      value: activitySummary.views,
      accent: 'text-sky-300',
    },
    {
      label: 'Saved searches',
      value: activitySummary.saved_searches,
      accent: 'text-amber-200',
    },
  ]

  return (
    <div className="text-primary-foreground min-h-screen pb-16">
      <section
        className="relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#081735] via-[#050f23] to-[#020814]"
        data-testid="profile-header"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent blur-3xl"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 py-10">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/20 bg-white/10 text-2xl text-white">
                  <AvatarFallback className="bg-white/10 text-xl text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm tracking-wide text-white/60 uppercase">
                    My Profile
                  </p>
                  <h1 className="text-3xl font-bold text-white sm:text-4xl">
                    {displayName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
                    <span>{user.email}</span>
                    <Badge className="border-white/30 bg-white/10 text-white/80">
                      {hasHousehold ? 'Household synced' : 'No household yet'}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-white/70">
                Adjust your information, manage your household, and understand
                how you&apos;re interacting with listings—all from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings">
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/5 px-6 text-white hover:bg-white/10"
                >
                  Open settings
                </Button>
              </Link>
              <Link href="/dashboard/liked">
                <Button className="bg-cyan-500/80 px-6 text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400/80">
                  View favorites
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-inner"
              >
                <p className="text-xs tracking-[0.2em] text-white/60 uppercase">
                  {stat.label}
                </p>
                <p className={`mt-2 text-3xl font-semibold ${stat.accent}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="space-y-6">
            <Card className="card-glassmorphism-style">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UserIcon className="h-5 w-5" />
                  Profile snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  {[
                    {
                      label: 'Primary email',
                      value: user.email ?? 'Not provided',
                      icon: Mail,
                      muted: false,
                    },
                    {
                      label: 'Phone number',
                      value: phoneNumber || 'Add your phone number',
                      icon: Phone,
                      muted: !phoneNumber,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="rounded-2xl bg-white/10 p-2 text-white/80">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs tracking-wide text-white/50 uppercase">
                            {item.label}
                          </p>
                          <p
                            className={`text-sm ${
                              item.muted ? 'text-white/50' : 'text-white'
                            }`}
                          >
                            {item.value}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('profile')}
                  className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  Edit profile details
                </Button>
              </CardContent>
            </Card>

            <Card className="card-glassmorphism-style">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5" />
                  Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <p>
                  {hasHousehold
                    ? 'You are sharing preferences with your household.'
                    : 'Invite a partner or family member to collaborate on decisions.'}
                </p>
                {hasHousehold ? (
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="text-xs tracking-wide text-white/50 uppercase">
                      Household
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {profile.household?.name}
                    </p>
                    <p className="mt-3 text-xs tracking-wide text-white/50 uppercase">
                      Join code
                    </p>
                    <p className="font-mono text-sm text-cyan-200">
                      {profile.household?.id}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-white/60">
                    Create or join a household to unlock mutual likes and shared
                    timelines.
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('household')}
                    className="flex-1 border-white/30 bg-white/5 text-white hover:bg-white/10"
                  >
                    Manage household
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('activity')}
                    className="flex-1 border-white/30 bg-white/5 text-white hover:bg-white/10"
                  >
                    View activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white/5 p-1 text-white/60">
                <TabsTrigger
                  value="profile"
                  className="min-w-[140px] rounded-2xl px-4 py-2 text-sm data-[state=active]:!bg-white data-[state=active]:!text-[#0a1224] data-[state=active]:shadow-lg"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="household"
                  className="min-w-[140px] rounded-2xl px-4 py-2 text-sm data-[state=active]:!bg-white data-[state=active]:!text-[#0a1224] data-[state=active]:shadow-lg"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Household
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="min-w-[140px] rounded-2xl px-4 py-2 text-sm data-[state=active]:!bg-white data-[state=active]:!text-[#0a1224] data-[state=active]:shadow-lg"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card className="card-glassmorphism-style">
                  <CardHeader>
                    <CardTitle className="text-primary-foreground text-2xl">
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProfileForm user={user} profile={profile} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="household"
                className="space-y-6"
                data-testid="household-section"
              >
                <HouseholdSection profile={profile} />
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <ActivityStats summary={activitySummary} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
