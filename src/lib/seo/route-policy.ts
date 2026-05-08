import type { MetadataRoute } from 'next'
import { PROTECTED_PATH_PREFIXES } from '../routing/protected-routes'

export const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

export type SeoPublicRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

export const SEO_PUBLIC_ROUTES: SeoPublicRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/signup', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
]

export const REQUIRED_LEGAL_PUBLIC_PATHS = [
  '/privacy',
  '/terms',
  '/cookies',
] as const

export const NOINDEX_PRIVATE_PATHS = [
  '/login',
  '/reset-password',
  '/verify-email',
  '/auth/auth-code-error',
  '/invite/[token]',
] as const

const EXACT_AND_SLASH_PRIVATE_PATHS = [
  '/api',
  '/api/',
  '/auth',
  '/auth/',
  '/invite',
  '/invite/',
  '/demo',
  '/demo/',
  '/sponsor-mockups',
  '/sponsor-mockups/',
  '/supabase',
  '/supabase/',
] as const

export const LEGACY_PRIVATE_PREFIXES = ['/account', '/admin'] as const

export const ROBOTS_DISALLOW_PATHS: string[] = [
  ...PROTECTED_PATH_PREFIXES,
  ...LEGACY_PRIVATE_PREFIXES,
  ...EXACT_AND_SLASH_PRIVATE_PATHS,
]

const normalizePath = (path: string): string => {
  if (!path) {
    return '/'
  }

  const pathOnly = path.split(/[?#]/, 1)[0] || '/'
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
}

export function isSeoPublicRoute(path: string): boolean {
  const normalizedPath = normalizePath(path)
  return SEO_PUBLIC_ROUTES.some((route) => route.path === normalizedPath)
}

export function isRobotsDisallowedPath(path: string): boolean {
  const normalizedPath = normalizePath(path)

  return ROBOTS_DISALLOW_PATHS.some((blockedPath) => {
    if (blockedPath.endsWith('/')) {
      return normalizedPath.startsWith(blockedPath)
    }

    return (
      normalizedPath === blockedPath ||
      normalizedPath.startsWith(`${blockedPath}/`)
    )
  })
}
