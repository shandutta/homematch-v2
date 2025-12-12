/** @jest-environment node */

import {
  describe,
  expect,
  test,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import {
  fetchZillowImageUrls,
  isStreetViewImageUrl,
  isZillowStaticImageUrl,
} from '@/lib/ingestion/zillow-images'

describe('zillow images', () => {
  test('isStreetViewImageUrl detects Google Street View URLs', () => {
    expect(
      isStreetViewImageUrl(
        'https://maps.googleapis.com/maps/api/streetview?location=1+Main+St'
      )
    ).toBe(true)
    expect(
      isStreetViewImageUrl('https://photos.zillowstatic.com/fp/x.jpg')
    ).toBe(false)
  })

  test('isZillowStaticImageUrl detects Zillow photo URLs', () => {
    expect(
      isZillowStaticImageUrl('https://photos.zillowstatic.com/fp/x.jpg')
    ).toBe(true)
    expect(
      isZillowStaticImageUrl(
        'https://maps.googleapis.com/maps/api/streetview?location=1+Main+St'
      )
    ).toBe(false)
  })

  test('fetchZillowImageUrls returns [] on 404', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'not found',
    })

    await expect(
      fetchZillowImageUrls({
        zpid: '123',
        rapidApiKey: 'test',
        fetchImpl: fetchMock as any,
      })
    ).resolves.toEqual([])
  })

  test('fetchZillowImageUrls trims, filters, dedupes, and caps results', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        images: [
          ' https://a.com/1.jpg ',
          'https://a.com/1.jpg',
          'https://b.com/2.jpg',
          'https://c.com/3.jpg',
          null,
          123,
          '',
        ],
      }),
    })

    await expect(
      fetchZillowImageUrls({
        zpid: '123',
        rapidApiKey: 'test',
        fetchImpl: fetchMock as any,
        maxImages: 2,
      })
    ).resolves.toEqual(['https://a.com/1.jpg', 'https://b.com/2.jpg'])
  })

  describe('fetchZillowImageUrls retries', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.spyOn(Math, 'random').mockReturnValue(0)
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.restoreAllMocks()
    })

    test('retries on 429 and succeeds', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'rate limited',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            images: ['https://photos.zillowstatic.com/fp/1.jpg'],
          }),
        })

      const promise = fetchZillowImageUrls({
        zpid: '123',
        rapidApiKey: 'test',
        fetchImpl: fetchMock as any,
        retries: 2,
      })

      await jest.advanceTimersByTimeAsync(500)

      await expect(promise).resolves.toEqual([
        'https://photos.zillowstatic.com/fp/1.jpg',
      ])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
