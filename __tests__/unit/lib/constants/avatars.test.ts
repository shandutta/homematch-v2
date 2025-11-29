import { describe, test, expect } from '@jest/globals'
import {
  PRESET_AVATARS,
  getAvatarSrc,
  getPresetAvatar,
  AvatarData,
} from '@/lib/constants/avatars'

describe('Avatar Constants', () => {
  describe('PRESET_AVATARS', () => {
    test('contains exactly 10 preset avatars', () => {
      expect(PRESET_AVATARS).toHaveLength(10)
    })

    test('each preset has id, name, and src properties', () => {
      PRESET_AVATARS.forEach((avatar) => {
        expect(avatar).toHaveProperty('id')
        expect(avatar).toHaveProperty('name')
        expect(avatar).toHaveProperty('src')
        expect(typeof avatar.id).toBe('string')
        expect(typeof avatar.name).toBe('string')
        expect(typeof avatar.src).toBe('string')
      })
    })

    test('each preset has unique id', () => {
      const ids = PRESET_AVATARS.map((a) => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    test('all src paths point to /avatars/ directory', () => {
      PRESET_AVATARS.forEach((avatar) => {
        expect(avatar.src).toMatch(/^\/avatars\/\w+\.svg$/)
      })
    })

    test('includes expected animal avatars', () => {
      const expectedIds = [
        'bear',
        'cat',
        'dog',
        'fox',
        'koala',
        'owl',
        'panda',
        'penguin',
        'rabbit',
        'sloth',
      ]
      const actualIds = PRESET_AVATARS.map((a) => a.id)
      expect(actualIds).toEqual(expectedIds)
    })
  })

  describe('getAvatarSrc', () => {
    test('returns correct path for preset avatar type', () => {
      const avatar: AvatarData = { type: 'preset', value: 'fox' }
      const result = getAvatarSrc(avatar)
      expect(result).toBe('/avatars/fox.svg')
    })

    test('returns URL directly for custom avatar type', () => {
      const customUrl = 'https://storage.example.com/avatars/user123/avatar.png'
      const avatar: AvatarData = { type: 'custom', value: customUrl }
      const result = getAvatarSrc(avatar)
      expect(result).toBe(customUrl)
    })

    test('returns null for null input', () => {
      expect(getAvatarSrc(null)).toBeNull()
    })

    test('returns null for undefined input', () => {
      expect(getAvatarSrc(undefined)).toBeNull()
    })

    test('returns null for invalid preset ID', () => {
      const avatar: AvatarData = { type: 'preset', value: 'invalid-animal' }
      const result = getAvatarSrc(avatar)
      expect(result).toBeNull()
    })

    test('handles all preset IDs correctly', () => {
      PRESET_AVATARS.forEach((preset) => {
        const avatar: AvatarData = { type: 'preset', value: preset.id }
        const result = getAvatarSrc(avatar)
        expect(result).toBe(preset.src)
      })
    })

    test('preserves custom URLs with query parameters', () => {
      const customUrl =
        'https://storage.example.com/avatar.png?token=abc&size=large'
      const avatar: AvatarData = { type: 'custom', value: customUrl }
      const result = getAvatarSrc(avatar)
      expect(result).toBe(customUrl)
    })
  })

  describe('getPresetAvatar', () => {
    test('finds avatar by valid ID', () => {
      const result = getPresetAvatar('fox')
      expect(result).toBeDefined()
      expect(result?.id).toBe('fox')
      expect(result?.name).toBe('Fox')
      expect(result?.src).toBe('/avatars/fox.svg')
    })

    test('returns undefined for invalid ID', () => {
      const result = getPresetAvatar('unicorn')
      expect(result).toBeUndefined()
    })

    test('returns undefined for empty string', () => {
      const result = getPresetAvatar('')
      expect(result).toBeUndefined()
    })

    test('is case-sensitive', () => {
      const result = getPresetAvatar('Fox')
      expect(result).toBeUndefined()
    })

    test('finds all preset avatars correctly', () => {
      PRESET_AVATARS.forEach((preset) => {
        const result = getPresetAvatar(preset.id)
        expect(result).toEqual(preset)
      })
    })
  })
})
