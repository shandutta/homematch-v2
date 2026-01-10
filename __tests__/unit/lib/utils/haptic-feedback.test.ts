import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import HapticFeedback, { useHapticFeedback } from '@/lib/utils/haptic-feedback'

const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})

describe('HapticFeedback', () => {
  let originalVibrate: Navigator['vibrate'] | undefined
  let originalHapticFeedback: Window['hapticFeedback'] | undefined
  let originalDeviceMotionEvent: typeof window.DeviceMotionEvent | undefined
  let originalAudioContext: typeof window.AudioContext | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    debugSpy.mockImplementation(() => {})
    Reflect.set(HapticFeedback, 'isSupported', false)
    Reflect.set(HapticFeedback, 'isIOSSupported', false)
    originalVibrate = globalThis.navigator?.vibrate
    originalHapticFeedback = globalThis.window?.hapticFeedback
    originalDeviceMotionEvent = globalThis.window?.DeviceMotionEvent
    originalAudioContext = globalThis.window?.AudioContext
  })

  afterEach(() => {
    if (typeof originalVibrate === 'function') {
      globalThis.navigator.vibrate = originalVibrate
    } else {
      Reflect.deleteProperty(globalThis.navigator, 'vibrate')
    }

    globalThis.window.hapticFeedback = originalHapticFeedback

    if (originalDeviceMotionEvent) {
      Object.defineProperty(window, 'DeviceMotionEvent', {
        value: originalDeviceMotionEvent,
        configurable: true,
        writable: true,
      })
    } else {
      Reflect.deleteProperty(window, 'DeviceMotionEvent')
    }

    if (originalAudioContext) {
      Object.defineProperty(window, 'AudioContext', {
        value: originalAudioContext,
        configurable: true,
        writable: true,
      })
    } else {
      Reflect.deleteProperty(window, 'AudioContext')
    }
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
