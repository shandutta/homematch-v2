import type { NextConfig } from 'next'

// Bundle analyzer configuration
let withBundleAnalyzer: any
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })
} catch {
  // Fallback if bundle analyzer is not installed
  withBundleAnalyzer = (config: any) => config
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
  .filter(Boolean)
  .map((origin) => origin!.toLowerCase()) as string[]

const stripTrailingSlash = (value?: string | null) =>
  value ? value.replace(/\/+$/, '') : value

const SUPABASE_LOCAL_PROXY_ENABLED =
  process.env.SUPABASE_LOCAL_PROXY === 'true'
const SUPABASE_LOCAL_PROXY_TARGET =
  stripTrailingSlash(process.env.SUPABASE_LOCAL_PROXY_TARGET) ||
  'http://127.0.0.1:54321'

const nextConfig: NextConfig = {
  /* config options here */
  ...(allowedDevOrigins.length
    ? {
        allowedDevOrigins,
      }
    : {}),

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
    // Future experimental features can be added here
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
