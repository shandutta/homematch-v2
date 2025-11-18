import { headers } from 'next/headers'
import { DEFAULT_APP_URL, getEnvAppUrl, normalizeOrigin } from './site-url'

const normalize = (url?: string | null) => normalizeOrigin(url) ?? null

export const getServerAppUrl = async () => {
  const headerStore = await headers()

  const forwardedHost = headerStore.get('x-forwarded-host')
  const forwardedProto =
    headerStore.get('x-forwarded-proto') ||
    headerStore.get('x-forwarded-protocol')

  if (forwardedHost) {
    const forwardedOrigin = normalize(
      `${forwardedProto ?? 'https'}://${forwardedHost}`
    )
    if (forwardedOrigin) return forwardedOrigin
  }

  const originHeader = normalize(headerStore.get('origin'))
  if (originHeader) return originHeader

  const host = headerStore.get('host')
  if (host) {
    const proto =
      forwardedProto ||
      (process.env.NODE_ENV === 'development' ? 'http' : 'https')
    const hostOrigin = normalize(`${proto}://${host}`)
    if (hostOrigin) return hostOrigin
  }

  return getEnvAppUrl()
}

export const buildServerRedirectUrl = async (path = '/auth/callback') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = (await getServerAppUrl()) || DEFAULT_APP_URL
  return `${baseUrl}${normalizedPath}`
}
