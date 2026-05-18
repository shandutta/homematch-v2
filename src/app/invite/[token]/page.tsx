import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { getServerUserContext } from '@/lib/auth/server-context'
import type {
  Household,
  HouseholdInvitation,
  UserProfile,
} from '@/types/database'
import { Users, ShieldCheck, Clock4 } from 'lucide-react'
import { AcceptInviteForm } from './AcceptInviteForm'

// @service-role-capability: invite landing page fetches by opaque token before
// authentication; selected data is limited to invite/household and inviter display fields.
// TODO(D1 follow-up): replace with constrained invite preview RPC.
export const metadata = createNoindexRouteMetadata({
  title: 'Household Invite | HomeMatch',
  description: 'Open your private HomeMatch household invitation.',
})

type InviteRecord = HouseholdInvitation & {
  household?: Pick<Household, 'id' | 'name' | 'collaboration_mode'> | null
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const resolvedParams = await params
  const token = resolvedParams.token

  const serviceClient = await getServiceRoleClient({
    approvedCapability: 'invite-preview',
  })
  const { data: invite, error } = await serviceClient
    .from('household_invitations')
    .select(
      `
        *,
        household:households(id, name, collaboration_mode)
      `
    )
    .eq('token', token)
    .maybeSingle<InviteRecord>()

  if (error || !invite) {
    notFound()
  }

  const { data: inviterProfile } = await serviceClient
    .from('user_profiles')
    .select('display_name')
    .eq('id', invite.created_by)
    .maybeSingle<Pick<UserProfile, 'display_name'>>()

  const user = await getServerUserContext()

  const isExpired = new Date(invite.expires_at) < new Date()
  const canAccept = invite.status === 'pending' && !isExpired
  // Never surface the inviter's email on the public-facing invite page —
  // the URL is reachable by anyone with the token. Fall back to a generic
  // label when no display_name is set.
  const inviterName = inviterProfile?.display_name || 'A household member'
  const statusLabel = isExpired
    ? 'Expired'
    : invite.status === 'pending'
      ? 'Pending'
      : invite.status.charAt(0).toUpperCase() + invite.status.slice(1)

  return (
    <div className="min-h-screen bg-hm-canvas px-4 py-10 text-hm-ink">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-hm-muted transition hover:text-hm-ink"
        >
          ← Back to dashboard
        </Link>

        <Card className="rounded-3xl border border-hm-border bg-hm-surface-raised text-hm-ink shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-hm-faint" />
              Join {invite.household?.name || 'this household'}
            </CardTitle>
            <p className="text-sm text-hm-faint">
              {inviterName} invited you to search for homes together.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 rounded-2xl border border-hm-border bg-hm-canvas p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-hm-faint uppercase">
                  Household
                </p>
                <p className="text-lg font-semibold text-hm-ink">
                  {invite.household?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-hm-faint uppercase">
                  Collaboration mode
                </p>
                <p className="text-lg font-semibold text-hm-ink capitalize">
                  {invite.household?.collaboration_mode ?? 'shared'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-hm-faint uppercase">
                  Expires
                </p>
                <p className="text-lg font-semibold text-hm-ink">
                  {formatDate(invite.expires_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-hm-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>
                Accepting will link your saved homes with this household.
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-hm-muted">
              <Clock4 className="h-4 w-4 text-amber-500" />
              <span>
                Invitation status:{' '}
                <Badge
                  className={
                    canAccept
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-hm-surface text-hm-muted'
                  }
                >
                  {statusLabel}
                </Badge>
              </span>
            </div>

            {invite.message && (
              <blockquote className="rounded-2xl border border-hm-border bg-hm-surface-raised p-4 text-sm text-hm-muted">
                “{invite.message}”
              </blockquote>
            )}

            {canAccept ? (
              <AcceptInviteForm
                token={token}
                householdName={invite.household?.name || 'your household'}
              />
            ) : (
              <Button
                type="button"
                disabled
                className="w-full bg-hm-surface text-hm-faint"
              >
                {isExpired
                  ? 'This invitation has expired'
                  : 'Invitation already used'}
              </Button>
            )}

            {!user && canAccept && (
              <p className="text-center text-sm text-hm-faint">
                Already have an account?{' '}
                <Link
                  href={`/login?redirectTo=/invite/${token}`}
                  className="font-semibold text-hm-link underline"
                >
                  Sign in to accept
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
