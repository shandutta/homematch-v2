'use client'

// Enhanced haptic feedback utility for mobile devices
export class HapticFeedback {
  private static isSupported =
    typeof navigator !== 'undefined' && 'vibrate' in navigator
  private static isIOSSupported =
    typeof window !== 'undefined' && 'DeviceMotionEvent' in window

  // Check if haptic feedback is available
  static get isAvailable(): boolean {
    return this.isSupported || this.isIOSSupported
  }

  // Light haptic feedback - for drag start, button hover
  static light(): void {
    this.vibrate([5])
    this.triggerIOSHaptic('light')
  }

  // Medium haptic feedback - for threshold crossing
  static medium(): void {
    this.vibrate([10])
    this.triggerIOSHaptic('medium')
  }

  // Heavy haptic feedback - for strong interactions
  static heavy(): void {
    this.vibrate([20])
    this.triggerIOSHaptic('heavy')
  }

  // Success haptic feedback - for completed actions
  static success(): void {
    this.vibrate([5, 20, 5])
    this.triggerIOSHaptic('success')
  }

  // Error haptic feedback - for failed actions
  static error(): void {
    this.vibrate([10, 50, 10, 50, 10])
    this.triggerIOSHaptic('error')
  }

  // Warning haptic feedback - for warnings
  static warning(): void {
    this.vibrate([5, 25, 5])
    this.triggerIOSHaptic('warning')
  }

  // Selection haptic feedback - for selections and taps
  static selection(): void {
    this.vibrate([3])
    this.triggerIOSHaptic('selection')
  }

  // Impact haptic feedback with variable intensity
  static impact(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
    const patterns = {
      light: [5],
      medium: [10],
      heavy: [20],
    }
    this.vibrate(patterns[intensity])
    this.triggerIOSHaptic(intensity)
  }

  // Custom vibration pattern
  static custom(pattern: number[]): void {
    this.vibrate(pattern)
  }

  // Internal vibration method
  private static vibrate(pattern: number | number[]): void {
    if (!this.isSupported) return

    try {
      navigator.vibrate(pattern)
    } catch (error) {
      console.debug('Vibration API not supported:', error)
    }
  }

  // iOS-specific haptic feedback
  private static triggerIOSHaptic(type: string): void {
    if (typeof window === 'undefined') return

    // Check for iOS haptic engine support
    const hapticFeedback = (
      window as unknown as { hapticFeedback?: Record<string, () => void> }
    ).hapticFeedback
    if (hapticFeedback && typeof hapticFeedback[type] === 'function') {
      try {
        hapticFeedback[type]()
      } catch (error) {
        console.debug('iOS haptic feedback not available:', error)
      }
    }

    // Alternative method for iOS Safari
    if ('DeviceMotionEvent' in window) {
      try {
        // Request device motion permission for iOS 13+
        if (
          typeof (
            DeviceMotionEvent as unknown as {
              requestPermission?: () => Promise<string>
            }
          ).requestPermission === 'function'
        ) {
          ;(
            DeviceMotionEvent as unknown as {
              requestPermission: () => Promise<string>
            }
          )
            .requestPermission()
            .then((permission: string) => {
              if (permission === 'granted') {
                this.triggerMotionHaptic(type)
              }
            })
            .catch(() => {
              // Permission denied or not available
            })
        } else {
          this.triggerMotionHaptic(type)
        }
      } catch (error) {
        console.debug('Device motion haptic not available:', error)
      }
    }
  }

  // Trigger haptic using device motion (iOS fallback)
  private static triggerMotionHaptic(type: string): void {
    // This is a fallback method that uses audio context to create haptic-like feedback
    if (typeof window === 'undefined' || !window.AudioContext) return

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioContextClass) return
      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Configure based on haptic type
      const config = this.getHapticConfig(type)
      oscillator.frequency.setValueAtTime(
        config.frequency,
        audioContext.currentTime
      )
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(
        config.volume,
        audioContext.currentTime + 0.01
      )
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + config.duration
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + config.duration)
    } catch (error) {
      console.debug('Audio haptic feedback not available:', error)
    }
  }

  // Get haptic configuration based on type
  private static getHapticConfig(type: string): {
    frequency: number
    volume: number
    duration: number
  } {
    const configs = {
      light: { frequency: 200, volume: 0.1, duration: 0.05 },
      medium: { frequency: 150, volume: 0.2, duration: 0.1 },
      heavy: { frequency: 100, volume: 0.3, duration: 0.15 },
      success: { frequency: 300, volume: 0.15, duration: 0.1 },
      error: { frequency: 80, volume: 0.25, duration: 0.2 },
      warning: { frequency: 120, volume: 0.2, duration: 0.12 },
      selection: { frequency: 250, volume: 0.1, duration: 0.03 },
    }

    return configs[type as keyof typeof configs] || configs.medium
  }
}

// React hook for haptic feedback
export function useHapticFeedback() {
  return {
    light: HapticFeedback.light,
    medium: HapticFeedback.medium,
    heavy: HapticFeedback.heavy,
    success: HapticFeedback.success,
    error: HapticFeedback.error,
    warning: HapticFeedback.warning,
    selection: HapticFeedback.selection,
    impact: HapticFeedback.impact,
    custom: HapticFeedback.custom,
    isAvailable: HapticFeedback.isAvailable,
  }
}

export default HapticFeedback
