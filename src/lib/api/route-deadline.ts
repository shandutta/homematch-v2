import { ApiErrorHandler } from '@/lib/api/errors'

type RouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response>

export function withRouteDeadline<Args extends unknown[]>(
  label: string,
  timeoutMs: number,
  handler: RouteHandler<Args>
): RouteHandler<Args> {
  return async (...args: Args) => {
    let timedOut = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const timeoutResponse = new Promise<Response>((resolve) => {
      timeoutId = setTimeout(() => {
        timedOut = true
        console.warn(`[${label}] exceeded ${timeoutMs}ms route deadline`)
        resolve(
          ApiErrorHandler.gatewayTimeout(
            `${label} exceeded ${timeoutMs}ms route deadline`
          )
        )
      }, timeoutMs)
    })

    try {
      return await Promise.race([handler(...args), timeoutResponse])
    } finally {
      if (!timedOut && timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }
}
