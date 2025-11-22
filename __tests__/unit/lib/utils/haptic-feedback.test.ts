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
    ;(HapticFeedback as any).isSupported = false
    ;(HapticFeedback as any).isIOSSupported = false
    ;(global as any).navigator = originalNavigator
    ;(global as any).window = originalWindow
  })

  afterEach(() => {
    ;(global as any).navigator = originalNavigator
    ;(global as any).window = originalWindow
  })

  afterAll(() => {
    debugSpy.mockRestore()
  })

  test('isAvailable is false when no browser APIs exist', () => {
    expect(HapticFeedback.isAvailable).toBe(false)
  })

  test('vibrates when supported and handles safe fallback', () => {
    const vibrate = jest.fn()
    ;(HapticFeedback as any).isSupported = true
    ;(global.navigator as any).vibrate = vibrate
    HapticFeedback.light()
    expect(vibrate).toHaveBeenCalledWith([5])
  })

  test('triggerIOSHaptic uses custom hapticFeedback when available', () => {
    const mockIOSHaptic = jest.fn()
    ;(HapticFeedback as any).isSupported = true
    ;(HapticFeedback as any).isIOSSupported = true
    ;(global.navigator as any).vibrate = jest.fn()
    ;(global.window as any).hapticFeedback = { light: mockIOSHaptic }
    ;(global.window as any).DeviceMotionEvent = {
      requestPermission: jest.fn().mockResolvedValue('denied'),
    }
    ;(global.window as any).AudioContext = undefined

    HapticFeedback.light()
    expect(mockIOSHaptic).toHaveBeenCalled()
  })

  test('hook returns bound methods', () => {
    const haptic = useHapticFeedback()
    expect(typeof haptic.light).toBe('function')
    expect(haptic.isAvailable).toBe(false)
  })
})
