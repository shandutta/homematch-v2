/**
 * @jest-environment node
 *
 * Static guard for public/demo listing fixtures (P0/P1).
 *
 * The unauthenticated marketing/landing surface renders listing-shaped
 * cards from a small set of files. None of those files are allowed to
 * source data from Supabase, Zillow, or any other system that holds
 * real user/customer/private records — they are pure synthetic placeholders.
 *
 * This test pins three boundaries:
 *   1. Inventory: the set of files that ship listing-shaped fixtures to
 *      anonymous visitors is exactly the four files documented in
 *      `reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md`.
 *      Adding a new public listing fixture file must be a deliberate
 *      decision, not a silent surface widening.
 *   2. Field shape: none of those files contain field names or property
 *      keys that imply real user/customer/private records (email, phone,
 *      household_id, owner/agent identifiers, auth tokens, secrets, etc.).
 *   3. Source: the public marketing API route emits a static literal
 *      array — it never reaches into Supabase, Zillow, the service layer,
 *      or any environment-configured key. Marketing components only fetch
 *      from `/api/properties/marketing` (or fall back to local placeholders).
 *
 * If a future change tries to wire the public landing pages to a real
 * data source, this test fails before that change ships.
 */
// Phase 0/1 closure: P1-internal-demo-gate

// Phase 0/1 closure: P1-internal-demo-gate
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = process.cwd()

const PUBLIC_DEMO_FIXTURE_FILES = [
  'src/app/api/properties/marketing/route.ts',
  'src/components/marketing/MarketingPreviewCard.tsx',
  'src/components/marketing/MarketingPreviewCardStatic.tsx',
  'src/components/marketing/PhoneMockup.tsx',
] as const

type FixtureFile = (typeof PUBLIC_DEMO_FIXTURE_FILES)[number]

const readFixture = (relativePath: FixtureFile): string =>
  readFileSync(join(repoRoot, relativePath), 'utf8')

