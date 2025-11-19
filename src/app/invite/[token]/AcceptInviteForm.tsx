'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
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

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptInviteAction(token)
      if (result.success) {
        toast.success(`Joined ${householdName}`)
        router.push('/dashboard')
        router.refresh()
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      type="button"
      onClick={handleAccept}
      disabled={isPending}
      className="w-full bg-slate-900 text-white hover:bg-slate-800"
    >
      {isPending ? 'Joining household...' : 'Accept invitation'}
    </Button>
  )
}
