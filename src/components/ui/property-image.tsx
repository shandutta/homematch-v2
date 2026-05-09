'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Home } from 'lucide-react'

interface PropertyImageProps {
  src?: string | string[]
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  onError?: () => void
  onLoad?: () => void
  /**
   * Show a shimmering skeleton overlay until the image fully loads.
   * Disable for cases where the parent already provides a loading
   * presentation or where we expect an instant local SVG.
   */
  showSkeleton?: boolean
}

const FALLBACK_IMAGES = [
  '/images/properties/house-1.svg',
  '/images/properties/house-2.svg',
  '/images/properties/house-3.svg',
]

// Tiny dark-grey gradient SVG used as the blur placeholder for remote images.
// Matches the obsidian theme, avoids a white flash, and ships ~150 bytes.
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  (typeof window === 'undefined'
    ? Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>'
      ).toString('base64')
    : btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>'
      ))

const BROKEN_IMAGE_PATH_PATTERNS = [
  'photo-1575517111478-7f6f2c59ebb0',
]

const BLOCKED_DOMAINS = new Set([
  'loremflickr.com',
])

const shouldBlockHostname = (hostname: string | null) =>
  process.env.NEXT_PUBLIC_TEST_MODE === 'true' &&
  hostname !== null &&
  hostname !== '' &&
  BLOCKED_DOMAINS.has(hostname)

const getUrlHostname = (url: string | null): string | null => {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

const isKnownBrokenImage = (url: string): boolean => {
  const hostname = getUrlHostname(url)
  if (shouldBlockHostname(hostname)) {
    return true
  }
  return BROKEN_IMAGE_PATH_PATTERNS.some((pattern) => url.includes(pattern))
}

// Local SVG fallbacks load synchronously — no need for a long skeleton fade.
const isLocalAsset = (url: string): boolean => url.startsWith('/')

export function PropertyImage({
  src,
  alt,
  fill,
  width,
  height,
  className = '',
  priority = false,
  sizes,
  onError,
  onLoad,
  showSkeleton = true,
}: PropertyImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [allFallbacksFailed, setAllFallbacksFailed] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const srcKey = useMemo(() => {
    if (Array.isArray(src)) return src.filter(Boolean).join('|')
    return src ?? ''
  }, [src])

  useEffect(() => {
    setCurrentImageIndex(0)
    setHasError(false)
    setAllFallbacksFailed(false)
    setHasLoaded(false)
  }, [srcKey])

  const resolvedSrc = useMemo(() => {
    if (src && !hasError) {
      let imageUrl: string | undefined

      if (Array.isArray(src) && src.length > 0) {
        imageUrl = src.find((url) => !isKnownBrokenImage(url))
      } else if (typeof src === 'string') {
        imageUrl = isKnownBrokenImage(src) ? undefined : src
      }

      const imageHostname = imageUrl ? getUrlHostname(imageUrl) : null
      if (shouldBlockHostname(imageHostname)) {
        console.warn(
          `Blocking ${imageHostname} URL from Next.js Image optimization: ${imageUrl}`
        )
        imageUrl = undefined
      }

      if (imageUrl) {
        return imageUrl
      }
    }

    return FALLBACK_IMAGES[currentImageIndex] || FALLBACK_IMAGES[0]
  }, [src, hasError, currentImageIndex])

  const handleImageError = useCallback(() => {
    setHasError(true)

    if (currentImageIndex < FALLBACK_IMAGES.length - 1) {
      setCurrentImageIndex((prev) => prev + 1)
    } else {
      console.warn('All image fallbacks failed for:', alt)
      setAllFallbacksFailed(true)
    }

    onError?.()
  }, [currentImageIndex, alt, onError])

  const handleImageLoad = useCallback(() => {
    setHasLoaded(true)
    onLoad?.()
  }, [onLoad])

  const skeletonVisible =
    showSkeleton &&
    !hasLoaded &&
    !allFallbacksFailed &&
    !isLocalAsset(resolvedSrc!)

  const fadeClass = showSkeleton
    ? hasLoaded
      ? 'opacity-100'
      : 'opacity-0'
    : 'opacity-100'

  const imageClassName =
    `transition-opacity duration-500 ${fadeClass} ${className}`.trim()

  // Blur placeholder is only valuable for remote images (which take a while to
  // load). Local SVG fallbacks render instantly, so skip the placeholder there
  // to avoid an extra paint.
  const usesBlurPlaceholder = !isLocalAsset(resolvedSrc!)

  const imageProps = {
    src: resolvedSrc!,
    alt,
    className: imageClassName,
    priority,
    sizes,
    onError: handleImageError,
    onLoad: handleImageLoad,
    ...(usesBlurPlaceholder
      ? { placeholder: 'blur' as const, blurDataURL: BLUR_DATA_URL }
      : {}),
    ...(fill ? { fill: true } : { width, height }),
  }

  if (allFallbacksFailed) {
    return (
      <div
        data-testid="property-image-placeholder"
        className={`flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 ${className}`}
      >
        <Home className="h-12 w-12 text-slate-500" />
      </div>
    )
  }

  if (!fill) {
    return (
      <span className="relative inline-block align-middle">
        <Image {...imageProps} />
        {skeletonVisible && <ImageSkeleton />}
      </span>
    )
  }

  return (
    <>
      <Image {...imageProps} />
      {skeletonVisible && <ImageSkeleton />}
    </>
  )
}

function ImageSkeleton() {
  return (
    <div
      data-testid="property-image-skeleton"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-900/40"
    >
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)] bg-[length:200%_100%] animate-[propertyImageShimmer_1.6s_ease-in-out_infinite]" />
      <style>{`
        @keyframes propertyImageShimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
