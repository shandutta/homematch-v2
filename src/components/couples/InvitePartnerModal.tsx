'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Search,
  User,
  Loader2,
} from 'lucide-react'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { getBrowserAppUrl } from '@/lib/utils/site-url'
import type { HouseholdInvitation } from '@/types/database'

interface InvitePartnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
}

interface UserSearchResult {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  household_id: string | null
}

export function InvitePartnerModal({
  open,
  onOpenChange,
  householdId,
  userId,
}: InvitePartnerModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(
    null
  )
  const [pendingInvites, setPendingInvites] = useState<HouseholdInvitation[]>(
    []
  )
  const [invitesLoading, setInvitesLoading] = useState(false)

  // User search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null
  )

  const inviteLinkBase = getBrowserAppUrl()

  const fetchPendingInvites = useCallback(async () => {
    setInvitesLoading(true)
    try {
      const invites =
        await UserServiceClient.getHouseholdInvitations(householdId)
      setPendingInvites(invites.filter((i) => i.status === 'pending'))
    } catch {
      // Silently fail - not critical
    } finally {
      setInvitesLoading(false)
    }
  }, [householdId])

  // Fetch pending invites on open
  useEffect(() => {
    if (open && householdId) {
      fetchPendingInvites()
    }
  }, [open, householdId, fetchPendingInvites])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`
      )
      if (res.ok) {
        const data = await res.json()
        // Filter out current user and users already in a household
        setSearchResults(
          (data.users || []).filter(
            (u: UserSearchResult) => u.id !== userId && !u.household_id
          )
        )
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery, userId])

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user)
    setInviteEmail(user.email)
    setInviteName(user.display_name || '')
    setSearchQuery('')
    setSearchResults([])
  }

  const handleClearSelectedUser = () => {
    setSelectedUser(null)
    setInviteEmail('')
    setInviteName('')
  }

  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address')
      return
    }

    setInviteSubmitting(true)
    setInviteError(null)

    try {
      await UserServiceClient.createHouseholdInvitation({
        household_id: householdId,
        invited_email: inviteEmail.trim(),
        invited_name: inviteName.trim() || null,
        message: inviteMessage.trim() || null,
      })

      toast.success('Invitation sent!')
      setInviteEmail('')
      setInviteName('')
      setInviteMessage('')
      setSelectedUser(null)
      await fetchPendingInvites()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send invitation'
      setInviteError(message)
      toast.error(message)
    } finally {
      setInviteSubmitting(false)
    }
  }

  const copyHouseholdCode = async () => {
    try {
      await navigator.clipboard.writeText(householdId)
      setCodeCopied(true)
      toast.success('Household code copied!')
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      toast.error('Could not copy household code', {
        description:
          'Please copy it manually or check your browser permissions.',
      })
    }
  }

  const copyInviteLink = async (token: string) => {
    const link = `${inviteLinkBase}/invite/${token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedInviteToken(token)
      toast.success('Invite link copied!')
      setTimeout(() => setCopiedInviteToken(null), 2000)
    } catch {
      toast.error('Could not copy invite link', {
        description:
          'Please copy it manually or check your browser permissions.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 text-purple-500" />
            Invite Your Partner
          </DialogTitle>
          <DialogDescription>
            Send an invitation to your partner so you can discover your dream
            home together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {inviteError && (
            <Alert variant="destructive">
              <AlertDescription>{inviteError}</AlertDescription>
            </Alert>
          )}

          {/* Search for existing users */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Find your partner on HomeMatch
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {selectedUser.display_name || selectedUser.email}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelectedUser}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by email address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
            )}

            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="rounded-lg border border-slate-200 bg-white shadow-lg">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.display_name || user.email}
                      </p>
                      {user.display_name && (
                        <p className="text-sm text-slate-500">{user.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 3 &&
              searchResults.length === 0 &&
              !searchLoading &&
              !selectedUser && (
                <p className="text-sm text-slate-500">
                  No users found. You can still invite them by email below.
                </p>
              )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">
                Or invite by email
              </span>
            </div>
          </div>

          {/* Manual email invite */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Partner&apos;s name
                </label>
                <Input
                  placeholder="Their name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={!!selectedUser}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <Input
                  placeholder="partner@example.com"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!!selectedUser}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Personal message (optional)
              </label>
              <textarea
                placeholder="Add a personal note..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                rows={2}
              />
            </div>

            <Button
              onClick={handleInviteSubmit}
              disabled={inviteSubmitting || !inviteEmail.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {inviteSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>

          {/* Pending invites */}
          {(pendingInvites.length > 0 || invitesLoading) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Pending invitations
                </label>
                {invitesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Badge variant="secondary">{pendingInvites.length}</Badge>
                )}
              </div>
              {invitesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {invite.invited_name || invite.invited_email}
                        </p>
                        {invite.invited_name && (
                          <p className="text-sm text-slate-500">
                            {invite.invited_email}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInviteLink(invite.token)}
                        aria-label={`Copy invite link for ${invite.invited_name || invite.invited_email}`}
                      >
                        {copiedInviteToken === invite.token ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative: Share household code */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Or share your household code
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm text-slate-800">
                {householdId}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyHouseholdCode}
                className="shrink-0"
                aria-label="Copy household code"
              >
                {codeCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Your partner can use this code to join directly from their profile
              settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
