/**
 * Static side-effect policy for `src/app/api/*` route handlers.
 *
 * Autonomous workers (and other unattended probes that lack production
 * credentials) must not call routes that would burn paid external quota,
 * fan out notifications, mutate cron-gated admin state, or destroy user
 * data. This module is the single source of truth that classifies every
 * API route by side-effect category and exposes a helper for probe
 * gating.
 *
 * The matching test in `__tests__/unit/app/api-route-side-effect-policy.test.ts`
 * walks `src/app/api/**\/route.ts` and fails if a new route is added
 * without a classification — this keeps the policy honest as the API
 * surface grows.
 */

export type RouteSideEffectCategory =
  // External paid APIs that bill on every request.
  | 'paid-maps'
  | 'paid-rapidapi'
  | 'paid-llm'
  // Cron-secret-gated admin generation/ingestion.
  | 'cron-admin'
  // Sends user-visible notifications (push/email/in-app fan-out).
  | 'notification'
  // Bulk-destructive operations on the requester's data.
  | 'destructive-auth'
  // Mutating writes on behalf of an authenticated requester.
  | 'mutating-auth'
  // Authenticated read-only.
  | 'safe-auth-read'
  // Public read-only.
  | 'safe-public-read'
  // Telemetry/metrics ingest (best-effort, no billing).
  | 'telemetry-ingest'

export interface RouteSideEffectPolicy {
  /** Path under `src/app` (e.g. `/api/maps/geocode`). Must end in a non-slash segment. */
  readonly path: string
  /** All applicable categories — a route can be both paid-llm and cron-admin. */
  readonly categories: readonly RouteSideEffectCategory[]
  /** One-line rationale explaining why this classification was chosen. */
  readonly rationale: string
}

/**
 * Categories that disqualify a route from being hit by autonomous,
 * no-credential probes. Hitting these endpoints from an unattended worker
 * either spends paid quota, requires secrets the worker does not have,
 * fans out notifications to real users, or destroys data.
 */
export const NO_AUTONOMOUS_PROBE_CATEGORIES = new Set<RouteSideEffectCategory>([
  'paid-maps',
  'paid-rapidapi',
  'paid-llm',
  'cron-admin',
  'notification',
  'destructive-auth',
])

