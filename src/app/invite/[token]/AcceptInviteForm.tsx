'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { acceptInviteAction } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AcceptInviteFormProps {
  token: string
  householdName: string
}

export function AcceptInviteForm({
  token,
  householdName,
}: AcceptInviteFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleAccept = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await acceptInviteAction(token)
        if (result.success) {
          toast.success(`Joined ${householdName}`)
          router.push('/dashboard')
          router.refresh()
          return
        }

        if (result.error) {
          setError(result.error)
        } else {
          setError('Unable to accept this invitation right now.')
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to accept invitation'
        setError(message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        onClick={handleAccept}
        disabled={isPending}
        className="w-full bg-slate-900 text-white hover:bg-slate-800"
      >
        {isPending ? 'Joining household...' : 'Accept invitation'}
      </Button>
    </div>
  )
}
