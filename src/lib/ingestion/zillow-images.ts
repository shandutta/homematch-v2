const DEFAULT_RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com'

export type FetchZillowImagesOptions = {
  zpid: string
  rapidApiKey: string
  host?: string
  fetchImpl?: typeof fetch
  retries?: number
  timeoutMs?: number
  maxImages?: number
}

export function isStreetViewImageUrl(url: string): boolean {
  return /maps\.googleapis\.com\/maps\/api\/streetview/i.test(url)
}

export function isZillowStaticImageUrl(url: string): boolean {
  return /photos\.zillowstatic\.com/i.test(url)
}

export async function fetchZillowImageUrls(
  options: FetchZillowImagesOptions
): Promise<string[]> {
  const {
    zpid,
    rapidApiKey,
    host = DEFAULT_RAPIDAPI_HOST,
    fetchImpl = fetch,
    retries = 3,
    timeoutMs = 30000,
    maxImages = 80,
  } = options

  const url = `https://${host}/images?zpid=${encodeURIComponent(zpid)}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetchImpl(url, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': host,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.status === 404) return []

      if (res.status === 429) {
        const backoffMs =
          500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250)
        lastError = new Error(
          `RapidAPI rate limit (429) for zpid=${zpid}; backing off ${backoffMs}ms`
        )
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, backoffMs))
          continue
        }
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(
          `RapidAPI error ${res.status} ${res.statusText} for zpid=${zpid}: ${text.slice(0, 200)}`
        )
      }

      const data: unknown = await res.json()
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null
      const rawImages =
        isRecord(data) && Array.isArray(data.images) ? data.images : []
      const urls = rawImages
        .filter((u): u is string => typeof u === 'string')
        .map((u) => u.trim())
        .filter(Boolean)

      const seen = new Set<string>()
      const unique: string[] = []
      for (const u of urls) {
        if (seen.has(u)) continue
        seen.add(u)
        unique.push(u)
        if (unique.length >= maxImages) break
      }

      return unique
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      const isAbort =
        lastError.name === 'AbortError' ||
        /aborted|timeout/i.test(lastError.message)

      if (attempt < retries - 1) {
        const backoffMs =
          500 * Math.pow(2, attempt) +
          Math.floor(Math.random() * 250) +
          (isAbort ? 1000 : 0)
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch Zillow images for zpid=${zpid}`)
}
