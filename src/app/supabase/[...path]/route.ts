import { NextRequest } from 'next/server'

const stripTrailingSlash = (value?: string | null) =>
  value ? value.replace(/\/+$/, '') : value

const getProxyConfig = () => {
  const enabled = process.env['SUPABASE_LOCAL_PROXY'] === 'true'
  const target =
    stripTrailingSlash(process.env['SUPABASE_LOCAL_PROXY_TARGET']) ||
    'http://127.0.0.1:54200'

  return { enabled, target }
}

export const dynamic = 'force-dynamic'

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) => {
  const { enabled, target } = getProxyConfig()
  if (!enabled) {
    return new Response('Supabase proxy disabled', { status: 404 })
  }

  const { path: pathSegments } = await params
  const path = pathSegments?.join('/') ?? ''
  const targetUrl = `${target}/${path}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.set('x-forwarded-host', req.nextUrl.host)
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''))

  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : Buffer.from(await req.arrayBuffer())

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    })

    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.set('x-supabase-proxy-target', target)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Supabase proxy error', error)
    return new Response('Supabase proxy error', { status: 502 })
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
}
