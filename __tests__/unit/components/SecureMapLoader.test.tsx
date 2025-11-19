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
  delete (window as any).google
  delete (window as any).initGoogleMaps
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
    ) as HTMLScriptElement
    expect(script).toBeTruthy()
    ;(window as any).google = { maps: {} }

    await act(async () => {
      ;(window as any).initGoogleMaps?.()
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
    ) as HTMLScriptElement
    expect(script).toBeTruthy()

    await act(async () => {
      script.onerror?.(new Event('error') as any)
    })

    expect(screen.getByText(/Map Unavailable/i)).toBeInTheDocument()
    expect(screen.queryByTestId('map-child')).toBeNull()
  })
})
