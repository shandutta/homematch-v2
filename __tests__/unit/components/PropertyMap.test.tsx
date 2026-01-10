import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { PropertyMap } from '@/components/property/PropertyMap'
import { __resetSecureMapLoaderStateForTests } from '@/components/shared/SecureMapLoader'

describe('PropertyMap', () => {
  beforeEach(() => {
    __resetSecureMapLoaderStateForTests()
    // Clean any previous google mocks
    if (typeof window !== 'undefined') {
      Reflect.deleteProperty(window, 'google')
    }
  })

  afterEach(() => {
    document
      .querySelectorAll('script[src="/api/maps/proxy-script"]')
      .forEach((script) => script.remove())
    Reflect.deleteProperty(window, 'google')
    Reflect.deleteProperty(window, 'initGoogleMaps')
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
  })

  it('renders safely when window.google is not available (jsdom/SSR guard)', () => {
    const { container } = render(
      <PropertyMap
        property={{
          id: 'placeholder',
          address: 'N/A',
          city: 'N/A',
          state: 'CA',
          zip_code: '00000',
          price: 0,
          bedrooms: 0,
          bathrooms: 0,
          square_feet: null,
          property_type: null,
          listing_status: 'active',
          is_active: true,
          created_at: null,
          updated_at: null,
          zpid: null,
          images: null,
          description: null,
          coordinates: null, // no google available, guard path
          neighborhood_id: null,
          amenities: null,
          year_built: null,
          lot_size_sqft: null,
          parking_spots: null,
          property_hash: null,
        }}
      />
    )

    // Should render a container without throwing, even when Maps API is not present
    expect(container.firstChild).toBeTruthy()
  })

  it('initializes map when window.google is available', async () => {
    const mapCtor = jest.fn().mockImplementation(() => ({
      setCenter: jest.fn(),
    }))
    const markerCtor = jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
    }))
    const infoWindowCtor = jest.fn().mockImplementation(() => ({}))
    const sizeCtor = jest.fn().mockImplementation(() => ({}))
    const pointCtor = jest.fn().mockImplementation(() => ({}))

    // Minimal google maps shim
    Object.defineProperty(window, 'google', {
      value: {
        maps: {
          Map: mapCtor,
          Marker: markerCtor,
          InfoWindow: infoWindowCtor,
          Size: sizeCtor,
          Point: pointCtor,
        },
      },
      writable: true,
      configurable: true,
    })

    const { container } = render(
      <PropertyMap
        property={{
          id: 'p1',
          address: '123 Main',
          city: 'X',
          state: 'CA',
          zip_code: '00000',
          price: 100,
          bedrooms: 1,
          bathrooms: 1,
          square_feet: 500,
          property_type: 'single_family',
          listing_status: 'active',
          is_active: true,
          created_at: null,
          updated_at: null,
          zpid: null,
          images: null,
          description: null,
          coordinates: { lat: 1, lng: 2 },
          neighborhood_id: null,
          amenities: null,
          year_built: null,
          lot_size_sqft: null,
          parking_spots: null,
          property_hash: null,
        }}
      />
    )

    expect(container.firstChild).toBeTruthy()

    await waitFor(() => expect(mapCtor).toHaveBeenCalled())
    expect(markerCtor).toHaveBeenCalled()
  })

  it('includes mapId when configured (enables advanced markers)', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'test-map-id'

    const mapCtor = jest.fn().mockImplementation(() => ({
      setCenter: jest.fn(),
    }))
    const markerCtor = jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
    }))
    const infoWindowCtor = jest.fn().mockImplementation(() => ({}))
    const sizeCtor = jest.fn().mockImplementation(() => ({}))
    const pointCtor = jest.fn().mockImplementation(() => ({}))

    Object.defineProperty(window, 'google', {
      value: {
        maps: {
          Map: mapCtor,
          Marker: markerCtor,
          InfoWindow: infoWindowCtor,
          Size: sizeCtor,
          Point: pointCtor,
        },
      },
      writable: true,
      configurable: true,
    })

    render(
      <PropertyMap
        property={{
          id: 'p1',
          address: '123 Main',
          city: 'X',
          state: 'CA',
          zip_code: '00000',
          price: 100,
          bedrooms: 1,
          bathrooms: 1,
          square_feet: 500,
          property_type: 'single_family',
          listing_status: 'active',
          is_active: true,
          created_at: null,
          updated_at: null,
          zpid: null,
          images: null,
          description: null,
          coordinates: { lat: 1, lng: 2 },
          neighborhood_id: null,
          amenities: null,
          year_built: null,
          lot_size_sqft: null,
          parking_spots: null,
          property_hash: null,
        }}
      />
    )

    await waitFor(() => expect(mapCtor).toHaveBeenCalled())
    const mapOptions = mapCtor.mock.calls[0]?.[1]
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null
    if (!isRecord(mapOptions)) {
      throw new Error('Expected map options to be an object')
    }
    expect(mapOptions.mapId).toBe('test-map-id')
  })
})
