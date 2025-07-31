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
  
  trailingSlash: false,
}

export default nextConfig
