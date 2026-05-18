/**
 * ONBOARDING-001 from .gstack/qa-reports/qa-report-prod-2026-05-13-full-tour.md.
 *
 * Brand-new users were dropping straight into /dashboard with zero
 * preference calibration and seeing 160 random property cards. This page
 * intercepts the first dashboard load and collects the bare minimum
 * preference data the recommendation feed needs to be personalized:
 *
 *   - Cities the user is searching in
 *   - Price range
 *   - Bedrooms / bathrooms minimum
 *   - Household composition (drives the couples / matching prompts)
 *
 * On submit (or skip), `user_profiles.onboarding_completed` flips to
 * true so the dashboard stops redirecting here.
 */
import { redirect } from 'next/navigation'
import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { getUserProfileForServerAuth } from '@/lib/auth/server-profile'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import { OnboardingForm } from './OnboardingForm'

export const metadata = createNoindexRouteMetadata({
  title: 'Set up your search | HomeMatch',
  description:
    'Tell HomeMatch what you’re looking for so we can match you to the right homes.',
})

export default async function OnboardingPage() {
  const userCtx = await getServerUserContext()
  if (!userCtx) {
    redirect('/login?redirectTo=%2Fonboarding')
  }

  const userShape = await getOptionalServerUser()
  if (!userShape) {
    redirect('/login?redirectTo=%2Fonboarding')
  }

  // Bootstrap the profile row if the webhook hasn't fired yet.
  let profileId = userCtx.profileId
  if (!profileId && userCtx.source === 'clerk') {
    profileId = await ensureUserProfileForCurrentClerkUser()
  }

  // If we somehow can't resolve a profile, fall through to the form and
  // let the API route surface a clean error on submit. Better than
  // blocking the user on a setup race.
  const profile = profileId
    ? await getUserProfileForServerAuth(profileId)
    : null

  // Already onboarded? Skip straight to the dashboard.
  if (profile?.onboarding_completed === true) {
    redirect('/dashboard')
  }

  return (
    <main className="gradient-grid-bg text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-3 text-white">
          <p className="text-xs font-semibold tracking-[0.2em] text-hm-accent/90 uppercase">
            One minute setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What are you looking for?
          </h1>
          <p className="max-w-xl text-base text-white/70">
            We&rsquo;ll use this to filter the homes you see and to help your
            household agree faster. You can change everything later in Settings.
          </p>
        </header>

        <OnboardingForm />

        <p className="text-xs text-white/50">
          Skipping is fine, but you&rsquo;ll see a generic feed until you set a
          city.
        </p>
      </div>
    </main>
  )
}
