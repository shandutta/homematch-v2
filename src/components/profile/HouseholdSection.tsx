'use client'

import { useState } from 'react'
import { UserProfile, Household } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, UserPlus, LogOut, Copy } from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface HouseholdSectionProps {
  profile: UserProfile & { household?: Household | null }
}

export function HouseholdSection({ profile }: HouseholdSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const router = useRouter()
  const userService = UserServiceClient

  const createHousehold = async () => {
    if (!householdName.trim()) {
      setError('Please enter a household name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const household = await userService.createHousehold({
        name: householdName,
      })

      if (!household) {
        throw new Error('Failed to create household')
      }

      await userService.joinHousehold(profile.id, household.id)
      toast.success('Household created successfully')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create household'
      )
    } finally {
      setLoading(false)
    }
  }

  const joinHousehold = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a household code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await userService.joinHousehold(profile.id, joinCode)
      toast.success('Joined household successfully')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join household')
    } finally {
      setLoading(false)
    }
  }

  const leaveHousehold = async () => {
    if (!confirm('Are you sure you want to leave this household?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await userService.leaveHousehold(profile.id)
      toast.success('Left household successfully')
      router.refresh()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to leave household'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const copyHouseholdCode = () => {
    if (profile.household) {
      navigator.clipboard.writeText(profile.household.id)
      toast.success('Household code copied to clipboard')
    }
  }

  if (profile.household) {
    return (
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card className="card-glassmorphism-style">
          <CardHeader>
            <CardTitle className="text-primary-foreground flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6" />
              Current Household
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-primary/40 mb-2 text-sm">Household Name</p>
              <p className="text-primary-foreground text-xl">
                {profile.household.name}
              </p>
            </div>

            <div>
              <p className="text-primary/40 mb-2 text-sm">Household Code</p>
              <div className="flex items-center gap-2">
                <code className="bg-primary/30 text-primary/60 rounded px-3 py-1 text-sm">
                  {profile.household.id}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyHouseholdCode}
                  className="text-primary/60 hover:text-primary-foreground"
                  data-testid="copy-household-code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-primary/60/60 mt-2 text-xs">
                Share this code with family members to join your household
              </p>
            </div>

            <Button
              onClick={leaveHousehold}
              disabled={loading}
              variant="outline"
              className="border-destructive/20 hover:bg-destructive/10 text-red-400 hover:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Household
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground text-2xl">
            Create a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-primary/40">
            Create a household to share property searches and preferences with
            family members.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="border-primary/20 bg-background/10 text-primary-foreground placeholder:text-primary/60/50"
            />
            <Button
              onClick={createHousehold}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Household
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground text-2xl">
            Join a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-primary/40">
            Have a household code? Enter it below to join an existing household.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="border-primary/20 bg-background/10 text-primary-foreground placeholder:text-primary/60/50"
            />
            <Button
              onClick={joinHousehold}
              disabled={loading}
              variant="outline"
              className="border-primary/20 text-primary/60 hover:bg-primary/20 hover:text-primary-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              Join Household
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
