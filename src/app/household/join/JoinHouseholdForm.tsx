'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, ArrowLeft, Loader2 } from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import Link from 'next/link'

interface JoinHouseholdFormProps {
  userId: string
}

export function JoinHouseholdForm({ userId }: JoinHouseholdFormProps) {
  const [householdCode, setHouseholdCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!householdCode.trim()) {
      setError('Please enter a household code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await UserServiceClient.joinHousehold(userId, householdCode.trim())
      toast.success('Successfully joined household!')
      router.push('/couples')
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to join household'
      // Make error messages more user-friendly
      if (message.includes('not found') || message.includes('invalid')) {
        setError('Household not found. Please check the code and try again.')
      } else {
        setError(message)
      }
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500">
            <Users className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-slate-900">
          Join a Household
        </CardTitle>
        <p className="text-slate-500">
          Enter the household code shared by your partner to start searching for
          homes together.
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
              htmlFor="household-code"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Household Code
            </label>
            <Input
              id="household-code"
              placeholder="Paste the household code here"
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value)}
              className="border-slate-200 bg-white font-mono text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Ask your partner for their household code or check your invitation
              email.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !householdCode.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Join Household
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
            <Link href="/household/create">
              Create your own household instead
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
