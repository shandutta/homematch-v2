const DEFAULT_APP_URL = 'http://localhost:3000'

const stripTrailingSlash = (url: string) =>
  url.endsWith('/') ? url.slice(0, -1) : url

export const normalizeOrigin = (url?: string | null) => {
  if (!url) return null
  return stripTrailingSlash(url.trim())
}

export const getEnvAppUrl = () =>
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL) ??
  DEFAULT_APP_URL

export const getBrowserAppUrl = () => {
  if (typeof window !== 'undefined') {
    const runtimeOrigin = normalizeOrigin(window.location?.origin)
    if (runtimeOrigin) {
      return runtimeOrigin
    }
  }

  return getEnvAppUrl()
}

export const buildBrowserRedirectUrl = (path = '/auth/callback') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getBrowserAppUrl()}${normalizedPath}`
}

export { DEFAULT_APP_URL }
