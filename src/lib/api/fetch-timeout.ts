export class FetchTimeoutError extends Error {
  constructor(message = 'Outbound request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number
  timeoutMessage?: string
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const { timeoutMs = 10000, timeoutMessage, signal, ...fetchInit } = init
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new FetchTimeoutError(timeoutMessage))
  }, timeoutMs)

  const abortFromCaller = () => {
    controller.abort(signal?.reason)
  }

  try {
    if (signal) {
      if (signal.aborted) {
        abortFromCaller()
      } else {
        signal.addEventListener('abort', abortFromCaller, { once: true })
      }
    }

    return await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.reason instanceof FetchTimeoutError) {
      throw controller.signal.reason
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function isFetchTimeoutError(error: unknown): boolean {
  return (
    error instanceof FetchTimeoutError ||
    (error instanceof Error &&
      (error.name === 'AbortError' || /timed?\s*out|timeout/i.test(error.message)))
  )
}
