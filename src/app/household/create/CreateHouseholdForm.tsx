'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Home, UserPlus, ArrowLeft, Loader2 } from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import Link from 'next/link'

export function CreateHouseholdForm() {
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!householdName.trim()) {
      setError('Please enter a household name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // The RPC function atomically creates the household AND links the user
      const household = await UserServiceClient.createHousehold({
        name: householdName.trim(),
      })

      if (!household) {
        throw new Error('Failed to create household')
      }

      // No need to call joinHousehold - the RPC handles linking the user profile
      toast.success('Household created! Now invite your partner.')
      router.push('/couples')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create household'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex items-center gap-2">
          <Link
            href="/couples"
            className="text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
            <Home className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-slate-900">
          Create Your Household
        </CardTitle>
        <p className="text-slate-500">
          Start your home search journey together. Create a household and invite
          your partner to join.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label
              htmlFor="household-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Household Name
            </label>
            <Input
              id="household-name"
              placeholder="e.g., The Smith Family"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Pick a name that you and your partner will recognize.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !householdName.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Household
              </>
            )}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button variant="outline" asChild className="w-full">
            <Link href="/household/join">
              Already have a household code? Join instead
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
