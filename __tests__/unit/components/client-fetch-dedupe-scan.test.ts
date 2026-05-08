/**
 * @jest-environment node
 *
 * Static dedupe scan for client-side `fetch('/api/...')` paths that hit our
 * own backend. Walks `src/components/**` and `src/hooks/**` for fetch
 * literals targeting `/api/...` and asserts each backend endpoint is
 * reached from at most one canonical client module (typically a hook in
 * `src/hooks/` or a service in `src/lib/services/`). Any additional caller
 * to the same endpoint must appear on the `INTENTIONAL_DUPLICATES` list
 * below with a recorded reason.
 *
 * Why this guard exists:
 *   - Multiple client modules calling the same backend route diverge on
 *     query keys, cache TTLs, error handling, and auth header strategy
 *     (e.g. `useCouples` vs `useCouplesFeatures` vs raw fetch in
 *     `CouplesPageClient` all hit `/api/couples/mutual-likes` with
 *     different shapes).
 *   - The scan is intentionally tolerant: it freezes the *current* set of
 *     duplicates and asserts that no NEW duplicate sneaks in. Removing a
 *     duplicate (good!) requires deleting the corresponding entry from
 *     `INTENTIONAL_DUPLICATES`.
 *
 * The exception list is the documentation surface — it is the inventory
 * of known duplicate fetch paths waiting on consolidation.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const REPO_ROOT = process.cwd()
const SCAN_ROOTS = [
  join(REPO_ROOT, 'src/components'),
  join(REPO_ROOT, 'src/hooks'),
] as const

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

interface FetchCallSite {
  /** Repo-relative posix path of the calling file. */
  file: string
  /** Normalized backend endpoint, e.g. `/api/couples/mutual-likes`. */
  endpoint: string
}

const collectFiles = (root: string): string[] => {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      const info = statSync(full)
      if (info.isDirectory()) {
        walk(full)
        continue
      }
      const dot = entry.lastIndexOf('.')
      if (dot < 0) continue
      const ext = entry.slice(dot)
      if (!SCAN_EXTENSIONS.has(ext)) continue
      out.push(full)
    }
  }
  walk(root)
  return out.sort()
}

/**
 * Normalize a fetch URL literal to a stable backend endpoint:
 *   - strip a leading template-literal interpolation prefix like `${BASE}`
 *   - strip query strings (`?...`)
 *   - strip trailing template-literal interpolations (`/${id}`) by cutting
 *     at the first `${` segment
 *   - require the result to start with `/api/`
 * Returns null when the URL is not a `/api/...` literal we want to track.
 */
const normalizeEndpoint = (raw: string): string | null => {
  let url = raw.trim()
  // Cut at the first template interpolation — anything dynamic after that
  // point is a path or query param and not part of the endpoint identity.
  const interp = url.indexOf('${')
  if (interp >= 0) url = url.slice(0, interp)
  // Drop query string.
  const q = url.indexOf('?')
  if (q >= 0) url = url.slice(0, q)
  // Trim trailing slashes.
  url = url.replace(/\/+$/, '')
  if (!url.startsWith('/api/')) return null
  return url
}

/**
 * Scan a source file for fetch literals that target `/api/...`. Captures
 * one call site per (file, normalized endpoint) pair so that a single file
 * making multiple GET+PATCH calls to the same endpoint counts as one
 * caller on that endpoint (we are tracking module-level duplication, not
 * call-expression count).
 */
