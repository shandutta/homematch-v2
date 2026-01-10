import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import HapticFeedback, { useHapticFeedback } from '@/lib/utils/haptic-feedback'

const originalNavigator = global.navigator
const originalWindow = global.window
const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})

describe('HapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    debugSpy.mockImplementation(() => {})
    Reflect.set(HapticFeedback, 'isSupported', false)
    Reflect.set(HapticFeedback, 'isIOSSupported', false)
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  afterAll(() => {
    debugSpy.mockRestore()
  })

  test('isAvailable is false when no browser APIs exist', () => {
    expect(HapticFeedback.isAvailable).toBe(false)
  })

  test('vibrates when supported and handles safe fallback', () => {
    type VibrateFn = NonNullable<Navigator['vibrate']>
    const vibrate: VibrateFn = jest.fn(() => true)
    Reflect.set(HapticFeedback, 'isSupported', true)
    Object.defineProperty(globalThis.navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    })
    HapticFeedback.light()
    expect(vibrate).toHaveBeenCalledWith([5])
  })

  test('triggerIOSHaptic uses custom hapticFeedback when available', () => {
    const mockIOSHaptic = jest.fn()
    Reflect.set(HapticFeedback, 'isSupported', true)
    Reflect.set(HapticFeedback, 'isIOSSupported', true)
    const vibrate: NonNullable<Navigator['vibrate']> = jest.fn(() => true)
    Object.defineProperty(globalThis.navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    })
    window.hapticFeedback = { light: mockIOSHaptic }
    Object.defineProperty(window, 'DeviceMotionEvent', {
      value: {
        requestPermission: jest
          .fn<Promise<'granted' | 'denied'>, []>()
          .mockResolvedValue('denied'),
      },
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'AudioContext', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    HapticFeedback.light()
    expect(mockIOSHaptic).toHaveBeenCalled()
  })

  test('hook returns bound methods', () => {
    const haptic = useHapticFeedback()
    expect(typeof haptic.light).toBe('function')
    expect(haptic.isAvailable).toBe(false)
  })
})
