import fs from 'fs'
import path from 'path'

type SeedProperty = {
  zpid?: string
  address: string
  city: string
  state: string
  zip_code?: string | number
  images?: string[]
  [k: string]: unknown
}

type ZillowListing = {
  zpid?: number | string
  address?: string
  city?: string
  state?: string
  zipcode?: string | number
  imgSrc?: string
  images?: string[]
  [k: string]: unknown
}

type PropertyExtendedSearchResponse = {
  results?: ZillowListing[]
  props?: ZillowListing[]
  data?: {
    results?: ZillowListing[]
  }
  [k: string]: unknown
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// Kept for future use when switching to the dedicated Zillow images endpoint
type ZillowImagesResponse = {
  images?: string[]
  [k: string]: unknown
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const DEFAULT_HOST = 'zillow-com1.p.rapidapi.com'
const SEED_PATH = path.join(
  process.cwd(),
  'migrated_data',
  'seed-properties.json'
)
const BACKUP_PATH = path.join(
  process.cwd(),
  'migrated_data',
  'seed-properties.backup.json'
)

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  for (const a of argv.slice(2)) {
    const [k, v] = a.split('=')
    if (k) {
      const key = k.replace(/^--/, '')
      args[key] = v ?? true
    }
  }
  return args
}

function normalizeString(s?: string | number): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

// Safely extract hostname from URL for proper domain checking
function getUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function isProbableMatch(seed: SeedProperty, res: ZillowListing): boolean {
  const a1 = normalizeString(seed.address)
  const c1 = normalizeString(seed.city)
  const st1 = normalizeString(seed.state)
  const z1 = normalizeString(seed.zip_code)

  const a2 = normalizeString(res.address)
  const c2 = normalizeString(res.city)
  const st2 = normalizeString(res.state)
  const z2 = normalizeString(res.zipcode)

  // Basic heuristics: require city+state match, and either zip or address substring overlaps
  if (c1 && st1 && c1 === c2 && st1 === st2) {
    if (z1 && z2 && z1 === z2) return true
    if (a1 && a2 && (a1.includes(a2) || a2.includes(a1))) return true
  }
  // If zip is present and matches along with partial address, accept
  if (
    z1 &&
    z2 &&
    z1 === z2 &&
    a1 &&
    a2 &&
    (a1.includes(a2) || a2.includes(a1))
  ) {
    return true
  }
  return false
}
/* eslint-enable @typescript-eslint/no-unused-vars */

async function rapidJson(url: string, key: string, host: string) {
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  return res.json()
}

async function propertyExtendedSearch(
  location: string,
  key: string,
  host: string,
  retries = 3
): Promise<PropertyExtendedSearchResponse | undefined> {
  const url = `https://${host}/propertyExtendedSearch?location=${encodeURIComponent(location)}`
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return (await rapidJson(url, key, host)) as PropertyExtendedSearchResponse
    } catch (err) {
      const msg = (err as Error).message || ''
      const is429 = /429/.test(msg)
      const is404 = /404/.test(msg)
      if (is404) {
        console.warn(`[propertyExtendedSearch] 404 for ${location}`)
        return undefined
      }
      if (is429 && attempt < retries - 1) {
        const backoffMs =
          500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250)
        console.warn(
          `[propertyExtendedSearch] 429 rate limit for ${location}. Backing off ${backoffMs}ms (attempt ${attempt + 1}/${retries})`
        )
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }
      console.warn(`[propertyExtendedSearch] Failed for ${location}: ${msg}`)
      return undefined
    }
  }
  return undefined
}

async function pickFirstListingImageFromSearch(
  p: SeedProperty,
  key: string,
  host: string
): Promise<string | undefined> {
  // Preference: zip_code if present; fallback to city,state
  const primaryLoc = p.zip_code
    ? String(p.zip_code)
    : [p.city, p.state].filter(Boolean).join(', ')
  const secondaryLoc = !p.zip_code
    ? undefined
    : [p.city, p.state].filter(Boolean).join(', ')

  const locations = [primaryLoc, secondaryLoc].filter(Boolean) as string[]

  for (const loc of locations) {
    const data = await propertyExtendedSearch(loc, key, host, 4)
    if (!data) continue
    const list: ZillowListing[] =
      data.results ?? data.props ?? data.data?.results ?? []

    // Try to find a listing in the same city/state first
    const normalizedCity = normalizeString(p.city)
    const normalizedState = normalizeString(p.state)
    const byCityState = list.find((it) => {
      return (
        normalizeString(it.city) === normalizedCity &&
        normalizeString(it.state) === normalizedState
      )
    })

    const candidate = byCityState ?? list[0]
    if (!candidate) continue

    // Prefer explicit images[], fallback to imgSrc
    const images = Array.isArray(candidate.images) ? candidate.images : []
    const img =
      images[0] ??
      (typeof candidate.imgSrc === 'string' ? candidate.imgSrc : undefined)

    if (img && typeof img === 'string') {
      return img
    }
  }

  return undefined
}

async function main() {
  const args = parseArgs(process.argv)
  const dryRun = Boolean(args['dry-run'] ?? args['dryrun'] ?? false)
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
  const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || DEFAULT_HOST

  if (!RAPIDAPI_KEY) {
    console.error('[update-seed-zillow-images] RAPIDAPI_KEY not set')
    process.exit(1)
  }

  const raw = fs.readFileSync(SEED_PATH, 'utf-8')
  const seed = JSON.parse(raw) as SeedProperty[]

  const updated: SeedProperty[] = JSON.parse(raw)

  let changed = 0
  for (let i = 0; i < seed.length; i++) {
    const p = seed[i]
    // Only fetch if we don't already have a Zillow URL or if image looks like placeholder
    const current =
      Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined
    // Use proper hostname extraction instead of substring matching for security
    const currentHostname = current ? getUrlHostname(current) : null
    const isUnsplash = currentHostname === 'images.unsplash.com'

    if (!isUnsplash && current) {
      // Leave as-is if already non-Unsplash URL
      continue
    }

    const img = await pickFirstListingImageFromSearch(
      p,
      RAPIDAPI_KEY,
      RAPIDAPI_HOST
    )
    if (!img) {
      console.warn(
        `[update] Could not find image for "${p.address}, ${p.city}, ${p.state}"`
      )
      continue
    }

    // Update exactly 1 image per property
    updated[i] = {
      ...p,
      images: [img],
    }
    changed++
    console.log(`[update] Set image for "${p.address}, ${p.city}" → ${img}`)
  }

  if (changed === 0) {
    console.log('[update-seed-zillow-images] No changes needed.')
    return
  }

  if (dryRun) {
    console.log(
      `[update-seed-zillow-images] DRY RUN: ${changed} properties would be updated. No file written.`
    )
    return
  }

  // Backup then write
  fs.writeFileSync(BACKUP_PATH, raw, 'utf-8')
  fs.writeFileSync(SEED_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  console.log(
    `[update-seed-zillow-images] Updated ${changed} properties. Backup created at ${path.relative(
      process.cwd(),
      BACKUP_PATH
    )}`
  )
}

main().catch((err) => {
  console.error('[update-seed-zillow-images] Unhandled error:', err)
  process.exit(1)
})
