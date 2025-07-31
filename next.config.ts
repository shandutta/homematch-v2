import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */

  // Skip linting during test builds
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINTING === 'true',
  },

  // Skip type checking during test builds
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  // Disable static optimization to prevent SSG build errors
  output: 'standalone',
  
  // Force all pages to be dynamic to avoid static generation issues
  experimental: {
    forceSwcTransforms: true,
  },
}

export default nextConfig
