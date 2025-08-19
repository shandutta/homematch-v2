'use client'

import { useState, useCallback } from 'react'
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
}

// Working fallback images - prioritize local assets to avoid external failures
const FALLBACK_IMAGES = [
  '/images/properties/house-1.svg',
  '/images/properties/house-2.svg',
  '/images/properties/house-3.svg',
]

// Known broken Unsplash URLs and unreliable image sources that should be avoided
const BROKEN_IMAGE_PATTERNS = [
  'photo-1575517111478-7f6f2c59ebb0', // This specific image is consistently 404
  'loremflickr.com', // LoremFlickr causes Next.js optimization 500 errors in test mode
  // Add more patterns as they're identified
]

// Check if a URL contains known broken patterns
const isKnownBrokenImage = (url: string): boolean => {
  return BROKEN_IMAGE_PATTERNS.some((pattern) => url.includes(pattern))
}

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
}: PropertyImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  // Determine the image source to use
  const getImageSrc = useCallback(() => {
    // If we have a custom src and haven't encountered an error, use it
    if (src && !hasError) {
      let imageUrl: string | undefined

      if (Array.isArray(src) && src.length > 0) {
        // Find first non-broken image in the array
        imageUrl = src.find((url) => !isKnownBrokenImage(url))
      } else if (typeof src === 'string') {
        // Check if single string URL is known to be broken
        imageUrl = isKnownBrokenImage(src) ? undefined : src
      }

      // Double-check: if the URL is still a loremflickr URL, force fallback
      if (imageUrl && imageUrl.includes('loremflickr.com')) {
        console.warn(
          `Blocking loremflickr URL from Next.js Image optimization: ${imageUrl}`
        )
        imageUrl = undefined
      }

      if (imageUrl) {
        return imageUrl
      }
    }

    // Use fallback images
    return FALLBACK_IMAGES[currentImageIndex] || FALLBACK_IMAGES[0]
  }, [src, hasError, currentImageIndex])

  const handleImageError = useCallback(() => {
    setHasError(true)

    // Try next fallback image if available
    if (currentImageIndex < FALLBACK_IMAGES.length - 1) {
      setCurrentImageIndex((prev) => prev + 1)
    } else {
      // All fallbacks failed, show placeholder
      console.warn('All image fallbacks failed for:', alt)
    }

    onError?.()
  }, [currentImageIndex, alt, onError])

  const imageProps = {
    src: getImageSrc(),
    alt,
    className: `transition-opacity duration-300 ${className}`,
    priority,
    sizes,
    onError: handleImageError,
    onLoad,
    ...(fill ? { fill: true } : { width, height }),
  }

  // If all images fail, show a placeholder
  if (hasError && currentImageIndex >= FALLBACK_IMAGES.length - 1) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
      >
        <Home className="h-12 w-12 text-gray-400" />
      </div>
    )
  }

  return <Image {...imageProps} />
}
