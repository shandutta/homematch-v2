import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const mkdir = promisify(fs.mkdir)
const access = promisify(fs.access)
const writeFile = promisify(fs.writeFile)

type ZillowImagesResponse = {
  images?: string[]
  [k: string]: unknown
}

const DEFAULT_HOST = 'zillow-com1.p.rapidapi.com'
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'properties')
const MAX_IMAGES = 6

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (const a of argv.slice(2)) {
    const [k, v] = a.split('=')
    if (k && v) {
      args[k.replace(/^--/, '')] = v
    }
  }
  return args
}

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true })
  } catch {
    // ignore
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `Failed to download ${url}: ${res.status} ${res.statusText}`
    )
  }
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(destPath, buffer)
}

async function main() {
  const args = parseArgs(process.argv)
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
  const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || DEFAULT_HOST
  const envZpid = process.env.ZILLOW_ZPID
  const zpid = args['zpid'] || envZpid

  if (!RAPIDAPI_KEY) {
    console.log('[fetch-zillow-images] RAPIDAPI_KEY not set. No-op.')
    process.exit(0)
  }
  if (!zpid) {
    console.log(
      '[fetch-zillow-images] ZPID not provided. Pass --zpid=<id> or set ZILLOW_ZPID. No-op.'
    )
    process.exit(0)
  }

  const url = `https://${RAPIDAPI_HOST}/images?zpid=${encodeURIComponent(zpid)}`
  console.log(
    `[fetch-zillow-images] Fetching images for zpid=${zpid} from host=${RAPIDAPI_HOST}`
  )

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  })

  if (!res.ok) {
    console.error(
      `[fetch-zillow-images] API request failed: ${res.status} ${res.statusText}`
    )
    process.exit(1)
  }

  const data = (await res.json()) as ZillowImagesResponse
  const images = Array.isArray(data.images)
    ? data.images.slice(0, MAX_IMAGES)
    : []

  if (images.length === 0) {
    console.log('[fetch-zillow-images] No images returned by API. No-op.')
    process.exit(0)
  }

  await ensureDir(OUTPUT_DIR)

  let downloaded = 0
  let skipped = 0

  for (let i = 0; i < Math.min(images.length, MAX_IMAGES); i++) {
    const imgUrl = images[i]
    const index = i + 1
    const outPath = path.join(OUTPUT_DIR, `real-${index}.jpg`)

    try {
      if (await fileExists(outPath)) {
        console.log(`[fetch-zillow-images] Skipping existing real-${index}.jpg`)
        skipped++
        continue
      }
      await downloadToFile(imgUrl, outPath)
      console.log(`[fetch-zillow-images] Saved real-${index}.jpg`)
      downloaded++
    } catch (err) {
      console.warn(
        `[fetch-zillow-images] Failed real-${index}.jpg from ${imgUrl}: ${(err as Error).message}`
      )
    }
  }

  console.log(
    `[fetch-zillow-images] Done. Downloaded=${downloaded}, Skipped=${skipped}, TargetDir=${path.relative(
      process.cwd(),
      OUTPUT_DIR
    )}`
  )
}

main().catch((err) => {
  console.error('[fetch-zillow-images] Unhandled error:', err)
  process.exit(1)
})
