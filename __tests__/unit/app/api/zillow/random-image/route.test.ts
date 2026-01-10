import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  test,
  jest,
} from '@jest/globals'
import { GET } from '@/app/api/zillow/random-image/route'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
}))

const originalEnv = process.env
const originalFetch = global.fetch
const fetchMock: jest.Mock<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
> = jest.fn()

const createJsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

describe('zillow random image API route', () => {
  beforeAll(() => {
    global.fetch = fetchMock
  })

  beforeEach(() => {
    process.env = { ...originalEnv }
    jsonMock.mockClear()
    fetchMock.mockReset()
  })

  afterAll(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  test('returns 404 in production', async () => {
    process.env.NODE_ENV = 'production'

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(404)
    expect(body.error).toBe('Not found')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns 503 when RAPIDAPI key is missing', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.RAPIDAPI_KEY

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(503)
    expect(body.error).toContain('Zillow API access')
  })

  test('returns 502 when search request fails', async () => {
    process.env.RAPIDAPI_KEY = 'test-key'
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({}, { status: 502, statusText: 'Bad Gateway' })
    )

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(502)
    expect(body.error).toContain('Zillow search failed')
  })

  test('returns 204 when search has no candidates', async () => {
    process.env.RAPIDAPI_KEY = 'test-key'
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ props: [{ zpid: null }] })
    )

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(204)
    expect(body.error).toBe('No properties found from search query')
  })

  test('returns 204 when images are missing', async () => {
    process.env.RAPIDAPI_KEY = 'test-key'
    fetchMock
      .mockResolvedValueOnce(createJsonResponse({ props: [{ zpid: 1 }] }))
      .mockResolvedValueOnce(createJsonResponse({ images: [] }))

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(204)
    expect(body.error).toBe('No images returned for selected properties')
  })

  test('returns a single card when only one candidate succeeds', async () => {
    process.env.RAPIDAPI_KEY = 'test-key'
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          props: [
            {
              zpid: 1,
              price: 100,
              bedrooms: 2,
              bathrooms: 1,
              address: 'Test Address',
              latitude: 1,
              longitude: 2,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({ images: ['https://example.com/img.jpg'] })
      )

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        zpid: '1',
        imageUrl: 'https://example.com/img.jpg',
        address: 'Test Address',
      })
    )
  })

  test('returns an array when multiple cards succeed', async () => {
    process.env.RAPIDAPI_KEY = 'test-key'
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          props: [
            { zpid: 1, address: 'One' },
            { zpid: 2, address: 'Two' },
          ],
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({ images: ['https://example.com/1.jpg'] })
      )
      .mockResolvedValueOnce(
        createJsonResponse({ images: ['https://example.com/2.jpg'] })
      )

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
  })
})