const scanFetchCallSites = (
  absPath: string,
  source: string
): FetchCallSite[] => {
  const file = relative(REPO_ROOT, absPath).split('\\').join('/')
  const endpoints = new Set<string>()

  // Match fetch('...'), fetch("..."), fetch(`...`) where the URL begins
  // with `/api/`. We restrict the leading character class so we don't
  // accidentally pick up imported `fetch` declarations or comments.
  const pattern = /\bfetch\(\s*([`'"])((?:\\.|(?!\1).)*?)\1/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const literal = match[2]
    const normalized = normalizeEndpoint(literal)
    if (normalized) endpoints.add(normalized)
  }

  return Array.from(endpoints, (endpoint) => ({ file, endpoint }))
}

/**
 * Documented duplicate fetch paths. Each entry MUST list the canonical
 * caller (the hook or service that is the "right" one going forward) and
 * the secondary callers that should be migrated, plus a `reason`.
 *
 * Adding an entry here is *intentional debt*: it documents that we know
 * about the duplicate and have decided not to consolidate it yet. Removing
 * an entry (because the duplicate was eliminated) makes the scan stricter,
 * which is the desired direction.
 */
interface DuplicateEntry {
  endpoint: string
  /** Files (repo-relative) currently calling this endpoint. */
  callers: ReadonlyArray<string>
  /**
   * Module the rest of the codebase should consolidate on. Must be one of
   * the entries in `callers` so the scan can verify it still exists.
   */
  canonical: string
  reason: string
}

const INTENTIONAL_DUPLICATES: ReadonlyArray<DuplicateEntry> = [
  {
    endpoint: '/api/couples/mutual-likes',
    callers: [
      'src/hooks/useCouples.ts',
      'src/hooks/useCouplesFeatures.ts',
      'src/components/couples/CouplesPageClient.tsx',
    ],
    canonical: 'src/hooks/useCouplesFeatures.ts',
    reason:
      'Three callers (two hooks + one page-level raw fetch) target the same ' +
      'endpoint with different response shapes (mutualLikes-only vs ' +
      'mutualLikes+performance). Consolidation onto useCouplesFeatures is ' +
      'tracked but not yet executed; flagged here so any FOURTH caller fails ' +
      'the scan.',
  },
  {
    endpoint: '/api/couples/activity',
    callers: [
      'src/hooks/useCouples.ts',
      'src/hooks/useCouplesFeatures.ts',
      'src/components/couples/CouplesPageClient.tsx',
    ],
    canonical: 'src/hooks/useCouplesFeatures.ts',
    reason:
      'Mirrors the mutual-likes duplication: two hooks expose differently ' +
      'shaped activity timelines and CouplesPageClient bypasses both with ' +
      'its own bearer-token fetch. Same consolidation target.',
  },
  {
    endpoint: '/api/couples/stats',
    callers: [
      'src/hooks/useCouplesFeatures.ts',
      'src/components/couples/CouplesPageClient.tsx',
    ],
    canonical: 'src/hooks/useCouplesFeatures.ts',
    reason:
      'CouplesPageClient duplicates the stats fetch instead of consuming ' +
      'useCouplesStats. Documented so a third caller is rejected.',
  },
  {
    endpoint: '/api/couples/disputed',
    callers: [
      'src/components/couples/DisputedPropertiesView.tsx',
      'src/components/couples/DisputedPropertiesAlert.tsx',
    ],
    canonical: 'src/components/couples/DisputedPropertiesView.tsx',
    reason:
      'No shared hook exists for /api/couples/disputed yet. Both the alert ' +
      'banner and the full view fetch directly. The alert only reads count; ' +
      'consolidation should extract a useDisputedProperties hook.',
  },
]

const collectAllCallSites = (): FetchCallSite[] => {
  const sites: FetchCallSite[] = []
  for (const root of SCAN_ROOTS) {
    for (const abs of collectFiles(root)) {
      const source = readFileSync(abs, 'utf8')
      sites.push(...scanFetchCallSites(abs, source))
    }
  }
  return sites
}

describe('Phase 1 client fetch dedupe scan', () => {
  const callSites = collectAllCallSites()

  // Build the live endpoint -> callers map once.
  const endpointToFiles = new Map<string, Set<string>>()
  for (const { endpoint, file } of callSites) {
    let set = endpointToFiles.get(endpoint)
    if (!set) {
      set = new Set<string>()
      endpointToFiles.set(endpoint, set)
    }
    set.add(file)
  }

  it('discovers at least one /api/... fetch call site to scan', () => {
    expect(callSites.length).toBeGreaterThan(0)
  })

  it('every documented duplicate still describes a real duplicate today', () => {
    for (const dup of INTENTIONAL_DUPLICATES) {
      const live = endpointToFiles.get(dup.endpoint)
      if (!live) {
        throw new Error(
          `INTENTIONAL_DUPLICATES references endpoint ${dup.endpoint} but no ` +
            `client module fetches it any more — remove the entry to tighten ` +
            `the scan.`
        )
      }

      // The canonical caller must still exist in the codebase.
      expect(dup.callers).toContain(dup.canonical)
      const liveCallers = Array.from(live).sort()
      const documentedCallers = [...dup.callers].sort()
      // If the live caller set has shrunk, the entry is stale — surface
      // that loudly so the scan stays a tight fence rather than rotting.
      expect(liveCallers).toEqual(documentedCallers)
      expect(dup.reason.trim().length).toBeGreaterThan(20)
    }
  })

  it('every /api/... endpoint has exactly one caller, or is documented', () => {
    const documentedByEndpoint = new Map(
      INTENTIONAL_DUPLICATES.map((dup) => [dup.endpoint, dup])
    )

    const violations: string[] = []
    for (const [endpoint, files] of endpointToFiles) {
      if (files.size <= 1) continue
      const documented = documentedByEndpoint.get(endpoint)
      if (!documented) {
        violations.push(
          `Endpoint ${endpoint} is fetched from ${files.size} client modules ` +
            `(${Array.from(files).sort().join(', ')}). Either consolidate the ` +
            `callers onto a single hook/service or add an INTENTIONAL_DUPLICATES ` +
            `entry with a documented reason.`
        )
      }
    }

    if (violations.length > 0) {
      throw new Error(violations.join('\n'))
    }
    expect(violations).toEqual([])
  })
})