// Field-shaped tokens that would indicate the fixture is leaking real
// user/customer/private records. We keep this list deliberately narrow
// to field *names*, not free prose, so synthetic copy ("Built for
// households", "Stay in sync") does not trip the guard. Word-boundary
// matches keep `mailto:`-style strings or unrelated identifiers out.
const PRIVATE_FIELD_TOKENS: ReadonlyArray<{
  label: string
  pattern: RegExp
}> = [
  { label: 'owner_email', pattern: /\bowner_email\b/ },
  { label: 'agent_email', pattern: /\bagent_email\b/ },
  { label: 'agent_phone', pattern: /\bagent_phone\b/ },
  { label: 'owner_phone', pattern: /\bowner_phone\b/ },
  { label: 'owner_name', pattern: /\bowner_name\b/ },
  { label: 'agent_name', pattern: /\bagent_name\b/ },
  { label: 'owner_id', pattern: /\bowner_id\b/ },
  { label: 'agent_id', pattern: /\bagent_id\b/ },
  { label: 'account_id', pattern: /\baccount_id\b/ },
  { label: 'household_id', pattern: /\bhousehold_id\b/ },
  { label: 'profile_id', pattern: /\bprofile_id\b/ },
  { label: 'auth_id', pattern: /\bauth_id\b/ },
  { label: 'auth_user_id', pattern: /\bauth_user_id\b/ },
  { label: 'user_id', pattern: /\buser_id\b/ },
  { label: 'session_id', pattern: /\bsession_id\b/ },
  { label: 'phone_number', pattern: /\bphone_number\b/ },
  { label: 'ssn', pattern: /\bssn\b/i },
  { label: 'tax_id', pattern: /\btax_id\b/ },
  { label: 'date_of_birth', pattern: /\bdate_of_birth\b/ },
  { label: 'birth_date', pattern: /\bbirth_date\b/ },
  { label: 'dob', pattern: /\bdob\b/ },
  { label: 'password', pattern: /\bpassword\b/ },
  { label: 'access_token', pattern: /\baccess_token\b/ },
  { label: 'refresh_token', pattern: /\brefresh_token\b/ },
  { label: 'bearer', pattern: /\bbearer\s+/i },
  { label: 'service_role', pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
  { label: 'anon_key', pattern: /SUPABASE_ANON_KEY/ },
  { label: 'cron_secret', pattern: /\bcron_secret\b/i },
  { label: 'api_key', pattern: /\bapi_key\b/i },
]

const DATA_SOURCE_TOKENS: ReadonlyArray<{
  label: string
  pattern: RegExp
}> = [
  { label: 'createClient (supabase)', pattern: /createClient\s*\(/ },
  { label: '@/lib/supabase', pattern: /from\s+['"]@\/lib\/supabase/ },
  { label: 'PropertyService', pattern: /\bPropertyService\b/ },
  { label: 'UserService', pattern: /\bUserService\b/ },
  { label: '@/lib/services', pattern: /from\s+['"]@\/lib\/services/ },
  { label: 'rapidapi', pattern: /rapidapi/i },
  { label: 'zillow api host', pattern: /zillow.*\.com/i },
  { label: 'process.env.* secret', pattern: /process\.env\.[A-Z0-9_]*KEY/ },
  {
    label: 'process.env.* secret (TOKEN)',
    pattern: /process\.env\.[A-Z0-9_]*TOKEN/,
  },
]

describe('public demo listing fixture boundary', () => {
  describe('inventory', () => {
    test('the documented fixture files exist and stay readable', () => {
      for (const relativePath of PUBLIC_DEMO_FIXTURE_FILES) {
        const source = readFixture(relativePath)
        expect(typeof source).toBe('string')
        expect(source.length).toBeGreaterThan(0)
      }
    })
  })

  describe('field-shape boundary', () => {
    test.each(PUBLIC_DEMO_FIXTURE_FILES)(
      '%s carries no real user/customer/private field tokens',
      (relativePath) => {
        const source = readFixture(relativePath)
        const hits = PRIVATE_FIELD_TOKENS.filter(({ pattern }) =>
          pattern.test(source)
        ).map(({ label }) => label)
        expect(hits).toEqual([])
      }
    )
  })

  describe('data-source boundary', () => {
    test.each(PUBLIC_DEMO_FIXTURE_FILES)(
      '%s does not reach into Supabase/Zillow/service-layer/secrets',
      (relativePath) => {
        const source = readFixture(relativePath)
        const hits = DATA_SOURCE_TOKENS.filter(({ pattern }) =>
          pattern.test(source)
        ).map(({ label }) => label)
        expect(hits).toEqual([])
      }
    )

    test('marketing API route emits a static literal MARKETING_CARDS array', () => {
      const source = readFixture('src/app/api/properties/marketing/route.ts')

      // The route must declare an inline array constant, not import or
      // fetch listings from anywhere else.
      expect(source).toMatch(
        /const\s+MARKETING_CARDS\s*:\s*MarketingCard\[\]\s*=\s*\[/
      )
      expect(source).not.toMatch(/\bawait\s+fetch\s*\(/)
      expect(source).not.toMatch(/\bawait\s+supabase\b/)
      expect(source).not.toMatch(/from\s+['"]@\/lib\/services/)

      // Each entry must use the documented synthetic `mock-N` zpid prefix
      // so production zpids cannot be smuggled into public output.
      const zpidMatches = source.match(/zpid:\s*'([^']+)'/g) ?? []
      expect(zpidMatches.length).toBeGreaterThanOrEqual(3)
      for (const match of zpidMatches) {
        expect(match).toMatch(/zpid:\s*'mock-\d+'/)
      }
    })

    test('PhoneMockup fetches only the public marketing endpoint', () => {
      const source = readFixture('src/components/marketing/PhoneMockup.tsx')
      const fetchCalls = source.match(/fetch\(\s*['"`][^'"`]+['"`]/g) ?? []
      expect(fetchCalls.length).toBeGreaterThan(0)
      for (const call of fetchCalls) {
        expect(call).toMatch(/fetch\(\s*['"`]\/api\/properties\/marketing['"`]/)
      }
    })

    test('marketing preview cards render only synthetic copy, no DB-shaped reads', () => {
      const previewSource = readFixture(
        'src/components/marketing/MarketingPreviewCard.tsx'
      )
      const staticSource = readFixture(
        'src/components/marketing/MarketingPreviewCardStatic.tsx'
      )

      for (const source of [previewSource, staticSource]) {
        expect(source).not.toMatch(/\buseQuery\s*\(/)
        expect(source).not.toMatch(/\buseSWR\s*\(/)
        expect(source).not.toMatch(/\bfetch\s*\(/)
        expect(source).not.toMatch(/from\s+['"]@\/lib\/services/)
        expect(source).not.toMatch(/from\s+['"]@\/lib\/supabase/)
      }
    })
  })
})
