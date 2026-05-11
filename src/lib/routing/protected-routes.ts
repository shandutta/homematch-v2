const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/profile',
  '/household',
  '/settings',
  '/validation',
  '/couples',
  '/properties',
] as const

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export { PROTECTED_PATH_PREFIXES }
