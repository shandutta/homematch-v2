import type { NextConfig } from 'next'

// Bundle analyzer configuration
const defaultBundleAnalyzer = (config: NextConfig): NextConfig => config
type NextConfigTransform = typeof defaultBundleAnalyzer
const isNextConfigTransform = (value: unknown): value is NextConfigTransform =>
  typeof value === 'function'
let withBundleAnalyzer = defaultBundleAnalyzer
try {
  const analyzerModule: unknown = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })
  if (isNextConfigTransform(analyzerModule)) {
    withBundleAnalyzer = analyzerModule
  } else {
    withBundleAnalyzer = defaultBundleAnalyzer
  }
} catch {
  // Fallback if bundle analyzer is not installed
  withBundleAnalyzer = defaultBundleAnalyzer
}

const normalizeOriginHost = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  try {
    const parsed = new URL(trimmed)
    return parsed.hostname
  } catch {
    return trimmed
      .replace(/\/$/, '')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
  }
}

const allowedDevOrigins = [
  normalizeOriginHost(process.env.NEXT_PUBLIC_APP_URL),
  ...(process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS.split(',').map((origin) =>
        normalizeOriginHost(origin)
      )
    : []),
]
  .filter((origin): origin is string => Boolean(origin))
  .map((origin) => origin.toLowerCase())

const stripTrailingSlash = (value?: string | null) =>
  value ? value.replace(/\/+$/, '') : value

const SUPABASE_LOCAL_PROXY_ENABLED = process.env.SUPABASE_LOCAL_PROXY === 'true'
const SUPABASE_LOCAL_PROXY_TARGET =
  stripTrailingSlash(process.env.SUPABASE_LOCAL_PROXY_TARGET) ||
  'http://127.0.0.1:54200'

const distDir = process.env.NEXT_DIST_DIR?.trim()

const nextConfig: NextConfig = {
  /* config options here */
  ...(allowedDevOrigins.length
    ? {
        allowedDevOrigins,
      }
    : {}),

  ...(distDir ? { distDir } : {}),

  // Allow external Zillow image hosts for next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'photos.zillowstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.zillowstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
    ],
    // Optional tuning for responsive images
    deviceSizes: [320, 420, 768, 1024, 1200, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Disable optimization for unreliable external sources during testing or development
    unoptimized:
      process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
      process.env.NODE_ENV === 'development',
    // Handle image loading errors gracefully
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Skip linting during test builds
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINTING === 'true',
  },

  // Skip type checking during test builds
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  trailingSlash: false,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Generate source maps for production debugging (optional)
  productionBrowserSourceMaps: false,

  // Experimental features for performance
  experimental: {
    // TODO: Enable Turbopack filesystem caching once supported by this Next.js
    // version. These flags are not present in 15.5.9.
    // Set to false here to disable if caching causes issues.
    // turbopackFileSystemCacheForDev: true,
    // turbopackFileSystemCacheForBuild: true,
  },

  // Optimize output
  compiler: {
    // Remove console logs in production (except errors and warnings)
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  async rewrites() {
    const rules = []

    if (SUPABASE_LOCAL_PROXY_ENABLED) {
      rules.push({
        source: '/supabase/:path*',
        destination: `${SUPABASE_LOCAL_PROXY_TARGET}/:path*`,
      })
    }

    return rules
  },
}

// Wrap with bundle analyzer if enabled
export default withBundleAnalyzer(nextConfig)
