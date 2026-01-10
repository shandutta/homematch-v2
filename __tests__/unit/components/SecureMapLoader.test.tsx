import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import {
  SecureMapLoader,
  __resetSecureMapLoaderStateForTests,
} from '@/components/shared/SecureMapLoader'

beforeEach(() => {
  __resetSecureMapLoaderStateForTests()
})

afterEach(() => {
  document
    .querySelectorAll('script[src="/api/maps/proxy-script"]')
    .forEach((script) => script.remove())
  Reflect.deleteProperty(window, 'google')
  Reflect.deleteProperty(window, 'initGoogleMaps')
})

describe('SecureMapLoader', () => {
  test('shows loading fallback before Google Maps is ready', async () => {
    render(
      <SecureMapLoader>
        <div data-testid="map-child">Map Ready</div>
      </SecureMapLoader>
    )

    expect(screen.getByText(/Loading map/i)).toBeInTheDocument()
    expect(screen.queryByTestId('map-child')).toBeNull()
  })

  test('renders children once Google Maps script calls init callback', async () => {
    render(
      <SecureMapLoader>
        <div data-testid="map-child">Map Ready</div>
      </SecureMapLoader>
    )

    const script = document.querySelector(
      'script[src="/api/maps/proxy-script"]'
    )
    expect(script).toBeTruthy()
    if (!(script instanceof HTMLScriptElement)) {
      throw new Error('Expected Google Maps script to be an HTMLScriptElement')
    }
    Reflect.set(window, 'google', { maps: { Map: function Map() {} } })

    await act(async () => {
      const init = Reflect.get(window, 'initGoogleMaps')
      if (typeof init === 'function') {
        init()
      }
    })

    await waitFor(() =>
      expect(screen.getByTestId('map-child')).toBeInTheDocument()
    )
  })

  test('shows error fallback when the script fails to load', async () => {
    render(
      <SecureMapLoader>
        <div data-testid="map-child">Map Ready</div>
      </SecureMapLoader>
    )

    const script = document.querySelector(
      'script[src="/api/maps/proxy-script"]'
    )
    expect(script).toBeTruthy()
    if (!(script instanceof HTMLScriptElement)) {
      throw new Error('Expected Google Maps script to be an HTMLScriptElement')
    }

    await act(async () => {
      script.onerror?.(new Event('error'))
    })

    expect(screen.getByText(/Map Unavailable/i)).toBeInTheDocument()
    expect(screen.queryByTestId('map-child')).toBeNull()
  })
})