export const ROUTE_SIDE_EFFECT_POLICIES: readonly RouteSideEffectPolicy[] = [
  {
    path: '/api/admin/generate-neighborhood-vibes',
    categories: ['paid-llm', 'cron-admin'],
    rationale:
      'Cron-gated; calls OpenRouter to generate neighborhood vibe text.',
  },
  {
    path: '/api/admin/generate-vibes',
    categories: ['paid-llm', 'cron-admin'],
    rationale:
      'Cron-gated; calls OpenRouter vision model to generate property vibes.',
  },
  {
    path: '/api/admin/generate-vibes-zillow',
    categories: ['paid-llm', 'paid-rapidapi', 'cron-admin'],
    rationale:
      'Cron-gated; pulls Zillow detail via RapidAPI then calls OpenRouter.',
  },
  {
    path: '/api/admin/backfill-zillow-fields',
    categories: ['paid-rapidapi', 'cron-admin'],
    rationale:
      'Cron-gated weekly backfill of NULL description/amenities on existing properties via RapidAPI. Anti-redundancy companion to scripts/backfill-zillow-description-amenities.ts so newly-ingested rows whose initial Zillow payload was empty get re-fetched without manual intervention.',
  },
  {
    path: '/api/admin/status-refresh',
    categories: ['paid-rapidapi', 'cron-admin'],
    rationale: 'Cron-gated Zillow status refresh via RapidAPI.',
  },
  {
    path: '/api/couples/activity',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read of household activity.',
  },
  {
    path: '/api/couples/check-mutual',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read for potential mutual-like check.',
  },
  {
    path: '/api/couples/disputed',
    categories: ['safe-auth-read'],
    rationale:
      'Auth-gated household-scoped read; service-role usage is read-only and capability-guarded.',
  },
  {
    path: '/api/couples/mutual-likes',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read of household mutual likes.',
  },
  {
    path: '/api/couples/notify',
    categories: ['notification', 'mutating-auth'],
    rationale:
      'Creates household notification rows that fan out to partner users.',
  },
  {
    path: '/api/couples/property-reactions',
    categories: ['safe-auth-read'],
    rationale:
      'Auth-gated DB read of household member reactions for a given property.',
  },
  {
    path: '/api/couples/stats',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read of household statistics.',
  },
  {
    path: '/api/health',
    categories: ['safe-public-read'],
    rationale: 'Public liveness probe; performs a single bounded DB ping.',
  },
  {
    path: '/api/interactions',
    categories: ['mutating-auth'],
    rationale: 'Auth-gated DB writes for swipe interactions.',
  },
  {
    path: '/api/interactions/reset',
    categories: ['destructive-auth'],
    rationale: 'Bulk-deletes the requester’s interactions; destructive.',
  },
  {
    path: '/api/match',
    categories: ['safe-auth-read'],
    rationale:
      'Auth-free LLM matcher; mock mode by default, no paid quota in default config.',
  },
  {
    path: '/api/maps/geocode',
    categories: ['paid-maps'],
    rationale: 'Server-side proxy to paid Google Maps Geocoding API.',
  },
  {
    path: '/api/maps/metro-boundaries',
    categories: ['safe-public-read'],
    rationale:
      'Reads precomputed neighborhood boundaries from Supabase; no external paid call.',
  },
  {
    path: '/api/maps/places/autocomplete',
    categories: ['paid-maps'],
    rationale: 'Server-side proxy to paid Google Places Autocomplete API.',
  },
  {
    path: '/api/maps/proxy-script',
    categories: ['paid-maps'],
    rationale: 'Proxies the keyed Google Maps JS bundle.',
  },
  {
    path: '/api/maps/script',
    categories: ['paid-maps'],
    rationale:
      'Gates on GOOGLE_MAPS_SERVER_API_KEY and points clients at the Maps proxy script.',
  },
  {
    path: '/api/neighborhoods/vibes',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read of neighborhood vibe records.',
  },
  {
    path: '/api/performance/metrics',
    categories: ['telemetry-ingest'],
    rationale:
      'Best-effort web-vitals ingest; rate-limited by IP, no billing impact.',
  },
  {
    path: '/api/properties/marketing',
    categories: ['safe-public-read'],
    rationale: 'Returns a static mock list for the marketing surface.',
  },
  {
    path: '/api/properties/vibes',
    categories: ['safe-auth-read'],
    rationale: 'Auth-gated DB read of property vibe records.',
  },
  {
    path: '/api/households',
    categories: ['mutating-auth'],
    rationale:
      'Clerk-aware household creation. Verifies the Clerk session, bootstraps the user_profiles row if needed, and calls create_household_by_user_id under service-role. Replaces the broken anon-key RPC path that was blocking Clerk users from creating households (HOUSEHOLD-001).',
  },
  {
    path: '/api/households/invitations',
    categories: ['mutating-auth'],
    rationale:
      'Clerk-aware household invitation creation. Verifies the Clerk session, confirms household membership, then inserts the invitation row under service-role. Replaces the broken anon-key path that called supabase.auth.getSession() (null for Clerk users) (HOUSEHOLD-001).',
  },
  {
    path: '/api/households/join',
    categories: ['mutating-auth'],
    rationale:
      'Clerk-aware household join. Verifies the Clerk session, resolves the user_profiles row, and updates only that profile household_id under service-role because Clerk users cannot rely on auth.uid()-based RLS.',
  },
  {
    path: '/api/users/avatar',
    categories: ['mutating-auth'],
    rationale: 'Auth-gated avatar upload to Supabase storage.',
  },
  {
    path: '/api/users/me',
    categories: ['safe-auth-read'],
    rationale:
      'Auth-gated identity lookup (profile id, email, household_id). Bootstraps a user_profiles row on first read for fresh Clerk signups whose webhook is mid-flight; that bootstrap is the documented exception and is keyed to the verified Clerk session.',
  },
  {
    path: '/api/users/preferences',
    categories: ['mutating-auth'],
    rationale:
      'Clerk-aware preference update used by the /onboarding flow. Verifies the Clerk session, bootstraps the user_profiles row if needed, then updates preferences + onboarding_completed under service-role with the resolved profile UUID (ONBOARDING-001).',
  },
  {
    path: '/api/users/search',
    categories: ['safe-auth-read'],
    rationale:
      'Auth-gated, rate-limited invite search; service-role usage is capability-guarded.',
  },
  {
    path: '/api/zillow/random-image',
    categories: ['paid-rapidapi'],
    rationale:
      'Calls RapidAPI Zillow at request time; production deploys reject the request, but the route still requires a paid key.',
  },
  {
    path: '/api/webhooks/clerk',
    categories: ['mutating-auth'],
    rationale:
      'Clerk webhook (Svix-signed). user.created/updated/deleted events upsert/delete rows in user_profiles. Signature-gated; not user-facing.',
  },
] as const

const POLICY_BY_PATH = new Map<string, RouteSideEffectPolicy>(
  ROUTE_SIDE_EFFECT_POLICIES.map((policy) => [policy.path, policy])
)

export function getRouteSideEffectPolicy(
  path: string
): RouteSideEffectPolicy | undefined {
  return POLICY_BY_PATH.get(path)
}

/**
 * Returns true when the route is safe to call from an autonomous,
 * no-credential probe (e.g. a Claude worker running tests in CI without
 * production secrets). A route is probe-safe only when none of its
 * categories appear in `NO_AUTONOMOUS_PROBE_CATEGORIES`.
 *
 * Unknown paths default to `false` — the caller must add a policy entry
 * before probing a new route.
 */
export function isAutonomousProbeAllowed(path: string): boolean {
  const policy = POLICY_BY_PATH.get(path)
  if (!policy) return false
  return !policy.categories.some((category) =>
    NO_AUTONOMOUS_PROBE_CATEGORIES.has(category)
  )
}
