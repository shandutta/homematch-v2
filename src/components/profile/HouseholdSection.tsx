'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserProfile, Household, HouseholdInvitation } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  UserPlus,
  LogOut,
  Copy,
  Plus,
  MailPlus,
  X,
  Check,
  Sparkles,
  Home,
  Link as LinkIcon,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getBrowserAppUrl } from '@/lib/utils/site-url'
import { motion, AnimatePresence } from 'framer-motion'

interface HouseholdSectionProps {
  profile: UserProfile & { household?: Household | null }
}

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

const inviteStatusStyles: Record<
  InviteStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
  },
  accepted: {
    label: 'Accepted',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
  },
  revoked: {
    label: 'Revoked',
    bg: 'bg-white/5',
    text: 'text-hm-stone-400',
    border: 'border-white/10',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    border: 'border-red-500/20',
  },
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

const inputStyles =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-hm-stone-200 placeholder:text-hm-stone-500 transition-all focus:border-amber-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-500/20'

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
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState<string | null>(null)
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
      // The RPC function atomically creates the household AND links the user
      const household = await userService.createHousehold({
        name: householdName,
      })

      if (!household) {
        throw new Error('Failed to create household')
      }

      // No need to call joinHousehold - the RPC handles linking the user profile
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

  const copyHouseholdCode = async () => {
    if (profile.household) {
      try {
        await navigator.clipboard.writeText(profile.household.id)
        setCodeCopied(true)
        toast.success('Household code copied to clipboard')
        setTimeout(() => setCodeCopied(false), 2000)
      } catch {
        toast.error('Could not copy household code', {
          description: 'Please copy it manually or check your browser permissions.',
        })
      }
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
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(token)
      toast.success('Invitation link copied')
      setTimeout(() => setLinkCopied(null), 2000)
    } catch {
      toast.error('Could not copy invite link', {
        description: 'Please copy it manually or check your browser permissions.',
      })
    }
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
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || inviteError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Current Household Card */}
        <div className="card-luxury overflow-hidden p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
                Current Household
              </h2>
              <p className="text-hm-stone-500 text-sm">
                Manage your household settings
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-medium tracking-[0.15em] text-emerald-300 uppercase">
                  Household Name
                </p>
              </div>
              <p
                className="font-heading text-hm-stone-200 mt-2 text-2xl font-semibold"
                data-testid="household-name"
              >
                {profile.household.name}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-hm-stone-500 text-xs font-medium tracking-[0.15em] uppercase">
                Invite Code
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code
                  className="text-hm-stone-300 flex-1 truncate rounded-lg bg-white/5 px-3 py-2 font-mono text-sm"
                  data-testid="household-id"
                >
                  {profile.household.id}
                </code>
                <button
                  type="button"
                  onClick={copyHouseholdCode}
                  className="text-hm-stone-400 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                  data-testid="copy-household-code"
                  aria-label="Copy household code"
                >
                  <AnimatePresence mode="wait">
                    {codeCopied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="h-4 w-4 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
              <p className="text-hm-stone-500 mt-2 text-xs">
                Share this code or send an invitation link so your partner can
                join instantly.
              </p>
            </div>

            <Button
              onClick={leaveHousehold}
              disabled={loading}
              variant="ghost"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              data-testid="leave-household-button"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Household
            </Button>
          </div>
        </div>

        {/* Invite Collaborators Card */}
        <div className="card-luxury overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <MailPlus className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
                  Invite Collaborators
                </h2>
                <p className="text-hm-stone-500 text-sm">
                  Add partners or family members
                </p>
              </div>
            </div>
            {invites.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                {invites.filter((invite) => invite.status === 'pending').length}{' '}
                pending
              </span>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {/* Send invite form */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-hm-stone-200 font-medium">
                    Send a new invite
                  </p>
                  <p className="text-hm-stone-500 text-sm">
                    Generate a private link your partner can use to join.
                  </p>
                </div>
                <MailPlus className="text-hm-stone-500 hidden h-5 w-5 sm:block" />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="Partner name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className={inputStyles}
                  data-testid="invite-name-input"
                />
                <input
                  placeholder="Partner email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={inputStyles}
                  data-testid="invite-email-input"
                />
              </div>

              <textarea
                placeholder="Add a personal message (optional)"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className={`${inputStyles} mt-4 resize-none`}
                rows={3}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={handleInviteSubmit}
                  disabled={inviteSubmitting}
                  className="bg-gradient-to-r from-sky-500 to-sky-600 px-5 text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30"
                  data-testid="send-invite-button"
                >
                  {inviteSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Send invitation
                    </>
                  )}
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
                    className="text-hm-stone-400 hover:text-hm-stone-200 hover:bg-white/5"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Invitations list */}
            <div className="space-y-3">
              <p className="text-hm-stone-400 text-xs font-medium tracking-[0.15em] uppercase">
                Invitations
              </p>
              {invitesLoading ? (
                <div className="space-y-3" data-testid="invites-loading">
                  {[...Array(2)].map((_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl bg-white/5"
                    />
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                  <Users className="text-hm-stone-500 mx-auto h-8 w-8" />
                  <p className="text-hm-stone-400 mt-2 text-sm">
                    No invitations yet. Add your partner&apos;s email above to
                    get started.
                  </p>
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
                      <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-hm-stone-200 truncate font-medium">
                              {invite.invited_name || invite.invited_email}
                            </p>
                            <p className="text-hm-stone-500 text-sm">
                              {invite.invited_email}
                            </p>
                            <div className="text-hm-stone-500 mt-1 flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              Expires {formatDate(invite.expires_at)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${styles.bg} ${styles.text} ${styles.border}`}
                            >
                              {styles.label}
                            </span>
                            <button
                              onClick={() => handleCopyInviteLink(invite.token)}
                              className="text-hm-stone-400 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              <AnimatePresence mode="wait">
                                {linkCopied === invite.token ? (
                                  <motion.span
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    Copied
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key="copy"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <LinkIcon className="h-3 w-3" />
                                    Copy link
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </button>
                            {invite.status === 'pending' && (
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="text-hm-stone-400 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <X className="h-3 w-3" />
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                        {invite.message && (
                          <p className="text-hm-stone-400 mt-3 rounded-lg bg-white/[0.03] p-3 text-sm italic">
                            &ldquo;{invite.message}&rdquo;
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No household state
  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Create Household Card */}
      <div className="card-luxury overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Home className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Create a Household
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Start collaborating with family
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4" data-testid="create-household-form">
          <p className="text-hm-stone-400 text-sm">
            Create a household to share property searches and preferences with
            your partner or family members.
          </p>
          <input
            placeholder="Enter household name"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            className={inputStyles}
            data-testid="household-name-input"
          />
          <Button
            onClick={createHousehold}
            disabled={loading}
            className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30"
            data-testid="create-household-button"
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
        </div>
      </div>

      {/* Join Household Card */}
      <div className="card-luxury overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Users className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Join a Household
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Connect with an existing group
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-hm-stone-400 text-sm">
            Have a household code? Enter it below to join an existing household.
          </p>
          <input
            placeholder="Enter household code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className={inputStyles}
          />
          <Button
            onClick={joinHousehold}
            disabled={loading}
            variant="outline"
            className="text-hm-stone-300 border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
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
        </div>
      </div>
    </div>
  )
}
