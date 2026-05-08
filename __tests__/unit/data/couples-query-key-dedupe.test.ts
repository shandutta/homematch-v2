import { readFileSync } from 'fs'
import * as path from 'path'

import { couplesKeys } from '@/hooks/useCouples'
import { interactionKeys } from '@/hooks/useInteractions'
import { vibesKeys } from '@/hooks/usePropertyVibes'

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const couplesFeaturesSource = readSource('src/hooks/useCouplesFeatures.ts')
const couplesRealtimeSource = readSource('src/hooks/useCouplesRealtime.ts')

const COUPLES_ROOT = 'couples'
const COUPLES_SUBKEYS = ['mutual-likes', 'activity', 'stats'] as const

describe('TanStack query key dedupe index', () => {
  describe('domain root partitioning', () => {
    it('keeps couples / interactions / property-vibes roots disjoint so cross-domain invalidation cannot leak', () => {
      const roots = [
        couplesKeys.all[0],
        interactionKeys.all[0],
        vibesKeys.all[0],
      ]
      expect(new Set(roots).size).toBe(roots.length)
    })

    it('exposes couplesKeys with the canonical "couples" root', () => {
      expect(couplesKeys.all).toEqual(['couples'])
      expect(couplesKeys.mutualLikes()).toEqual(['couples', 'mutual-likes'])
      expect(couplesKeys.activity()).toEqual(['couples', 'activity'])
    })

    it('exposes interactionKeys with stable list-shape for prefix invalidation', () => {
      expect(interactionKeys.all).toEqual(['interactions'])
      expect(interactionKeys.summaries()).toEqual(['interactions', 'summary'])
      expect(interactionKeys.lists()).toEqual(['interactions', 'list'])
      expect(interactionKeys.list('liked')).toEqual([
        'interactions',
        'list',
        'liked',
      ])
      // The per-type list key must extend `lists()` so a single
      // invalidateQueries({ queryKey: interactionKeys.lists() }) reaches every
      // type bucket without the call sites enumerating them.
      const lists = interactionKeys.lists()
      const list = interactionKeys.list('viewed')
      expect(list.slice(0, lists.length)).toEqual([...lists])
    })
  })

  describe('couples key consistency across read + invalidate sites', () => {
    // Realtime invalidation in useCouplesRealtime keys off literal arrays
    // (COUPLES_QUERY_KEYS); the read hooks in useCouples and useCouplesFeatures
    // build their queryKey arrays from local factories. If any of these three
    // sources drift on the root token or sub-keys, invalidations silently miss
    // their target queries — refetches stop happening on partner activity. This
    // test pins the canonical strings across all three files so a typo (e.g.
    // 'mutual_likes' vs 'mutual-likes') trips CI before it reaches users.
    it('uses the same "couples" root in useCouplesFeatures.ts and useCouplesRealtime.ts as in couplesKeys', () => {
      expect(couplesKeys.all[0]).toBe(COUPLES_ROOT)
      expect(couplesFeaturesSource).toMatch(
        /couplesAllKey:\s*readonly\s*\['couples'\]\s*=\s*\['couples'\]/
      )
      expect(couplesRealtimeSource).toMatch(
        /COUPLES_QUERY_KEYS\s*=\s*\{[\s\S]*?\['couples',/
      )
    })

    it.each(COUPLES_SUBKEYS)(
      'declares "%s" sub-key consistently in useCouplesFeatures and useCouplesRealtime',
      (subKey) => {
        const featuresMatches = couplesFeaturesSource.match(
          new RegExp(`'${subKey}'`, 'g')
        )
        const realtimeMatches = couplesRealtimeSource.match(
          new RegExp(`'${subKey}'`, 'g')
        )
        expect(featuresMatches?.length ?? 0).toBeGreaterThan(0)
        expect(realtimeMatches?.length ?? 0).toBeGreaterThan(0)
      }
    )

    it('does not introduce an alternate underscored sub-key spelling alongside the hyphenated canonical one', () => {
      // Guards against the most common drift: 'mutual_likes' / 'mutual likes'
      // sneaking in next to 'mutual-likes', which would split the query cache.
      const offenders = ['mutual_likes', 'mutual likes', 'mutuallikes']
      for (const source of [couplesFeaturesSource, couplesRealtimeSource]) {
        for (const offender of offenders) {
          expect(source).not.toContain(`'${offender}'`)
        }
      }
    })
  })

  describe('dashboard/property-list fetch overlap dedupe key', () => {
    // Complements __tests__/unit/data/dashboard-query-dedupe.test.ts which
    // exercises runtime dedupe via the loader. This static guard pins the
    // dedupe key shape so a future refactor cannot drop a field that
    // partitions concurrent dashboard loads.
    const loaderSource = readSource('src/lib/data/loader.ts')

    it('builds the in-flight dedupe key from both searchParams and options', () => {
      expect(loaderSource).toMatch(/getDashboardSearchDedupeKey/)
      const fnMatch = loaderSource.match(
        /getDashboardSearchDedupeKey[\s\S]*?JSON\.stringify\(\{[\s\S]*?\}\)/
      )
      expect(fnMatch).not.toBeNull()
      const fnBody = fnMatch?.[0] ?? ''
      expect(fnBody).toMatch(/searchParams/)
      expect(fnBody).toMatch(/options/)
    })

    it('routes dashboard searches through the dedupe wrapper before hitting the property service', () => {
      // Catches a refactor that calls propertyService.searchProperties
      // directly inside loadDashboardData, bypassing the in-flight Map.
      expect(loaderSource).toMatch(/runDedupedDashboardSearch\(/)
      expect(loaderSource).toMatch(/inFlightDashboardSearches\.delete/)
    })
  })
})
