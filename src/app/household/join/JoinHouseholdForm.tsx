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
    <Card className="border-hm-border bg-hm-surface-raised w-full max-w-md rounded-3xl border shadow-xl">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex items-center gap-2">
          <Link
            href="/couples"
            className="text-hm-faint hover:text-hm-muted transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="from-hm-accent to-hm-accent-strong flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br">
            <Users className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-hm-ink text-2xl">Join a Household</CardTitle>
        <p className="text-hm-muted">
          Enter the household code shared with you to start searching for homes
          together.
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
              className="text-hm-ink-soft mb-1.5 block text-sm font-medium"
            >
              Household Code
            </label>
            <Input
              id="household-code"
              placeholder="Paste the household code here"
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value)}
              className="border-hm-border bg-hm-surface-raised text-hm-ink placeholder:text-hm-faint font-mono"
              disabled={loading}
            />
            <p className="text-hm-muted mt-1.5 text-xs">
              Ask the person who invited you for the household code or check
              your invitation email.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !householdCode.trim()}
            className="from-hm-accent to-hm-accent-strong hover:from-hm-accent-strong hover:to-hm-link-hover w-full bg-gradient-to-r"
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
              <span className="border-hm-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-hm-surface-raised text-hm-muted px-2">
                Or
              </span>
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
