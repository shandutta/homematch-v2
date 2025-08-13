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

const nextConfig: NextConfig = {
  /* config options here */

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
    ],
    // optional: domains fallback in case remotePatterns is bypassed somewhere
    domains: [
      'photos.zillowstatic.com',
      'images.zillowstatic.com',
      'images.unsplash.com',
    ],
    // optional tuning for responsive images
    deviceSizes: [320, 420, 768, 1024, 1200, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
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
}

// Wrap with bundle analyzer if enabled
export default withBundleAnalyzer(nextConfig)
