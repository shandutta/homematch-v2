import { renderHook } from '@testing-library/react'
import { useRenderPerformance } from '@/lib/utils/client-performance'

describe('useRenderPerformance hook', () => {
  let consoleDebugSpy: jest.SpyInstance
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      writable: true,
      value: ORIGINAL_NODE_ENV,
    })
  })

  it('does not throw on first render', () => {
    expect(() => renderHook(() => useRenderPerformance('Foo'))).not.toThrow()
  })

  it('does not log on initial render', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      writable: true,
      value: 'development',
    })
    renderHook(() => useRenderPerformance('Foo'))
    expect(consoleDebugSpy).not.toHaveBeenCalled()
  })

  it('does not log when component re-renders fewer than 21 times', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      writable: true,
      value: 'development',
    })
    const { rerender } = renderHook(() => useRenderPerformance('Foo'))
    for (let i = 0; i < 5; i += 1) {
      rerender()
    }
    expect(consoleDebugSpy).not.toHaveBeenCalled()
  })

  it('does not log in production even with many renders', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      writable: true,
      value: 'production',
    })
    const { rerender } = renderHook(() => useRenderPerformance('Foo'))
    for (let i = 0; i < 30; i += 1) {
      rerender()
    }
    expect(consoleDebugSpy).not.toHaveBeenCalled()
  })

  it('logs a rapid re-rendering warning when renders happen quickly in dev', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      writable: true,
      value: 'development',
    })
    const { rerender } = renderHook(() => useRenderPerformance('Bar'))
    // Each rerender is < 16ms apart in test environment.
    // The rapid-rerender branch logs at renderCount > 5 && renderCount % 10 === 0
    // so render 10 should trigger a log.
    for (let i = 0; i < 12; i += 1) {
      rerender()
    }
    const rapidWarnLogged = consoleDebugSpy.mock.calls.some((call) => {
      const message = String(call[0])
      return message.includes('Bar') && message.includes('re-rendering rapidly')
    })
    expect(rapidWarnLogged).toBe(true)
  })
})
