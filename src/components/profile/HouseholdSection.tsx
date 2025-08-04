'use client'

import { useState } from 'react'
import { UserProfile, Household } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, UserPlus, LogOut, Copy } from 'lucide-react'
import { UserService } from '@/lib/services/users'
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
  const userService = new UserService()

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
            <CardTitle className="flex items-center gap-2 text-2xl text-white">
              <Users className="h-6 w-6" />
              Current Household
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm text-purple-200">Household Name</p>
              <p className="text-xl text-white">{profile.household.name}</p>
            </div>

            <div>
              <p className="mb-2 text-sm text-purple-200">Household Code</p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-purple-900/30 px-3 py-1 text-sm text-purple-300">
                  {profile.household.id}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyHouseholdCode}
                  className="text-purple-300 hover:text-white"
                  data-testid="copy-household-code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-purple-300/60">
                Share this code with family members to join your household
              </p>
            </div>

            <Button
              onClick={leaveHousehold}
              disabled={loading}
              variant="outline"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
          <CardTitle className="text-2xl text-white">
            Create a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-purple-200">
            Create a household to share property searches and preferences with
            family members.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="border-purple-500/20 bg-white/10 text-white placeholder:text-purple-300/50"
            />
            <Button
              onClick={createHousehold}
              disabled={loading}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Household
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-2xl text-white">
            Join a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-purple-200">
            Have a household code? Enter it below to join an existing household.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="border-purple-500/20 bg-white/10 text-white placeholder:text-purple-300/50"
            />
            <Button
              onClick={joinHousehold}
              disabled={loading}
              variant="outline"
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:text-white"
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
