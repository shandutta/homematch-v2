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
    const query = searchQuery.trim()
    // Server requires an exact email (no prefix scan, per Q5 audit fix).
    // Skip the call until the input looks like a full address.
    if (!query || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`
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
            <UserPlus className="text-couples-primary h-5 w-5" />
            Invite Someone
          </DialogTitle>
          <DialogDescription>
            Send an invitation to someone in your household so you can search
            together.
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
            <label className="text-hm-ink-soft text-sm font-medium">
              Find a household member on HomeMatch
            </label>
            {selectedUser ? (
              <div className="border-couples-primary/30 bg-couples-primary/10 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-couples-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                    <User className="text-couples-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-hm-ink font-medium">
                      {selectedUser.display_name || selectedUser.email}
                    </p>
                    <p className="text-hm-muted text-sm">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelectedUser}
                  className="text-hm-muted hover:text-hm-ink-soft"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="text-hm-faint absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Enter their full email address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="text-hm-faint absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                )}
              </div>
            )}

            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="border-hm-border bg-hm-surface-raised rounded-lg border shadow-lg">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="hover:bg-hm-canvas flex w-full items-center gap-3 px-4 py-3 text-left transition"
                  >
                    <div className="bg-hm-surface flex h-8 w-8 items-center justify-center rounded-full">
                      <User className="text-hm-muted h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-hm-ink font-medium">
                        {user.display_name || user.email}
                      </p>
                      {user.display_name && (
                        <p className="text-hm-muted text-sm">{user.email}</p>
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
                <p className="text-hm-muted text-sm">
                  No users found. You can still invite them by email below.
                </p>
              )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="border-hm-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-hm-surface-raised text-hm-muted px-2">
                Or invite by email
              </span>
            </div>
          </div>

          {/* Manual email invite */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-hm-ink-soft mb-1.5 block text-sm font-medium">
                  Name
                </label>
                <Input
                  placeholder="Their name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={!!selectedUser}
                />
              </div>
              <div>
                <label className="text-hm-ink-soft mb-1.5 block text-sm font-medium">
                  Email address
                </label>
                <Input
                  placeholder="member@example.com"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!!selectedUser}
                />
              </div>
            </div>

            <div>
              <label className="text-hm-ink-soft mb-1.5 block text-sm font-medium">
                Personal message (optional)
              </label>
              <textarea
                placeholder="Add a personal note..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="border-hm-border bg-hm-surface-raised text-hm-ink placeholder:text-hm-faint focus:border-hm-focus focus:ring-hm-focus w-full rounded-md border p-3 text-sm focus:ring-1 focus:outline-none"
                rows={2}
              />
            </div>

            <Button
              onClick={handleInviteSubmit}
              disabled={inviteSubmitting || !inviteEmail.trim()}
              className="from-couples-primary to-couples-secondary w-full bg-gradient-to-r hover:opacity-90"
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
                <label className="text-hm-ink-soft text-sm font-medium">
                  Pending invitations
                </label>
                {invitesLoading ? (
                  <Loader2 className="text-hm-faint h-4 w-4 animate-spin" />
                ) : (
                  <Badge variant="secondary">{pendingInvites.length}</Badge>
                )}
              </div>
              {invitesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="text-hm-faint h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="border-hm-border bg-hm-canvas flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-hm-ink font-medium">
                          {invite.invited_name || invite.invited_email}
                        </p>
                        {invite.invited_name && (
                          <p className="text-hm-muted text-sm">
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
          <div className="border-hm-border bg-hm-canvas rounded-lg border p-4">
            <p className="text-hm-ink-soft mb-2 text-sm font-medium">
              Or share your household code
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-hm-surface-raised text-hm-ink-soft flex-1 rounded px-3 py-2 font-mono text-sm">
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
            <p className="text-hm-muted mt-2 text-xs">
              They can use this code to join directly from their profile
              settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
