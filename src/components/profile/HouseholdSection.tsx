'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserProfile, Household, HouseholdInvitation } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserPlus, LogOut, Copy, Plus, MailPlus, X } from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getBrowserAppUrl } from '@/lib/utils/site-url'

interface HouseholdSectionProps {
  profile: UserProfile & { household?: Household | null }
}

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

const inviteStatusStyles: Record<
  InviteStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  revoked: { label: 'Revoked', className: 'bg-slate-200 text-slate-600' },
  expired: { label: 'Expired', className: 'bg-rose-100 text-rose-700' },
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function HouseholdSection({ profile }: HouseholdSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [invites, setInvites] = useState<HouseholdInvitation[]>([])
  const router = useRouter()
  const userService = UserServiceClient
  const householdId = profile.household?.id
  const inviteLinkBase = useMemo(() => getBrowserAppUrl(), [])

  const fetchInvites = async () => {
    if (!householdId) return
    setInvitesLoading(true)
    setInviteError(null)
    try {
      const data = await userService.getHouseholdInvitations(householdId)
      setInvites(data)
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : 'Failed to load invitations'
      )
    } finally {
      setInvitesLoading(false)
    }
  }

  useEffect(() => {
    if (!householdId) return
    fetchInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId])

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

  const handleInviteSubmit = async () => {
    if (!householdId) return

    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address to invite')
      return
    }

    setInviteSubmitting(true)
    setInviteError(null)

    try {
      await userService.createHouseholdInvitation({
        household_id: householdId,
        invited_email: inviteEmail.trim(),
        invited_name: inviteName.trim() || null,
        message: inviteMessage.trim() || null,
      })
      setInviteEmail('')
      setInviteName('')
      setInviteMessage('')
      toast.success('Invitation sent')
      await fetchInvites()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send invitation'
      setInviteError(message)
      toast.error(message)
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleCopyInviteLink = async (token: string) => {
    const link = `${inviteLinkBase}/invite/${token}`
    await navigator.clipboard.writeText(link)
    toast.success('Invitation link copied')
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return
    try {
      await userService.revokeHouseholdInvitation(inviteId)
      toast.success('Invitation revoked')
      await fetchInvites()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to revoke invitation'
      toast.error(message)
    }
  }

  if (profile.household) {
    return (
      <div className="space-y-6">
        {(error || inviteError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || inviteError}</AlertDescription>
          </Alert>
        )}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <Users className="h-6 w-6" />
              Current Household
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-slate-600">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-500">
                Household name
              </p>
              <p
                className="text-2xl font-semibold text-slate-900"
                data-testid="household-name"
              >
                {profile.household.name}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-500">
                Invite code
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-800"
                  data-testid="household-id"
                >
                  {profile.household.id}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyHouseholdCode}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  data-testid="copy-household-code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Share this code or send an invitation link so your partner can
                join instantly.
              </p>
            </div>

            <Button
              onClick={leaveHousehold}
              disabled={loading}
              variant="ghost"
              className="text-rose-500 hover:bg-rose-50"
              data-testid="leave-household-button"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Household
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <MailPlus className="h-6 w-6" />
              Invite collaborators
            </CardTitle>
            {invites.length > 0 && (
              <Badge className="bg-slate-100 text-slate-700">
                {invites.filter((invite) => invite.status === 'pending').length}{' '}
                pending
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    Send a new invite
                  </p>
                  <p className="text-sm text-slate-500">
                    We&apos;ll generate a private link your partner can use to
                    join this household.
                  </p>
                </div>
                <MailPlus className="hidden h-5 w-5 text-slate-400 sm:block" />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Partner name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  data-testid="invite-name-input"
                />
                <Input
                  placeholder="Partner email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  data-testid="invite-email-input"
                />
              </div>

              <textarea
                placeholder="Add a personal message (optional)"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                rows={3}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={handleInviteSubmit}
                  disabled={inviteSubmitting}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  data-testid="send-invite-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {inviteSubmitting ? 'Sending...' : 'Send invitation'}
                </Button>
                {(inviteEmail || inviteName || inviteMessage) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteEmail('')
                      setInviteName('')
                      setInviteMessage('')
                    }}
                    className="text-slate-500 hover:bg-slate-100"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">Invitations</p>
              {invitesLoading ? (
                <div className="space-y-3" data-testid="invites-loading">
                  {[...Array(2)].map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No invitations yet. Add your partner&apos;s email above to get
                  started.
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => {
                    const status =
                      (invite.status as InviteStatus) ??
                      ('pending' as InviteStatus)
                    const styles =
                      inviteStatusStyles[status] || inviteStatusStyles.pending
                    return (
                      <div
                        key={invite.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {invite.invited_name || invite.invited_email}
                            </p>
                            <p className="text-sm text-slate-500">
                              {invite.invited_email}
                            </p>
                            <p className="text-xs text-slate-500">
                              Expires {formatDate(invite.expires_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge className={styles.className}>
                              {styles.label}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyInviteLink(invite.token)}
                              className="border-slate-200 text-slate-600 hover:bg-white"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy link
                            </Button>
                            {invite.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="text-slate-500 hover:bg-slate-100"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                        {invite.message && (
                          <p className="mt-3 rounded-2xl bg-white p-3 text-sm text-slate-600">
                            “{invite.message}”
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">
            Create a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="create-household-form">
          <p className="text-slate-500">
            Create a household to share property searches and preferences with
            family members.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              data-testid="household-name-input"
            />
            <Button
              onClick={createHousehold}
              disabled={loading}
              className="bg-slate-900 text-white hover:bg-slate-800"
              data-testid="create-household-button"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Household
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">
            Join a Household
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500">
            Have a household code? Enter it below to join an existing household.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Enter household code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            />
            <Button
              onClick={joinHousehold}
              disabled={loading}
              variant="outline"
              className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
