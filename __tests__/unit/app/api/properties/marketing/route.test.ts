import { describe, expect, test, jest } from '@jest/globals'

jest.mock('@/lib/utils/performance', () => ({
  withPerformanceTracking: (handler: (...args: unknown[]) => unknown) =>
    handler,
}))

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

describe('properties marketing API route', () => {
  test('returns marketing cards', async () => {
    const route = await import('@/app/api/properties/marketing/route')
    await route.GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(3)
    expect(body[0]).toEqual(
      expect.objectContaining({
        zpid: expect.any(String),
        address: expect.any(String),
      })
    )
  })

  test('rejects unsupported methods', async () => {
    const route = await import('@/app/api/properties/marketing/route')

    await route.POST()
    const [postBody, postInit] = jsonMock.mock.calls.at(-1)!
    expect(postInit?.status).toBe(405)
    expect(postBody.error).toBe('Method not allowed')

    await route.PUT()
    const [putBody, putInit] = jsonMock.mock.calls.at(-1)!
    expect(putInit?.status).toBe(405)
    expect(putBody.error).toBe('Method not allowed')

    await route.DELETE()
    const [deleteBody, deleteInit] = jsonMock.mock.calls.at(-1)!
    expect(deleteInit?.status).toBe(405)
    expect(deleteBody.error).toBe('Method not allowed')

    await route.PATCH()
    const [patchBody, patchInit] = jsonMock.mock.calls.at(-1)!
    expect(patchInit?.status).toBe(405)
    expect(patchBody.error).toBe('Method not allowed')

    await route.OPTIONS()
    const [optionsBody, optionsInit] = jsonMock.mock.calls.at(-1)!
    expect(optionsInit?.status ?? 200).toBe(200)
    expect(optionsBody).toEqual({})
  })
})
