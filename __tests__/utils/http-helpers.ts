export const createJsonResponse = (
  payload: unknown,
  init: ResponseInit = {}
): Response => {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  })
}

export const getRequestUrl = (input?: RequestInfo | URL): string => {
  if (!input) return ''
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  if (input instanceof Request) return input.url
  return String(input)
}
