import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { createClient } from '@/lib/supabase/server'
import type {
  Household,
  HouseholdInvitation,
  UserProfile,
} from '@/types/database'
import { Users, ShieldCheck, Clock4 } from 'lucide-react'
import { AcceptInviteForm } from './AcceptInviteForm'

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
  params: { token: string } | Promise<{ token: string }>
}) {
  const resolvedParams = await params
  const token = resolvedParams.token

  const serviceClient = await getServiceRoleClient()
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
    .select('display_name, email')
    .eq('id', invite.created_by)
    .maybeSingle<Pick<UserProfile, 'display_name' | 'email'>>()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isExpired = new Date(invite.expires_at) < new Date()
  const canAccept = invite.status === 'pending' && !isExpired
  const inviterName =
    inviterProfile?.display_name ||
    inviterProfile?.email ||
    'A household member'
  const statusLabel = isExpired
    ? 'Expired'
    : invite.status === 'pending'
      ? 'Pending'
      : invite.status.charAt(0).toUpperCase() + invite.status.slice(1)

  return (
    <div className="min-h-screen bg-[#030c24] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-white/80 transition hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <Card className="rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-slate-400" />
              Join {invite.household?.name || 'this household'}
            </CardTitle>
            <p className="text-sm text-slate-500">
              {inviterName} invited you to search for homes together.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Household
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {invite.household?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Collaboration mode
                </p>
                <p className="text-lg font-semibold text-slate-900 capitalize">
                  {invite.household?.collaboration_mode ?? 'shared'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Expires
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(invite.expires_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>
                Accepting will link your saved homes with this household.
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock4 className="h-4 w-4 text-amber-500" />
              <span>
                Invitation status:{' '}
                <Badge
                  className={
                    canAccept
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }
                >
                  {statusLabel}
                </Badge>
              </span>
            </div>

            {invite.message && (
              <blockquote className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
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
                className="w-full bg-slate-200 text-slate-500"
              >
                {isExpired
                  ? 'This invitation has expired'
                  : 'Invitation already used'}
              </Button>
            )}

            {!user && canAccept && (
              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link
                  href={`/login?redirectTo=/invite/${token}`}
                  className="font-semibold text-slate-900 underline"
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
