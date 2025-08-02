import type { NextConfig } from 'next'

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
    domains: ['photos.zillowstatic.com', 'images.zillowstatic.com', 'images.unsplash.com'],
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
}

export default nextConfig
